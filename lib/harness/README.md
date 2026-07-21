# harness

Harness proof paths.

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API surface.

- **`proof.ts`** — critical proof-path catalog (`evidence` + `freshRerun`)  
  *Ratchet* → [`docs/harness/PROOF.md`](../../docs/harness/PROOF.md) · [`docs/harness/FRESH-RERUN.md`](../../docs/harness/FRESH-RERUN.md) · `bun run harness:status`
- **`maintenance.ts`** — `TenantRunbook` + `retirementCheck` · `RETIRED_TENANT_RUNBOOKS` tombstones  
  *Ratchet* → `assertRetirementEnforcement` · `assertRetirementConditionCheck` · [`docs/harness/spine-tenants.md`](../../docs/harness/spine-tenants.md)
- **`ci-owned-tenants.json`** — flip `tenants.<id>=true` when CI owns the periodic re-proof  
  *Probe* → `bun scripts/retirement-check-ci-owner.ts --tenant=<id>`
- **`discover-scheduled.ts`** — harness-perimeter schedule discovery (code · package scripts · GHA)  
  *Ratchet* → `assertScheduledJobCoverage` · owners / exemptions in-file
- **`signal-monitoring.ts`** — per-tenant probe · alert channel · optional last-check freshness  
  *Ratchet* → `assertSignalMonitorTenantLinks` · `assertSignalMonitorFreshness`
- **`intervention-validity.ts`** — catalog + markdown repair commands resolve (script/path · allowlist)  
  *Ratchet* → `assertInterventionCommandsValid`
- **`heal-fixture.ts`** — sandboxed E2E heal loop (not a production spine tenant)  
  *Ratchet* → `bun run test:tenant-heal` · claim `spine-tenant-heal`
- **`code-quality.ts`** — types · coverage · orphans · complexity tenants (not spine cron)  
  *Ratchet* → `bun run test:code-quality` · [`docs/harness/code-quality.md`](../../docs/harness/code-quality.md)
- **`complexity.ts`** + **`complexity-baseline.json`** — McCabe floor for `lib/harness` functions  
  *Probe* → `scripts/complexity-check.ts` · *Ratchet* → `bun run check:harness-complexity`
- **`ci-deploy.ts`** + **`discover-ci.ts`** — CI/deploy runbooks + fail-closed job coverage  
  *Ratchet* → `bun run test:ci-deploy` · [`docs/harness/ci-deploy.md`](../../docs/harness/ci-deploy.md)
- **`coverage-ratchet.ts`** + **`coverage-baseline.json`** — lib/harness coverage floors  
  *Ratchet* → `bun run test:harness-coverage`
- **`cron.ts`** — Bun.cron surface (OS-persistent primary · in-process complement)  
  *Ratchet* → `bun run test:cron` · [`docs/harness/cron.md`](../../docs/harness/cron.md)

Daemon: [`spine/scheduler.ts`](../../spine/scheduler.ts) · tenants: [`spine/tenants.ts`](../../spine/tenants.ts).
