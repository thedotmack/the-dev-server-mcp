#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as linkify from 'linkifyjs';
import * as os from 'os';

const execAsync = promisify(exec);

const STATE_FILE = path.join(process.cwd(), '.the-dev-server-state.json');

// PM2 management state
interface ManagedProcessConfig {
  name: string;
  script: string;
  cwd?: string;
  args?: string[];
  env?: Record<string, string>;
  interpreter?: string;
  instances?: number;
  watch?: boolean;
  autorestart?: boolean;
  logOffset?: number; // Byte offset for reading fresh logs after restart
}

interface DevServerState {
  managedProcesses: Record<string, ManagedProcessConfig>;
  lastSynced?: Date;
}

let serverState: DevServerState = {
  managedProcesses: {}
};

async function loadState(): Promise<void> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(data) as DevServerState;
    serverState = {
      managedProcesses: parsed.managedProcesses || {},
      lastSynced: parsed.lastSynced ? new Date(parsed.lastSynced) : undefined
    };
  } catch (error) {
    // State file missing or unreadable; start fresh
    serverState = { managedProcesses: {} };
  }
}

async function persistState(): Promise<void> {
  const serialized = JSON.stringify(
    {
      ...serverState,
      lastSynced: new Date().toISOString()
    },
    null,
    2
  );
  await fs.writeFile(STATE_FILE, serialized, 'utf-8');
}

async function runPm2(command: string, options: ExecOptions = {}) {
  const execOptions: ExecOptions & { encoding: BufferEncoding } = {
    ...(options as ExecOptions),
    encoding: 'utf8' as BufferEncoding,
    env: {
      ...process.env,
      ...(options.env || {})
    }
  };

  const { stdout } = await execAsync(command, execOptions);
  return stdout as string;
}

const server = new McpServer({
  name: 'the-dev-server',
  version: '0.1.0',
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
},
{
  instructions: `CRITICAL: ALWAYS use this MCP to manage development servers.

FIRST TIME with a project:
1. Register every dev server with register-managed-process()
2. Review registered servers with get-managed-processes()

WHEN USER ASKS about server state:
1. Call get-managed-processes() to check what's running
2. Start or stop servers with start-managed-process() / stop-managed-process()
3. Update configuration with update-managed-process()

WHEN DEBUGGING:
- Use the diagnose-server prompt for systematic troubleshooting
- Check logs with read-managed-process-logs()

ALWAYS manage servers through this MCP.`
});

/**
 * Tool: get-managed-processes
 * Returns registered servers and their current status
 */
server.registerTool(
  'get-managed-processes',
  {
    title: 'List Managed Servers',
    description: 'List all registered development servers and their current status',
    inputSchema: {},
    outputSchema: {
      servers: z.array(z.object({
        name: z.string(),
        status: z.string(),
        memory: z.string().optional(),
        script: z.string(),
        cwd: z.string().optional()
      })),
      lastSynced: z.string().optional()
    }
  },
  async () => {
    await loadState();

    let pm2ProcessMap: Map<string, any> = new Map();
    try {
      const stdout = await runPm2('pm2 jlist');
      const parsed = JSON.parse(stdout);
      parsed.forEach((p: any) => {
        pm2ProcessMap.set(p.name, p);
      });
    } catch (error) {
      // Process manager not available; mark all as stopped
    }

    const servers = Object.values(serverState.managedProcesses).map(config => {
      const pm2Info = pm2ProcessMap.get(config.name);
      const status = pm2Info?.pm2_env?.status || 'stopped';
      const memory = pm2Info?.monit?.memory
        ? `${Math.round(pm2Info.monit.memory / 1024 / 1024)}MB`
        : undefined;

      return {
        name: config.name,
        status,
        memory,
        script: config.script,
        cwd: config.cwd
      };
    });

    const output = {
      servers,
      lastSynced: serverState.lastSynced?.toISOString()
    };

    return {
      content: [{
        type: 'text',
        text: `Registered Servers:\n${JSON.stringify(output, null, 2)}`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: register-managed-process
 * Registers a new development server with optional auto-start
 */
server.registerTool(
  'register-managed-process',
  {
    title: 'Register Development Server',
    description: 'Register a new development server to be managed by this MCP',
    inputSchema: {
      name: z.string().describe('Unique server name'),
      script: z.string().describe('Command or script to run'),
      cwd: z.string().optional().describe('Working directory for the process'),
      args: z.array(z.string()).optional().describe('Arguments passed to the script'),
      env: z.record(z.string()).optional().describe('Environment variables for the server'),
      interpreter: z.string().optional().describe('Interpreter to use (e.g., node, python)'),
      instances: z.number().optional().describe('Number of instances for cluster mode'),
      watch: z.boolean().optional().describe('Enable watch mode'),
      autorestart: z.boolean().optional().describe('Enable autorestart'),
      startImmediately: z.boolean().optional().default(true).describe('Start the server right after registration')
    },
    outputSchema: {
      success: z.boolean(),
      managedProcess: z.object({
        name: z.string(),
        script: z.string(),
        cwd: z.string().optional(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional(),
        interpreter: z.string().optional(),
        instances: z.number().optional(),
        watch: z.boolean().optional(),
        autorestart: z.boolean().optional()
      })
    }
  },
  async ({ startImmediately = true, ...params }) => {
    await loadState();

    const config: ManagedProcessConfig = {
      name: params.name,
      script: params.script,
      cwd: params.cwd,
      args: params.args,
      env: params.env,
      interpreter: params.interpreter,
      instances: params.instances,
      watch: params.watch,
      autorestart: params.autorestart
    };

    serverState.managedProcesses[config.name] = config;
    await persistState();

    if (startImmediately) {
      await startPm2Process(config);
    }

    const output = {
      success: true,
      managedProcess: config
    };

    return {
      content: [{
        type: 'text',
        text: `Server '${config.name}' registered${startImmediately ? ' and started' : ''}`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: update-managed-process
 * Update configuration of an existing managed process
 */
server.registerTool(
  'update-managed-process',
  {
    title: 'Update Managed Process',
    description: 'Update the stored configuration for a managed process',
    inputSchema: {
      name: z.string().describe('Name of the managed process to update'),
      script: z.string().optional(),
      cwd: z.string().optional(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      interpreter: z.string().optional(),
      instances: z.number().optional(),
      watch: z.boolean().optional(),
      autorestart: z.boolean().optional(),
      applyToPm2: z.boolean().optional().default(false).describe('Restart server with new settings immediately')
    },
    outputSchema: {
      success: z.boolean(),
      managedProcess: z.object({
        name: z.string(),
        script: z.string(),
        cwd: z.string().optional(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional(),
        interpreter: z.string().optional(),
        instances: z.number().optional(),
        watch: z.boolean().optional(),
        autorestart: z.boolean().optional()
      })
    }
  },
  async ({ name, applyToPm2 = false, ...updates }) => {
    await loadState();

    const existing = serverState.managedProcesses[name];
    if (!existing) {
      throw new Error(`Managed process '${name}' is not registered. Use register-managed-process first.`);
    }

    const updated: ManagedProcessConfig = {
      ...existing,
      ...updates,
      name
    };

    serverState.managedProcesses[name] = updated;
    await persistState();

    if (applyToPm2) {
      // Restart process with new configuration
      await deletePm2Process(name);
      await startPm2Process(updated);
    }

    const output = {
      success: true,
      managedProcess: updated
    };

    return {
      content: [{
        type: 'text',
        text: `Server '${name}' updated${applyToPm2 ? ' and restarted with new settings' : ''}`
      }],
      structuredContent: output
    };
  }
);

/**
 * Helper: check if a process exists in PM2
 */
async function getPm2ProcessInfo(name: string): Promise<any | null> {
  try {
    const stdout = await runPm2('pm2 jlist');
    const processes = JSON.parse(stdout);
    return processes.find((p: any) => p.name === name) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper: start process via PM2 using stored configuration
 * Prevents duplicate instances by checking if process already exists
 */
async function startPm2Process(config: ManagedProcessConfig) {
  // Check if process already exists in PM2
  const existingProcess = await getPm2ProcessInfo(config.name);

  if (existingProcess) {
    const status = existingProcess.pm2_env?.status;

    if (status === 'online') {
      // Process already running, don't create duplicate
      return;
    } else if (status === 'stopped') {
      // Process exists but stopped, restart it instead
      await restartPm2Process(config.name);
      return;
    }
    // If status is something else (errored, etc), delete and recreate
    await deletePm2Process(config.name);
  }

  // Process doesn't exist, create it
  const parts = ['pm2', 'start', config.script, '--name', config.name];

  if (config.interpreter) {
    parts.push('--interpreter', config.interpreter);
  }
  if (config.cwd) {
    parts.push('--cwd', config.cwd);
  }
  if (config.instances && config.instances > 0) {
    parts.push('-i', String(config.instances));
  }
  if (config.watch === true) {
    parts.push('--watch');
  }
  if (config.watch === false) {
    parts.push('--no-watch');
  }

  // Disable autorestart by default unless explicitly enabled
  // This allows us to see when servers crash instead of hiding failures
  if (config.autorestart === true) {
    // Autorestart explicitly enabled, PM2 default behavior
  } else {
    // Default: disable autorestart to surface issues
    parts.push('--no-autorestart');
  }

  if (config.args && config.args.length > 0) {
    parts.push('--', ...config.args);
  }

  return runPm2(parts.join(' '), {
    cwd: config.cwd,
    env: {
      ...(config.env || {})
    }
  });
}

async function deletePm2Process(name: string) {
  try {
    await runPm2(`pm2 delete ${name}`);
  } catch (error) {
    // Ignore if process not found
  }
}

async function stopPm2Process(name: string) {
  try {
    await runPm2(`pm2 stop ${name}`);
  } catch (error) {
    // Ignore if process not found
  }
}

async function restartPm2Process(name: string) {
  return runPm2(`pm2 restart ${name}`);
}

async function describePm2Process(name: string) {
  const stdout = await runPm2(`pm2 describe ${name}`);
  return stdout;
}

/**
 * Helper: Get the path to PM2 log files for a process
 */
function getPm2LogPath(name: string, type: 'out' | 'error' = 'out'): string {
  const pm2Home = process.env.PM2_HOME || path.join(os.homedir(), '.pm2');
  const suffix = type === 'error' ? 'error.log' : 'out.log';
  return path.join(pm2Home, 'logs', `${name}-${suffix}`);
}

/**
 * Tool: start-managed-process
 * Starts a registered development server
 */
server.registerTool(
  'start-managed-process',
  {
    title: 'Start Development Server',
    description: 'Start a registered development server',
    inputSchema: {
      name: z.string().describe('Name of the server to start')
    },
    outputSchema: {
      success: z.boolean(),
      status: z.string()
    }
  },
  async ({ name }) => {
    await loadState();
    const config = serverState.managedProcesses[name];
    if (!config) {
      throw new Error(`Server '${name}' is not registered. Use register-managed-process first.`);
    }

    await startPm2Process(config);

    // Initialize log offset after start
    try {
      const logPath = getPm2LogPath(name, 'out');
      // Wait briefly for log file to be created
      await new Promise(resolve => setTimeout(resolve, 500));
      const stats = await fs.stat(logPath);
      serverState.managedProcesses[name].logOffset = stats.size;
      await persistState();
    } catch (error) {
      // Log file might not exist yet, will be 0 by default
    }

    // Wait briefly and try to detect URL from logs
    await new Promise(resolve => setTimeout(resolve, 2000));

    let urlInfo = '';
    try {
      const logs = await runPm2(`pm2 logs ${name} --lines 100 --nostream`);

      // Use linkifyjs to find all URLs in the logs
      const links = linkify.find(logs, 'url');

      // Find first http/https URL (prioritize localhost, 127.0.0.1, 0.0.0.0)
      const localUrl = links.find(link =>
        link.href.includes('localhost') ||
        link.href.includes('127.0.0.1') ||
        link.href.includes('0.0.0.0')
      );

      const foundUrl = localUrl || links[0];

      if (foundUrl) {
        // Clean up the URL (remove trailing slashes)
        let url = foundUrl.href.replace(/\/+$/, '');
        urlInfo = ` on ${url}`;
      } else {
        // Fallback: look for just port number
        const portMatch = logs.match(/(?:port|Port|PORT)[\s:]+(\d{4,5})/);
        if (portMatch) {
          urlInfo = ` on http://localhost:${portMatch[1]}`;
        }
      }
    } catch (error) {
      // Couldn't get logs, continue without URL info
    }

    const output = {
      success: true,
      status: 'started'
    };

    return {
      content: [{
        type: 'text',
        text: `Server '${name}' started${urlInfo}`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: stop-managed-process
 * Stops a running development server
 */
server.registerTool(
  'stop-managed-process',
  {
    title: 'Stop Development Server',
    description: 'Stop a running development server',
    inputSchema: {
      name: z.string().describe('Name of the server to stop')
    },
    outputSchema: {
      success: z.boolean()
    }
  },
  async ({ name }) => {
    await stopPm2Process(name);
    const output = {
      success: true
    };

    return {
      content: [{
        type: 'text',
        text: `Server '${name}' stopped`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: restart-managed-process
 * Restarts a running development server
 */
server.registerTool(
  'restart-managed-process',
  {
    title: 'Restart Development Server',
    description: 'Restart a running development server',
    inputSchema: {
      name: z.string().describe('Name of the server to restart')
    },
    outputSchema: {
      success: z.boolean(),
      status: z.string()
    }
  },
  async ({ name }) => {
    await loadState();

    // Flush logs before restart to get fresh output
    try {
      await runPm2(`pm2 flush ${name}`);
    } catch (error) {
      // Ignore flush errors, continue with restart
    }

    await restartPm2Process(name);

    // After restart, capture the log file offset for fresh log reads
    try {
      const logPath = getPm2LogPath(name, 'out');
      const stats = await fs.stat(logPath);

      if (serverState.managedProcesses[name]) {
        serverState.managedProcesses[name].logOffset = stats.size;
        await persistState();
      }
    } catch (error) {
      // Log file might not exist yet, offset will be 0 by default
    }

    const output = {
      success: true,
      status: 'restarted'
    };

    return {
      content: [{
        type: 'text',
        text: `Server '${name}' restarted (logs flushed)`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: delete-managed-process
 * Unregisters and stops a development server
 */
server.registerTool(
  'delete-managed-process',
  {
    title: 'Delete Development Server',
    description: 'Delete a development server and remove it from tracking',
    inputSchema: {
      name: z.string().describe('Name of the server to delete'),
      deleteFromPm2: z.boolean().optional().default(true).describe('Stop the running server as well')
    },
    outputSchema: {
      success: z.boolean()
    }
  },
  async ({ name, deleteFromPm2 = true }) => {
    await loadState();

    if (deleteFromPm2) {
      await deletePm2Process(name);
    }

    delete serverState.managedProcesses[name];
    await persistState();

    const output = {
      success: true
    };

    return {
      content: [{
        type: 'text',
        text: `Server '${name}' deleted${deleteFromPm2 ? ' and stopped' : ''}`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: describe-managed-process
 * Provide detailed PM2 description for a managed process
 */
server.registerTool(
  'describe-managed-process',
  {
    title: 'Describe Managed Process',
    description: 'Get detailed PM2 information about a process',
    inputSchema: {
      name: z.string().describe('Name of the process to describe')
    },
    outputSchema: {
      success: z.boolean(),
      description: z.string()
    }
  },
  async ({ name }) => {
    const description = await describePm2Process(name);
    const output = {
      success: true,
      description
    };

    return {
      content: [{
        type: 'text',
        text: description
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: read-managed-process-logs
 * Read logs for a development server
 */
server.registerTool(
  'read-managed-process-logs',
  {
    title: 'Read Server Logs',
    description: 'Read recent logs from a development server',
    inputSchema: {
      name: z.string().describe('Server name'),
      lines: z.number().optional().default(50).describe('Number of log lines to read'),
      type: z.enum(['all', 'out', 'error']).optional().default('all').describe('Log stream to read'),
      freshOnly: z.boolean().optional().default(false).describe('Only read logs since last restart (uses stored offset)')
    },
    outputSchema: {
      success: z.boolean(),
      logs: z.string()
    }
  },
  async ({ name, lines = 50, type = 'all', freshOnly = false }) => {
    await loadState();

    let cleanedLogs = '';

    // If freshOnly is true, read from log file using stored offset
    if (freshOnly && serverState.managedProcesses[name]?.logOffset !== undefined) {
      try {
        const logPath = getPm2LogPath(name, type === 'error' ? 'error' : 'out');
        const offset = serverState.managedProcesses[name].logOffset || 0;

        // Read from offset to end of file
        const fileHandle = await fs.open(logPath, 'r');
        const stats = await fileHandle.stat();
        const bytesToRead = stats.size - offset;

        if (bytesToRead > 0) {
          // Limit to reasonable size (1MB)
          const maxBytes = 1024 * 1024;
          const readSize = Math.min(bytesToRead, maxBytes);
          const buffer = Buffer.alloc(readSize);

          await fileHandle.read(buffer, 0, readSize, offset);
          await fileHandle.close();

          cleanedLogs = buffer.toString('utf8');

          // Update offset for next read
          serverState.managedProcesses[name].logOffset = offset + readSize;
          await persistState();
        } else {
          cleanedLogs = '(no new logs since last restart)';
        }
      } catch (error) {
        // Fall back to PM2 command if direct file read fails
        freshOnly = false;
      }
    }

    // If not using freshOnly mode or fallback needed, use PM2 command
    if (!freshOnly) {
      let command = `pm2 logs ${name} --lines ${lines} --nostream`;
      if (type === 'out') {
        command += ' --out';
      } else if (type === 'error') {
        command += ' --err';
      }

      const rawLogs = await runPm2(command);

      // Strip PM2 formatting and paths
      cleanedLogs = rawLogs
        // Remove PM2 log file paths
        .replace(/\/.*\.pm2\/logs\/.*\.log last \d+ lines:/g, '')
        // Remove PM2 process ID prefixes (e.g., "10|example | ")
        .replace(/^\s*\d+\|[^|]+\|\s*/gm, '')
        // Remove [TAILING] messages
        .replace(/\[TAILING\].*$/gm, '')
        .trim();
    }

    const output = {
      success: true,
      logs: cleanedLogs
    };

    return {
      content: [{
        type: 'text',
        text: `Recent logs for '${name}'${freshOnly ? ' (fresh only)' : ''}:\n${cleanedLogs}`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: get-pm2-status
 * Get status of PM2-managed processes
 */
server.registerTool(
  'get-pm2-status',
  {
    title: 'Get PM2 Status',
    description: 'Get the status of PM2-managed processes',
    inputSchema: {
      processName: z.string().optional().describe('Specific PM2 process name to check')
    },
    outputSchema: {
      available: z.boolean(),
      processes: z.array(z.object({
        name: z.string(),
        pid: z.number(),
        status: z.string(),
        cpu: z.string(),
        memory: z.string()
      }))
    }
  },
  async ({ processName }) => {
    try {
      const stdout = await runPm2('pm2 jlist');
      const processes = JSON.parse(stdout);
      
      const filtered = processName 
        ? processes.filter((p: any) => p.name === processName)
        : processes;

      const output = {
        available: true,
        processes: filtered.map((p: any) => ({
          name: p.name,
          pid: p.pid,
          status: p.pm2_env.status,
          cpu: p.monit.cpu + '%',
          memory: Math.round(p.monit.memory / 1024 / 1024) + 'MB'
        }))
      };

      return {
        content: [{ 
          type: 'text', 
          text: `PM2 Processes:\n${JSON.stringify(output.processes, null, 2)}` 
        }],
        structuredContent: output
      };
    } catch (error) {
      const output = {
        available: false,
        processes: []
      };

      return {
        content: [{ 
          type: 'text', 
          text: 'PM2 is not available or no processes found' 
        }],
        structuredContent: output
      };
    }
  }
);

/**
 * Resource: server-config
 * Provides access to common configuration files
 */
server.registerResource(
  'server-config',
  'config://server-config',
  {
    name: 'Server Configuration',
    description: 'Access to server configuration and package.json',
    mimeType: 'application/json'
  },
  async () => {
    try {
      const cwd = process.cwd();
      const packageJsonPath = path.join(cwd, 'package.json');
      
      const packageJson = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(packageJson);

      const config = {
        name: pkg.name,
        scripts: pkg.scripts,
        dependencies: pkg.dependencies,
        devDependencies: pkg.devDependencies
      };

      return {
        contents: [{
          uri: 'config://server-config',
          text: JSON.stringify(config, null, 2),
          mimeType: 'application/json'
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: 'config://server-config',
          text: JSON.stringify({ error: 'Could not read package.json' }, null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  }
);

/**
 * Prompt: diagnose-server
 * Provides a structured prompt for diagnosing server issues
 */
server.registerPrompt(
  'diagnose-server',
  {
    title: 'Diagnose Server Issues',
    description: 'Get a structured prompt to help diagnose development server issues',
    argsSchema: {
      issue: z.string().optional().describe('Description of the issue you\'re experiencing')
    }
  },
  ({ issue }) => ({
    messages: [
      {
        role: 'user',
            content: {
              type: 'text',
              text: `Please help diagnose this development server issue: ${issue || 'Server not responding'}\n\nCheck the following:
1. Is the server registered? (use get-managed-processes)
2. What is its current status? (use get-managed-processes)
3. Can you start or restart it? (use start-managed-process or restart-managed-process)
4. Are there any errors in the logs? (use read-managed-process-logs)
5. Check if dependencies are installed and the port is available

Provide a comprehensive diagnosis and recommended next steps.`
        }
      }
    ]
  })
);

// Start the server
async function main() {
  await loadState();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('the-dev-server MCP running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
