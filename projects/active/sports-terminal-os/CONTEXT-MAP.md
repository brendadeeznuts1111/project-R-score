# Sports Terminal OS — Context Map

Single entry point for agents and developers. Start here.

## What This Is

A sports betting trading terminal. Bun.serve backend (single port: HTTP + WebSocket + SSE), bun:sqlite (no ORM), React 19 + Vite frontend, Redis Streams Telegram bots, TOML partner profiles with Zod validation, EWMA adaptive exposure cascade engine.

73K lines, 170+ files, 10 cron jobs, 65+ API routes, 7 WebSocket channels, 14 database migrations, 21 frontend pages, 3 partner profile templates, 3 data feeds, 2 fuzzy matchers, 1 pipeline monitor.

## Quick Start

```bash
bun install
bun run dev              # http://localhost:3000
bun run typecheck        # tsc --noEmit (0 errors)
bun run db:migrate       # Create tables
bun run db:seed          # Seed initial data
bun run test             # Test suite
```

## Navigation Index

### For Agents (AI coding assistants)

| File | Purpose | Read when |
|------|---------|-----------|
| **`CONTEXT-MAP.md`** | This file — master index | First, always |
| **`AGENTS.md`** | Architecture, feed pattern, design decisions, env vars, build commands | Understanding the system |
| **`MEMORY.md`** | Session state, zone status, decisions log, file inventory | Picking up from last session |
| **`plan.md`** | Original build plan | Understanding project history |
| **`docs/feeds-blueprint.txt`** | Template for adding a data source | Adding a new API connector |
| **`docs/cron-blueprint.txt`** | Template for adding a cron job | Adding scheduled work |
| **`docs/route-blueprint.txt`** | Template for adding an API endpoint | Adding an endpoint |
| **`docs/ws-blueprint.txt`** | Template for adding a WebSocket handler | Adding real-time channels |
| **`docs/adr/0003-fuzzy-team-matching.md`** | ADR: Fuzzy matching decision record | Understanding algorithm choices |
| `.reasonix/skills/add-feed.md` | Skill: how to add a data feed | Invoked via `/add-feed` |

### For Humans (developers)

| File | Purpose |
|------|---------|
| **`README.md`** | Project overview |
| **`design/system-architecture.md`** | Full system design (9K lines) |
| **`design/database-schema.md`** | All 34+ tables |
| **`design/api-contract.md`** | All 93 endpoints |
| **`openapi.json`** | OpenAPI spec |
| **`package.json`** | Dependencies, scripts |
| **`.env.example`** | Environment variable template |

## System Architecture (30-second tour)

```
src/
├── api/              93 route handlers       ← HTTP endpoints
│   ├── router.ts          Route registry       ← add routes here
│   └── internal-routes.ts Shadow Agent ingest  ← cookie push endpoint
├── auth/             JWT, API key, session    ← authentication
│   ├── middleware.ts      Auth pipeline        ← session validation (wired)
│   ├── session.ts         Buckeye sessions     ← cf_clearance storage
│   └── jwt.ts             Token sign/verify
├── feeds/            Data source connectors   ← ONE FILE per external API
│   ├── buckeye-players.ts  Player roster feed
│   └── pinnacle.ts         Pinnacle odds feed
├── services/         Business logic           ← shared infrastructure
│   ├── cron.ts            All 10 cron jobs     ← register new jobs here
│   ├── sportsbook-service.ts Odds + CLV + steam
│   ├── buckeye-feed.ts    Buckeye wager polling
│   ├── pipeline-health-monitor.ts  Pipeline metrics + alerts
│   ├── ewma-tracker.ts    Exponential decay exposure
│   ├── player-service.ts  Archetype classification
│   └── websocket-handlers/ 7 WS channels
├── zones/            Domain-specific modules
│   └── partner-profile/  Cascade engine       ← THE KERNEL
│       ├── partner-gateway.ts  evaluate() — O(1) signal gate
│       ├── partner-profile-schema.ts  Zod schemas + TOML
│       ├── cascade-engine-integration.ts  processSignal()
│       └── partner-profile-service.ts  In-memory gateway map
├── frontend/         React 19 + Vite SPA      ← 21 pages
│   ├── hooks/useWebSocket.ts  Unified WS manager
│   └── pages/            21 page components
├── telegram/         Redis Streams bots       ← 3 bot workers
├── db/               SQLite + migrations      ← bun:sqlite, no ORM
├── utils/            Types, env, logging, fuzzy  ← shared across all zones
│   ├── fuzzy-matcher.ts    Token-aware JW + Dice + Metaphone
│   └── odds-phrase-matcher.ts  Odds label + source name matching
└── index.ts          Bun.serve entry point    ← single port
```

## Key Design Decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | Bun.serve, single port | HTTP + WebSocket + SSE, one process |
| 2 | bun:sqlite, no ORM | Direct SQL — no query builder overhead |
| 3 | TOML partner profiles | Declarative, Zod-validated at boot |
| 4 | `BUCKEYE_LIVE_MODE=false` | Every data pipe defaults OFF |
| 5 | `PartnerGateway.evaluate()` | Single O(1) kernel for cascade logic |
| 6 | EWMA lambda=0 default | Static caps unless explicitly enabled |
| 7 | One file per data source | Never mix two APIs in one feed file |
| 8 | Analytics in services, not feeds | CLV/steam/arb live in sportsbook-service.ts |
| 9 | Dynamic imports in cron handlers | Avoids circular deps between cron ↔ feeds |
| 10 | ALL errors caught, never crash | Every handler wrapped in try/catch |

## Data Flow (complete pipeline)

```
Shadow Agent          Buckeye Feed          Odds Feed           Cascade Mover
(15 min cron)         (5 min cron)          (2 min cron)        (per signal)
     │                     │                     │                    │
     ├─ WebView extract    │                     │  Pinnacle API      │
     │  cf_clearance       │                     │                    │
     ├─ POST /internal/    │                     ├─ updateBookOdds()  │
     │  update-cookies ────┤                     │  → line_movements  │
     │                     │                     │  → CLV, steam      │
     │                     ├─ GET /proxy/wagers  │                    │
     │                     │  (uses fresh cookie)│                    │
     │                     ├─ mapToSignal()      │                    │
     │                     ├─ processSignalRoute─┤                    │
     │                     │                     │                    ├─ evaluate()
     │                     │                     │                    │  steps 1-8
     │                     │                     │                    │  step 9: EWMA
     │                     │                     │                    │  step 10: allow
     │                     │                     │                    ├─ recordExposure()
     │                     │                     │                    │  → ewma.record()
     │                     │                     │                    │
     │                     ├─ broadcastToSSE ────┼────────────────────┤
     │                     │  "wagerTick"        │                    │
     │                     │                     │                    │
     ▼                     ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LiveTicker (frontend SSE)                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `BUCKEYE_LIVE_MODE` | Enable all live data pipes | `false` |
| `PINNACLE_API_KEY` | Pinnacle Sports API key | — |
| `INTERNAL_API_TOKEN` | Auth for Shadow Agent + internal endpoints | — |
| `PROXY_INTERNAL_URL` | Buckeye proxy URL | `http://localhost:3001` |
| `PROXY_API_KEY` | Buckeye proxy API key | — |
| `TELEGRAM_BOT_TOKEN` | Bot token for alerts | — |
| `ENABLE_ANALYTICS` | Feature extraction cron | `false` |
| `HEALTH_WAGER_MAX_AGE_MIN` | Max wager feed age before alert | `15` |
| `HEALTH_ODDS_MAX_AGE_MIN` | Max odds feed age before alert | `10` |
| `HEALTH_MAX_COOKIE_AGE_MIN` | Min cookie TTL before alert | `30` |
| `ENABLE_RISK_ENGINE` | Risk position expiry | `false` |
| `ENABLE_SANDBOX` | Sandbox scenarios | `true` |

## Skills

| Skill | How to invoke | What it does |
|-------|--------------|-------------|
| `add-feed` | `/add-feed` or `run_skill("add-feed")` | Step-by-step guide for adding a new API data source |

## Patterns (The 8-Step Build Pattern)

Every feature built in this session followed the same loop:

1. **Ground-truth** — grep the codebase, read the stub, never trust memory
2. **Find the seam** — the TODO, the stub, the write-once field, the hard-coded constant
3. **Build the pipe** — `fetch()` → `map()` → feed into existing infrastructure
4. **Gate behind env** — default OFF, never activate without opt-in
5. **Graceful degradation** — API down? Log and skip. Key missing? Log and skip.
6. **Wire into cron** — `Bun.cron()` in `cron.ts`, same handler pattern
7. **Type-check gate** — `bun run typecheck` after every step, zero tolerance
8. **Ship the summary** — table of files touched, activation command, diagram

## Zone Status

| Zone | Status | Key files |
|------|--------|-----------|
| Zone 1 Sportsbook | Done | `sportsbook-service.ts`, `sportsbook-routes.ts`, `SportsbookGrid.tsx` |
| Zone 2 Patterns | Done | `pattern-service.ts`, `pattern-routes.ts`, `PatternHistory.tsx` |
| Zone 3 Prediction Markets | Done | `prediction-market-service.ts`, `prediction-market-routes.ts` |
| Zone 4 Risk/Backend Ops | Done | `risk-service.ts`, `risk-routes.ts`, `cron.ts`, `auth/` |
| Zone 8 Webhook Alerts | Done | `webhook-service.ts`, `webhook-dispatcher.ts` |
| Zone 9 Market Intelligence | Done | `pinnacle.ts`, `buckeye-feed.ts`, `buckeye-players.ts`, `pipeline-health-monitor.ts` |
| Player Domain | Done | `player-service.ts`, `player-routes.ts`, `PlayerProfile.tsx` |
| Agent Domain | Done | `agent-service.ts`, `agent-routes.ts`, `AgentDownline.tsx` |
| Partner Profile OS | Done | `partner-gateway.ts`, `partner-profile-schema.ts`, TOML profiles |
| Telegram Hub | Done | `TelegramBotWorker.ts`, `queue-publisher.ts`, `TelegramHub.tsx` |
| Frontend | Done | 21 pages, unified WebSocket, all themes |
| Shadow Agent | Done | `shadow-agent.ts`, `internal-routes.ts`, `ewma-tracker.ts` |

## Build Statistics

| Metric | Count |
|--------|-------|
| Source files | 175+ |
| Lines of code | ~73,000 |
| Type errors | 0 |
| Cron jobs | 10 |
| API endpoints | 65+ |
| WebSocket channels | 7 |
| Database tables | 34+ |
| Frontend pages | 21 |
| Partner profiles | 3 TOML templates |
| Data feeds | 3 (Buckeye wagers, Buckeye players, Pinnacle odds) |
| Skills | 1 (`add-feed`) |
| Fuzzy matchers | 2 (fuzzy-matcher v2, odds-phrase-matcher) |
| Pipeline monitors | 1 (pipeline-health-monitor) |
| Blueprints | 4 (feed, cron, route, WebSocket) |
| ADRs | 1 (0003 — Fuzzy Team Matching) |

## Bun Primitive Coverage

Every Bun-native API used across the 170 source files, with call counts.

| Primitive | Sites | Where |
|-----------|-------|-------|
| `bun:sqlite` | 23 | Every service, DB module, migrations, seed data |
| `Bun.cron` | 10 | Cron registry, prediction market price history |
| `ServerWebSocket` | 7 | All 7 WebSocket channel handlers |
| `Bun.file` | 6 | Static serving, migration loader, TOML loader |
| `Bun.sleep` | 6 | Telegram bot, webhook dispatcher, Shadow Agent |
| `Bun.serve` | 4 | Server bootstrap (HTTP + WS + SSE on one port) |
| `Bun.TOML` | 4 | Partner profile loader, partner routes |
| `Bun.Glob` | 1 | Migration SQL file discovery |
| `Bun.nanoseconds` | 1 | Pipeline health monitor timing |
| `Bun.WebView` | 1 | Shadow Agent cookie extraction (scripts/) |
| `bun:spawn` | 1 | Telegram bot worker launcher |

**11 primitives. 63 usage sites.** Zero npm dependencies for core infrastructure — Bun is the platform.
