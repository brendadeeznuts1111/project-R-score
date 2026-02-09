# Search Online Recovery Runbook

This runbook is for fast incident recovery when search governance/security gates block deploys.

## One-command preflight

Run:

```bash
bun run search:preflight:emergency
```

The preflight runs this sequence and stops on first failure:

1. `security:guard:deps`
2. `security:audit`
3. `search:policy:check`
4. `search:status:unified:strict`
5. `search:bench:gate --json`
6. `tests/search-dashboard-unified-api.test.ts`

## If preflight fails

Use the first failing step from preflight summary:

- `security:guard:deps`:
  - remove blocked packages from root `package.json`
  - remove blocked imports in core paths (`scripts/`, `server/`, `lib/`, `packages/`, `src/`, `dashboard/`, `tests/`)
- `security:audit`:
  - run `bun audit` locally
  - update/remove vulnerable root dependencies and refresh lockfile
- `search:policy:check`:
  - ensure policy version/rationale/changelog requirements are met
- `search:status:unified:strict`:
  - refresh artifacts in order:
    - `bun run search:coverage:loc:wide`
    - `bun run search:bench:snapshot:core:wide:local`
    - `bun run search:loop:status`
    - `bun run search:loop:runbook`
- `search:bench:gate --json`:
  - if expected shift, re-pin baseline:
    - `bun run search:bench:pin --from reports/search-benchmark/latest.json --out .search/search-benchmark-pinned-baseline.json`
  - document rationale in `.search/POLICY_CHANGELOG.md`

## Final verification before push

Run:

```bash
bun run search:preflight:emergency
```

Only push when all steps pass.

