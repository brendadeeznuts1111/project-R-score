# Spine tenants (index)

Continuous-maintenance index for in-process spine tenants.  
Typed catalog: [`lib/harness/maintenance.ts`](../../lib/harness/maintenance.ts) · registry: [`spine/tenants.ts`](../../spine/tenants.ts).

Daemon: `bun run spine:schedule` · once: `bun run spine:schedule:once` · `--tenant=<id>`

## Per-tenant runbooks

Each active tenant **must** have signal · intervention · proof · retirement (`retirementVerified: false`):

- [`tenants/docs-integrity.md`](tenants/docs-integrity.md) — claim `docs-integrity`
- [`tenants/install-verify.md`](tenants/install-verify.md) — claim `install-verify-journey`

**To retire a tenant:**

1. Flip `tenants.<id>=true` in [`lib/harness/ci-owned-tenants.json`](../../lib/harness/ci-owned-tenants.json) once CI/operate owns the periodic re-proof.  
2. Confirm `retirementCheck` passes (`bun scripts/retirement-check-ci-owner.ts --tenant=<id>`).  
3. Move the entry to `RETIRED_TENANT_RUNBOOKS` with `retirementVerified: true` and remove it from `SPINE_TENANTS` / `SIGNAL_MONITORS` in the same PR (keep `spine-multi-tenant` ≥2).  
4. The ratchet re-runs `retirementCheck` for every tombstone and rejects the commit if it fails.

## Cross-references

Closed maintenance loop — each edge is machine-checked by `bun run test:tenant-runbooks`:

- **`TenantRunbook.proofId` → `ProofPath.id`** — why the tenant exists  
  *Ratchet* → `assertRunbookProofLinks`
- **`TenantRunbook.tenant` ↔ `SPINE_TENANTS`** — no orphan docs, no undocumented tenant  
  *Ratchet* → `assertRunbookTenantLinks`
- **Retirement attestation** — active runbooks keep `retirementVerified: false`; remove from spine only by moving to `RETIRED_TENANT_RUNBOOKS` with `retirementVerified: true`  
  *Ratchet* → `assertRetirementEnforcement`
- **Retirement condition check** — active runbooks declare `retirementCheck`; tombstones execute it (command and/or proof `freshRerun` must exit 0; missing check warns)  
  *Ratchet* → `assertRetirementCheckShape` · `assertRetirementConditionCheck` · [`ci-owned-tenants.json`](../../lib/harness/ci-owned-tenants.json)
- **Discovered schedules covered** — harness-perimeter crons / `package.json` schedule scripts / GHA `cron:` map to a tenant + runbook or an explicit exemption  
  *Ratchet* → `assertScheduledJobCoverage` · [`lib/harness/discover-scheduled.ts`](../../lib/harness/discover-scheduled.ts)
- **Signal monitors registered** — every tenant has a probe (`checkCommand`) + `alertChannel`; spine-tick probes name `--tenant=`  
  *Ratchet* → `assertSignalMonitorTenantLinks` · `assertSignalMonitorFields` · [`lib/harness/signal-monitoring.ts`](../../lib/harness/signal-monitoring.ts)
- **Monitor ↔ runbook.signal** — documented signal mentions the probe  
  *Ratchet* → `assertSignalMonitorAlignedWithRunbook`
- **Last-check freshness (soft)** — when `lastCheckPath` exists, observation age ≤ `maxAgeMinutes` (`SIGNAL_MONITOR_FRESHNESS=strict` requires the file)  
  *Ratchet* → `assertSignalMonitorFreshness` · ticks: `reports/spine-tenant-ticks.jsonl`
- **`docPath` markdown** — human signal · intervention · retirement sections  
  *Ratchet* → file exists + `## Signal` / `## Intervention` / `## Retirement`
- **`intervention` contains linked proof `freshRerun`** — first repair step is the claim command  
  *Ratchet* → `assertRunbookInterventionContainsProofFreshRerun`
- **Intervention commands valid** — catalog + markdown `` `bun …` `` resolve (`bun run` script / file path); no shell metacharacters; allowlisted heads  
  *Ratchet* → `assertInterventionCommandsValid` · [`lib/harness/intervention-validity.ts`](../../lib/harness/intervention-validity.ts)
- **Catalog fields non-empty** — `signal` · `intervention` · `retirement`  
  *Ratchet* → `assertRunbookFieldsNonEmpty`
- **Runbook `freshRerun` executes** — each `docs:tenant-*` (or catalog command) exits 0  
  *Ratchet* → `assertRunbookFreshRerunsPass`
- **Linked proof is healthy** — each `proofId`’s `freshRerun` exits 0 (deduped)  
  *Ratchet* → `assertLinkedProofFreshRerunsPass`

## Code quality (not spine cron)

Day-loop / CI code-health tenants use the same runbook shape but are **not** in `SPINE_TENANTS`:

→ [`code-quality.md`](code-quality.md) · `bun run test:code-quality` · claim `code-quality-tenants`

## CI / deploy (not spine cron)

Required CI envelopes and deploy scripts:

→ [`ci-deploy.md`](ci-deploy.md) · `bun run test:ci-deploy` · claim `ci-deploy-runbooks`

## E2E heal (sandboxed)

Production `SPINE_TENANTS` are not mutated. A fixture tenant (`heal-fixture`) lives under `tests/fixtures/tenant-heal/` and is copied into `.cache/journey-tenant-heal/` for the journey:

1. **Baseline** — `check` exits 0  
2. **Break** — flip `health.json` `ok: false`  
3. **Signal** — `check` exits non-zero  
4. **Intervention** — `fix` restores health  
5. **Proof** — `check` exits 0  

*Ratchet* → `bun run test:tenant-heal` · claim `spine-tenant-heal` · [`lib/harness/heal-fixture.ts`](../../lib/harness/heal-fixture.ts)  
Included in `bun run test:tenant-runbooks`.

## Ratchet

- **Catalog ↔ tenants ↔ proofs ↔ docs** — full cross-ref set above  
  *Ratchet* → `bun run test:tenant-runbooks` · claim `spine-maintenance-runbooks`
- **E2E heal loop** — sandboxed break → signal → intervene → recover  
  *Ratchet* → `bun run test:tenant-heal` · claim `spine-tenant-heal`
- **Docs render** — `bun run docs:spine-tenants` (this index + live registry)

## Lookup

```bash
bun run docs:spine-tenants
bun run test:tenant-runbooks
bun run test:tenant-heal
bun run docs:tenant-install-verify
bun run docs:tenant-docs-integrity
```
