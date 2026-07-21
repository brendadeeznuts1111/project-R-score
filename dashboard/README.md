# Dashboard Runtime Guide

Surfaces in this directory:

| Surface | Entry |
|---------|--------|
| MCP HTTP dashboard | `bun dashboard/dashboard-server.ts` |
| MCP CLI status | `bun run dashboard` → `dashboard/mcp-overview.ts status` |
| Registry UI | `bun dashboard/business-registry.ts` |
| Protocol check | `bun run dashboard:protocol:check` |
| Live demo | `bun run dashboard:live` |

## Local MCP Dashboard

```bash
bun dashboard/dashboard-server.ts
```

Primary local endpoints:

- `GET /api/dashboard`
- `GET /api/dashboard/debug`
- `GET /api/dashboard/runtime`
- `GET /api/health`

Default env:

- `DASHBOARD_PORT=3456`
- `DASHBOARD_HOST=localhost`
- `DASHBOARD_CACHE_TTL_MS=2000`
- `ALLOW_PORT_FALLBACK=false`

When `ALLOW_PORT_FALLBACK=true`, the server auto-increments if bind fails.

## Preflight

```bash
bun scripts/dashboard-preflight.ts
```

Checks Bun policy, port ownership for `DASHBOARD_PORT`, required files, and route contract for `/api/dashboard`, `/api/health`, `/api/dashboard/runtime`.

## Port ownership

```bash
lsof -nP -iTCP:3456 -sTCP:LISTEN
ps -p <PID> -o pid,ppid,comm,args
curl -sS http://localhost:3456/api/health
curl -sS http://localhost:3456/api/dashboard
curl -sS http://localhost:3456/api/dashboard/runtime
```

## Status

```bash
bun run dashboard                 # MCP overview status
bun run dashboard:protocol:check  # protocol contract
bun dashboard/status-monitor.ts   # component matrix (when needed)
```

## Registry dashboard

```bash
bun dashboard/business-registry.ts
```

See also [`README-REGISTRY.md`](./README-REGISTRY.md).
