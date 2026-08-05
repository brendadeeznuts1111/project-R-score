# Bun Agent – Live Odds Intelligence v1.01

Self-contained dashboard with sport / league / market / session drill-down.

## Run

```bash
bun run agent:odds-dashboard
# → http://127.0.0.1:3000/
```

Serves `dashboard.html` and mock:

| Path | Role |
|------|------|
| `GET /api/odds/options` | Filter dropdowns |
| `GET /api/odds?host=&sport=&league=&market_type=&session=&limit=` | Filtered rows |
| `GET /api/odds/stats` | Aggregate stats |
| `GET /api/platform` | Bun/capability stub |

When a real operator-research HTTP agent exists, keep these paths and replace the mock handlers.

**Not** the Tennis HQ Worker (`tennis.factory-wager.com`) — local agent shell only.
