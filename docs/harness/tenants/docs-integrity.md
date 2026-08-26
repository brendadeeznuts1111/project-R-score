# Tenant: docs-integrity

**Tenant** `docs-integrity`  
**Runs** `bun tools/bun-doc-refs.ts schedule --once` — daily `0 6 * * *` UTC via
spine  
**Proof** `docs-integrity` (claim in `lib/harness/proof.ts`)  
**Catalog** `lib/harness/maintenance.ts` · `MAINTENANCE_RUNBOOKS`

The scheduled tenant checks links and taxonomy. Exact release provenance is a
separate continuous claim: `bun-api-release-provenance` runs
`bun tools/bun-docs-catalog.ts verify` and `bun run docs:provenance:check`.

## Signal (failure)

`bun run spine:schedule:once -- --tenant=docs-integrity` exits non-zero.  
Also: integrity summary `FAIL` / non-zero failure count in
`reports/doc-integrity.jsonl`.

## Intervention (repair)

Catalog intervention:
`bun tools/bun-doc-refs.ts integrity · bun tools/bun-doc-refs.ts schedule --once`

1. Reproduce without writes: `bun tools/bun-doc-refs.ts integrity`
2. Refresh the scheduled evidence: `bun tools/bun-doc-refs.ts schedule --once`
3. If taxonomy/map drift: `bun tools/bun-doc-refs.ts integrity --fix` (or
   operate loop in [`../../BUN_DOCS_OPERATE.md`](../../BUN_DOCS_OPERATE.md))
4. Re-run the tenant: `bun run spine:schedule:once -- --tenant=docs-integrity`
5. When release/feed/catalog history moved, run
   `bun tools/bun-docs-catalog.ts verify` and `bun run docs:provenance:check`.
   Persisted inputs fail closed; repair the artifact or deliberately rebuild
   scrape state with `bun tools/bun-docs-releases.ts scrape --force`.

Do **not** delete the tenant to green the daemon.

## Retirement

Remove when docs integrity is solely owned by a required CI / `docs:refresh`
operate schedule and the spine daemon is no longer needed for this pass. Keep
multi-tenant proof ≥2 via another tenant.

**Retirement verified** `false` — set `tenants.docs-integrity=true` in
[`lib/harness/ci-owned-tenants.json`](../../../lib/harness/ci-owned-tenants.json)
when CI owns the pre-deploy re-proof, confirm
`bun scripts/retirement-check-ci-owner.ts --tenant=docs-integrity` exits 0, then
move the catalog entry to `RETIRED_TENANT_RUNBOOKS` with
`retirementVerified: true` in the same PR that removes this tenant from
`SPINE_TENANTS`.

**Retirement check** Ensure docs-integrity is part of CI pre-deploy gate →
`bun scripts/retirement-check-ci-owner.ts --tenant=docs-integrity`

**Owner** `// owner: platform / docs operate`  
**Fresh-rerun** `bun run docs:tenant-docs-integrity`
