# Tenant: typescript-ci

**Tenant** `typescript-ci` (CI · not a spine cron)  
**Runs** `bun run type-check:ci`  
**Proof** `typescript-ci-gate`  
**Workflow** [`.github/workflows/typescript-checks.yml`](../../../.github/workflows/typescript-checks.yml)  
**Catalog** `lib/harness/ci-deploy.ts`

## Signal (failure)

`bun run type-check:ci` (or `type-check:full` on the workflow) exits non-zero.

## Intervention (repair)

1. Reproduce: `bun run type-check:ci`
2. Fix reported errors
3. Optionally confirm full tree: `bun run type-check:full`
4. Re-run: `bun run type-check:ci`

## Retirement

Remove when type-check:ci is solely owned by typescript-checks.yml without a CI runbook.

**Retirement verified** `false`  
**Retirement check** proofId `typescript-ci-gate`

**Owner** `// owner: platform / typescript`  
**Fresh-rerun** `bun run docs:ci-deploy`
