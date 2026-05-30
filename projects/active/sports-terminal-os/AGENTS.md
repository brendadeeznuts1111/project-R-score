# Sports Terminal OS — Agent Guide

## Project Architecture

```
src/
├── api/            Route handlers (93 proxy endpoints)
├── auth/           JWT, API key, session middleware
├── db/             SQLite connection, migrations, seed data
├── services/       Business logic, cron jobs, data feeds
│   ├── cron.ts          All scheduled jobs (11 entries)
│   ├── sportsbook-service.ts  Odds CRUD, line movements, CLV, steam detection
│   ├── ewma-tracker.ts        Exponential decay exposure tracking
│   └── buckeye-feed.ts        Buckeye proxy wager polling
├── zones/          Domain-specific modules
│   └── partner-profile/  Cascade engine, partner gateways, TOML profiles
├── frontend/       React 19 + Vite SPA (21 pages)
├── telegram/       Redis Streams bot workers
├── feeds/          Data source connectors (one file per external API)
│   └── pinnacle.ts        Pinnacle API odds fetcher
├── utils/          Shared types, environment config, logging
└── index.ts        Bun.serve entry point (single port: HTTP + WS + SSE)
```

## Adding a New Data Feed

Every feed follows the same 3-function pattern. See `docs/feeds-blueprint.txt` for the template.

### Checklist (6 steps)

1. **Copy the blueprint** — `docs/feeds-blueprint.txt` → `src/feeds/<source>.ts`
2. **fetch*()** — GET/POST to the external API with auth headers
3. **map*()** — Transform API JSON → internal type (pure function, no side effects)
4. **refresh()** — Orchestrator: fetch → map → feed into shared infrastructure
5. **Register in cron.ts** — Add `Bun.cron(...)` entry gated on `BUCKEYE_LIVE_MODE`
6. **Add env vars** — API keys go in `src/utils/env.ts`

### Rules

- One file per data source. Never mix two APIs in one feed file.
- Never put analytics (CLV, steam, arbitrage) in feed files. Analytics live in the shared service.
- Never call `broadcastToSSE()`/`broadcastToWebSockets()` from a feed file. Broadcast from cron handler or shared service.
- Gate everything behind `BUCKEYE_LIVE_MODE` + API key presence. Default OFF.
- Never crash. All errors caught, logged, returned in `result.errors[]`.

### Shared Infrastructure (feed into these, don't duplicate)

| Service | Import | What it does |
|---------|--------|-------------|
| `sportsbook-service.ts` | `updateBookOdds()`, `getBestLines()`, `calculateCLV()`, `detectSteamMoves()` | Odds storage + analytics |
| `cascade-engine-integration.ts` | `processSignal()`, `processSignalRoute()` | Partner gate routing |
| `ewma-tracker.ts` | Auto-wired per partner via `PartnerGateway` | Exponential decay exposure |
| `cron.ts` | `registerCronJobs()` | Bun.cron registry |

## Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Bun.serve single port | HTTP + WebSocket + SSE on one process |
| 2 | bun:sqlite, no ORM | Direct SQL for performance, no query builder overhead |
| 3 | TOML partner profiles | Declarative config, Zod-validated at boot |
| 4 | `BUCKEYE_LIVE_MODE=false` default | Every data pipe defaults OFF — safety first |
| 5 | `PartnerGateway.evaluate()` as kernel | Single O(1) entry point for all cascade logic |
| 6 | EWMA lambda=0 default | Backward compatible — static caps unless explicitly enabled |

## Build Commands

```bash
bun run dev              # Start dev server
bun run typecheck        # tsc --noEmit (must pass clean before every commit)
bun run test             # Run test suite
bun run db:migrate       # Apply migrations
bun run db:seed          # Seed initial data
```

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `BUCKEYE_LIVE_MODE` | Enable live data pipes | For production |
| `PINNACLE_API_KEY` | Pinnacle Sports API key | For odds feed |
| `INTERNAL_API_TOKEN` | Auth for Shadow Agent endpoints | For cookie refresh |
| `PROXY_INTERNAL_URL` | Buckeye proxy URL | For wager feed |
| `TELEGRAM_BOT_TOKEN` | Bot token for alerts | Optional |

## Pattern Blueprints

| Blueprint | Purpose |
|-----------|---------|
| `docs/feeds-blueprint.txt` | Feed file template (fetch → map → refresh) |
| `docs/cron-blueprint.txt` | Cron job template |
| `docs/route-blueprint.txt` | API route template |
| `docs/ws-blueprint.txt` | WebSocket handler template |

## Design Documents

- `design/system-architecture.md` — Full system design
- `design/database-schema.md` — All 34+ tables
- `design/api-contract.md` — All 93 endpoints
- `plan.md` — Original build plan
- `MEMORY.md` — Session memory + zone status
