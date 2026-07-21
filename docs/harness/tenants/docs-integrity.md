# Tenant: docs-integrity

**Tenant** `docs-integrity`  
**Runs** `bun tools/bun-doc-refs.ts schedule --once` — daily `0 6 * * *` UTC via spine  
**Proof** `docs-integrity` (claim in `lib/harness/proof.ts`)  
**Catalog** `lib/harness/maintenance.ts` · `MAINTENANCE_RUNBOOKS`

## Signal (failure)

`bun run spine:schedule:once -- --tenant=docs-integrity` exits non-zero.  
Also: integrity summary `FAIL` / non-zero failure count in `reports/doc-integrity.jsonl`.

## Intervention (repair)

1. Re-run integrity: `bun tools/bun-doc-refs.ts schedule --once`
2. If taxonomy/map drift: `bun tools/bun-doc-refs.ts integrity --fix` (or operate loop in [`../../BUN_DOCS_OPERATE.md`](../../BUN_DOCS_OPERATE.md))
3. Re-run the tenant: `bun run spine:schedule:once -- --tenant=docs-integrity`

Do **not** delete the tenant to green the daemon.

## Retirement

Remove when docs integrity is solely owned by a required CI / `docs:refresh` operate schedule and the spine daemon is no longer needed for this pass. Keep multi-tenant proof ≥2 via another tenant.

**Retirement verified** `false` — set `tenants.docs-integrity=true` in [`lib/harness/ci-owned-tenants.json`](../../../lib/harness/ci-owned-tenants.json), confirm `bun scripts/retirement-check-ci-owner.ts --tenant=docs-integrity` exits 0, then move the catalog entry to `RETIRED_TENANT_RUNBOOKS` with `retirementVerified: true` in the same PR that removes this tenant from `SPINE_TENANTS`.

**Retirement check** `bun scripts/retirement-check-ci-owner.ts --tenant=docs-integrity` (+ proof `docs-integrity`)

**Owner** `// owner: platform / docs operate`  
**Fresh-rerun** `bun run docs:tenant-docs-integrity`
