# Bun Agent – Live Odds Intelligence

Local agent shell dashboards (not Tennis HQ Worker).

| Version | File | Notes |
|---------|------|--------|
| **v1.03+liquidity** (default `/`) | `dashboard-v1.03.html` | Partner health · liquidity filters · arb eligibility · charts · login · export · backup |
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

Odds rows are enriched with `bookmakerId`, `liquidityTier`, `partnerStatus` via host / eTLD+1 join (`extractEtldPlusOne` + `resolvePartnerForHost`).

## APIs (local mock agent)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/partners/health` | Merged registry health + liquidity summary |
| GET | `/api/odds/*` | Options (incl. liquidity/status), rows, stats, SSE stream |
| POST | `/api/upload` | FormData + Blob |
| POST | `/api/auth/login` | Demo session |
| POST | `/api/backup` | Mock DB backup stamp |
| GET | `/api/pool` · `/api/prefetch` · `/api/platform` | Pool / DNS / capabilities + rate counters |

Arbitrage UI **excludes** partners with `liquidityTier === illiquid` or status offline/degraded/critical. Soft balances are still `null` until ops bake ships amounts.
