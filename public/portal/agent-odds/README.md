# Bun Agent – Live Odds Intelligence

Local agent shell dashboards (not Tennis HQ Worker).

| Version | File | Notes |
|---------|------|--------|
| **v1.03** (default `/`) | `dashboard-v1.03.html` | Arbitrage · alerts · charts · tiers · login · export · backup |
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

## APIs (mock agent)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/odds/*` | Options, rows, stats, SSE stream |
| POST | `/api/upload` | FormData + Blob |
| POST | `/api/auth/login` | Demo session |
| POST | `/api/backup` | Mock DB backup stamp |
| GET | `/api/pool` · `/api/prefetch` · `/api/platform` | Pool / DNS / capabilities + rate counters |

UI panels for arbitrage, anomalies, and tier comparison ship with **client-side mock data** until real backend routes exist.
