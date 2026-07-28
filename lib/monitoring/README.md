# Monitoring

Registry + ops health dashboard.

| Path | Role |
|------|------|
| [`collect.ts`](collect.ts) | `collectMonitoring` — packages, platforms, DOD, integrity, experiments, prediction, compliance |
| [`compliance-slice.ts`](compliance-slice.ts) | Board → monitoring / health freeze shapes (see table below) |
| [`page.ts`](page.ts) | Server HTML via `Bun.inspect.table` |
| [`schema.ts`](schema.ts) | `integrity_checks` table |
| [`integrity.ts`](integrity.ts) | `runIntegrityCheck` — contract-validates artifacts, records into **ops DB** (`OPS_DB_PATH` / `data/operations.db`) via `openOperationsDb` (`bun run integrity:check`) |
| Local JSON | `GET /api/monitoring` (`serve-public`) |
| Local page | `GET /monitoring` (Bun.inspect.table HTML) |
| Pages JSON | `functions/api/monitoring.ts` → `public/registry/monitoring.json` |
| Pages HTML | `public/monitoring/index.html` (client fetch) |

### Compliance projections (`compliance-slice.ts`)

One bake (`public/registry/compliance-board.json`) → shared freeze shapes. Edge + local serve-public must stay parity on health.

| Export | Consumes / emits | Where |
|--------|------------------|--------|
| `loadComplianceMonitoringSlice` | board file → `monitoring.compliance` tile | `collectMonitoring` · `/api/monitoring` · `/monitoring/` |
| `projectComplianceHealthArtifact` | board JSON → `artifacts.complianceBoard` | Pages edge [`portal-health-edge.ts`](../http/portal-health-edge.ts) · local [`serve-public`](../../scripts/serve-public.ts) |
| Portal UI | embed + `GET /api/compliance` | `/portal/compliance/` · tenant [`docs/harness/tenants/compliance-portal.md`](../../docs/harness/tenants/compliance-portal.md) |

Missing bake → health `exists:false` (no degrade); present + fail → `ok:false` (degrades).

```bash
bun run serve:public
open http://localhost:3000/monitoring
curl -s http://localhost:3000/api/monitoring | head

bun run ops:snapshot   # writes public/registry/monitoring.json for Pages
```
