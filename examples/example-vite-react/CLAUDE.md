# CRITICAL: Dev Server Management

🚨 **MANDATORY: Read this BEFORE any dev server operations** 🚨

## THE RULE

**ALWAYS use the-dev-server MCP to manage this dev server. NEVER run `npm run dev`, `npm run build`, or any process management commands directly.**

## Before ANY Action

**START EVERY CONVERSATION WITH:**
```
get-managed-processes()
```

This shows registered servers and their status. If this server isn't registered, you MUST register it first.

## Required Workflow

### 1. First Time Setup
```
register-managed-process({
  name: "example-vite-react",
  script: "npm",
  args: ["run", "dev"],
  cwd: "/absolute/path/to/examples/example-vite-react",
  env: { "PORT": "5173" }
})
```

### 2. Start Server
```
start-managed-process({ name: "example-vite-react" })
```

### 3. Stop Server
```
stop-managed-process({ name: "example-vite-react" })
```

### 4. Restart After Changes
```
restart-managed-process({ name: "example-vite-react" })
```

### 5. Build for Production
```
update-managed-process({
  name: "example-vite-react",
  args: ["run", "build"],
  applyToPm2: true
})
```
Then start it to run the build.

### 6. Check Logs
```
read-managed-process-logs({ name: "example-vite-react", type: "error" })
```

## NEVER DO

❌ `npm run dev`
❌ `npm run build`
❌ `npm run preview`
❌ Assume the server is running
❌ Skip checking status first

## ALWAYS DO

✅ Check `get-managed-processes()` FIRST
✅ Register before starting
✅ Use MCP tools for ALL lifecycle operations
✅ Confirm with `get-managed-processes()` after changes

This MCP is the ONLY way to manage this dev server. No exceptions.
