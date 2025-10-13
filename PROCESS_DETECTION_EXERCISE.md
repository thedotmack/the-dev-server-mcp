# Development Server Detection Exercise

## Objective
Document a repeatable strategy for the MCP server to
1. Detect whether a development process for the current project is known and running.
2. Start the process when it is missing.
3. Restart the process with a log flush when required.
4. Surface only the fresh logs that follow the restart.

## Baseline Reference
The existing implementation persists server configurations in `.the-dev-server-state.json`, issues PM2 commands to reconcile actual process state, and attempts to extract URLs from recent logs directly after a start. Restarts flush logs before issuing `pm2 restart`, but the subsequent log retrieval still relies on raw PM2 output.

## Hypothesis 1 – Hybrid State and Live Sync
- **Detect:** Load persisted configurations, then overlay the results of `pm2 jlist` to determine live status; missing live entries are treated as stopped.
- **Start:** If no entry exists, auto-register using the project defaults (script, cwd, env) and start immediately.
- **Restart & Flush:** Execute `pm2 flush <name>` followed by `pm2 restart <name>`.
- **Fresh Logs:** Wait briefly, fetch `pm2 logs <name> --lines N --nostream`, and discard 
  lines with timestamps older than the recorded restart time.

## Hypothesis 2 – PM2-First Discovery
- **Detect:** Ignore local state and derive candidate processes by listing PM2 entries that match the project working directory or naming conventions.
- **Start:** When the scan returns nothing, register and start a process using `npm run dev` (or another inferred script) on the fly.
- **Restart & Flush:** Call `pm2 restart <name> --update-env`, then `pm2 flush <name>` to clear old buffers.
- **Fresh Logs:** Stream `pm2 logs <name> --lines N --nostream` immediately afterward; because the flush ran post-restart, the output reflects only new lines.

## Hypothesis 3 – Project Descriptor File
- **Detect:** Require each project to check in a `project.mcp.json` descriptor; hash together `cwd`, script, and interpreter to identify the registered process.
- **Start:** If the descriptor exists but no PM2 process is running, register from the descriptor and start.`
- **Restart & Flush:** Replace restart with a `stop → flush → start` sequence to ensure a clean boot and emptied log buffer.
- **Fresh Logs:** Tail the log file path recorded in the descriptor, allowing the MCP to read logs straight from PM2’s filesystem output after the start finishes.

## Hypothesis 4 – Runtime Health Probe
- **Detect:** In addition to PM2 metadata, perform a lightweight health probe (HTTP request or TCP ping) based on the expected port; treat probe failure as a dead process even if PM2 reports `online`.
- **Start:** If both PM2 and the probe fail, register and start a new process, capturing the port from env or logs.
- **Restart & Flush:** Flush logs, restart, and store the restart timestamp alongside the probe configuration.
- **Fresh Logs:** Fetch logs and filter to entries whose computed timestamp exceeds the stored restart timestamp; re-run the probe afterward to confirm availability.

## Hypothesis 5 – Session Supervisor Layer
- **Detect:** Maintain a transient in-memory registry for the active MCP session keyed by `cwd`; on each call, reconcile this registry with PM2’s view to determine definitive status.
- **Start:** When the registry lacks a process, synthesize the configuration using heuristics (package scripts, framework detection) and issue `pm2 start`.
- **Restart & Flush:** Perform `pm2 restart <name>` and capture PM2’s numeric log sequence or file offset before issuing `pm2 flush`.
- **Fresh Logs:** After restart, read logs until the previously recorded offset, then start tailing only lines beyond that boundary to ensure the transcript reflects new output alone.

## Next Actions
1. Select one hypothesis to prototype in a branch and validate against multiple example projects.
2. Define consistent metrics (startup latency, log freshness accuracy, recovery from crashes) to compare the approaches.
3. Document the chosen flow within the MCP instructions so downstream agents follow the same lifecycle.
