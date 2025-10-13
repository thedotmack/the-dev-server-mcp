# URL Detection

The MCP uses **[linkifyjs](https://linkify.js.org/)** - a dedicated library for finding URLs in text.

## Why linkifyjs?

✅ **Built for extraction**: Designed specifically for finding links in plain text
✅ **Fast & accurate**: Highly optimized for performance
✅ **Handles variations**: Auto-detects URLs with/without protocols, subdomains, various TLDs
✅ **No regex complexity**: Production-tested library instead of fragile regex patterns
✅ **Easy to use**: Simple API for finding all URLs in text

## What It Captures

✅ **Any valid URL in logs:**
```
http://localhost:3000
http://127.0.0.1:8080
https://0.0.0.0:443
http://192.168.1.100:5173
https://example.com:8443
http://localhost:3000/api
www.example.com (adds http://)
example.com:3000
```

✅ **From any context:**
```
Local: http://localhost:5173
Server listening on http://127.0.0.1:3000
Running at https://0.0.0.0:8080
➜ http://localhost:3000/
Visit https://example.com for more info
```

✅ **Port-only fallback:**
```
Listening on port 3000  → http://localhost:3000
Server started on Port: 8080  → http://localhost:8080
```

## Real-World Examples

### Next.js
```
   ▲ Next.js 15.5.5
   - Local:        http://localhost:3002
   - Network:      http://192.168.1.35:3002

Result: "Server started on http://localhost:3002"
(Prioritizes localhost over network IP)
```

### Vite
```
  VITE v6.0.1  ready in 543 ms
  ➜  Local:   http://localhost:5173/

Result: "Server started on http://localhost:5173"
```

### Express
```
Server listening on http://127.0.0.1:3000

Result: "Server started on http://127.0.0.1:3000"
```

### Django
```
Starting development server at http://127.0.0.1:8000/

Result: "Server started on http://127.0.0.1:8000"
```

### Rails
```
* Listening on http://0.0.0.0:3000

Result: "Server started on http://0.0.0.0:3000"
```

### Flask
```
 * Running on http://127.0.0.1:5000

Result: "Server started on http://127.0.0.1:5000"
```

### Port-Only
```
Server started successfully
Listening on port 8080

Result: "Server started on http://localhost:8080"
```

## Implementation

```typescript
import * as linkify from 'linkifyjs';

// Wait for server to boot
await new Promise(resolve => setTimeout(resolve, 2000));

const logs = await runPm2(`pm2 logs ${name} --lines 100 --nostream`);

// Use linkifyjs to find all URLs
const links = linkify.find(logs, 'url');

// Prioritize local URLs (localhost, 127.0.0.1, 0.0.0.0)
const localUrl = links.find(link =>
  link.href.includes('localhost') ||
  link.href.includes('127.0.0.1') ||
  link.href.includes('0.0.0.0')
);

const foundUrl = localUrl || links[0];

if (foundUrl) {
  let url = foundUrl.href.replace(/\/+$/, '');
  urlInfo = ` on ${url}`;
} else {
  // Fallback: port-only detection
  const portMatch = logs.match(/(?:port|Port|PORT)[\s:]+(\d{4,5})/);
  if (portMatch) {
    urlInfo = ` on http://localhost:${portMatch[1]}`;
  }
}
```

## Advantages

✅ **Production-tested**: Used by thousands of projects
✅ **Robust**: Handles edge cases better than regex
✅ **Maintainable**: No complex regex to debug
✅ **Universal**: Works with any framework's log format
✅ **Smart prioritization**: Prefers localhost URLs over network IPs
✅ **Graceful fallback**: Port-only detection if no URL found
✅ **Future-proof**: Library maintainers handle URL spec changes
