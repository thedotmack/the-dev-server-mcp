<h1 align="center">
  <br>
  🚀 the-dev-server MCP
  <br>
</h1>

<h4 align="center">Let Claude register, start, and inspect every dev server you run with PM2.</h4>

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
  <em>A Model Context Protocol (MCP) server that owns PM2 process management for your dev environments—Claude can register processes, boot them, inspect logs, and keep configuration in sync.</em>
</p>

---

## 🎯 Why This Exists

Running multiple dev servers across projects quickly gets messy:
- ❌ Configs live in random scripts and terminal history
- ❌ Each teammate manages PM2 differently (or not at all)
- ❌ Restart workflows are tribal knowledge
- ❌ Log files are scattered and forgotten
- ❌ Claude has to guess which process you care about

**the-dev-server MCP solves this** by letting Claude act as the PM2 control plane. Every dev server you care about is registered once, stored in versioned JSON, and controlled through the same MCP tools.

## ✨ Features

* **🧠 Managed Process Registry** – Declare every dev service (script, cwd, args, env) once; the MCP persists it in `.the-dev-server-state.json`.
* **⚙️ PM2 Orchestration** – Start, stop, restart, delete, and describe processes entirely through MCP tools.
* **� Config Drift Control** – Update registrations, apply config changes to PM2 instantly, and keep state in sync.
* **� Unified Status View** – `get-managed-processes` merges the stored registry with live PM2 status so Claude sees what *should* exist and what’s actually running.
* **📝 Log Streaming** – Tail standard/out or error logs from any registered process without leaving the conversation.
* **🩺 Troubleshooting Prompt** – `diagnose-server` walks Claude through a PM2-first debugging workflow.
* **💾 Disk Persistence** – Registrations survive MCP restarts, so once a process is defined it’s available forever.
* **🔧 macOS & Linux Support** – Built for Unix environments where PM2 is available (Windows support coming later).

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

> **🔔 Note:** The MCP includes built-in instructions that Claude sees automatically. Project files reinforce "always manage servers through PM2" on a per-repo basis.

## 📖 Usage

### Day-to-day Flow

1. **Register every dev server once**

  Claude: `register-managed-process`

  ```json
  {
    "name": "next-app",
    "script": "npm",
    "args": ["run", "dev"],
    "cwd": "/Users/alexnewman/Projects/next-app",
    "env": { "PORT": "3000" }
  }
  ```

  This stores the config locally and (optionally) starts it immediately through PM2.

2. **Start / stop / restart on demand**

  - `start-managed-process` → boots the registered script via PM2
  - `stop-managed-process` → graceful shutdown
  - `restart-managed-process` → great for config reloads or code changes

3. **Inspect state at any time**

  - `get-managed-processes` shows both the registry and live PM2 info side-by-side.
  - `describe-managed-process` provides the raw PM2 describe output when you need low-level details.

4. **Update definitions safely**

  - Use `update-managed-process` to change script args, env vars, interpreter, or watch/autorestart flags.
  - Pass `"applyToPm2": true` to delete + re-register the PM2 process automatically.

5. **Clean up when projects end**

  - `delete-managed-process` removes entries from both the registry and PM2 (unless you opt to keep the PM2 process running).

6. **Tail logs directly in chat**

  - `read-managed-process-logs` supports `type: "all" | "out" | "error"` with configurable line counts.

7. **Need the big picture?**

  - `get-pm2-status` always remains available for ad-hoc PM2 inspection across all processes (registered or not).

> 💡 **Tip:** The `diagnose-server` prompt orchestrates these steps automatically when the user says “the server is broken.”

### Tool Reference

| Tool | What it does | Typical prompt |
|------|---------------|----------------|
| `get-managed-processes` | Lists registered configs + live PM2 snapshot | "What dev servers do we know about?" |
| `register-managed-process` | Adds a new process (and starts it) | "Register our Next.js dev server" |
| `update-managed-process` | Modifies stored config, optional redeploy | "Change the port to 4000" |
| `start-managed-process` | Starts via PM2 | "Boot the API" |
| `stop-managed-process` | Stops via PM2 | "Stop everything" |
| `restart-managed-process` | Restarts via PM2 | "Restart the queue worker" |
| `delete-managed-process` | Unregisters (and optionally deletes from PM2) | "Remove the legacy service" |
| `describe-managed-process` | Shows raw PM2 description | "Show me details for auth-service" |
| `read-managed-process-logs` | Tails stdout/stderr | "Show the latest errors" |
| `get-pm2-status` | On-demand PM2 overview | "What's PM2 running right now?" |

### Resource

`server-config` – quick read-only access to the project’s `package.json` metadata.

### Prompt

`diagnose-server` – structured PM2-first debugging checklist.

## 🏗️ How It Works

The MCP persists a registry file in your repo root: `.the-dev-server-state.json`.

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

On startup the MCP loads this file, hydrates the registry, and every modification (register/update/delete) writes back to disk with a fresh timestamp. PM2 commands are executed using the stored config so the MCP always knows how to recreate a process.

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

1. **Register Before Running** – Ensure every dev service has an entry in the registry so Claude can manage it.
2. **Let the MCP Start/Stop** – Resist `pm2` CLI muscle memory; trigger lifecycle actions through MCP tools so state stays consistent.
3. **Update Configs via MCP** – Use `update-managed-process` instead of editing `.the-dev-server-state.json` by hand.
4. **Lean on Diagnose Prompt** – When a server misbehaves, the prompt orchestrates status, restart, and log inspection automatically.
5. **Keep PM2 Clean** – Use `delete-managed-process` when cleaning house to avoid orphaned processes.

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [HOW-IT-WORKS.lock.md](./HOW-IT-WORKS.lock.md) | Comprehensive architecture, workflows, and examples |
| [CLAUDE.md.example](./CLAUDE.md.example) | Copy to projects for Claude instructions |
| [.clinerules.example](./.clinerules.example) | Copy to projects for CLI AI assistants |

## 🛣️ Roadmap

- [ ] Windows support (PowerShell PM2 parity)
- [ ] Multi-server orchestration (groups & dependency graphs)
- [ ] Docker/Compose target support in addition to PM2
- [ ] Health monitoring and automatic restart policies
- [ ] Remote environment support (SSH tunnels / containers)
- [ ] Rich history of restarts and log bookmarks

## 🤝 Contributing

Contributions are welcome! This is a utility MCP designed to solve a real pain point in Claude development workflows.

### Ideas for contributions:
- Windows support implementation
- First-class Docker/Compose runners
- Process grouping and aggregate commands
- Watch-mode dashboards for PM2 metrics
- Documentation & onboarding improvements

## 📄 License

MIT

---

## 🙏 Acknowledgments

Built with:
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) – Official TypeScript MCP SDK
- [zod](https://github.com/colinhacks/zod) – Schema validation

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
