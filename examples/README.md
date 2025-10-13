# Example Applications

This directory contains example applications that showcase the-dev-server MCP in action.

## Available Examples

### 1. Next.js App (`example-nextjs`)
- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS
- Documentation page

### 2. Vite React App (`example-vite-react`)
- Vite for fast development
- React 19 with React Router
- TypeScript
- Tailwind CSS
- Documentation page

## Testing Instructions

### Quick Start

1. **Install dependencies:**
   ```bash
   cd example-nextjs  # or example-vite-react
   npm install
   ```

2. **Set your MCP-compatible AI assistant's project root to the example folder**

3. **Use this prompt:**
   ```
   Make the site 'pretty in pink' and make sure it builds and runs
   ```

### What to Expect

The AI assistant should:
1. Read the CLAUDE.md file with strict MCP instructions
2. Check server status with `get-managed-processes()`
3. Register the server if needed
4. Modify styles to be "pretty in pink"
5. Use the MCP to build and run (NOT direct npm commands)
6. Confirm everything works

### Key Points

- ✅ Each example has a **strict CLAUDE.md** that enforces MCP usage
- ✅ The AI should **NEVER** run `npm run dev` or `npm run build` directly
- ✅ All server operations go through the-dev-server MCP tools
- ✅ The instructions are **front and center** so the AI remembers them

## Structure

Each example includes:
- `CLAUDE.md` - Strict, mandatory MCP usage instructions
- `README.md` - Basic setup information
- `package.json` - Dependencies and scripts
- Complete working application with docs page

## Purpose

These examples demonstrate that when properly configured with clear CLAUDE.md instructions, AI assistants will consistently use the MCP for all dev server operations, eliminating confusion and ensuring proper process management.
