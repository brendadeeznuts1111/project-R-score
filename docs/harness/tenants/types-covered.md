# Tenant: types-covered

**Tenant** `types-covered` (code-quality · not a spine cron)  
**Runs** `bun run type-check`  
**Proof** `lib-docs-typecheck` (day-loop type-check surfaces)  
**Catalog** `lib/harness/code-quality.ts`

## Signal (failure)

`bun run type-check` exits non-zero (day-loop type debt).

## Intervention (repair)

1. Reproduce: `bun run type-check`
2. Fix the reported errors in the day-loop include set (`tsconfig.check.json`)
3. Re-run: `bun run type-check`

## Retirement

Remove when type-check is solely enforced by a required pre-merge gate that covers the same surfaces without a code-quality tenant.

**Retirement verified** `false`  
**Retirement check** proofId `lib-docs-typecheck`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run type-check`
