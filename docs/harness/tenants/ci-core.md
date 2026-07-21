# Tenant: ci-core

**Tenant** `ci-core` (CI · not a spine cron)  
**Runs** `bun run ci:core` — install verify · hygiene · `ci:harness`  
**Proof** `ci-core-envelope`  
**Workflow** [`.github/workflows/harness-gates.yml`](../../../.github/workflows/harness-gates.yml)  
**Catalog** `lib/harness/ci-deploy.ts`

## Signal (failure)

`bun run ci:core` exits non-zero, or the Harness Gates job fails on `CI core`.

## Intervention (repair)

1. Reproduce locally: `bun run ci:core`
2. For a faster loop: `bun run ci:harness:fast`
3. Fix the failing gate (path-bun · brands · lint · test:changed · install verify · hygiene)
4. Re-run: `bun run ci:core`

## Retirement

Remove when a single required GHA job owns the full envelope without a cataloged runbook.

**Retirement verified** `false`  
**Retirement check** `bun run docs:ci-deploy`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run docs:ci-deploy`
