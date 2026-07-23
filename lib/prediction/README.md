# Prediction (ops C5)

Coverage prediction backtests and accuracy rollups for operations analytics.
SSOT lives here — not under `lib/operations/`.

| Path | Role |
|------|------|
| [`tester.ts`](tester.ts) | `simulateCoveragePrediction` · `runCoverageBacktest` · `runDailyCoveragePredictionCycle` · `getPredictionAccuracy` |
| [`report.ts`](report.ts) | SVG chart + HTML; optional `Bun.WebView` → `Bun.Image` PNG |
| [`schema.ts`](schema.ts) | `ensurePredictionSchema` → table `prediction_accuracy` |
| [`index.ts`](index.ts) | Public barrel |
| CLI | [`tools/ops-prediction.ts`](../../tools/ops-prediction.ts) · `bun run ops:prediction` |
| Cron | [`lib/accounts/automation.ts`](../accounts/automation.ts) · `ops-coverage-prediction` @ 01:00 UTC |
| Schema hook | `migrateSchema` in [`lib/operations/schema.ts`](../operations/schema.ts) |
| Tests | `tests/prediction-backtest.test.ts` · `tests/prediction-report.test.ts` |
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
bun run ops:prediction daily --lookback 30
bun run ops:prediction backtest --from 2025-01-01 --to 2025-12-31
bun run ops:prediction report              # SVG+HTML → public/registry/prediction/
bun run ops:prediction report --webview    # + Bun.WebView screenshot → Bun.Image PNG
bun run ops:prediction accuracy --json
bun run ops:snapshot                       # ops-summary.json + report assets for Pages
```

Env: `OPS_DB_PATH` (same ops DB as experiments / provision).

Backtest inserts are **idempotent** per `(prediction_type, prediction_date, model_version)`.

### Report artifacts (Bun native)

| File | How |
|------|-----|
| `public/registry/prediction/coverage-chart.svg` | Pure SVG from series |
| `public/registry/prediction/report.html` | Table + chart |
| `public/registry/prediction/coverage-chart.png` | Optional: `Bun.WebView` → `Bun.Image` |

Portal `/portal/ops` loads PNG or SVG. Pages needs `ops:snapshot` (and preferably report assets) committed/deployed. Disable CF Pages SPA rewrite so `/registry/*.json` is not HTML.

## Prove

```bash
bun test tests/prediction-backtest.test.ts tests/prediction-report.test.ts
bun run ops:prediction report
```
