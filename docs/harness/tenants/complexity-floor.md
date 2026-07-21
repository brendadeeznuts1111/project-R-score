# Tenant: complexity-floor

**Tenant** `complexity-floor` (code-quality · not a spine cron)  
**Runs** `bun run check:harness-complexity`  
**Proof** `harness-complexity-floor`  
**Catalog** `lib/harness/code-quality.ts` · baseline [`complexity-baseline.json`](../../../lib/harness/complexity-baseline.json)

## Signal (failure)

`bun run check:harness-complexity` reports a `lib/harness` function whose McCabe complexity exceeds `maxComplexity` in `complexity-baseline.json`.

## Intervention (repair)

1. Reproduce: `bun run check:harness-complexity -- --report`
2. Split or simplify the offending function(s)
3. Re-run: `bun run check:harness-complexity`
4. Only raise `maxComplexity` when intentionally allowing a higher floor (never lower without a retirement PR)

## Retirement

Remove when ESLint `complexity` (or equivalent) enforces the same `lib/harness` floor without this tenant.

**Retirement verified** `false`  
**Retirement check** `bun run check:harness-complexity`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run check:harness-complexity`
