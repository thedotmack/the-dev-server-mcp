#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Server state tracking
interface DevServerState {
  port?: number;
  address?: string;
  processType?: 'terminal' | 'pm2' | 'background' | 'unknown';
  pid?: number;
  serverTech?: string;
  buildCommand?: string;
  startCommand?: string;
  logPath?: string;
  status: 'running' | 'stopped' | 'unknown';
  lastChecked?: Date;
  projectPath?: string;
  projectName?: string;
}

let serverState: DevServerState = {
  status: 'unknown'
};

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
  instructions: `CRITICAL: ALWAYS use this MCP for ANY question about development servers, ports, or processes.

FIRST TIME with a project:
1. Call detect-server-process() to discover running servers
2. Call get-server-state() to see what's tracked

WHEN USER ASKS about server:
1. ALWAYS call get-server-state() first
2. Report port, status, project location, and process type
3. If state is old/unknown, call detect-server-process()

WHEN USER STARTS/STOPS SERVER:
- Immediately call update-server-state() with the new information

WHEN DEBUGGING:
- Use the diagnose-server prompt for systematic troubleshooting
- Call read-server-logs() to see recent errors

NEVER assume port numbers, status, or locations. ALWAYS query this MCP first.`
});

/**
 * Tool: get-server-state
 * Returns the current known state of the development server
 */
server.registerTool(
  'get-server-state',
  {
    title: 'Get Dev Server State',
    description: 'Get the current state of the development server including port, process type, and status',
    inputSchema: {},
    outputSchema: {
      status: z.enum(['running', 'stopped', 'unknown']),
      port: z.number().optional(),
      address: z.string().optional(),
      processType: z.enum(['terminal', 'pm2', 'background', 'unknown']).optional(),
      pid: z.number().optional(),
      serverTech: z.string().optional(),
      buildCommand: z.string().optional(),
      startCommand: z.string().optional(),
      logPath: z.string().optional(),
      lastChecked: z.string().optional(),
      projectPath: z.string().optional(),
      projectName: z.string().optional()
    }
  },
  async () => {
    const output = {
      ...serverState,
      lastChecked: serverState.lastChecked?.toISOString()
    };
    return {
      content: [{ 
        type: 'text', 
        text: `Dev Server State:\n${JSON.stringify(output, null, 2)}` 
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: update-server-state
 * Updates the tracked state of the development server
 */
server.registerTool(
  'update-server-state',
  {
    title: 'Update Dev Server State',
    description: 'Update the tracked state of the development server with new information',
    inputSchema: {
      port: z.number().optional().describe('The port number the server is running on'),
      address: z.string().optional().describe('The full address (e.g., http://localhost:3000)'),
      processType: z.enum(['terminal', 'pm2', 'background', 'unknown']).optional().describe('How the server process is running'),
      pid: z.number().optional().describe('The process ID'),
      serverTech: z.string().optional().describe('The server technology (e.g., Express, Next.js, Vite)'),
      buildCommand: z.string().optional().describe('Command to build the project'),
      startCommand: z.string().optional().describe('Command to start the server'),
      logPath: z.string().optional().describe('Path to the log file'),
      status: z.enum(['running', 'stopped', 'unknown']).optional().describe('Current server status'),
      projectPath: z.string().optional().describe('Full path to the project directory'),
      projectName: z.string().optional().describe('Name of the project')
    },
    outputSchema: {
      success: z.boolean(),
      updatedState: z.object({
        status: z.enum(['running', 'stopped', 'unknown']),
        port: z.number().optional(),
        address: z.string().optional(),
        processType: z.enum(['terminal', 'pm2', 'background', 'unknown']).optional(),
        pid: z.number().optional(),
        serverTech: z.string().optional(),
        buildCommand: z.string().optional(),
        startCommand: z.string().optional(),
        logPath: z.string().optional(),
        projectPath: z.string().optional(),
        projectName: z.string().optional()
      })
    }
  },
  async (params) => {
    // Update only the provided fields
    serverState = {
      ...serverState,
      ...params,
      lastChecked: new Date()
    };

    const output = {
      success: true,
      updatedState: {
        status: serverState.status,
        port: serverState.port,
        address: serverState.address,
        processType: serverState.processType,
        pid: serverState.pid,
        serverTech: serverState.serverTech,
        buildCommand: serverState.buildCommand,
        startCommand: serverState.startCommand,
        logPath: serverState.logPath,
        projectPath: serverState.projectPath,
        projectName: serverState.projectName
      }
    };

    return {
      content: [{ 
        type: 'text', 
        text: `Updated dev server state:\n${JSON.stringify(output.updatedState, null, 2)}` 
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: detect-server-process
 * Attempts to auto-detect running development server processes
 */
server.registerTool(
  'detect-server-process',
  {
    title: 'Detect Server Process',
    description: 'Automatically detect running development server processes and their details',
    inputSchema: {
      workingDirectory: z.string().optional().describe('Working directory to check for server processes')
    },
    outputSchema: {
      detected: z.boolean(),
      processes: z.array(z.object({
        pid: z.number(),
        port: z.number().optional(),
        command: z.string(),
        type: z.enum(['terminal', 'pm2', 'background']),
        projectPath: z.string().optional(),
        projectName: z.string().optional()
      }))
    }
  },
  async ({ workingDirectory }) => {
    const processes: Array<{
      pid: number;
      port?: number;
      command: string;
      type: 'terminal' | 'pm2' | 'background';
      projectPath?: string;
      projectName?: string;
    }> = [];

    try {
      // Check for common dev server processes
      const commonPorts = [3000, 3001, 4200, 5000, 5173, 8080, 8000, 9000];
      
      for (const port of commonPorts) {
        try {
          const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null || true`);
          const pid = stdout.trim();
          
          if (pid) {
            const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o command= 2>/dev/null || true`);
            const command = psOutput.trim();
            
            if (command) {
              // Determine process type
              let type: 'terminal' | 'pm2' | 'background' = 'background';
              if (command.includes('node') && !command.includes('pm2')) {
                type = 'terminal';
              } else if (command.includes('pm2')) {
                type = 'pm2';
              }
              
              // Get project path using lsof
              let projectPath: string | undefined;
              let projectName: string | undefined;
              try {
                const { stdout: lsofOutput } = await execAsync(`lsof -p ${pid} | grep cwd | awk '{print $NF}' 2>/dev/null || true`);
                projectPath = lsofOutput.trim();
                if (projectPath) {
                  projectName = projectPath.split('/').pop();
                }
              } catch (err) {
                // Could not get project path
              }
              
              processes.push({
                pid: parseInt(pid),
                port,
                command,
                type,
                projectPath,
                projectName
              });
            }
          }
        } catch (err) {
          // Skip if port is not in use
        }
      }

      // Update server state if we found something
      if (processes.length > 0) {
        const mainProcess = processes[0];
        serverState = {
          ...serverState,
          pid: mainProcess.pid,
          port: mainProcess.port,
          address: mainProcess.port ? `http://localhost:${mainProcess.port}` : undefined,
          processType: mainProcess.type,
          status: 'running',
          lastChecked: new Date(),
          projectPath: mainProcess.projectPath,
          projectName: mainProcess.projectName
        };
      }
    } catch (error) {
      // Detection failed, return empty results
    }

    const output = {
      detected: processes.length > 0,
      processes
    };

    return {
      content: [{ 
        type: 'text', 
        text: `Detected ${processes.length} dev server process(es):\n${JSON.stringify(output, null, 2)}` 
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: check-port-status
 * Check if a specific port is in use
 */
server.registerTool(
  'check-port-status',
  {
    title: 'Check Port Status',
    description: 'Check if a specific port is in use and get process information',
    inputSchema: {
      port: z.number().describe('Port number to check')
    },
    outputSchema: {
      inUse: z.boolean(),
      pid: z.number().optional(),
      command: z.string().optional()
    }
  },
  async ({ port }) => {
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null || true`);
      const pid = stdout.trim();
      
      if (pid) {
        const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o command= 2>/dev/null || true`);
        const command = psOutput.trim();
        
        const output = {
          inUse: true,
          pid: parseInt(pid),
          command
        };

        return {
          content: [{ 
            type: 'text', 
            text: `Port ${port} is in use by PID ${pid}:\n${command}` 
          }],
          structuredContent: output
        };
      }
    } catch (error) {
      // Port not in use
    }

    const output = {
      inUse: false
    };

    return {
      content: [{ 
        type: 'text', 
        text: `Port ${port} is not in use` 
      }],
      structuredContent: output
    };
  }
);

/**
 * Tool: read-server-logs
 * Read the most recent server logs
 */
server.registerTool(
  'read-server-logs',
  {
    title: 'Read Server Logs',
    description: 'Read the most recent lines from the server log file',
    inputSchema: {
      logPath: z.string().optional().describe('Path to the log file (uses tracked path if not provided)'),
      lines: z.number().optional().default(50).describe('Number of recent lines to read')
    },
    outputSchema: {
      success: z.boolean(),
      logs: z.string().optional(),
      error: z.string().optional()
    }
  },
  async ({ logPath, lines = 50 }) => {
    const pathToRead = logPath || serverState.logPath;
    
    if (!pathToRead) {
      const output = {
        success: false,
        error: 'No log path specified or tracked'
      };
      return {
        content: [{ 
          type: 'text', 
          text: 'Error: No log path specified or tracked' 
        }],
        structuredContent: output
      };
    }

    try {
      const { stdout } = await execAsync(`tail -n ${lines} "${pathToRead}" 2>/dev/null || true`);
      
      const output = {
        success: true,
        logs: stdout
      };

      return {
        content: [{ 
          type: 'text', 
          text: `Recent logs from ${pathToRead}:\n\n${stdout}` 
        }],
        structuredContent: output
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        error: errorMsg
      };

      return {
        content: [{ 
          type: 'text', 
          text: `Error reading logs: ${errorMsg}` 
        }],
        structuredContent: output
      };
    }
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
      const { stdout } = await execAsync('pm2 jlist 2>/dev/null');
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
1. Is the server process running? (use detect-server-process)
2. What port is it supposed to be on? (use get-server-state)
3. Is that port accessible? (use check-port-status)
4. Are there any errors in the logs? (use read-server-logs)
5. If using PM2, what's the PM2 status? (use get-pm2-status)

Provide a comprehensive diagnosis and recommended next steps.`
        }
      }
    ]
  })
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('the-dev-server MCP running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
