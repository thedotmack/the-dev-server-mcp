<h1 align="center">
  <br>
  🚀 the-dev-server MCP
  <br>
</h1>

<h4 align="center">Never let Claude get confused about your development server again.</h4>

<p align="center">
  <a href="#-why-this-exists">Why</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <em>A Model Context Protocol (MCP) server that tracks and manages the state of your development server, providing Claude with persistent memory and awareness of server status, ports, processes, and logs.</em>
</p>

---

## 🎯 Why This Exists

Claude constantly forgets:
- ❌ What port your server is running on
- ❌ Whether the server is actually running
- ❌ How the server is being managed (terminal? PM2? background?)
- ❌ Where to find server logs
- ❌ What commands to use to build/start

**the-dev-server MCP solves this** by giving Claude a reliable, queryable source of truth for all dev server state.

## ✨ Features

* **🔍 Auto-Detection** - Automatically discovers running development servers on common ports
* **📊 State Tracking** - Maintains persistent knowledge of server configuration across conversations
* **🔌 Port Monitoring** - Check which ports are in use and by what process
* **📂 Project Location** - Tracks which project directory each server is running from
* **📝 Log Access** - Direct access to server log files for debugging
* **⚙️ PM2 Integration** - Full support for PM2-managed processes
* **🩺 Diagnostic Tools** - Structured troubleshooting prompts and workflows
* **💾 Persistent Memory** - State survives across multiple Claude queries
* **🎯 Zero Configuration** - Works out of the box after setup
* **🔧 Cross-Platform** - Supports macOS and Linux

## 🚀 Quick Start

### Installation

```bash
# Clone or download this repository
cd the-dev-server-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

Replace `/absolute/path/to/` with the actual path to your installation.

### Restart Claude Desktop

After updating the config, restart Claude Desktop to load the MCP server.

### Add Project Instructions (Recommended)

For best results, add instructions to your projects:

```bash
# For Claude - copy to your project root
cp /path/to/the-dev-server-mcp/CLAUDE.md.example /your/project/CLAUDE.md

# For CLI tools (Cline, Cursor, etc.) - copy to your project root
cp /path/to/the-dev-server-mcp/.clinerules.example /your/project/.clinerules
```

This ensures Claude and other AI assistants consistently use the MCP for server questions.

> **� Note:** The MCP includes built-in instructions that Claude sees automatically. Project files are optional but recommended for best results.

## 📖 Usage

### In Your Claude Conversations

Simply tell Claude to use the MCP:

> "Use the-dev-server MCP to check the current server status"

Or set it as a project instruction:

> "Always use the-dev-server MCP for all development server questions. Call get-server-state or detect-server-process at the start of any server-related conversation."

### Available Tools

#### 1. `get-server-state`
Get the current tracked state of your dev server.

```
Example: "What's the current server state?"
```

#### 2. `update-server-state`
Manually update the server state with new information.

```
Example: "I just started the server on port 3000 using npm run dev"
Claude will use update-server-state to track this
```

#### 3. `detect-server-process`
Auto-detect running development servers.

```
Example: "Find any development servers running on my machine"
```

#### 4. `check-port-status`
Check if a specific port is in use.

```
Example: "Is port 3000 available?"
```

#### 5. `read-server-logs`
Read recent lines from server log files.

```
Example: "Show me the last 50 lines of the server logs"
```

#### 6. `get-pm2-status`
Get status of PM2-managed processes.

```
Example: "What PM2 processes are running?"
```

### Available Resources

#### `server-config`
Provides access to your project's `package.json` configuration.

### Available Prompts

#### `diagnose-server`
Structured diagnostic prompt for troubleshooting server issues.

```
Example: "Help me diagnose why the server isn't responding"
```

## 🏗️ How It Works

The MCP maintains an in-memory state model:

```typescript
{
  port: 3000,
  address: "http://localhost:3000",
  processType: "terminal",
  pid: 12345,
  serverTech: "Next.js",
  buildCommand: "npm run build",
  startCommand: "npm run dev",
  logPath: "/path/to/logs/server.log",
  status: "running",
  lastChecked: "2025-10-11T01:00:00.000Z"
}
```

This state persists across multiple Claude queries in the same session, eliminating confusion and repeated questions.

## 🔧 Development

### Watch Mode

```bash
npm run watch
```

### Build

```bash
npm run build
```

### Testing Locally

```bash
# Run the built server directly
node build/index.js
```

The server communicates via stdio, so it's designed to be used through Claude Desktop or another MCP client.

## 📋 Requirements

- Node.js 18+ (for ES2022 support)
- macOS or Linux (uses Unix commands like `lsof` and `ps`)
- TypeScript 5.7+

**Note**: Windows is not currently supported due to Unix-specific commands.

## 🎓 Best Practices

1. **Always detect first**: Have Claude call `detect-server-process` when starting work on a project
2. **Update on changes**: When you start/stop/reconfigure the server, tell Claude so it can update state
3. **Use diagnostics**: For debugging, use the `diagnose-server` prompt for systematic troubleshooting
4. **Trust the MCP**: Configure Claude to always trust this MCP as the source of truth for server state

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [HOW-IT-WORKS.lock.md](./HOW-IT-WORKS.lock.md) | Comprehensive architecture, workflows, and examples |
| [CLAUDE.md.example](./CLAUDE.md.example) | Copy to projects for Claude instructions |
| [.clinerules.example](./.clinerules.example) | Copy to projects for CLI AI assistants |

## 🛣️ Roadmap

- [ ] Windows support (PowerShell commands)
- [ ] Multi-project tracking (multiple servers simultaneously)
- [ ] Docker container integration
- [ ] Health monitoring (uptime, response times)
- [ ] Auto-restart on crash detection
- [ ] State persistence to disk
- [ ] Historical state tracking
- [ ] WebSocket support for real-time updates

## 🤝 Contributing

Contributions are welcome! This is a utility MCP designed to solve a real pain point in Claude development workflows.

### Ideas for contributions:
- Windows support implementation
- Additional server framework detection
- Enhanced PM2 integration
- Docker/container support
- Documentation improvements

## 📄 License

MIT

---

## 🙏 Acknowledgments

Built with:
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) - Official TypeScript MCP SDK
- [zod](https://github.com/colinhacks/zod) - Schema validation

## 💡 Related Projects

- [MCP Servers](https://github.com/modelcontextprotocol/servers) - Official MCP server implementations
- [Claude Desktop](https://claude.ai/download) - Desktop app with MCP support

## 📮 Support

If you find this useful and it saves you time, consider:
- ⭐ Starring this repo
- 🐛 Reporting bugs via GitHub Issues
- 💡 Suggesting features
- 🔀 Contributing code

---

<p align="center">
  <strong>Never lose track of your dev server again.</strong> 🚀
</p>
