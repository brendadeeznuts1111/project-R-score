# Factorial experiments (ops C4)

Multi-factor designs for **partner policy** (routing, cut %, stake, timing, coverage floor, …).
SSOT lives here — not under `lib/operations/`.

| Path | Role |
|------|------|
| [`design.ts`](design.ts) | Pure design: full / `regular-2level` / `balanced-subset` |
| [`engine.ts`](engine.ts) | `FactorialEngine` — create → sticky assign → metrics → analyze |
| [`phases.ts`](phases.ts) | Sequential phase presets (1→4 factors, full factorial each phase) |
| [`runner.ts`](runner.ts) | `launchPhase` + `dailyCheck` (cluster or switchback; no Bun.cron) |
| [`analyze.ts`](analyze.ts) | Main effects + two-way interactions + `predictFromEffects` |
| [`schema.ts`](schema.ts) | Experiment tables |
| [`policy.ts`](policy.ts) | Factor scope, resolution, sample-size, duration launch guardrails |
| [`cluster.ts`](cluster.ts) | `assignClustered` — spillover boundary per opaque cluster key |
| [`switchback.ts`](switchback.ts) | Within-partner schedules + time-adjusted `analyzeSwitchback` |
| [`champion-challenger.ts`](champion-challenger.ts) | System-model shadow MAE promote rule (not p-values) |
| [`outcomes.ts`](outcomes.ts) | Settlement metrics + `canOfferStakeForNode` |
| [`index.ts`](index.ts) | Public barrel |

## Dual protocols

| Protocol | Use when | How |
|----------|----------|-----|
| **between** | Cross-partner comparison | Sticky `assignClustered` (`expert_id` → `parent_id` → `default`) |
| **switchback** | Control partner fixed effects / time trends | `createSwitchbackSchedule` seeded by cluster key — **no** sticky assign for that partner |

Do not run both protocols for the same partner in one experiment.

## Phased timeline (practical factorials)

Do **not** factorial all domains at once. Sequential phases:

| Phase | Months | Factors | Cells |
|-------|--------|---------|-------|
| 1 | 1–2 | `routing` static\|dynamic | 2 |
| 2 | 3–4 | + `cut` 0.10\|0.15 | 4 |
| 3 | 5–6 | + `stake` fixed\|kelly | 8 |
| 4 | 7–8 | + `timing` immediate\|batched | 16 |

```bash
OPS_EXPERIMENT_SANDBOX=1 bun run ops:experiments phase --n 1 --protocol switchback --period-days 7 --washout 1
bun run ops:experiments check --id <experimentId>
```

## CLI

```bash
bun run ops:experiments --help
bun run ops:experiments design --factors 'routing:static,dynamic;cut:0.10,0.15' --fraction 1
bun run ops:experiments phase --n 1 --protocol switchback --period-days 14 --washout 3
bun run ops:experiments assign-cluster --id <id> --partner <node> --cluster-by expert
bun run ops:experiments switchback-schedule --id <id> --partner <node> --period-days 14
bun run ops:experiments switchback-analyze --id <id>
bun run ops:experiments check --id <id>
bun run ops:experiments analyze --id <id>
```

Env: `OPS_DB_PATH` · `OPS_EXPERIMENT_SANDBOX=1` (relax partner/duration gates for demos).

## System factors → champion/challenger

`model`, `automation_frequency`, `reconciliation_mode`, infrastructure are **system-scoped**
([`policy.ts`](policy.ts)) — not randomized per partner.

```bash
bun run ops:prediction shadow-log --champion naive --challenger rf --cpred 50 --gpred 48 --actual 49
bun run ops:prediction shadow-eval --min-n 100 --margin 0.01
```

Promote recommendations are MAE + n + margin only — **not** a p-value claim.

## Coverage gate + settlement

- Variant keys `min_coverage_pct` / `coverage_floor` / `minPlatformCoverage` → `canOfferOnPlatform`
- Switchback current period wins over sticky assignment when a schedule exists
- `settlePlay` → `recordPlaySettlementOutcomes` for active experiments

## Guardrails

- Harm early pause in `dailyCheck` is **operational** (mean gap + min n), not statistical significance
- Default launch: Resolution IV, 10 partners/cell, 28 days (sandbox overrides via env/flags)
- Contextual bandits deferred

## Prove

```bash
bun test tests/experiments-factorial.test.ts \
         tests/experiments-phases.test.ts \
         tests/experiments-runner.test.ts \
         tests/experiments-champion.test.ts \
         tests/operations-schema.test.ts
bun run ops:experiments phase --n 1 --sandbox --protocol between
```
