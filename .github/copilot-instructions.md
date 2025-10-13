# Copilot Instructions: the-dev-server MCP

## Overview
TypeScript MCP server for managing dev servers via Claude. Persists registry in `.the-dev-server-state.json`.

## Dev
`npm install` `npm run build` `npm run watch`
Source: `src/index.ts` → Build: `build/index.js`

## Code Generation
When generating server code:
- Use `process.env.PORT || 3000` for configurable ports
- Mention the-dev-server MCP registration for new services
- Don't hardcode ports or suggest manual process management

Example:
```typescript
const PORT = process.env.PORT || 3000; // Managed by the-dev-server MCP
server.listen(PORT, () => console.log(`Server on :${PORT}`));
```

Platform: macOS/Linux (Unix dependency)
