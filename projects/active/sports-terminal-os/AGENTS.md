# Sports Terminal OS — agent entrypoint

Project R root policy remains authoritative. This file adds the product-local
boundaries required for safe changes; [`README.md`](README.md) owns architecture
and product overview.

## Runtime and proof

Use the scripts declared in `package.json` from this directory:

```bash
bun run typecheck
bun run test
bun run build:verify
```

Use `bun test <path>` or `bun run test:watch` during focused development.
Database commands (`db:migrate`, `db:rollback`, `db:seed`, `db:reset`) mutate
local state; confirm the intended database before running them.

## Product boundaries

- `src/index.ts` owns the HTTP/WebSocket/SSE process. Domain behavior belongs
  in `src/services/` or `src/zones/`, not route handlers.
- A data-source connector owns fetch and mapping only. Feed analytics and
  broadcasting stay in shared services or cron orchestration.
- New feeds must remain disabled without their explicit live-mode setting and
  credential. Return structured errors instead of crashing the process.
- Do not broadcast directly from feed files or introduce a second analytics,
  canonical-team, or odds-drift implementation.
- Parse and validate external data before it enters domain services. Keep API
  keys, JWT secrets, and bot tokens in environment owners, never in examples.
- Preserve per-connection backpressure, authorization, and topic checks when
  changing WebSocket behavior.

## Task routes

- Feed template: [`docs/feeds-blueprint.txt`](docs/feeds-blueprint.txt)
- Cron template: [`docs/cron-blueprint.txt`](docs/cron-blueprint.txt)
- Route template: [`docs/route-blueprint.txt`](docs/route-blueprint.txt)
- WebSocket template: [`docs/ws-blueprint.txt`](docs/ws-blueprint.txt)
- Script and dependency authority: [`package.json`](package.json)

Frontend code intentionally uses the product's Vite scripts. Do not replace a
declared product toolchain with a generic Bun-only rule.
