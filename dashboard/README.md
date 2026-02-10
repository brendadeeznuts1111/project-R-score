# Dashboard Runtime Guide

This directory contains multiple dashboard surfaces. Use the correct target:

- Local MCP dashboard service (primary ops target): `/Users/nolarose/Projects/dashboard/dashboard-server.ts`
- Public docs site dashboard (deployment target): [https://docs.factory-wager.com](https://docs.factory-wager.com)
- Registry dashboard (business cards UI): `/Users/nolarose/Projects/dashboard/business-registry.ts`

## Local MCP Dashboard

Start command:

```bash
bun run start:dashboard:mcp
```

Primary local endpoints:

- `GET /api/dashboard`
- `GET /api/dashboard/debug`
- `GET /api/dashboard/runtime`
- `GET /api/health`

Default runtime environment contract:

- `DASHBOARD_PORT=3456`
- `DASHBOARD_HOST=localhost`
- `DASHBOARD_CACHE_TTL_MS=2000`
- `ALLOW_PORT_FALLBACK=false`

When `ALLOW_PORT_FALLBACK=true`, the server auto-increments to the next free port if bind fails.

## Preflight

Run before local ops changes:

```bash
bun run dashboard:preflight
```

Checks include:

- Bun minimum/recommended policy
- Port availability and owner for `DASHBOARD_PORT`
- Required dashboard files
- Route contract for `/api/dashboard`, `/api/health`, `/api/dashboard/runtime`

## Port Ownership Troubleshooting

Show the process listening on dashboard port:

```bash
lsof -nP -iTCP:3456 -sTCP:LISTEN
```

Show full process details:

```bash
ps -p <PID> -o pid,ppid,comm,args
```

Probe health and dashboard endpoints:

```bash
curl -sS http://localhost:3456/api/health | jq .
curl -sS http://localhost:3456/api/dashboard | jq '.metrics.system'
curl -sS http://localhost:3456/api/dashboard/runtime | jq .
```

## Status Monitor

Generate the project component status report from the curated 14-component matrix:

```bash
bun run dashboard:status:report
```

The report includes:
- overall health score
- stable vs beta component counts
- production readiness count
- average test coverage
- top performers and attention list

## Local Secret Handling

Keep real credentials only in untracked local files:

- `.env.local`
- `.env.secret.local`

Run local secret scan:

```bash
bun run security:secrets:local
```

This fails on high-confidence plaintext secrets found in tracked `.env` files.
