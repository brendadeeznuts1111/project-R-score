# harness

Harness proof paths, monorepo health, CI discovery, packages graph.

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API
surface. **Scale:** ~8k lines · ~21 modules — prefer the **Area map** first.

## Area map

| Area | Paths (entry) | Role |
| ---- | ------------- | ---- |
| Proof catalog | [`proof.ts`](proof.ts) · [`gate-ref.ts`](gate-ref.ts) | Critical proof-path catalog (`evidence` + `freshRerun`) · gate class wiring |
| Spine / tenants | [`maintenance.ts`](maintenance.ts) · [`ci-owned-tenants.json`](ci-owned-tenants.json) · [`heal-fixture.ts`](heal-fixture.ts) · [`signal-monitoring.ts`](signal-monitoring.ts) · [`intervention-validity.ts`](intervention-validity.ts) | Tenant runbooks, retirement, heal loop, monitors, repair command validity |
| Schedule / cron | [`discover-scheduled.ts`](discover-scheduled.ts) · [`cron.ts`](cron.ts) | Harness-perimeter schedule discovery · Bun.cron surface |
| CI / deploy | [`ci-deploy.ts`](ci-deploy.ts) · [`discover-ci.ts`](discover-ci.ts) · [`actions-check-noise.ts`](actions-check-noise.ts) | CI/deploy runbooks, job coverage, Actions noise filters |
| Code quality ratchets | [`code-quality.ts`](code-quality.ts) · [`complexity.ts`](complexity.ts) · [`complexity-baseline.json`](complexity-baseline.json) · [`coverage-ratchet.ts`](coverage-ratchet.ts) · [`coverage-baseline.json`](coverage-baseline.json) | Types/orphans/complexity · McCabe floor · coverage floors |
| Monorepo health | [`monorepo-health.ts`](monorepo-health.ts) · [`monorepo-health-ui.ts`](monorepo-health-ui.ts) · [`monorepo-health-history.ts`](monorepo-health-history.ts) · [`monorepo-surfaces.ts`](monorepo-surfaces.ts) | Health score engine · board UI · history · multi-surface inventory |
| Packages graph / vault | [`packages-graph-map.ts`](packages-graph-map.ts) · [`packages-vault-map.ts`](packages-vault-map.ts) | Package dependency map bake · Proton Pass / env.template coupling (no secret values) |
| Process capture | [`process-capture.ts`](process-capture.ts) | Concurrent stdout/stderr drain for child proofs (no pipe deadlock) |

**Operate:** `bun run harness:status` · `check:monorepo-health` ·
`test:code-quality` · `test:ci-deploy` · `test:cron` ·
[`docs/harness/PROOF.md`](../../docs/harness/PROOF.md) ·
[`docs/harness/tenants/monorepo-health.md`](../../docs/harness/tenants/monorepo-health.md).

### Module notes

- **`proof.ts`** — critical proof-path catalog (`evidence` + `freshRerun`)  
  *Ratchet* → [`docs/harness/PROOF.md`](../../docs/harness/PROOF.md) · [`docs/harness/FRESH-RERUN.md`](../../docs/harness/FRESH-RERUN.md) · `bun run harness:status`
- **`gate-ref.ts`** — validate `ProofPath.gateRef` against gateClass wiring  
  *Ratchet* → in-file with `proof.ts`
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
- **`monorepo-health.ts`** (+ `monorepo-health-ui` · `history` · `monorepo-surfaces`) — monorepo health score  
  *Ratchet* → `bun run check:monorepo-health` · [monorepo-health](../../docs/harness/tenants/monorepo-health.md)
- **`packages-graph-map.ts`** · **`packages-vault-map.ts`** — package graph bake · vault/env coupling  
  *Ratchet* → packages audit / portal packages board
- **`process-capture.ts`** — concurrent child stream capture for proof runners  
- **`actions-check-noise.ts`** — filter hosted-check noise when GHA is disabled / flaky

Daemon: [`spine/scheduler.ts`](../../spine/scheduler.ts) · tenants: [`spine/tenants.ts`](../../spine/tenants.ts).
