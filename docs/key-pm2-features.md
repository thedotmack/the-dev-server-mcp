# PM2 Features Analysis & Architectural Decisions

## Executive Summary

After deep-diving into PM2 documentation and playing through multiple implementation approaches, the current architecture is **correct and necessary**. PM2 does NOT automatically prevent duplicate processes or provide fresh-log-only reading. Our custom scripting addresses real gaps.

## Current Status ✅

1. **Autorestart Disabled** - Uses `--no-autorestart` to surface crashes (src/index.ts:376-383)
2. **Duplicate Prevention** - Custom `getPm2ProcessInfo()` checks before starting (src/index.ts:322-355)
3. **Fresh Log Tracking** - Byte offset system for reading post-restart logs only (src/index.ts:547-557)

**All fixes are built and ready - MCP needs restart in Claude Code to activate.**

---

## What PM2 Does Automatically

### ✅ Things We Don't Need to Script

1. **Process Lifecycle Management**
   - PM2 handles process monitoring, PID tracking, status reporting
   - We just call `pm2 start/stop/restart` and PM2 handles the rest

2. **Log Collection**
   - PM2 automatically captures stdout/stderr to `~/.pm2/logs/`
   - `pm2 logs` command streams them
   - `pm2 flush` clears them

3. **Crash Handling**
   - PM2 detects crashes and can auto-restart (we explicitly disable this)
   - PM2 tracks restart counts

4. **Resource Monitoring**
   - PM2 tracks CPU, memory usage per process
   - Available via `pm2 jlist` or programmatic API

### ❌ Things PM2 Does NOT Do (Why Our Code Exists)

1. **Prevent Duplicate Names**
   - PM2 happily creates multiple processes with same name
   - No built-in uniqueness constraint
   - **Our fix:** `getPm2ProcessInfo()` checks before starting

2. **Fresh Logs After Restart**
   - `pm2 logs` shows all accumulated logs
   - No "since last restart" filter
   - **Our fix:** Byte offset tracking in state file

3. **Disable Autorestart by Default**
   - PM2 enables autorestart by default
   - Hides crashes in development
   - **Our fix:** `--no-autorestart` flag unless explicitly enabled

---

## Approaches Considered & Analysis

### Approach 1: Add More Config Options ❌

**Idea:** Expose `max_memory_restart`, `merge_logs`, `log_date_format`, etc.

**Playing the tape:**
```
1. User registers dev server with max_memory_restart: "500M"
2. Dev server slowly leaks memory over 4 hours
3. Hits 500MB, PM2 auto-restarts it
4. Problem: This HIDES the memory leak instead of surfacing it
5. Conflicts with our philosophy: make problems visible
```

**Decision:** NO. Dev servers should crash loudly when broken. Memory limits hide problems.

### Approach 2: Switch to PM2 Programmatic API ❌

**Idea:** Replace shell commands with `pm2.connect()` + Node.js API

**Playing the tape:**
```
1. Install pm2 as dependency
2. Rewrite all runPm2() calls with pm2.list(), pm2.start(), etc.
3. Handle connection lifecycle (when to connect/disconnect?)
4. Major refactor, high bug risk
5. User sees... slightly faster execution?
6. Performance isn't a bottleneck currently
```

**Pros:**
- Faster (no shell spawning)
- Direct object access
- Better error handling

**Cons:**
- Major refactor risk
- Current approach works fine
- Not solving a real problem

**Decision:** FUTURE. Good idea, but not urgent. Shell commands work well for dev servers.

### Approach 3: Generate Ecosystem Files ❌

**Idea:** Create temp `ecosystem.config.js` files, use `pm2 startOrRestart`

**Playing the tape:**
```
1. User registers "example-nextjs"
2. Generate /tmp/pm2-example-nextjs.config.js
3. Run: pm2 startOrRestart /tmp/pm2-example-nextjs.config.js
4. PM2 uses file to start/restart
5. Delete temp file
6. Problems:
   - Where to store temp files? /tmp? Project root?
   - What if MCP crashes? Orphaned files everywhere
   - File I/O on every operation
   - startOrRestart requires config files, can't use dynamic args
```

**Pros:**
- Uses PM2's intended ecosystem workflow
- More "standard" PM2 usage

**Cons:**
- Temp file management is messy
- Doesn't solve duplicates better than our code
- Adds complexity without clear benefit

**Decision:** NO. Temp files create more problems than they solve.

### Approach 4: Document & Keep Current Architecture ✅

**Idea:** Current fixes are correct. Document why and what else is possible.

**Playing the tape:**
```
1. Duplicate prevention fix is done and working
2. Autorestart disabled correctly
3. Fresh log tracking works via byte offsets
4. Write comprehensive documentation explaining:
   - What PM2 handles automatically
   - What we must script ourselves (and why)
   - Future enhancement ideas if needed
5. Developer reads docs, understands architecture
6. Can make informed decisions about additions
7. Codebase stays simple and maintainable
```

**Decision:** ✅ YES. This is the right path.

---

## PM2 Features Available (For Reference)

### Commands We Could Use

| Command | Purpose | Our Usage |
|---------|---------|-----------|
| `pm2 start` | Start new process | ✅ Using |
| `pm2 stop` | Stop process | ✅ Using |
| `pm2 restart` | Restart process | ✅ Using |
| `pm2 delete` | Remove process | ✅ Using |
| `pm2 flush` | Clear logs | ✅ Using |
| `pm2 logs` | Stream logs | ✅ Using |
| `pm2 jlist` | JSON process list | ✅ Using |
| `pm2 describe` | Process details | ✅ Using |
| `pm2 startOrRestart` | Smart start | ❌ Requires ecosystem files |
| `pm2 startOrReload` | Graceful smart start | ❌ Requires ecosystem files |
| `pm2 reloadLogs` | Reopen log files | ⏸️ Could use after rotation |

### Config Options Available

| Option | Purpose | Dev Server Value? |
|--------|---------|-------------------|
| `autorestart` | Auto-restart on crash | ❌ We explicitly disable |
| `watch` | Restart on file changes | ⚠️ Useful but dangerous (infinite loops) |
| `instances` | Cluster mode count | ⚠️ Rarely needed for dev servers |
| `max_memory_restart` | Memory limit restart | ❌ Hides leaks |
| `merge_logs` | Combine error/out | ❌ Prefer separate for debugging |
| `log_date_format` | Custom timestamps | ❌ Not important for dev |
| `max_restarts` | Restart limit | ❌ We disable autorestart anyway |
| `min_uptime` | Stability threshold | ❌ We disable autorestart anyway |

---

## Programmatic API Example (For Future)

If we ever need better performance, here's how to use PM2's Node.js API:

```javascript
import pm2 from 'pm2';

// Connect to PM2 daemon
pm2.connect((err) => {
  if (err) throw err;

  // Start a process
  pm2.start({
    script: 'npm',
    args: ['run', 'dev'],
    name: 'example-nextjs',
    cwd: '/path/to/project',
    autorestart: false
  }, (err, apps) => {
    if (err) throw err;

    // List all processes
    pm2.list((err, list) => {
      console.log(list);
      pm2.disconnect();
    });
  });
});
```

**When this makes sense:**
- If we're managing 50+ dev servers (unlikely)
- If shell command overhead becomes measurable
- If we need real-time process events

---

## Future Enhancements (Only If Needed)

### High Value Additions

1. **`watch` Mode Toggle**
   - Let users enable file watching for auto-restart on changes
   - Useful for: Python/Ruby dev servers that don't auto-reload
   - Risk: Can cause infinite loops if server writes files on startup
   - Implementation: Already supported, just needs schema addition

2. **PM2 Log Rotation Integration**
   - Install: `pm2 install pm2-logrotate`
   - Auto-rotates logs by size/date
   - Useful if: Users run dev servers for days/weeks
   - Currently: Probably not needed

3. **Cluster Mode for Load Testing**
   - Let users test with multiple instances
   - Useful for: Load testing before production
   - Implementation: `instances` parameter already exists

### Low Value Additions

1. ~~`max_memory_restart`~~ - Hides problems
2. ~~`merge_logs`~~ - Harder to debug
3. ~~`log_date_format`~~ - Not important for dev
4. ~~Ecosystem file generation~~ - Adds complexity
5. ~~Programmatic API~~ - Over-engineering

---

## Conclusion

**Current architecture is correct.** We're scripting exactly what PM2 doesn't provide:
- Duplicate prevention
- Fresh log tracking
- Disabled autorestart by default

**No immediate changes needed.** The duplicate fix is ready after MCP restart.

**Future work:** Only add features if users explicitly need them. Don't over-engineer.
