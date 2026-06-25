# Sports Terminal OS v5.2

A comprehensive sports betting trading terminal with 93+ proxy endpoints, dual WebSocket/SSE, multi-layer analytics, partner profile management, and Telegram bot infrastructure.

## Table of Contents

- [Quick Start (Monorepo)](#quick-start-monorepo)
- [Quick Start (Standalone)](#quick-start-standalone)
- [Commands](#commands)
- [Single Point of Entry](#single-point-of-entry)
- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Frontend Pages](#frontend-pages)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Cron Jobs](#cron-jobs)
- [Partner Profile OS](#partner-profile-os)
- [Telegram Bot Workers](#telegram-bot-workers)
- [Deployment](#deployment)

---

## Quick Start (Monorepo)

This project is a workspace under the FactoryWager Enterprise monorepo. All commands are scoped via Bun's `--filter`:

```bash
# From repo root — install is already done (bun install picks up all workspaces)
bun run --filter sports-terminal-os dev           # Start dev server
bun run --filter sports-terminal-os test          # Run tests
bun run --filter sports-terminal-os typecheck     # TypeScript check
bun run --filter sports-terminal-os db:migrate    # Run SQLite migrations
bun run --filter sports-terminal-os db:seed       # Seed the database
bun run --filter sports-terminal-os frontend:dev  # Vite dev server for React UI
bun run --filter sports-terminal-os build         # Production build
bun run --filter sports-terminal-os start         # Production start
```

## Quick Start (Standalone)

```bash
cd projects/active/sports-terminal-os
cp .env.example .env          # Edit with your values
bun run db:migrate            # Run SQLite migrations
bun run db:seed               # Seed sample data
bun run dev                   # Start dev server (http://localhost:3000)
```

## Commands

| Command | Scope | Description |
|---------|-------|-------------|
| `dev` | `bun run --watch src/index.ts` | Dev server with hot reload |
| `start` | `bun run src/index.ts` | Production server |
| `build` | `tsc --noEmit && vite build` | Full production build |
| `test` | `bun test` | Run test suite |
| `typecheck` | `tsc --noEmit` | TypeScript validation |
| `db:migrate` | `bun run src/db/migrate.ts` | Apply migrations |
| `db:rollback` | `bun run src/db/migrate.ts --rollback` | Roll back last migration |
| `db:seed` | `bun run src/db/seed.ts` | Seed sample data |
| `db:reset` | migrate --reset + seed | Full DB reset |
| `frontend:dev` | `cd src/frontend && vite` | Vite dev server |
| `frontend:build` | `cd src/frontend && vite build` | Static frontend build |
| `generate-jwt-secret` | `bun run scripts/generate-jwt-secret.ts` | Generate JWT secret |

## Single Point of Entry

The package exports a **barrel** at `index.ts` so other workspace packages can import cleanly:

```typescript
// Import the server bootstrap
import { startServer, gracefulShutdown } from "sports-terminal-os";

// Import services
import { SportsbookService } from "sports-terminal-os/services";
import { RiskService } from "sports-terminal-os/services";
import { PlayerService } from "sports-terminal-os/services";

// Import types
import type { Wager, Player, Agent, RiskPosition, PartnerProfile, GateResult } from "sports-terminal-os/types";
```

The server binary is `src/index.ts` (invoked via `bun run dev` / `bun run start`). Importing the barrel does **not** auto-start the server — only `import "sports-terminal-os/server"` or calling `startServer()` does.

---

## System Overview

Sports Terminal OS is a full-featured trading platform built on Bun, React 19, and SQLite, integrating three domain layers into a unified system:

- **Core Terminal v5.2** — 93 proxy endpoints, 6-stage data pipeline, real-time odds, pattern detection, risk management
- **Partner Profile OS** — TOML-backed partner templates, lifecycle state machine, multi-layer signal routing (O(1) gates)
- **Telegram Bot Hub** — Redis Streams, multi-process bot workers, topic-per-agent routing

### Quick Stats

| Metric | Count |
|--------|-------|
| Total Source Files | 147 |
| Lines of Code | 58,824 |
| Backend Files | 125 |
| Frontend Pages | 21 |
| Database Migrations | 10 |
| Profile Templates | 3 |
| Proxy Endpoints | 93+ |
| WebSocket Message Types | 16 |
| SSE Streams | 5 |
| Cron Jobs | 8 |
| Risk Tiers | 4 |
| Customer Archetypes | 6 |
| Partner Lifecycle States | 9 |

## Architecture

### Technology Stack
- **Runtime**: Bun 1.0+ with `bun:sqlite`
- **Backend**: TypeScript, Bun.serve (single port: HTTP + WebSocket + SSE)
- **Frontend**: React 19 + Vite SPA
- **Queue**: Redis Streams (ioredis) for Telegram events
- **Upstream**: Buckeye (fantasy402.com:443)

### 6-Stage Data Pipeline
```
Ingest → Extract → Analyze → Enforce → Stream → Alert
```

### Zone Implementation Order (Dependency Chain)
```
Zone 4 (Backend Ops) → Zone 1 (Sportsbook) → Zone 8 (Webhooks) → Zone 2 (Patterns) → Zone 3 (Prediction Markets) → Player → Agent → Risk → Ops
```

### Partner Signal Cascade
```
Raw Signal → Book Index (O(1)) → Candidate Filter → Per-Partner Evaluation → GateResult → Exposure Recorded
```

## Project Structure

```
sports-terminal-os/
├── index.ts                       # Barrel export (single entry for workspace consumers)
├── src/
│   ├── index.ts                   # Bun.serve entry (HTTP + WS + SSE)
│   ├── api/                       # API routes (21 files)
│   │   ├── router.ts              # Main request router
│   │   ├── metrics.ts             # Prometheus /metrics
│   │   ├── health.ts              # Health/ready/live probes
│   │   ├── rate-limiter.ts        # Token bucket rate limiting
│   │   ├── action-queue.ts        # Priority queue processor
│   │   ├── idle-shutdown.ts       # Idle auto-shutdown
│   │   ├── sportsbook-routes.ts   # Zone 1: Sportsbook Grid
│   │   ├── pattern-routes.ts      # Zone 2: Patterns
│   │   ├── rules-routes.ts        # Zone 2: Rules Engine
│   │   ├── prediction-market-routes.ts # Zone 3: Prediction Markets
│   │   ├── webhook-routes.ts      # Zone 8: Webhooks
│   │   ├── alert-routes.ts        # Zone 8: Alerts
│   │   ├── player-routes.ts       # Player Domain
│   │   ├── agent-routes.ts        # Agent Domain
│   │   ├── risk-routes.ts         # Risk & Analytics
│   │   ├── partner-routes.ts      # Partner Profile OS (21 endpoints)
│   │   ├── telegram-routes.ts     # Telegram Hub
│   │   ├── export-routes.ts       # CSV/JSON/XLSX exports
│   │   ├── sandbox-routes.ts      # Sandbox A/B testing
│   │   └── ip-routes.ts           # IP surveillance
│   ├── services/                  # Business logic (18 files)
│   │   ├── sportsbook-service.ts
│   │   ├── pattern-service.ts
│   │   ├── rules-engine.ts
│   │   ├── prediction-market-service.ts
│   │   ├── arbitrage-detector.ts
│   │   ├── webhook-service.ts
│   │   ├── webhook-dispatcher.ts
│   │   ├── alert-service.ts
│   │   ├── player-service.ts
│   │   ├── agent-service.ts
│   │   ├── risk-service.ts
│   │   ├── ai-risk-service.ts
│   │   ├── export-service.ts
│   │   ├── sandbox-service.ts
│   │   ├── ip-surveillance-service.ts
│   │   ├── cron.ts
│   │   ├── metrics-collector.ts
│   │   └── websocket-handlers/    # 7 WS message processors
│   ├── zones/
│   │   └── partner-profile/       # Partner Profile OS (12 files)
│   │       ├── partner-profile-schema.ts
│   │       ├── partner-profile-loader.ts
│   │       ├── partner-profile-materializer.ts
│   │       ├── partner-gateway.ts # THE KERNEL — single evaluate() entry
│   │       ├── partner-profile-service.ts
│   │       ├── partner-source-router.ts
│   │       ├── cascade-engine-integration.ts
│   │       ├── telegram-integration.ts
│   │       ├── source-integration.ts
│   │       ├── settlement-integration.ts
│   │       ├── hot-reload.ts
│   │       └── index.ts
│   ├── telegram/                  # Telegram Bot Hub (5 files)
│   │   ├── queue-publisher.ts
│   │   ├── TelegramBotWorker.ts
│   │   ├── TopicManager.ts
│   │   ├── SendMessageClient.ts
│   │   └── run-bots.ts
│   ├── auth/                      # Authentication
│   │   ├── jwt.ts
│   │   ├── middleware.ts
│   │   └── session.ts
│   ├── db/                        # Database
│   │   ├── index.ts
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── middleware/
│   │   └── security.ts
│   ├── utils/
│   │   ├── types.ts
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   ├── tableLogger.ts
│   │   ├── validators.ts
│   │   └── env.ts
│   └── frontend/                  # React 19 SPA
│       ├── App.tsx
│       ├── main.tsx
│       ├── hooks/useWebSocket.ts
│       ├── components/            # 25 components
│       ├── pages/                 # 21 page components + index.ts
│       └── styles/global.css      # 2,485-line dark theme
├── profiles/                      # Partner TOML templates
│   ├── hybrid-sharp.toml
│   ├── retail.toml
│   └── offshore.toml
├── migrations/                    # 10 SQL migration files
├── workers/
│   └── TelegramBotWorker.ts
├── ecosystem.config.js            # PM2 config
├── design/                        # Architecture documents
│   ├── system-architecture.md
│   ├── api-contract.md
│   └── database-schema.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── MEMORY.md
└── README.md
```

## Frontend Pages

| Page | Route | Theme | Description |
|------|-------|-------|-------------|
| Dashboard | / | — | System overview |
| Sportsbook | /sportsbook | #1a2332 | Live odds grid |
| Prediction Markets | /prediction-markets | #2d4a2b | Multi-provider + arb |
| Patterns | /patterns | #f4a900 | Pattern history + rules |
| Customers | /customers | #d4a5a5 | Player 360 search |
| Risk Command Center | /risk | #4a6fa5 | Risk dashboard |
| Live Ticker | /live | — | Real-time wager feed |
| Agents | /agents | #e76f51 | Hierarchy + downline |
| Partners | /partners | — | Partner profiles |
| Command Center | /command | #0066ff | Alerts + webhooks |
| Telegram | /telegram | #2b1e3e | Bot hub |
| Operations | /operations | #2b1e3e | Exports + sandbox |
| AI Playground | /playground | — | Kimi AI chat |
| API Reference | /api-reference | — | 93 endpoints docs |

## API Endpoints

93 proxy endpoints + 30 system endpoints. See `design/api-contract.md` for the complete specification.

## Database

54 SQLite tables across 10 migration files. See `design/database-schema.md` for the complete schema.

## Cron Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| */2 * * * * | Queue Processor | Pending actions |
| */5 * * * * | Wager Refresh | Fetch new wagers |
| */10 * * * * | Feature Extraction | classifyArchetype() |
| */15 * * * * | Player Refresh + IP Surveillance | Fetch players + flag IPs |
| 0 * * * * | Position Expiry + Sandbox Janitor | Expire positions, cleanup |
| 0 3 * * * | Alert Cleanup | Purge old alerts |

## Partner Profile OS

### Signal Cascade
```typescript
import { partnerProfileService, processSignal } from "./src/zones/partner-profile";
await partnerProfileService.loadFromTemplates("./profiles");
const result = processSignal({
  signalId: "steam-123", partnerId: "PARTNER_001",
  bookId: "PINNACLE", type: "steam", suggestedStake: 10000,
  tier: "T1", eventId: "E1", market: "spread", sport: "NBA",
  confidence: 0.95, urgencyMs: 5000
});
// result.action = "allow" | "block" | "adjust" | "defer"
```

### GateResult Actions
| Action | Meaning | When |
|--------|---------|------|
| allow | Signal passes all checks | All guards pass |
| block | Signal rejected | Blacklisted book, KYC fail, etc. |
| adjust | Stake reduced | Over exposure limits |
| defer | Decision postponed | Missing data, async check |

### Lifecycle States
```
signup → materialized → active → cultivating → graduated
                              ↓
                        frozen / suspended / terminated
```

## Telegram Bot Workers

```bash
# Development: single bot
STREAMS=risk_alerts BOT_ID=risk_bot BOT_TOKEN=xxx bun run workers/TelegramBotWorker.ts

# Production: all bots
pm2 start ecosystem.config.js
```

### Redis Streams
| Stream | Events | Producer |
|--------|--------|----------|
| risk_alerts | risk_alert, risk_cleared | RiskScoringService |
| payment_events | deposit_request, withdrawal | PaymentService |
| agent_events | performance_update | AgentService |
| system_events | topic_refresh, heartbeat | Admin API |

## Deployment

### PM2
```bash
pm2 start ecosystem.config.js
```

### Systemd
```bash
systemctl start st-bot@risk_bot st-bot@payment_bot st-bot@agent_bot
```

## License

Proprietary — Sports Terminal v5.2
