# Bun Agent – Live Odds Intelligence

Local agent shell dashboards (not Tennis HQ Worker).

| Version | File | Notes |
|---------|------|--------|
| **v1.07** (default `/`) | `dashboard-v1.07.html` | Trading desk · WebSocket · mock bet · backtest · ML annotate |
| v1.06 | `dashboard-v1.06.html` | Uncovered Edges · tabs · events · alerts · Kelly · steam · value |
| v1.03+liquidity | `dashboard-v1.03.html` | Partner health · liquidity filters |
| v1.02 | `dashboard-v1.02.html` | SSE · FormData · pool / prefetch |
| v1.01 | `dashboard.html` | Drill-down filters |

## Run

```bash
bun run agent:odds-dashboard
# → http://127.0.0.1:3000/
# → WebSocket ws://127.0.0.1:3000/ws
```

## Demo login (local mock only)

| User | Password |
|------|----------|
| `analyst` | `password123` |

Or set `AGENT_DEMO_USER` / `AGENT_DEMO_PASS`. **Not for production.**

## Safety

- **`POST /api/bet` is an in-memory mock.** No real money, no live book placement.
- **Backtest** uses synthetic outcomes, not exchange history.
- **ML** fields are deterministic annotations from edge math (XGBoost/LSTM labels only — no trained weights).

## Edge engine

`lib/operator-research/edge-engine.ts` · `bet-mock.ts` · `backtest.ts`

| Signal | Logic |
|--------|--------|
| **Arbitrage** | Two-way `1/o1 + 1/o2 < 1`; illiquid/offline excluded |
| **Value** | EV vs sharp de-vig + Kelly |
| **Steam** | Prior vs current move % |
| **ML annotate** | `ml.predicted_prob` / `model` / `confidence` |
| **Mock bet** | ~80% success · rejects illiquid |
| **Backtest** | Seedable synthetic win rate / ROI / daily returns |

## APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/api/edges` | Opportunities (+ `ml`) |
| POST | `/api/bet` | Mock place `{ edgeId, stake, bookmaker }` → `{ mock: true, orderId }` |
| GET | `/api/bets` | Recent mock orders |
| POST | `/api/backtest` | `{ ruleId, startDate, endDate, seed? }` |
| GET | `/api/events` · `/:id` · `/:id/history` | Events + charts |
| GET/POST | `/api/alerts/rules` | Rules CRUD |
| GET | `/api/alerts/history` · `/performance` | Feed + snapshot |
| GET | `/api/partners/health` | Merged registry |
| GET | `/api/odds/*` | Partner-enriched odds |
| WS | `/ws` | Live feed topic `agent-odds` |
| GET | `/api/platform` | Capabilities |

## Tabs (v1.07)

Odds · Events · Detail · Edges · **Live** · **Backtest** · Rules · Health
