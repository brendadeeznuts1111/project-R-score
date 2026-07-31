# Tenant: ci-core

**Tenant** `ci-core` (CI · not a spine cron)  
**Runs** `bun run ci:core` — install verify · hygiene · `ci:harness`  
**Proof** `ci-core-envelope`  
**Execution** local Bun harness
**Catalog** `lib/harness/ci-deploy.ts`

## Signal (failure)

`bun run ci:core` exits non-zero.

## Intervention (repair)

1. Reproduce locally: `bun run ci:core`
2. For a faster loop: `bun run ci:harness:fast`
3. Fix the failing gate (path-bun · brands · lint · test:changed · install verify · hygiene · boundary-fixtures)
4. Re-run: `bun run ci:core`
5. Types (separate proof, not inside `ci:core`):
   `bun run ts:verify && bun run imports:verify && bun run type-check:ci && bun run type-check:full`

## Retirement

Remove when `ci:core` is retired or replaced by another local proof envelope.

**Retirement verified** `false`  
**Retirement check** `bun run docs:ci-deploy`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run docs:ci-deploy`
