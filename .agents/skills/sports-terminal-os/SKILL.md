---
name: sports-terminal-os
description: Sports Terminal OS v5.2 — sports betting trading terminal with 93 proxy endpoints, WebSocket/SSE, Partner Profile OS, Telegram hub. Bun-native monorepo workspace at projects/active/sports-terminal-os/.
---

# Sports Terminal OS v5.2

Full-stack sports betting terminal — Bun.serve backend, React 19 + Vite frontend, SQLite database, Redis-backed Telegram bot workers. This is a **workspace** under the FactoryWager Enterprise monorepo.

## Workspace location

```
projects/active/sports-terminal-os/
```

## When to use this skill

- Working on sportsbook odds, pattern detection, prediction markets, risk analytics, player/agent domains
- Operating or extending Partner Profile OS (TOML templates, lifecycle state machine, signal cascade)
- Debugging Telegram bot workers (Redis Streams, XREADGROUP consumer groups)
- Adding API routes, WebSocket handlers, cron jobs, or frontend pages
- Running migrations, seeding data, or validating the database schema

## Entry points

| Entry | File | Purpose |
|-------|------|---------|
| **Barrel** | `index.ts` | Re-exports `startServer`, all services, types, utils for workspace consumers |
| **Server binary** | `src/index.ts` | Bun.serve bootstrap — HTTP + WebSocket + SSE on a single port |
| **API router** | `src/api/router.ts` | Central request dispatcher — all 93 proxy + 30 system endpoints |
| **PartnerGateway** | `src/zones/partner-profile/partner-gateway.ts` | Kernel — `evaluate(signal)` for all partner zones |
| **Telegram hub** | `src/telegram/run-bots.ts` | Multi-bot launcher for Redis Streams workers |

## Architecture

```
Bun.serve (single port)
├── HTTP API → src/api/router.ts → 21 route files
├── WebSocket → src/services/websocket-handlers/ (7 WS types)
├── SSE → live-wagers stream
├── Static files → src/frontend/ (production build)
└── Cron jobs → 8 scheduled jobs (src/services/cron.ts)
```

### Zone dependency chain
```
Zone 4 (Backend Ops) → Zone 1 (Sportsbook) → Zone 8 (Webhooks) → Zone 2 (Patterns) → Zone 3 (Prediction Markets) → Player → Agent → Risk → Ops
```

## Key modules

### Services (`src/services/`)
- `sportsbook-service.ts` — Book health, best lines, line movements
- `pattern-service.ts` — 6 pattern detectors
- `rules-engine.ts` — AND/OR rule evaluation, simulation, backtesting
- `prediction-market-service.ts` — Multi-provider aggregator (4 providers)
- `arbitrage-detector.ts` — Cross-provider arb detection
- `risk-service.ts` — Risk positions, exposure, enforcement
- `player-service.ts` — Player 360, search, transactions, flags
- `agent-service.ts` — Agent hierarchy, downline, performance, billing
- `webhook-dispatcher.ts` — Reliable dispatch + retry + circuit breaker
- `export-service.ts` — CSV/JSON/XLSX export engine
- `sandbox-service.ts` — A/B testing, simulation
- `ip-surveillance-service.ts` — IP tracking, denylist
- `ai-risk-service.ts` — Kimi AI risk analysis integration

### Partner Profile OS (`src/zones/partner-profile/`)
- `partner-profile-schema.ts` — Zod schemas for partner TOML
- `partner-profile-loader.ts` — TOML → structured data
- `partner-profile-materializer.ts` — Resolve from multiple data sources
- `partner-gateway.ts` — **The kernel**: `evaluate(signal)` → `GateResult`
- `partner-profile-service.ts` — High-level CRUD + lifecycle transitions
- `partner-source-router.ts` — Data source selection (local/s3/api/cache)
- `cascade-engine-integration.ts` — Cascade Mover v3 wire-up
- `telegram-integration.ts` — Telegram topic routing per partner
- `settlement-integration.ts` — Settlement calculations
- `hot-reload.ts` — File watcher for TOML template changes

### Database (`src/db/`)
- `index.ts` — SQLite singleton (`bun:sqlite`)
- `migrate.ts` — Migration runner (10 migrations)
- `seed.ts` — Sample data seeding

### Auth (`src/auth/`)
- `jwt.ts` — jose-based JWT (HS256)
- `middleware.ts` — Auth middleware (4 modes: JWT, API Key, Session, Dev Bypass)
- `session.ts` — Buckeye session management

## Commands

All commands run from workspace root via `--filter`:

```bash
bun run --filter sports-terminal-os dev           # Dev server (watch mode)
bun run --filter sports-terminal-os start         # Production server
bun run --filter sports-terminal-os test          # Run tests
bun run --filter sports-terminal-os typecheck     # TypeScript check
bun run --filter sports-terminal-os db:migrate    # Apply migrations
bun run --filter sports-terminal-os db:seed       # Seed database
bun run --filter sports-terminal-os frontend:dev  # Vite dev server
bun run --filter sports-terminal-os build         # Full production build
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `jose` ^5.2.0 | JWT creation/verification |
| `zod` ^3.23.0 | Runtime validation |
| `prom-client` ^15.1.0 | Prometheus metrics |
| `ioredis` ^5.3.2 | Redis client (Telegram workers) |
| `react` ^19 | Frontend UI |
| `react-router-dom` ^7 | Frontend routing |
| `vite` ^5.2 | Frontend build tool |

## Environment

Copy `.env.example` to `.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | HS256 signing secret |
| `REDIS_URL` | No | — | Redis for Telegram |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token |
| `IDLE_TIMEOUT_MS` | No | 300000 | Auto-shutdown delay |
| `DEV_BYPASS_JWT` | No | false | Skip JWT in dev |

## Design docs

| Document | Path |
|----------|------|
| System architecture | `design/system-architecture.md` |
| API contract (93 endpoints) | `design/api-contract.md` |
| Database schema (54 tables) | `design/database-schema.md` |
| Build plan | `plan.md` |
| Session memory | `MEMORY.md` |

## Agent tooling

| Tool | Use when |
|------|----------|
| `ast_grep_outline` / `ast_grep_search` | Explore `src/` before broad reads |
| `ast_grep_network` | Validate dist frontend routes + ground-truth |
| `ast_grep_workflow` | Continuous semver/network scan on `dist/frontend` |
| `/precommit` | Before committing sports-terminal changes |

```bash
cd .agents/skills/ast-grep && bun run supply-chain:network:validate
bun run skill-loop:matrix -- --phases doctor,rate --only sports-terminal
```

Shared reference: [agent-tooling.md](../references/agent-tooling.md)
