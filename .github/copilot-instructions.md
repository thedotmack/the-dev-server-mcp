# Copilot Instructions for the-dev-server MCP

## Project Overview
This TypeScript-based Model Context Protocol (MCP) server turns Claude into the PM2 control plane for development servers. Instead of detecting ad-hoc processes, it persists a registry of managed process configurations, executes lifecycle commands (start/stop/restart/delete) through PM2, and exposes tools for viewing status, logs, and configuration drift.

## Current Status
- [x] ✅ Verified copilot-instructions.md file in .github directory
- [x] ✅ Project requirements clarified (MCP-driven PM2 orchestration)
- [x] ✅ Project scaffolded with TypeScript MCP template structure
- [x] ✅ Customized with 10 PM2-focused tools, 1 resource, 1 prompt
- [x] ✅ Persistent registry stored in `.the-dev-server-state.json`
- [x] ✅ Embedded instructions added to MCP server initialization
- [x] ✅ Extensions not required (standard TypeScript project)
- [x] ✅ Project compiled successfully (`npm install && npm run build`)
- [x] ✅ Task creation not needed (MCP runs via stdio)
- [x] ✅ Launch not applicable (configured in Claude Desktop config)
- [x] ✅ Documentation complete (README.md, HOW-IT-WORKS.lock.md, CLAUDE.md.example, .clinerules.example)

## Project Structure
```

├── .github/
│   └── copilot-instructions.md      # This file
├── src/
│   └── index.ts                     # Main MCP server implementation
├── build/                           # Compiled output
│   ├── index.js                     # Executable MCP server
│   └── index.d.ts                   # Type definitions
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── README.md                        # User-facing documentation
├── HOW-IT-WORKS.lock.md             # Comprehensive truth guide
├── CLAUDE.md.example                # Claude instruction template
├── .clinerules.example              # CLI AI assistant template
└── .gitignore                       # Git ignore rules
```

## Development Commands
- `npm install` – Install dependencies
- `npm run build` – Compile TypeScript to JavaScript
- `npm run watch` – Build in watch mode
- `node build/index.js` – Run the MCP server directly (stdio mode)

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

### Tools (10)
1. **get-managed-processes** – Registry snapshot + live PM2 metadata
2. **register-managed-process** – Persist new process config (optional auto-start)
3. **update-managed-process** – Mutate stored config (optional apply to PM2)
4. **start-managed-process** – Launch via PM2 using stored config
5. **stop-managed-process** – Stop PM2 process
6. **restart-managed-process** – Restart PM2 process
7. **delete-managed-process** – Remove from registry (and optionally PM2)
8. **describe-managed-process** – PM2 describe output for a specific process
9. **read-managed-process-logs** – Tail stdout/err via PM2 logs
10. **get-pm2-status** – Global PM2 process overview

### Resource (1)
- **server-config** – Read-only access to `package.json` metadata

### Prompt (1)
- **diagnose-server** – PM2-centric troubleshooting workflow

### State Model
```typescript
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
```
The registry persists to `.the-dev-server-state.json`; PM2 commands are generated from these configs.

## Embedded Instructions
Claude receives built-in instructions on connection:
- ALWAYS manage dev servers via this MCP (no manual PM2 commands)
- Register processes with `register-managed-process()` before use
- Use MCP lifecycle tools for start/stop/restart/delete
- Lean on `diagnose-server` + log tailing for troubleshooting

## Code Generation Guidelines (for Copilot)

When generating code related to servers in projects using this MCP:

### DO:
- ✅ Use environment variables for ports (`process.env.PORT || 3000`) so MCP can inject them
- ✅ Mention MCP registration/update flows when introducing new scripts or services
- ✅ Add comments reminding that PM2 is managed by the MCP
- ✅ Include proper error handling for port conflicts and log helpful startup info

### DON'T:
- ❌ Hardcode port numbers without fallbacks
- ❌ Assume processes are started manually
- ❌ Provide instructions that bypass the MCP (e.g., raw `pm2` CLI commands)

### Example Pattern:
```typescript
// Server port managed by the-dev-server MCP via PM2
// Allows override via environment variable
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Claude manages this process via the-dev-server MCP
});
```

## Execution Guidelines
- Project is production-ready
- Make changes in `src/index.ts` and run `npm run build`
- Integrate with Claude Desktop for end-to-end testing
- See HOW-IT-WORKS.lock.md for the authoritative architecture guide
- Share CLAUDE.md.example and .clinerules.example with users/teammates

## Platform Support
- ✅ macOS – Fully supported
- ✅ Linux – Fully supported
- ❌ Windows – Not yet supported (relies on Unix + PM2)

## Future Enhancements
- Windows/PowerShell support
- Multi-service orchestration (groups & batch commands)
- Docker/Compose integration alongside PM2
- Health monitoring & auto-healing policies
- Remote PM2 target support
- Historical restart/log snapshots
- Docker container integration
