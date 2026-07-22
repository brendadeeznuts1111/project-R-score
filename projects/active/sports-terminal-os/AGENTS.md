# Sports Terminal OS — Agent Guide

## Project Architecture

```
src/
├── api/            Route handlers (93 proxy endpoints)
├── auth/           JWT, API key, session middleware
├── db/             SQLite connection, migrations, seed data
├── services/       Business logic, cron jobs, data feeds
│   ├── cron.ts                        All scheduled jobs (11 entries)
│   ├── sportsbook-service.ts          Odds CRUD, line movements, CLV, steam detection
│   ├── ewma-tracker.ts                Exponential decay exposure tracking
│   ├── odds-drift-engine.ts           Drift detection, dedup, canonical team resolution
│   ├── team-alias-loader.ts           DB-backed alias map with hot-reload
│   ├── buckeye-feed.ts                Buckeye proxy wager polling
│   └── websocket-handlers/            7 real-time channel handlers
│       ├── sportsbook-ws.ts           sportsbook_odds_update
│       ├── agents-ws.ts               agent_update
│       ├── players-ws.ts              player_update
│       ├── patterns-ws.ts             pattern_detected
│       ├── prediction-ws.ts           prediction_update
│       ├── risk-ws.ts                 risk_update
│       ├── system-ws.ts               system_event
│       └── odds-drift-ws.ts           odds_drift (Zone 10)
├── zones/          Domain-specific modules
│   └── partner-profile/  Cascade engine, partner gateways, TOML profiles
├── frontend/       React 19 + Vite SPA (21 pages)
├── telegram/       Redis Streams bot workers
├── feeds/          Data source connectors (one file per external API)
│   └── pinnacle.ts        Pinnacle API odds fetcher
├── utils/          Shared types, environment config, fuzzy matcher
│   └── fuzzy-matcher.ts   findBestMatch, FuzzyTeamIndex, fuzzyScore (v2)
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
| `odds-drift-engine.ts` | `initOddsDriftEngine()`, `getOddsDriftEngine()` | Drift detection + canonical team resolution |
| `team-alias-loader.ts` | `loadAliasMap()`, `getAliasMap()`, `getCanonicalTeams()` | DB-backed alias hydration |
| `odds-drift-ws.ts` | `broadcastOddsDrift()`, `getOddsDriftMetrics()` | Real-time drift alert broadcast |
| `utils/h2-fetch.ts` | `h2Fetch(url, init?)`, `clearH2Cache()` | HTTP/2 fetch with graceful h1.1 fallback + per-origin caching |
| `utils/readme-config-loader.ts` | `readConfigFromPackage(name, opts?)` | Extracts + parses TOML from any npm package README |

## Packaged Configuration Pattern

Versioned, self-documenting config shipped as npm packages:

````
packages/odds-selectors/
├── package.json    ← name, version, files: ["README.md"]
└── README.md       ← human docs + ```toml config block
````

**Why:** Bookmaker changes HTML → publish new version → update lockfile → restart. No code deploy.
**How:** `readConfigFromPackage("odds-selectors")` extracts the fenced TOML block, parses it with `Bun.TOML.parse`.
**Qualifies for:** Bun global virtual store (no lifecycle scripts, symlink delivery, ~115ms warm install).

## Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Bun.serve single port | HTTP + WebSocket + SSE on one process |
| 2 | bun:sqlite, no ORM | Direct SQL for performance, no query builder overhead |
| 3 | TOML partner profiles | Declarative config, Zod-validated at boot |
| 4 | `BUCKEYE_LIVE_MODE=false` default | Every data pipe defaults OFF — safety first |
| 5 | `PartnerGateway.evaluate()` as kernel | Single O(1) entry point for all cascade logic |
| 6 | EWMA lambda=0 default | Backward compatible — static caps unless explicitly enabled |
| 7 | Callback injection for WS handlers | `setOddsDriftBroadcast()` pattern — no circular imports between handler and server |
| 8 | Immutable alert payloads | `Object.freeze()` before broadcast prevents cross-connection mutation |
| 9 | Per-connection backpressure | `ws.getBufferedAmount() > limit` check before each send — drop, don't crash |
| 10 | HTTP/2 multiplexed Telegram fetch | `h2Fetch()` wrapper tries h2 first, caches per-origin support, falls back to h1.1 transparently |

## Zone 10: Odds Drift (Real-Time)

The odds-drift subsystem detects line movements, resolves raw source team names to
canonical names via the fuzzy matcher, and broadcasts alerts to subscribed WebSocket
clients.

### Pipeline

```
Feed → OddsDriftEngine.process(input)
     → snapshot (record baseline)
     → detect drift (|toOdds - prevOdds| >= minDrift)
     → dedup (suppress re-alerts within dedupWindowMs)
     → resolveTopics (fuzzy matcher + alias map → canonical team)
     → emit alert (frozen, persisted to alert_log, broadcast via WS)
```

### Key Files

| File | Role |
|------|------|
| `src/services/odds-drift-engine.ts` | Drift detection, topic resolution, dedup |
| `src/services/team-alias-loader.ts` | Hydrates alias map from `source_team_aliases` table |
| `src/services/websocket-handlers/odds-drift-ws.ts` | WS handler: version neg, JWT auth, snapshot, backpressure |
| `migrations/015_source_team_aliases.sql` | Alias table + seed data (15 common football aliases) |

### Topics

| Pattern | Example | Purpose |
|---------|---------|---------|
| `sources:{source}:team:{rawTeam}` | `sources:fantasy402:team:man-city` | Raw source topic |
| `teams:{canonicalTeam}` | `teams:manchester-city` | Canonical team topic |

### Client Messages

| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `subscribe:odds_drift` | Client → Server | Subscribe with version |
| `unsubscribe:odds_drift` | Client → Server | Unsubscribe |
| `odds_drift:version` | Client → Server | Negotiate protocol version |
| `odds_drift:auth` | Client → Server | JWT authentication (HMAC-SHA256, `HYGIENE_JWT_SECRET`) |
| `odds_drift:snapshot` | Client → Server | Request state snapshot or replay `{lastSeq}` |
| `ack` | Client → Server | Acknowledge receipt up to `lastSeq` |
| `odds_drift` | Server → Client | Drift alert or event (with `_seq` for tracking) |
| `replay` | Server → Client | Ring-buffered message catch-up (after reconnect) |

### Hardening (v2.1.1)

| Feature | Mechanism |
|---------|-----------|
| Rate limiting | `MAX_MSGS_PER_SEC=30` per connection, violators get `close(1008)` |
| JWT claim enforcement | `allowed_topics` checked per-alert, supports `teams:*` wildcards |
| Ring buffer replay | 100 messages per topic, `{lastSeq}` catch-up on reconnect |
| Backpressure | `ws.getBufferedAmount() > limit` — drop, don't crash |

### .env.example (Zone 10 Hygiene)

```bash
# Zone 10: Odds Drift Hygiene WebSocket
HYGIENE_JWT_SECRET=your-hmac-sha256-secret-at-least-32-chars
HYGIENE_WS_BACKPRESSURE_LIMIT=65536     # bytes (default: 65536)
HYGIENE_WS_RATE_LIMIT_MSGS=30            # msgs/sec/conn (default: 30)
HYGIENE_WS_RING_BUFFER_SIZE=100          # replay entries (default: 100)
```

### Protocol Matrix

| Version | JWT Auth | Snapshot | Backpressure | Rate Limit | Ring Buffer | JWT Enforcement |
|---------|----------|----------|-------------|------------|-------------|-----------------|
| `odds-drift-v2.0.0` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `odds-drift-v2.1.0` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `odds-drift-v2.1.1` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HYGIENE_JWT_SECRET` | (falls back to `WS_JWT_SECRET` → `JWT_SECRET`) | HMAC-SHA256 secret for hygiene WS JWT auth |
| `HYGIENE_WS_BACKPRESSURE_LIMIT` | `65536` | Max bytes buffered before pausing per-connection |
| `HYGIENE_WS_RATE_LIMIT_MSGS` | `30` | Max incoming messages/sec per connection (1008 close on violation) |
| `HYGIENE_WS_RING_BUFFER_SIZE` | `100` | Per-topic ring buffer entries for catch-up replay |
| `TEAM_ALIAS_HOT_RELOAD_MS` | `0` (disabled) | Interval for alias map DB refresh |

## Build Commands

```bash
bun run dev              # Start dev server
bun run typecheck        # tsc --noEmit (must pass clean before every commit)
bun run test             # Run test suite
bun run db:migrate       # Apply migrations
bun run db:seed          # Seed initial data
bun run hygiene:v7          # Start mega-liner v8 (change-aware odds monitor)
bun run hygiene:dashboard   # Live ANSI terminal dashboard (1s refresh, /ws/metrics)
bun run hygiene:status      # One-shot Bun.inspect of /ws/metrics
bun run sources:audit       # Verify thumbnail cache + /thumbs/:site + /screenshot/:site (Bun.Image metadata / TEST-003)
bun run mcp --topic=X       # Live WebSocket topic audit stream (ANSI or raw JSON)
bun run build:verify        # 3-stage gate: typecheck → 82 tests → tsc
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

## Demos

| Demo | File | What It Shows |
|------|------|---------------|
| Mega‑liner v3 | `demos/mega-liner-v3.ts` | Bun primitives (WebView, cron, markdown.ansi, TOML, Transpiler, password, listen, udpSocket, serve, sqlite). `bun run demos/mega-liner-v3.ts` |
| Mega‑liner v7 | `demos/mega-liner-v7.ts` | v3 + `await using` disposal, Bun.Image pipeline (placeholder, resize, modulate, jpeg), SHA‑256 hashing, thumbnail cache + HTTP endpoint, placeholder WS push. Production‑ready. `bun run demos/mega-liner-v7.ts` |
| Mega‑liner v8 | `demos/mega-liner-v8.ts` | v7 + `deepEquals` change detection (skip unchanged scrapes), `console.depth=8` rich logging (no `[Object]`), `Bun.inspect` diff payloads, heartbeat protocol. Change‑aware. `bun run demos/mega-liner-v8.ts` |
