# HOW-IT-WORKS.lock.md
## The-Dev-Server MCP - The Definitive Truth Guide

**Last Updated:** October 12, 2025  
**Version:** 0.1.0  
**Status:** ✅ OPERATIONAL & PRODUCTION-READY

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

**the-dev-server MCP** is a Model Context Protocol server that acts as a **single source of truth** for development server state. It provides:

1. **State Tracking**: Persistent memory of server configuration and status
2. **Auto-Detection**: Automatic discovery of running development servers
3. **Status Queries**: Quick access to current server state
4. **Log Access**: Direct access to server logs
5. **Process Management Awareness**: Integration with terminal, PM2, and background processes

## 🏗️ ARCHITECTURE

### Core Components

```
the-dev-server MCP
├── Tools (Actions)
│   ├── get-server-state       → Returns current tracked state
│   ├── update-server-state    → Updates tracked state with new info
│   ├── detect-server-process  → Auto-detects running servers
│   ├── check-port-status      → Checks if a port is in use
│   ├── read-server-logs       → Reads server log files
│   └── get-pm2-status         → Gets PM2 process status
├── Resources (Data)
│   └── server-config          → Provides package.json and config
└── Prompts (Templates)
    └── diagnose-server        → Structured diagnostic prompt
```

### State Model

The server maintains a persistent state object:

```typescript
interface DevServerState {
  port?: number;                // e.g., 3000
  address?: string;             // e.g., http://localhost:3000
  processType?: 'terminal' | 'pm2' | 'background' | 'unknown';
  pid?: number;                 // Process ID
  serverTech?: string;          // e.g., "Express", "Next.js", "Vite"
  buildCommand?: string;        // e.g., "npm run build"
  startCommand?: string;        // e.g., "npm start"
  logPath?: string;             // e.g., "/path/to/server.log"
  status: 'running' | 'stopped' | 'unknown';
  lastChecked?: Date;           // When state was last updated
  projectPath?: string;         // Full project directory path (e.g., "/Users/.../my-project")
  projectName?: string;         // Project folder name (e.g., "my-project")
}
```

## 🔄 HOW IT WORKS IN PRACTICE

### Scenario 1: First Time Setup

1. **User starts server**: `npm run dev` in terminal
2. **Claude asks**: "Is the server running?"
3. **Claude uses MCP**: Calls `detect-server-process`
4. **MCP discovers**: Server on port 3000, PID 12345, running in terminal
5. **MCP updates state**: Stores all this information
6. **Claude remembers**: Can now reference this state in all future questions

### Scenario 2: Checking Status Later

1. **User**: "What's the dev server status?"
2. **Claude calls**: `get-server-state` tool
3. **MCP returns**: Full state including port, status, project location, last checked time
4. **Claude responds**: "Your Next.js server is running on http://localhost:3000 (PID 12345) in a terminal process from project 'eagle-qa-monitoring' at /Users/.../eagle-qa-monitoring. Last checked 5 minutes ago."

### Scenario 3: Debugging Issues

1. **User**: "Server not responding"
2. **Claude uses**: `diagnose-server` prompt
3. **MCP guides**: Check process → check port → read logs → check PM2
4. **Claude investigates**: Uses all tools to build complete picture
5. **Claude reports**: "Server process is running but port 3000 shows a different PID. Logs show error: EADDRINUSE."

### Scenario 4: PM2 Integration

1. **User**: "Check PM2 status"
2. **Claude calls**: `get-pm2-status`
3. **MCP queries**: PM2 for process list
4. **Claude reports**: "3 PM2 processes running: api-server (online), worker (online), scheduler (errored)"

## 🎓 USAGE INSTRUCTIONS FOR CLAUDE

### When to Use This MCP

**ALWAYS use the-dev-server MCP when:**
- User asks about "the server"
- User mentions ports or URLs
- User asks to start/stop/check a server
- User reports server issues
- User asks "is it running?"
- You need to know the server state
- You're confused about what server is running

### Workflow Pattern

```
1. FIRST TIME SEEING PROJECT
   → Call detect-server-process()
   → Call get-server-state() to see what we know
   → Update user on findings

2. USER ASKS ABOUT SERVER
   → Call get-server-state() to check current knowledge
   → If uncertain, call detect-server-process()
   → Provide specific answer with details

3. USER REPORTS ISSUE
   → Use diagnose-server prompt
   → Follow structured diagnostic process
   → Call read-server-logs() if needed

4. USER CHANGES SERVER CONFIG
   → Call update-server-state() with new information
   → Confirm update to user
```

### Example MCP Calls

**Get current state:**
```json
{
  "tool": "get-server-state",
  "arguments": {}
}
```

**Update state when user tells you something:**
```json
{
  "tool": "update-server-state",
  "arguments": {
    "port": 3000,
    "address": "http://localhost:3000",
    "processType": "terminal",
    "serverTech": "Next.js",
    "buildCommand": "npm run build",
    "startCommand": "npm run dev",
    "status": "running",
    "projectPath": "/Users/alexnewman/Scripts/my-project",
    "projectName": "my-project"
  }
}
```

**Auto-detect running servers:**
```json
{
  "tool": "detect-server-process",
  "arguments": {
    "workingDirectory": "/path/to/project"
  }
}
```

**Check specific port:**
```json
{
  "tool": "check-port-status",
  "arguments": {
    "port": 3000
  }
}
```

**Read logs:**
```json
{
  "tool": "read-server-logs",
  "arguments": {
    "logPath": "/path/to/logs/server.log",
    "lines": 50
  }
}
```

## 🔒 GUARANTEES & CONSTRAINTS

### What This MCP Guarantees

✅ **Persistent memory** of server state across conversations  
✅ **Auto-detection** of common dev servers on ports 3000-9000  
✅ **Real-time process checking** using system commands  
✅ **Log file access** for debugging  
✅ **PM2 integration** for production-like setups  

### What This MCP Does NOT Do

❌ Does not automatically start/stop servers (only tracks them)  
❌ Does not modify code or configuration files  
❌ Does not restart crashed servers  
❌ Does not manage multiple projects simultaneously  
❌ Does not work on Windows (uses Unix commands like `lsof`, `ps`)  

### Platform Compatibility

- ✅ **macOS**: Fully supported
- ✅ **Linux**: Fully supported
- ❌ **Windows**: Not supported (uses Unix-specific commands)

## 🛠️ TECHNICAL DETAILS

### Tools Overview

| Tool | Purpose | Key Use Case |
|------|---------|--------------|
| `get-server-state` | Retrieve current tracked state | "What's the server status?" |
| `update-server-state` | Manually update state | User says "I started it on port 4000" |
| `detect-server-process` | Auto-find running servers | "Find any dev servers running" |
| `check-port-status` | Check if port is occupied | "Is port 3000 free?" |
| `read-server-logs` | Access log files | "Show me the recent errors" |
| `get-pm2-status` | Query PM2 processes | "What's running in PM2?" |

### Detection Strategy

The MCP scans common dev server ports:
- 3000, 3001 (React, Next.js default)
- 4200 (Angular default)
- 5000, 5173 (Vite, general dev servers)
- 8080, 8000 (Common alternatives)
- 9000 (Various frameworks)

For each port, it:
1. Uses `lsof -i :PORT` to check if port is in use
2. Gets the PID of the process using that port
3. Uses `ps -p PID` to get the full command
4. Uses `lsof -p PID | grep cwd` to get the project directory
5. Extracts the project name from the directory path
6. Determines process type (terminal/PM2/background)
7. Auto-updates internal state with all discovered information

### State Persistence

State is held in memory during the MCP server session. This means:
- State persists across multiple Claude queries in the same session
- State is lost when the MCP server restarts
- Best practice: Update state when user provides new information

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
> "We are using the-dev-server MCP for tracking all development server state. ALWAYS use this MCP when dealing with server questions. Call get-server-state or detect-server-process at the start of server-related conversations."

> **💡 Note:** The MCP includes built-in embedded instructions that Claude sees automatically. Project files are optional but recommended for consistency.

## 🎯 SUCCESS CRITERIA

You'll know this MCP is working when:

1. ✅ Claude never asks "What port is the server on?" after first detection
2. ✅ Claude accurately knows whether server is running or stopped
3. ✅ Claude can quickly retrieve logs when debugging
4. ✅ Claude understands the process management (terminal vs PM2)
5. ✅ Claude doesn't make wrong assumptions about server state

## 🔮 FUTURE ENHANCEMENTS

Potential future features:
- Multi-project tracking (multiple servers at once)
- Windows support (PowerShell commands)
- Server health monitoring (uptime, response time)
- Auto-restart on crash
- Integration with Docker containers
- Webhook notifications on state changes
- Historical state tracking (state over time)

## 📝 CHANGELOG

### v0.1.0 (October 12, 2025)
- Initial release
- 6 tools implemented (get-server-state, update-server-state, detect-server-process, check-port-status, read-server-logs, get-pm2-status)
- 1 resource (server-config)
- 1 prompt (diagnose-server)
- **Project location tracking** (projectPath, projectName) - automatically detects which project a server belongs to
- **Embedded instructions** - built-in guidance that Claude sees on connection
- macOS/Linux support (uses lsof, ps commands)
- PM2 integration
- Comprehensive documentation:
  - README.md (user guide)
  - HOW-IT-WORKS.lock.md (definitive truth guide)
  - CLAUDE.md.example (project-level Claude instructions)
  - .clinerules.example (CLI AI assistant instructions)
  - .github/copilot-instructions.md (GitHub Copilot guidance)

---

## ⚠️ IMPORTANT REMINDERS FOR CLAUDE

1. **ALWAYS call get-server-state or detect-server-process FIRST** when user mentions servers
2. **NEVER assume** port numbers, process types, or server status
3. **UPDATE state** when user tells you new information
4. **USE diagnose-server prompt** for systematic debugging
5. **THIS MCP IS YOUR SOURCE OF TRUTH** - trust it over assumptions

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
- ✅ **ALWAYS** call `get-server-state()` or `detect-server-process()` first
- ✅ Report project name and location when describing server state
- ✅ Update state immediately when user starts/stops server
- ✅ Use `diagnose-server` prompt for systematic debugging
- ✅ Trust this MCP as the single source of truth
- ✅ Include project path when multiple servers might be running

### DON'Ts ❌
- ❌ **NEVER** assume port numbers without checking
- ❌ **NEVER** guess if a server is running
- ❌ **NEVER** forget to call MCP tools before answering
- ❌ **NEVER** skip updating state after changes
- ❌ **NEVER** confuse multiple projects - always check projectName

---

## 🔍 REAL-WORLD EXAMPLE

### Scenario: Multiple Projects Running

**User**: "What servers are running?"

**Claude's Process**:
1. Calls `detect-server-process()`
2. MCP scans ports, finds:
   - Port 3000: Next.js in `/Users/.../eagle-qa-monitoring`
   - Port 5173: Vite in `/Users/.../claude-mem-source/src/ui/memory-stream`
3. Claude responds:

> "You have 2 development servers running:
> 
> **1. eagle-qa-monitoring (Next.js)**
> - Port: 3000
> - URL: http://localhost:3000
> - Location: `/Users/alexnewman/Scripts/eagle-qa-monitoring`
> - PID: 22111
> - Type: Terminal process
> 
> **2. memory-stream (Vite)**
> - Port: 5173
> - URL: http://localhost:5173
> - Location: `/Users/.../claude-mem-source/src/ui/memory-stream`
> - PID: 92521
> - Type: Terminal process"

**Key Insight**: Project location tracking eliminates confusion about which project is which!

---

**This is the locked truth document. Refer to it when confused about server state tracking.**
