---
name: dev
description: Start and manage development server. Use when starting the dev server, running the registry locally, checking server status, or restarting after code changes.
---

# Development Server

Start and manage the MCP registry development server.

## Usage

```text
/dev               - Start dev server (port 3333)
/dev --port 4000   - Start on custom port
/dev status        - Check if server is running
/dev stop          - Stop running server
/dev restart       - Restart the server
/dev logs          - View recent server logs
```

## Default Configuration

| Setting | Value | Environment Variable |
|---------|-------|---------------------|
| Port | 3333 | `MCP_PORT` |
| Mode | development | `NODE_ENV` |
| Exchange | enabled | `EXCHANGE_ENABLED` |
| Mock Mode | true (dev) | `EXCHANGE_MOCK_MODE` |

## Examples

```bash
# Start development server
bun run dev

# Start on custom port
MCP_PORT=4000 bun run dev

# Start with exchange disabled
EXCHANGE_ENABLED=false bun run dev

# Start with production-like settings
NODE_ENV=production EXCHANGE_MOCK_MODE=false bun run dev
```

## Health Check

```bash
# Verify server is running
curl http://localhost:3333/mcp/health
```

## Related Skills

- `/test` - Run test suites
- `/bench` - Performance benchmarks
- `/exchange` - Exchange operations
