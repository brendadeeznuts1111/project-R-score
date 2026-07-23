# Prediction (ops C5)

Coverage prediction backtests and accuracy rollups for operations analytics.
SSOT lives here — not under `lib/operations/`.

| Path | Role |
|------|------|
| [`tester.ts`](tester.ts) | `simulateCoveragePrediction` · `runCoverageBacktest` · `getPredictionAccuracy` |
| [`schema.ts`](schema.ts) | `ensurePredictionSchema` → table `prediction_accuracy` |
| [`index.ts`](index.ts) | Public barrel |
| CLI | [`tools/ops-prediction.ts`](../../tools/ops-prediction.ts) · `bun run ops:prediction` |
| Schema hook | `migrateSchema` in [`lib/operations/schema.ts`](../operations/schema.ts) |
| Tests | [`tests/prediction-backtest.test.ts`](../../tests/prediction-backtest.test.ts) |
| Skill | [`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md) (C5) |
| Sibling (C4) | [`lib/experiments/`](../experiments/) · `bun run ops:experiments` |

## Model (v1)

Naive predictor as of date `D`:

```
100 × count(distinct prod active accounts with opened_at ≤ D)
    / count(active platforms with launch_date null or ≤ D)
```

Compared to `coverage_snapshots.coverage_percentage` for each snapshot in range.
Each backtest row is persisted to `prediction_accuracy` with MAE/RMSE/bias rollup.

## CLI

```bash
bun run ops:prediction --help
bun run ops:prediction backtest --from 2025-01-01 --to 2025-12-31
bun run ops:prediction accuracy
bun run ops:prediction accuracy --json
```

Env: `OPS_DB_PATH` (same ops DB as experiments / provision).

## Prove

```bash
bun test tests/prediction-backtest.test.ts
bun run ops:prediction --help
```
