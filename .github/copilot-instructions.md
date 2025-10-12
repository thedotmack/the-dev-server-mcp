# Copilot Instructions for the-dev-server MCP

## Project Overview
This is a TypeScript-based Model Context Protocol (MCP) server called "the-dev-server" that helps Claude understand and manage development server state. It tracks port numbers, process types, project locations, and provides automatic server detection.

## Current Status
- [x] ✅ Verified copilot-instructions.md file in .github directory
- [x] ✅ Project requirements clarified (MCP for dev server state tracking)
- [x] ✅ Project scaffolded with TypeScript MCP template structure
- [x] ✅ Customized with 6 tools, 1 resource, 1 prompt for dev server management
- [x] ✅ Enhanced with project location tracking (projectPath, projectName)
- [x] ✅ Embedded instructions added to MCP server initialization
- [x] ✅ Extensions not required (standard TypeScript project)
- [x] ✅ Project compiled successfully (npm install && npm run build)
- [x] ✅ Task creation not needed (MCP runs via stdio, not a typical build/run task)
- [x] ✅ Launch not applicable (MCP is configured in Claude Desktop config)
- [x] ✅ Documentation complete (README.md, HOW-IT-WORKS.lock.md, CLAUDE.md.example, .clinerules.example)

## Project Structure
```
the-dev-server-mcp/
├── .github/
│   └── copilot-instructions.md      # This file
├── src/
│   └── index.ts                     # Main MCP server implementation
├── build/                           # Compiled output
│   ├── index.js                     # Executable MCP server
│   └── index.d.ts                   # Type definitions
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── README.md                        # User-facing documentation (styled)
├── HOW-IT-WORKS.lock.md            # Comprehensive truth guide
├── STARTUP-INSTRUCTIONS.md         # Guide for adding instructions
├── CLAUDE.md.example               # Claude instruction template
├── .clinerules.example             # CLI AI assistant template
└── .gitignore                      # Git ignore rules
```

## Development Commands
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `node build/index.js` - Run the MCP server directly (stdio mode)

## Integration with Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "the-dev-server": {
      "command": "node",
      "args": ["/absolute/path/to/the-dev-server-mcp/build/index.js"]
    }
  }
}
```

## Key Features Implemented

### Tools (6)
1. **get-server-state** - Retrieve current tracked state
2. **update-server-state** - Update state with new information
3. **detect-server-process** - Auto-detect running dev servers (scans ports 3000-9000)
4. **check-port-status** - Check if a specific port is in use
5. **read-server-logs** - Read server log files
6. **get-pm2-status** - Query PM2 process manager

### Resource (1)
- **server-config** - Access to package.json configuration

### Prompt (1)
- **diagnose-server** - Structured debugging workflow

### State Model
```typescript
interface DevServerState {
  port?: number;                    // e.g., 3000
  address?: string;                 // e.g., http://localhost:3000
  processType?: 'terminal' | 'pm2' | 'background' | 'unknown';
  pid?: number;                     // Process ID
  serverTech?: string;              // e.g., "Next.js", "Vite"
  buildCommand?: string;            // e.g., "npm run build"
  startCommand?: string;            // e.g., "npm run dev"
  logPath?: string;                 // Path to logs
  status: 'running' | 'stopped' | 'unknown';
  lastChecked?: Date;               // When state was last updated
  projectPath?: string;             // Full project directory path
  projectName?: string;             // Project folder name
}
```

## Auto-Detection Strategy
- Scans common dev server ports: 3000, 3001, 4200, 5000, 5173, 8080, 8000, 9000
- Uses `lsof` to check port usage and get PID
- Uses `ps` to get full command
- Uses `lsof -p <pid> | grep cwd` to get project directory
- Determines process type (terminal/PM2/background)
- Auto-updates internal state with discovered information

## Embedded Instructions
The MCP includes built-in instructions that Claude sees on connection:
- ALWAYS use this MCP for server questions
- Call get-server-state() or detect-server-process() first
- Update state when user provides new information
- Never assume port numbers or status

## Code Generation Guidelines (for Copilot)

When generating code related to servers in projects using this MCP:

### DO:
- ✅ Use environment variables for ports (`process.env.PORT || 3000`)
- ✅ Add comments mentioning the MCP tracks server state
- ✅ Suggest configurable server settings
- ✅ Include proper error handling for port conflicts
- ✅ Log server startup information (port, address)

### DON'T:
- ❌ Hardcode port numbers without fallbacks
- ❌ Assume a specific port is available
- ❌ Skip logging server startup details

### Example Pattern:
```typescript
// Server port tracked by the-dev-server MCP
// Allows override via environment variable
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Claude can detect this via the-dev-server MCP
});
```

## Execution Guidelines
- Project is complete and production-ready
- To make changes: Edit `src/index.ts` and run `npm run build`
- Test by integrating with Claude Desktop
- Refer to HOW-IT-WORKS.lock.md for comprehensive usage details
- Share CLAUDE.md.example with users for project-level instructions
- Share .clinerules.example for CLI AI assistant integration

## Platform Support
- ✅ macOS - Fully supported
- ✅ Linux - Fully supported
- ❌ Windows - Not yet supported (uses Unix commands: lsof, ps)

## Future Enhancements
- Windows support (PowerShell equivalents)
- Multi-project tracking (multiple servers simultaneously)
- Docker container integration
- Real-time health monitoring
- State persistence to disk
