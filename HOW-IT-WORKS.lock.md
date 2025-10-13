# HOW-IT-WORKS.lock.md
## The-Dev-Server MCP - The Definitive Truth Guide

**Last Updated:** October 13, 2025  
**Version:** 0.1.0  
**Status:** ✅ OPERATIONAL & PRODUCTION-READY (PM2 manager refresh)

---

## 🎯 THE PROBLEM THIS SOLVES

Claude (and other LLMs) constantly get confused about development server state. They forget:
- What port the server is running on
- Whether the server is running in a terminal, PM2, or background process
- Where to find logs
- How to build the project
- What the actual server URL is
- Whether the server is actually running or stopped

This leads to endless confusion, repeated questions, and incorrect assumptions that waste time.

## 🔧 THE SOLUTION

**the-dev-server MCP** is a Model Context Protocol server that acts as a **single source of truth** for PM2-managed development processes. It now provides:

1. **Managed Registry** – Declare each dev service (script, args, cwd, env) once.
2. **Lifecycle Control** – Start, stop, restart, and delete PM2 processes without leaving the conversation.
3. **Config Drift Prevention** – Apply updates to stored configs and sync PM2 immediately.
4. **Unified Status** – Merge persisted registrations with live PM2 metadata.
5. **Integrated Logs** – Tail stdout/err directly for any registered process.

## 🏗️ ARCHITECTURE

### Core Components

```
the-dev-server MCP
├── Tools (Actions)
│   ├── get-managed-processes   → Registry + live PM2 snapshot
│   ├── register-managed-process→ Persist config (optionally start)
│   ├── update-managed-process  → Mutate config (+ optional redeploy)
│   ├── start-managed-process   → Start via PM2 using stored config
│   ├── stop-managed-process    → PM2 stop
│   ├── restart-managed-process → PM2 restart
│   ├── delete-managed-process  → Remove registry (and PM2)
│   ├── describe-managed-process→ Raw PM2 describe output
│   ├── read-managed-process-logs → Tail stdout/err
│   └── get-pm2-status          → Global PM2 overview
├── Resources (Data)
│   └── server-config           → Provides package.json metadata
└── Prompts (Templates)
  └── diagnose-server         → PM2-centric troubleshooting prompt
```

### State Model

The server persists a registry file `.the-dev-server-state.json` that mirrors:

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

## 🔄 HOW IT WORKS IN PRACTICE

### Scenario 1: First Time Registration

1. **User**: "Register the Next.js dev server."
2. **Claude** calls `register-managed-process` with script, args, cwd, env.
3. **MCP** persists config to `.the-dev-server-state.json` and starts PM2 using those parameters.
4. **User**: "Done." From now on `start-managed-process` boots it instantly.

### Scenario 2: Routine Development

1. **User**: "Start the API and UI services."
2. Claude runs `start-managed-process` twice using stored configs.
3. `get-managed-processes` confirms both are online and shows PM2 PIDs + CPU/Memory.

### Scenario 3: Config Change

1. **User**: "Move the UI to port 4000."
2. Claude calls `update-managed-process` with `env.PORT = 4000` and `applyToPm2: true`.
3. MCP deletes the existing PM2 process, restarts with new env, and updates the registry timestamp.

### Scenario 4: Debugging

1. **User**: "The queue worker is stuck."
2. Claude launches the `diagnose-server` prompt → instructs it to `get-managed-processes`, `restart-managed-process`, then `read-managed-process-logs`.
3. Response includes the restart result and the last 50 log lines, surfacing failure details.

## 🎓 USAGE INSTRUCTIONS FOR CLAUDE

### When to Use This MCP

**ALWAYS use the-dev-server MCP when:**
- Registering or modifying dev service definitions
- Starting, stopping, or restarting anything managed by PM2
- Inspecting logs or statuses for registered services
- Running the scripted troubleshooting flow
- Cleaning up retired services

### Workflow Pattern

```
1. NEW PROJECT
  → register-managed-process() for each dev server
  → get-managed-processes() to confirm registration

2. DAILY WORKFLOW
  → start-managed-process() / stop-managed-process()
  → restart-managed-process() after code changes

3. CONFIG UPDATES
  → update-managed-process({ ...config, applyToPm2: true })

4. INCIDENT RESPONSE
  → Use diagnose-server prompt
  → Tail logs via read-managed-process-logs()

5. DECOMMISSION SERVICES
  → delete-managed-process({ name, deleteFromPm2: true })
```

### Example MCP Calls

**Register a process:**
```json
{
  "tool": "register-managed-process",
  "arguments": {
    "name": "next-app",
    "script": "npm",
    "args": ["run", "dev"],
    "cwd": "/Users/alexnewman/Projects/next-app",
    "env": { "PORT": "3000" }
  }
}
```

**Start a registered process:**
```json
{
  "tool": "start-managed-process",
  "arguments": { "name": "next-app" }
}
```

**Apply a config change:**
```json
{
  "tool": "update-managed-process",
  "arguments": {
    "name": "next-app",
    "env": { "PORT": "4000" },
    "applyToPm2": true
  }
}
```

**Tail error logs:**
```json
{
  "tool": "read-managed-process-logs",
  "arguments": {
    "name": "next-app",
    "type": "error",
    "lines": 100
  }
}
```

## 🔒 GUARANTEES & CONSTRAINTS

### What This MCP Guarantees

✅ **Persistent registry** of managed processes across MCP restarts  
✅ **Deterministic PM2 operations** driven off stored config  
✅ **Consistent lifecycle commands** (`start/stop/restart/delete`)  
✅ **Log tailing** without manual file lookup  
✅ **Global PM2 status** via MCP  

### What This MCP Does NOT Do

❌ Does not auto-detect unmanaged processes anymore (must be registered)  
❌ Does not modify application code or env files  
❌ Does not provide health probes beyond PM2 status  
❌ Does not yet manage multiple hosts or remote PM2 targets  
❌ Does not work on Windows (relies on Unix + PM2)  

### Platform Compatibility

- ✅ **macOS**: Fully supported
- ✅ **Linux**: Fully supported
- ❌ **Windows**: Not supported (uses Unix-specific commands)

## 🛠️ TECHNICAL DETAILS

### Tools Overview

| Tool | Purpose | Key Use Case |
|------|---------|--------------|
| `get-managed-processes` | Registry + live PM2 status | "What dev services exist and which are running?" |
| `register-managed-process` | Persist new config; optional start | "Add the UI dev server" |
| `update-managed-process` | Change config; optional redeploy | "Switch the API to port 8080" |
| `start-managed-process` | Start via PM2 | "Boot the worker" |
| `stop-managed-process` | Stop via PM2 | "Pause the worker" |
| `restart-managed-process` | Restart via PM2 | "Reload the API" |
| `delete-managed-process` | Remove from registry (and PM2) | "Retire the legacy service" |
| `describe-managed-process` | Raw PM2 describe output | "Show me PM2 metadata" |
| `read-managed-process-logs` | Tail logs | "Show the last errors" |
| `get-pm2-status` | Global PM2 snapshot | "List everything PM2 is running" |

### PM2 Execution Strategy

- Uses `pm2 start` with stored script/interpreter/args/env to launch processes.
- Wraps `pm2 stop`, `pm2 restart`, and `pm2 delete` for lifecycle control.
- Reads process metadata using `pm2 jlist` and `pm2 describe` for status views.
- Tails logs via `pm2 logs <name> --nostream` with dynamic line counts and stream selection.

### State Persistence

State is persisted on disk (`.the-dev-server-state.json`) and mirrored in memory:
- Survives MCP restarts and machine reboots.
- Updated atomically after every registry mutation.
- Timestamp (`lastSynced`) reflects the last successful write.
- Manual edits are discouraged—use MCP tools to guarantee schema fidelity.

## 📋 INTEGRATION GUIDE

### Adding to Claude Desktop Config

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "the-dev-server": {
      "command": "node",
      "args": ["/Users/alexnewman/Scripts/the-dev-server-mcp/build/index.js"]
    }
  }
}
```

### Telling Claude to Use It

The MCP includes **embedded instructions** that Claude sees automatically when connecting. Additionally, you can add project-specific instructions:

**Option 1: Copy CLAUDE.md.example to your project**
```bash
cp /path/to/the-dev-server-mcp/CLAUDE.md.example /your/project/CLAUDE.md
```

**Option 2: Copy .clinerules.example for CLI AI assistants**
```bash
cp /path/to/the-dev-server-mcp/.clinerules.example /your/project/.clinerules
```

**Option 3: Tell Claude directly in conversation:**
> "We use the-dev-server MCP to register and manage every dev server through PM2. ALWAYS use its tools (register/start/stop/restart) instead of running PM2 manually."

> **💡 Note:** The MCP includes built-in embedded instructions that Claude sees automatically. Project files are optional but recommended for consistency.

## 🎯 SUCCESS CRITERIA

You'll know this MCP is working when:

1. ✅ Every active dev service is registered and visible via `get-managed-processes`
2. ✅ Claude starts/stops/restarts services solely through MCP tools
3. ✅ PM2 never has orphaned or mystery processes
4. ✅ Log tailing and diagnostics happen without shell pivots
5. ✅ Config changes are applied through MCP updates, not hand-edited files

## 🔮 FUTURE ENHANCEMENTS

Potential future features:
- Process grouping and batch commands
- Windows + WSL support
- Docker/Podman integration alongside PM2
- Health probes and alerting
- Remote PM2 target support (SSH/containers)
- Web dashboards and WebSocket streaming metrics
- Historical restart and log snapshot tracking

## 📝 CHANGELOG

### v0.1.0 (October 13, 2025 refresh)
- Major redesign: MCP now manages PM2 directly (register/start/stop/restart/delete).
- Added persistent registry file `.the-dev-server-state.json`.
- Introduced new toolset (get/register/update/start/stop/restart/delete/describe/read logs).
- Updated diagnose prompt to PM2-first workflow.
- Removed legacy port-scanning and manual state mutation tools.
- Documentation suite refreshed to reflect PM2 orchestration model.

---

## ⚠️ IMPORTANT REMINDERS FOR CLAUDE

1. **ALWAYS rely on registry data** – register processes before managing them.
2. **NEVER shell out to PM2 manually** while MCP is in use.
3. **UPDATE configs through the MCP** to keep disk + PM2 aligned.
4. **USE diagnose-server prompt** for issues; it follows the PM2-first flow automatically.
5. **TRUST this MCP** – it owns the lifecycle; let it be the control plane.

---

## 📚 DOCUMENTATION SUITE

This project includes comprehensive documentation:

| Document | Purpose | Audience |
|----------|---------|----------|
| **README.md** | Quick start, features, installation | End users |
| **HOW-IT-WORKS.lock.md** (this file) | Complete architecture & truth guide | Developers & Claude |
| **CLAUDE.md.example** | Copy to projects for Claude | Claude users |
| **.clinerules.example** | Copy to projects for CLI AIs | Cline/Cursor users |
| **.github/copilot-instructions.md** | Code generation patterns | GitHub Copilot |

### How to Use Documentation

1. **First time user?** → Read README.md
2. **Want to understand how it works?** → Read this file (HOW-IT-WORKS.lock.md)
3. **Using in a project?** → Copy CLAUDE.md.example or .clinerules.example to your project
4. **Using Copilot?** → Reference .github/copilot-instructions.md

---

## 🎓 BEST PRACTICES FOR CLAUDE

### DO's ✅
- ✅ Register every process before attempting to start it
- ✅ Use lifecycle tools (`start/stop/restart/delete`) instead of shell commands
- ✅ Update configs via MCP to avoid drift
- ✅ Tail logs and diagnose through MCP tools
- ✅ Reference `get-managed-processes` when reporting status

### DON'Ts ❌
- ❌ Never guess what PM2 is doing—query it via MCP
- ❌ Never edit `.the-dev-server-state.json` by hand
- ❌ Never bypass the MCP to run `pm2 start/stop/...` manually
- ❌ Never leave orphaned processes—delete them via MCP
- ❌ Never assume logs or env without checking registry

---

## 🔍 REAL-WORLD EXAMPLE

### Scenario: Multi-Service Workspace

**User**: "Spin up the API and UI services, then show me their logs."

**Claude's Process**:
1. Calls `start-managed-process` for `api-service` and `ui-app`.
2. Uses `get-managed-processes` to confirm both are `online` with PM2-provided PIDs and memory usage.
3. Calls `read-managed-process-logs` for each with `type: "out"` to stream launch logs.

**Claude responds** with a consolidated status + the most recent log lines, all without shelling out.

---

**This is the locked truth document. Refer to it when confused about server state tracking.**
