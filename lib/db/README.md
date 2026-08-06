# db

Shared ops SQLite connection + short TTL monitoring cache.

| File                             | Role                                                |
| -------------------------------- | --------------------------------------------------- |
| [`connection.ts`](connection.ts) | `getDb` singleton · `getMonitoringData` (TTL cache) |

Uses [`../operations/db.ts`](../operations/db.ts) for open helpers and
[`../monitoring/collect.ts`](../monitoring/collect.ts) for live/snapshot
monitoring payloads.

```bash
# Prefer openOperationsDb / getDb from call sites; do not open ad-hoc SQLite handles in portal code.
```

@see https://bun.com/docs/runtime/sqlite
