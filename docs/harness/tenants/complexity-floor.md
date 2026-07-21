# Tenant: complexity-floor

**Tenant** `complexity-floor` (code-quality · not a spine cron)  
**Runs** `bun run check:harness-complexity`  
**Proof** `harness-complexity-floor`  
**Catalog** `lib/harness/code-quality.ts` · baseline [`complexity-baseline.json`](../../../lib/harness/complexity-baseline.json)  
**Probe** [`scripts/complexity-check.ts`](../../../scripts/complexity-check.ts)

## Signal (failure)

`bun run check:harness-complexity` exits non-zero — a `lib/harness` function’s McCabe complexity exceeds `maxComplexity` in `complexity-baseline.json`.

## Intervention (repair)

Prefer refactor; raise the floor only when the complexity is intentional:

1. Reproduce: `bun run check:harness-complexity -- --report`
2. Split or simplify the offending function(s), **or** accept a higher floor:
   `bun run check:harness-complexity -- --update-baseline --yes`
3. Re-prove: `bun run check:harness-complexity`

`--update-baseline` sets `maxComplexity` to the current max seen (raises only; pass `--allow-lower` to lower). Non-TTY runs require `--yes`.

## Retirement

Remove when complexity is enforced by pre-commit (or ESLint `complexity`) for the same `lib/harness` floor without this tenant.

**Retirement verified** `false`  
**Retirement check** `bun run check:harness-complexity`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run check:harness-complexity`
