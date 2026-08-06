# Bun Agent – Live Odds Intelligence

Local agent shell dashboards (not Tennis HQ Worker).

| Version | File | Notes |
|---------|------|--------|
| **v1.06** (default `/`) | `dashboard-v1.06.html` | Uncovered Edges · tabs · events · alerts · Kelly · steam · value |
| v1.03+liquidity | `dashboard-v1.03.html` | Partner health · liquidity filters · arb eligibility |
| v1.02 | `dashboard-v1.02.html` | SSE · FormData · pool / prefetch |
| v1.01 | `dashboard.html` | Drill-down filters |

## Run

```bash
bun run agent:odds-dashboard
# → http://127.0.0.1:3000/
```

## Demo login (local mock only)

| User | Password |
|------|----------|
| `analyst` | `password123` |

Or set `AGENT_DEMO_USER` / `AGENT_DEMO_PASS`. **Not for production.**

## Partner merge (SSOT)

`lib/bookmakers/merged-registry.ts` loads:

- `public/registry/bookmakers.json` — public catalog (`liquidityTier`, urls, limits)
- `public/registry/partners-ops.json` — ops outs readiness → derived `status`

## Edge engine

`lib/operator-research/edge-engine.ts`:

| Signal | Logic |
|--------|--------|
| **Arbitrage** | Two-way `1/o1 + 1/o2 < 1` across books; illiquid/offline excluded |
| **Value** | EV vs sharp (highest liquidity) de-vig true price; Kelly stake |
| **Steam** | Synthetic prior vs current move % on live books |
| **Latency** | Confidence penalty when quote latency exceeds threshold |

## APIs (local mock agent)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/edges` | Live opportunities (`type`, `min`, sport/league filters) |
| GET | `/api/events` | Simulated multi-book events from partner catalog |
| GET | `/api/events/:id` | Event detail + book quotes |
| GET | `/api/events/:id/history` | Odds history series for charts |
| GET/POST | `/api/alerts/rules` | Alert rule CRUD (in-memory) |
| DELETE | `/api/alerts/rules/:id` | Delete rule |
| GET | `/api/alerts/history` | Recent alert feed |
| GET | `/api/alerts/performance` | Hit rate / P&L snapshot per rule |
| GET | `/api/partners/health` | Merged registry health + liquidity |
| GET | `/api/odds/*` | Partner-enriched odds rows / options / stats / SSE |
| POST | `/api/upload` · `/api/auth/login` · `/api/backup` | Upload · demo auth · backup stamp |
| GET | `/api/pool` · `/api/prefetch` · `/api/platform` | Pool / DNS / capabilities |

Query params for edges: `sport`, `league`, `type` (`arbitrage`\|`value`\|`steam`), `min` (edge %), `refresh=1`, `limit`.
