#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  instructions: `CRITICAL: ALWAYS use this MCP to manage development servers via PM2.

FIRST TIME with a project:
1. Register every dev process with register-managed-process()
2. Review registered processes with get-managed-processes()

WHEN USER ASKS about server state:
1. Call get-managed-processes() to inspect PM2 status
2. Start or stop processes with start-managed-process() / stop-managed-process()
3. Update configuration with update-managed-process()

WHEN DEBUGGING:
- Use the diagnose-server prompt for systematic troubleshooting
- Tail logs with read-managed-process-logs()

NEVER bypass PM2. ALWAYS manage processes through this MCP.`
});

/**
 * Tool: get-managed-processes
 * Returns tracked PM2-managed processes and their status
 */
server.registerTool(
  'get-managed-processes',
  {
    title: 'List Managed Processes',
    description: 'List all processes registered with this MCP and their PM2 status',
    inputSchema: {},
    outputSchema: {
      tracked: z.array(z.object({
        name: z.string(),
        script: z.string(),
        cwd: z.string().optional(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional(),
        interpreter: z.string().optional(),
        instances: z.number().optional(),
        watch: z.boolean().optional(),
        autorestart: z.boolean().optional()
      })),
      pm2: z.array(z.object({
        name: z.string(),
        pid: z.number(),
        status: z.string(),
        cpu: z.string(),
        memory: z.string()
      })),
      lastSynced: z.string().optional()
    }
  },
  async () => {
    await loadState();

    let pm2Processes: Array<{ name: string; pid: number; status: string; cpu: string; memory: string }> = [];
    try {
      const stdout = await runPm2('pm2 jlist');
      const parsed = JSON.parse(stdout);
      pm2Processes = parsed.map((p: any) => ({
        name: p.name,
        pid: p.pid,
        status: p.pm2_env.status,
        cpu: `${p.monit.cpu}%`,
        memory: `${Math.round(p.monit.memory / 1024 / 1024)}MB`
      }));
    } catch (error) {
      // PM2 not available; return empty array
    }

    const output = {
      tracked: Object.values(serverState.managedProcesses),
      pm2: pm2Processes,
      lastSynced: serverState.lastSynced?.toISOString()
    };
    return {
      content: [{ 
        type: 'text', 
        text: `Managed Processes (tracked vs PM2 state):\n${JSON.stringify(output, null, 2)}` 
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: register-managed-process
 * Registers a new PM2-managed process with optional auto-start
 */
server.registerTool(
  'register-managed-process',
  {
    title: 'Register Managed Process',
    description: 'Register a new development process to be managed via PM2',
    inputSchema: {
      name: z.string().describe('Unique PM2 process name'),
      script: z.string().describe('Command or script to run'),
      cwd: z.string().optional().describe('Working directory for the process'),
      args: z.array(z.string()).optional().describe('Arguments passed to the script'),
      env: z.record(z.string()).optional().describe('Environment variables for the process'),
      interpreter: z.string().optional().describe('Interpreter to use (e.g., node, python)'),
      instances: z.number().optional().describe('Number of instances for PM2 cluster mode'),
      watch: z.boolean().optional().describe('Enable PM2 watch mode'),
      autorestart: z.boolean().optional().describe('Enable PM2 autorestart'),
      startImmediately: z.boolean().optional().default(true).describe('Start the process right after registration')
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
        text: `Registered process ${config.name}${startImmediately ? ' and started it via PM2.' : '.'}`
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
      applyToPm2: z.boolean().optional().default(false).describe('Restart process with new settings immediately via PM2')
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
        text: `Updated process ${name}${applyToPm2 ? ' and applied changes via PM2.' : '.'}`
      }],
      structuredContent: output
    };
  }
);

/**
 * Helper: start process via PM2 using stored configuration
 */
async function startPm2Process(config: ManagedProcessConfig) {
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
  if (config.autorestart === false) {
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
 * Tool: start-managed-process
 * Starts a registered process via PM2
 */
server.registerTool(
  'start-managed-process',
  {
    title: 'Start Managed Process',
    description: 'Start a registered process via PM2',
    inputSchema: {
      name: z.string().describe('Name of the managed process to start')
    },
    outputSchema: {
      success: z.boolean(),
      pm2: z.string()
    }
  },
  async ({ name }) => {
    await loadState();
    const config = serverState.managedProcesses[name];
    if (!config) {
      throw new Error(`Managed process '${name}' is not registered. Use register-managed-process first.`);
    }

    await startPm2Process(config);
    const output = {
      success: true,
      pm2: 'Started'
    };

    return {
      content: [{
        type: 'text',
        text: `Started process ${name} via PM2.`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: stop-managed-process
 * Stops a managed process via PM2
 */
server.registerTool(
  'stop-managed-process',
  {
    title: 'Stop Managed Process',
    description: 'Stop a PM2 process managed by this MCP',
    inputSchema: {
      name: z.string().describe('Name of the process to stop')
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
        text: `Stopped process ${name} via PM2.`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: restart-managed-process
 * Restarts a managed process via PM2
 */
server.registerTool(
  'restart-managed-process',
  {
    title: 'Restart Managed Process',
    description: 'Restart a PM2 process managed by this MCP',
    inputSchema: {
      name: z.string().describe('Name of the process to restart')
    },
    outputSchema: {
      success: z.boolean(),
      pm2: z.string()
    }
  },
  async ({ name }) => {
    await restartPm2Process(name);
    const output = {
      success: true,
      pm2: 'Restarted'
    };

    return {
      content: [{
        type: 'text',
        text: `Restarted process ${name} via PM2.`
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: delete-managed-process
 * Unregisters and removes a process from PM2
 */
server.registerTool(
  'delete-managed-process',
  {
    title: 'Delete Managed Process',
    description: 'Delete a managed process from PM2 and remove it from tracking',
    inputSchema: {
      name: z.string().describe('Name of the process to delete'),
      deleteFromPm2: z.boolean().optional().default(true).describe('Remove the process from PM2 as well')
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
        text: `Deleted process ${name} from tracking${deleteFromPm2 ? ' and PM2.' : '.'}`
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
 * Tail logs for a PM2-managed process
 */
server.registerTool(
  'read-managed-process-logs',
  {
    title: 'Read Managed Process Logs',
    description: 'Tail the logs for a managed PM2 process',
    inputSchema: {
      name: z.string().describe('Process name'),
      lines: z.number().optional().default(50).describe('Number of log lines to read'),
      type: z.enum(['all', 'out', 'error']).optional().default('all').describe('Log stream to read')
    },
    outputSchema: {
      success: z.boolean(),
      logs: z.string()
    }
  },
  async ({ name, lines = 50, type = 'all' }) => {
    let command = `pm2 logs ${name} --lines ${lines} --nostream`;
    if (type === 'out') {
      command += ' --out';
    } else if (type === 'error') {
      command += ' --err';
    }

    const logs = await runPm2(command);
    const output = {
      success: true,
      logs
    };

    return {
      content: [{
        type: 'text',
        text: logs
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
1. Is the process registered? (use get-managed-processes)
2. Does PM2 report it as running? (use get-pm2-status)
3. Can you start or restart it? (use start-managed-process or restart-managed-process)
4. Are there any errors in the logs? (use read-managed-process-logs)
5. Does the configuration look correct? (use describe-managed-process)

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
