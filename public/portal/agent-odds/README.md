# Bun Agent – Live Odds Intelligence

Local agent shell dashboards (not Tennis HQ Worker).

| Version | File | Notes |
|---------|------|--------|
| **v1.02** (default `/`) | `dashboard-v1.02.html` | Streaming SSE · FormData+Blob upload · connection pool / prefetch UI |
| v1.01 | `dashboard.html` | Drill-down filters only |

## Run

```bash
bun run agent:odds-dashboard
# → http://127.0.0.1:3000/
```

## APIs (mock agent)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/odds/options` | Filter dropdowns |
| GET | `/api/odds?…` | Filtered odds rows |
| GET | `/api/odds/stats` | Aggregates |
| GET | `/api/odds/stream` | **SSE** live odds events |
| POST | `/api/upload` | **FormData** file (Blob) → sha256 |
| GET | `/api/pool` | Connection pool mock stats |
| GET | `/api/prefetch?host=` | DNS prefetch + timing |
| GET | `/api/platform` | Bun version / capabilities |

Replace mock handlers when a real operator-research HTTP agent owns these paths.
