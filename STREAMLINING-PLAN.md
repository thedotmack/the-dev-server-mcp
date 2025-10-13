# Streamlining Plan: Make MCP Seamless & Hide PM2

## Core Problems from Debug Log

1. **PM2 Pollution**: Every response mentions "via PM2", exposes `.pm2/logs` paths, shows PM2 process IDs
2. **Log Repetition**: Called logs 4 times, showing same 20-30 lines each time
3. **No Timestamps**: Can't tell when events happened
4. **Port Chaos**: Tried 3 times to start (ports 3000, 3001, 3002)

## Simple Solutions

### 1. Hide PM2 Completely

**Change all response messages:**
```
❌ "Registered process example-nextjs and started it via PM2."
✅ "Server 'example-nextjs' started"

❌ "Stopped process example-nextjs via PM2."
✅ "Server 'example-nextjs' stopped"
```

**Clean up status output:**
```json
❌ {
  "tracked": [...],
  "pm2": [{"name": "x", "pid": 123, ...}]
}

✅ {
  "servers": [
    {
      "name": "example-nextjs",
      "status": "running",
      "url": "http://localhost:3002",
      "uptime": "2m"
    }
  ]
}
```

**Strip PM2 from logs:**
```
❌ /Users/alexnewman/.pm2/logs/example-nextjs-out.log last 20 lines:
❌ 10|example | > next dev

✅ Recent logs:
✅ > next dev
```

### 2. Auto-Detect Port from Logs

Dev servers print their port:
- Next.js: `- Local: http://localhost:3002`
- Vite: `Local: http://localhost:5173`
- Express: `Server listening on http://localhost:8080`

**After starting:**
1. Wait 2 seconds for server to boot
2. Read logs
3. Parse `localhost:(\d+)`
4. Report: `"Server started on http://localhost:3002"`

**No port checking needed** - let the server pick, we just report it.

### 3. Incremental Logs with Timestamps

**Track what we've already read:**
```typescript
const logState = new Map<string, {lastRead: Date}>();

function getNewLogs(name: string) {
  const since = logState.get(name)?.lastRead || (Date.now() - 60000);
  const newLogs = readLogsSince(name, since);
  logState.set(name, {lastRead: Date.now()});
  return newLogs;
}
```

**Add timestamps to output:**
```
[2025-10-13 20:11:58] > next dev
[2025-10-13 20:12:01] ▲ Next.js 15.5.5
[2025-10-13 20:12:02] ✓ Ready in 999ms
```

**Strip PM2 prefixes** (`10|example |` → nothing)

## Playing the Tape: Before vs After

### BEFORE (from debug log)
```
get-managed-processes()
→ Shows: {"pm2": [...]} with all PM2 details

register-managed-process()
→ "Registered process example-nextjs and started it via PM2"

read-managed-process-logs()
→ /Users/.pm2/logs/example-nextjs-out.log last 30 lines:
→ 10|example | sh: next: command not found

stop-managed-process()
→ "Stopped process example-nextjs via PM2"

npm install

start-managed-process()
→ "Started process example-nextjs via PM2"

read-managed-process-logs()
→ Shows PM2 paths and prefixes
→ EADDRINUSE: port 3000

stop + update port to 3001 + start
→ "via PM2" × 3
read-logs → EADDRINUSE: port 3001

stop + update port to 3002 + start
→ "via PM2" × 3
read-logs → SUCCESS on port 3002
```

**Result**: 17+ tool calls, PM2 mentioned 10+ times, repeated log output

### AFTER (streamlined)
```
get-managed-processes()
→ {"servers": []}

register-managed-process()
→ "Server 'example-nextjs' registered"

start-managed-process()
→ Waits 2s, reads logs, detects port 3002
→ "Server started on http://localhost:3002"

get-logs()
→ Recent logs (incremental, timestamped):
→ [20:12:01] ▲ Next.js 15.5.5
→ [20:12:02] ✓ Ready in 999ms

User calls get-logs() again later:
→ Only shows NEW logs since last call
```

**Result**: 4 tool calls, PM2 mentioned 0 times, no repetition

## Implementation Checklist

### Phase 1: Strip PM2 (30 min)
- [ ] Find all response messages mentioning "via PM2" → remove it
- [ ] Change status JSON: `pm2` → `servers`, clean up fields
- [ ] Strip PM2 log path prefixes from output
- [ ] Remove `10|example |` style prefixes from log lines

### Phase 2: Port Detection (20 min)
- [ ] After `start-managed-process()`, wait 2s
- [ ] Read recent logs with `tail -100 | grep localhost:`
- [ ] Parse port with regex: `/localhost:(\d+)/`
- [ ] Return: `"Server started on http://localhost:{PORT}"`

### Phase 3: Incremental Logs (30 min)
- [ ] Add `Map<string, {lastRead: Date}>` to track log positions
- [ ] When reading logs, only get lines after `lastRead`
- [ ] Update `lastRead` after each call
- [ ] Add timestamp to each log line: `[HH:MM:SS] message`

### Phase 4: Clean Up Instructions (10 min)
- [ ] Update CLAUDE.md examples to not mention PM2
- [ ] Simplify registration examples
- [ ] Show clean status output in docs

## Expected Outcome

**Seamless**: LLM never knows PM2 exists
**Smart**: Detects actual port from server output
**Efficient**: Only shows new logs, not repeats
**Clear**: Timestamps show when events happened
**Simple**: "Server started", "Server stopped" - that's it
