# Tenant: registry-integrity

**Tenant** `registry-integrity` **Runs** `bun lib/factory/monitoring.ts --once`
— daily `0 3 * * *` UTC via spine **Proof** `factory-registry-integrity-v1`
(claim in `lib/harness/proof.ts`) **Catalog** `lib/harness/maintenance.ts` ·
`MAINTENANCE_RUNBOOKS`

## Signal (failure)

`bun run spine:schedule:once -- --tenant=registry-integrity` exits non-zero.
Also: `reports/registry-integrity.json` shows `failures.length > 0`, or
Slack/Telegram alert for checksum mismatch.

## Intervention (repair)

Catalog intervention:
`bun test tests/factory-production.test.ts · bun lib/factory/monitoring.ts --once`

1. Re-run the tenant:
   `bun run spine:schedule:once -- --tenant=registry-integrity`
2. Reproduce: `bun test tests/factory-production.test.ts`
3. Inspect failures: `bun lib/factory/cli.ts integrity` or read
   `reports/registry-integrity.json`
4. Re-publish corrupted artifacts or restore missing blobs in R2
5. Re-run: `bun lib/factory/monitoring.ts --once`

Do **not** delete the tenant to green the daemon.

## Retirement

Remove this tenant when registry integrity is enforced by required CI on every
publish/deploy and spine is no longer the periodic owner. Keep
`spine-multi-tenant` ≥2 via another tenant.

**Retirement verified** `false` — set `tenants.registry-integrity=true` in
[`lib/harness/ci-owned-tenants.json`](../../../lib/harness/ci-owned-tenants.json)
when CI owns the periodic audit, then move the catalog entry to
`RETIRED_TENANT_RUNBOOKS` with `retirementVerified: true` in the same PR that
removes this tenant from `SPINE_TENANTS`.

**Retirement check** registry-integrity is part of CI pre-deploy gate →
`bun scripts/retirement-check-ci-owner.ts --tenant=registry-integrity`

**Owner** `// owner: platform / factory registry` **Fresh-rerun**
`bun run docs:tenant-registry-integrity`
