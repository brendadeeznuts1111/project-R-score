# Bun Agent – Live Odds Intelligence

Local agent shell dashboards (not Tennis HQ Worker).

| Version             | Route / file                                     | Notes                                                                                                |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **v1.05** (default) | `/` · `/dashboard.html` · `dashboard-v1.05.html` | Stable events desk · signals · rules · alerts · CSRF-protected mutations                             |
| v1.13 (preview)     | `/v1.13` · `dashboard-v1.13.html`                | v1.07 workflow · v1.05 contracts · replayable odds SSE · settled-outcome CSV analysis                |
| v1.12               | `/system` · `/registry` · `dashboard-v1.12.html` | **System** + **Registry** tabs · package updates · snapshot browse · dry-run publish                 |
| v1.11               | `/packages` · `dashboard-v1.11.html`             | Package update tab fixes · click-select · `originalTarget` · real SSE `/api/update` · dry-run · CSRF |
| v1.10               | `dashboard-v1.10.html`                           | Package tab (buggy: no click, mock fallback, simulated progress)                                     |
| v1.07               | `dashboard-v1.07.html`                           | Trading desk · WebSocket · mock bet · backtest · ML annotate                                         |
| v1.06               | `dashboard-v1.06.html`                           | Uncovered Edges · tabs · events · alerts · Kelly · steam · value                                     |
| v1.03+liquidity     | `dashboard-v1.03.html`                           | Partner health · liquidity filters                                                                   |
| v1.02               | `dashboard-v1.02.html`                           | SSE · FormData · pool / prefetch                                                                     |

## Run

```bash
bun run agent:odds-dashboard
# → http://127.0.0.1:3000/
# → WebSocket ws://127.0.0.1:3000/ws
```

## Demo login (local mock only)

| User      | Password      |
| --------- | ------------- |
| `analyst` | `password123` |

Or set `AGENT_DEMO_USER` / `AGENT_DEMO_PASS`. **Not for production.**

## Safety

- **`POST /api/bet` is an in-memory mock.** No real money, no live book
  placement.
- **Backtest** uses synthetic outcomes, not exchange history.
- **v1.13 CSV analysis** uses only uploaded settled outcomes; it does not run
  the legacy synthetic simulator or re-evaluate alert predicates.
- **ML** fields are deterministic annotations from edge math (XGBoost/LSTM
  labels only — no trained weights).

## Edge engine

`lib/operator-research/edge-engine.ts` · `bet-mock.ts` · `backtest.ts`

| Signal          | Logic                                                |
| --------------- | ---------------------------------------------------- |
| **Arbitrage**   | Two-way `1/o1 + 1/o2 < 1`; illiquid/offline excluded |
| **Value**       | EV vs sharp de-vig + Kelly                           |
| **Steam**       | Prior vs current move %                              |
| **ML annotate** | `ml.predicted_prob` / `model` / `confidence`         |
| **Mock bet**    | ~80% success · rejects illiquid                      |
| **Backtest**    | Seedable synthetic win rate / ROI / daily returns    |

## APIs

| Method   | Path                                           | Role                                                                               |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| GET      | `/api/edges`                                   | Opportunities (+ `ml`)                                                             |
| POST     | `/api/bet`                                     | Mock place `{ edgeId, stake, bookmaker }` → `{ mock: true, orderId }`              |
| GET      | `/api/bets`                                    | Recent mock orders                                                                 |
| POST     | `/api/backtest`                                | `{ ruleId, startDate, endDate, seed? }`                                            |
| GET      | `/api/events` · `/:id` · `/:id/history`        | Events + charts                                                                    |
| GET/POST | `/api/alerts/rules`                            | Rules CRUD                                                                         |
| GET      | `/api/alerts/history` · `/performance`         | Feed + snapshot                                                                    |
| GET      | `/api/partners/health`                         | Merged registry                                                                    |
| GET      | `/api/odds/*`                                  | Partner-enriched odds                                                              |
| WS       | `/ws`                                          | Live feed topic `agent-odds`                                                       |
| GET      | `/api/platform`                                | Capabilities                                                                       |
| GET      | `/api/stream/odds`                             | Persisted odds SSE with cursor replay                                              |
| POST     | `/api/backtest/upload`                         | CSRF-protected settled-outcome CSV analysis                                        |
| GET      | `/api/system/info`                             | Bun.version / revision / which / Bun.color                                         |
| GET/POST | `/api/system/fs/ls` · `/fs/read` · `/fs/write` | Sandboxed file explorer (project root only)                                        |
| GET      | `/api/system/processes`                        | `Bun.spawn(['ps','aux'])`                                                          |
| GET/POST | `/api/system/env`                              | Bun.env view; set `DESK_*` / `OPERATOR_RESEARCH_*` only                            |
| POST     | `/api/system/password/hash` · `/verify`        | `Bun.password`                                                                     |
| POST     | `/api/system/search`                           | `Bun.Glob`                                                                         |
| POST     | `/api/system/inspect`                          | `Bun.inspect`                                                                      |
| GET      | `/api/system/peek`                             | Desk task `Bun.peek` statuses                                                      |
| GET      | `/api/system/jobs` · `/api/desk/jobs`          | Research agent · odds dashboard · optional `Bun.cron` monitor status               |
| GET      | `/api/registry/presets`                        | Allowlisted registry presets (`local` · `prod`)                                    |
| GET      | `/api/registry/packages?q=`                    | Search `public/registry/registry.json` (Phase 0 snapshot)                          |
| GET      | `/api/registry/packages/:name`                 | Detail (`?version=` · `?live=1` · `?preset=` · `readme` / `readmeHtml` · `source`) |
| GET      | `/api/registry/health?preset=`                 | Snapshot + optional local `/-/ping`                                                |
| GET      | `/api/registry/workspaces`                     | Publishable `packages/*` workspaces                                                |
| POST     | `/api/registry/publish`                        | Local `bun publish --registry` (CSRF · dry-run default · `confirm`)                |
| POST     | `/api/registry/factory-publish`                | Factory/R2 publish lane (CSRF · dry-run default · `confirm`)                       |

## Registry tab (v1.12)

Allowlisted presets only (no free-form registry URL):

| Preset  | URL                                          | Browse (Phase 0) | Publish                                     |
| ------- | -------------------------------------------- | ---------------- | ------------------------------------------- |
| `local` | `http://localhost:3000/`                     | Snapshot + ping  | `bun publish --registry` (dry-run default)  |
| `prod`  | `https://registry.factory-wager.com/api/npm` | Snapshot only    | `factory publish` (not `bun publish`→Pages) |

**Snapshot refresh** (do not invent `build:registry` / `npm install`→index):

```bash
bun run factory:snapshot
bun run ops:snapshot
```

Detail modal shows `readme` / `readmeFilename` / `readmeHtml`
(`Bun.markdown.html` + `tagFilter`). **Rendered** / **Raw** toggle. Check **Live
packument** to fetch the allowlisted preset (`local` / `prod`) with snapshot
fallback (`source`, `liveError` on failure).

```
GET /api/registry/packages/event-store?live=1&preset=local&version=1.0.0
```

**Live journey proof** (ephemeral HTTP in CI; optional real `:3000`):

```bash
bun test tests/operator-research-registry-live-journey.test.ts
bun run serve:public   # other terminal
bun run agent:registry:live-smoke
```

**Serve + Bun 1.3.12 desk jobs:**

```bash
bun run agent:serve
# optional in-process odds monitor (Bun.cron):
bun run agent serve --monitor
# or: OPERATOR_ODDS_MONITOR=1 bun run agent:serve
curl -s http://127.0.0.1:8790/api/system/jobs | head
# ANSI README in terminal (Bun.markdown.ansi — not the HTML modal):
bun run agent registry-readme event-store --version 1.0.0
```

**Deep links:**

```
/registry?tab=registry&registry=local&package=event-store
/dashboard-v1.12.html?tab=registry&registry=prod&package=@factorywager/registry-client&version=1.0.0&live=1
```

Pages / public score hosts are **not** publish targets
([ADR-0002](../../../docs/adr/0002-registry-index-ssot.md)).

## Tabs (v1.12)

Packages · **Registry** · **System** · Events · Detail · Edges · Live · Backtest
· Rules
