# Monitoring

Registry + ops health dashboard.

| Path | Role |
|------|------|
| [`collect.ts`](collect.ts) | `collectMonitoring` — packages, platforms, DOD, integrity, experiments, prediction, compliance |
| [`compliance-slice.ts`](compliance-slice.ts) | `loadComplianceMonitoringSlice` — board file → monitoring tile freeze shape |
| [`page.ts`](page.ts) | Server HTML via `Bun.inspect.table` |
| [`schema.ts`](schema.ts) | `integrity_checks` table |
| [`integrity.ts`](integrity.ts) | `runIntegrityCheck` — contract-validates artifacts, records into **ops DB** (`OPS_DB_PATH` / `data/operations.db`) via `openOperationsDb` (`bun run integrity:check`) |
| Local JSON | `GET /api/monitoring` (`serve-public`) |
| Local page | `GET /monitoring` (Bun.inspect.table HTML) |
| Pages JSON | `functions/api/monitoring.ts` → `public/registry/monitoring.json` |
| Pages HTML | `public/monitoring/index.html` (client fetch) |

```bash
bun run serve:public
open http://localhost:3000/monitoring
curl -s http://localhost:3000/api/monitoring | head

bun run ops:snapshot   # writes public/registry/monitoring.json for Pages
```
