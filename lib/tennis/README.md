# tennis

Portal tennis board metrics — mid buckets, series volume, venue counts.

| Path | Role |
|------|------|
| `board-metrics.ts` | Pure bucket/volume helpers + sample payload |
| bake | `bun run tennis:board:bake` → `public/registry/tennis/board-metrics.json` |

Event store default: `Kalshi-bot/research/cache/event-store.db` (when present).

```bash
bun run tennis:board:bake
bun test tests/tennis-board-metrics.test.ts
```
