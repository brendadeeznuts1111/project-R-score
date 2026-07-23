# Prediction (ops C5)

Coverage prediction backtests and accuracy rollups for operations analytics.

| Path | Role |
|------|------|
| [`tester.ts`](tester.ts) | `runCoverageBacktest` · `getPredictionAccuracy` |
| [`schema.ts`](schema.ts) | Prediction accuracy tables (if any) |
| [`index.ts`](index.ts) | Public barrel |
| CLI | [`tools/ops-prediction.ts`](../../tools/ops-prediction.ts) · `bun run ops:prediction` |
| Skill | [`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md) (C5) |

```bash
bun run ops:prediction --help
bun run ops:prediction backtest --from=2025-01-01 --to=2025-12-31
bun run ops:prediction accuracy
```

Env: `OPS_DB_PATH` (same ops DB as experiments / provision).
