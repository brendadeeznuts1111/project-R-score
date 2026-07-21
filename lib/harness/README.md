# harness

Harness proof paths.

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API surface.

- **`proof.ts`** — critical proof-path catalog (`evidence` + `freshRerun`)  
  *Ratchet* → [`docs/harness/PROOF.md`](../../docs/harness/PROOF.md) · [`docs/harness/FRESH-RERUN.md`](../../docs/harness/FRESH-RERUN.md) · `bun run harness:status`
- **`maintenance.ts`** — `TenantRunbook` catalog + `RETIRED_TENANT_RUNBOOKS` tombstones (`retirementVerified`)  
  *Ratchet* → `bun run test:tenant-runbooks` · `assertRetirementEnforcement` · [`docs/harness/spine-tenants.md`](../../docs/harness/spine-tenants.md)
- **`discover-scheduled.ts`** — harness-perimeter schedule discovery (code · package scripts · GHA)  
  *Ratchet* → `assertScheduledJobCoverage` · owners / exemptions in-file
- **`signal-monitoring.ts`** — per-tenant probe · alert channel · optional last-check freshness  
  *Ratchet* → `assertSignalMonitorTenantLinks` · `assertSignalMonitorFreshness`
- **`intervention-validity.ts`** — catalog + markdown repair commands resolve (script/path · allowlist)  
  *Ratchet* → `assertInterventionCommandsValid`
- **`heal-fixture.ts`** — sandboxed E2E heal loop (not a production spine tenant)  
  *Ratchet* → `bun run test:tenant-heal` · claim `spine-tenant-heal`
- **`cron.ts`** — Bun.cron surface (OS-persistent primary · in-process complement)  
  *Ratchet* → `bun run test:cron` · [`docs/harness/cron.md`](../../docs/harness/cron.md)

Daemon: [`spine/scheduler.ts`](../../spine/scheduler.ts) · tenants: [`spine/tenants.ts`](../../spine/tenants.ts).
