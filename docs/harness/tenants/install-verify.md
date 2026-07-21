# Tenant: install-verify

**Tenant** `install-verify`  
**Runs** `bun run test:install-verify` — daily `30 6 * * *` UTC via spine  
**Proof** `install-verify-journey` (claim in `lib/harness/proof.ts`)  
**Catalog** `lib/harness/maintenance.ts` · `MAINTENANCE_RUNBOOKS`

## Signal (failure)

`bun run spine:schedule:once -- --tenant=install-verify` exits non-zero.  
Also: daemon log `❌ spine tenant · install-verify · exit N` with `N ≠ 0`, or WebView `#status` ≠ `verified`.

## Intervention (repair)

1. Re-run the tenant: `bun run spine:schedule:once -- --tenant=install-verify`
2. Reproduce the journey: `bun run test:install-verify`
3. Fix the underlying issue (journey owner: [`../install-verify.md`](../install-verify.md))
4. Re-run the tenant once to verify green

Do **not** delete the tenant to green the daemon.

## Retirement

Remove this tenant when the `install-verify` journey proof moves to a pre-deploy / required CI gate that periodically re-proves it without spine. Keep `spine-multi-tenant` ≥2 via another tenant.

**Retirement verified** `false` — when a required CI gate (not spine) periodically re-proves `install-verify-journey`, set `tenants.install-verify=true` in [`lib/harness/ci-owned-tenants.json`](../../../lib/harness/ci-owned-tenants.json), then move the catalog entry to `RETIRED_TENANT_RUNBOOKS` with `retirementVerified: true` in the same PR that removes this tenant from `SPINE_TENANTS` (do not delete the tombstone).

**Retirement check** install-verify journey proof is owned by CI pre-deploy gate → proofId `install-verify-journey` (tombstone re-runs that proof’s `freshRerun`)

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run docs:tenant-install-verify`
