# Tenant: ci-core

**Tenant** `ci-core` (CI · not a spine cron)  
**Runs** `bun run ci:core` — install verify · hygiene · agent skills · native docs · harness gates

**Proof** `ci-core-envelope`  
**Workflow** [`.github/workflows/harness-gates.yml`](../../../.github/workflows/harness-gates.yml)  
**Catalog** `lib/harness/ci-deploy.ts`

## Signal (failure)

`bun run ci:core` exits non-zero, or the Harness Gates job fails on `CI core`.

When Actions jobs die in ~2s with empty steps (billing), treat **local** `bun run ci:core` as the gate — GHA status is not informative.

## Intervention (repair)

1. Reproduce locally: `bun run ci:core`
2. For a faster loop: `bun run ci:harness:fast`
3. Fix the failing gate (agent skills · path-bun · brands · lint · test:changed · install verify · hygiene · boundary-fixtures)
4. Re-run: `bun run ci:core`
5. Types (required check body, not inside `ci:core`):  
   `bun run ts:verify && bun run imports:verify && bun run type-check:ci && bun run type-check:full`
6. Actions offline → admin-merge after local proof; see [AUTHORITY.md](../AUTHORITY.md)

The `agent-skills` step runs `bun run skills:validate`. It treats repository
skill definitions and loop-registry entries as related domains: every entry
must resolve to valid skill metadata, while non-loop skills may remain catalog-only.

## Retirement

Remove when a single required GHA job owns the full envelope without a cataloged runbook.

**Retirement verified** `false`  
**Retirement check** `bun run docs:ci-deploy`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run docs:ci-deploy`
