# Tenant: coverage-floor

**Tenant** `coverage-floor` (code-quality · not a spine cron)  
**Runs** `bun run test:harness-coverage`  
**Proof** `harness-coverage-ratchet`  
**Catalog** `lib/harness/code-quality.ts` · baseline [`coverage-baseline.json`](../../../lib/harness/coverage-baseline.json)

## Signal (failure)

Harness coverage probe reports `lib/harness` lines or funcs below the floors in `coverage-baseline.json`.

## Intervention (repair)

1. Reproduce: `bun run test:harness-coverage`
2. Add or extend tests that exercise uncovered harness modules (prefer the coverage probe suite — do not pull live spine proofs into the probe)
3. Optionally raise floors in `coverage-baseline.json` after improving coverage (never lower without a retirement PR)
4. Re-run: `bun run test:harness-coverage`

## Retirement

Remove when Bun `coverageThreshold` in bunfig (or CI) enforces the same harness floor without this tenant.

**Retirement verified** `false`  
**Retirement check** proofId `harness-coverage-ratchet`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run test:harness-coverage`
