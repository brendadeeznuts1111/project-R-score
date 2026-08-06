# Bun Agent – Live Odds Intelligence

Local agent shell dashboards (not Tennis HQ Worker).

| Version             | Route / file                                     | Notes                                                                                                |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **v1.05** (default) | `/` · `/dashboard.html` · `dashboard-v1.05.html` | Stable events desk · signals · rules · alerts · CSRF-protected mutations                             |
| v1.13 (preview)     | `/v1.13` · `dashboard-v1.13.html`                | v1.07 workflow · v1.05 contracts · arb analytics · partner tiers/limits · accessible tabs            |
| v1.12               | `/system` · `dashboard-v1.12.html`               | **System** tab · Bun.file/Glob/which/spawn/password/peek · package updates                           |
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

| Method   | Path                                           | Role                                                                  |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| GET      | `/api/edges`                                   | Opportunities (+ `ml`)                                                |
| POST     | `/api/bet`                                     | Mock place `{ edgeId, stake, bookmaker }` → `{ mock: true, orderId }` |
| GET      | `/api/bets`                                    | Recent mock orders                                                    |
| POST     | `/api/backtest`                                | `{ ruleId, startDate, endDate, seed? }`                               |
| GET      | `/api/events` · `/:id` · `/:id/history`        | Events + charts                                                       |
| GET/POST | `/api/alerts/rules`                            | Rules CRUD                                                            |
| GET      | `/api/alerts/history` · `/performance`         | Feed + snapshot                                                       |
| GET      | `/api/partners/health`                         | Merged registry                                                       |
| GET      | `/api/odds/*`                                  | Partner-enriched odds                                                 |
| WS       | `/ws`                                          | Live feed topic `agent-odds`                                          |
| GET      | `/api/platform`                                | Capabilities                                                          |
| GET      | `/api/system/info`                             | Bun.version / revision / which / Bun.color                            |
| GET/POST | `/api/system/fs/ls` · `/fs/read` · `/fs/write` | Sandboxed file explorer (project root only)                           |
| GET      | `/api/system/processes`                        | `Bun.spawn(['ps','aux'])`                                             |
| GET/POST | `/api/system/env`                              | Bun.env view; set `DESK_*` / `OPERATOR_RESEARCH_*` only               |
| POST     | `/api/system/password/hash` · `/verify`        | `Bun.password`                                                        |
| POST     | `/api/system/search`                           | `Bun.Glob`                                                            |
| POST     | `/api/system/inspect`                          | `Bun.inspect`                                                         |
| GET      | `/api/system/peek`                             | Desk task `Bun.peek` statuses                                         |

## Tabs (v1.12 system route)

Packages · **System** · Events · Detail · Edges · Live · Backtest · Rules
