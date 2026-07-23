# Factorial experiments (ops C4)

Multi-factor designs for **partner policy** (routing, cut %, coverage floor, …).
SSOT lives here — not under `lib/operations/`.

| Path | Role |
|------|------|
| [`design.ts`](design.ts) | Pure design: full / `regular-2level` / `balanced-subset` |
| [`engine.ts`](engine.ts) | `FactorialEngine` — create → sticky assign → metrics → analyze; A/B helpers |
| [`analyze.ts`](analyze.ts) | Main effects + two-way interactions + `predictFromEffects` |
| [`schema.ts`](schema.ts) | `ensureExperimentsSchema` — tables listed below |
| [`policy.ts`](policy.ts) | Factor scope, resolution, sample-size, duration launch guardrails |
| [`cluster.ts`](cluster.ts) | `assignClustered` — shared cell per operator `clusterKey` (spillover boundary) |
| [`switchback.ts`](switchback.ts) | Within-partner schedules + `analyzeSwitchback` (time-varying effects) |
| [`outcomes.ts`](outcomes.ts) | Settlement metrics, `resolveExperimentSubject`, `canOfferStakeForNode` |
| [`index.ts`](index.ts) | Public barrel (`FactorialEngine`, `generateDesign`, `analyzeFactorial`, …) |

**Wiring**

| Concern | Path |
|---------|------|
| DB open + schema init | [`lib/operations/db.ts`](../operations/db.ts) → `initSchema` → `migrateSchema` → `ensureExperimentsSchema` |
| Coverage offer gate | [`lib/operations/platform-coverage.ts`](../operations/platform-coverage.ts) `canOfferOnPlatform(..., partnerId?)` |
| Liquidity + reserve | [`lib/operations/liquidity.ts`](../operations/liquidity.ts) `ensurePosition` · `reservePlay(..., { checkCoverage })` |
| Settlement hook | [`play-settlement.ts`](../operations/play-settlement.ts) → [`outcomes.ts`](outcomes.ts) |
| CLI | [`tools/ops-experiments.ts`](../../tools/ops-experiments.ts) · package script `ops:experiments` |
| Brands | [`lib/types/branded.ts`](../types/branded.ts) → `ExperimentId`, `ExperimentVariantId`, `ExperimentAssignmentId`, `TreeNodeId` |
| Tests | `tests/experiments-factorial.test.ts` · `tests/experiments-outcomes.test.ts` · `tests/operations-schema.test.ts` |
| Skill | [`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md) |
| Sibling (C5) | [`lib/prediction/`](../prediction/) · `bun run ops:prediction` |

## Tables (`ensureExperimentsSchema`)

| Table | Purpose |
|-------|---------|
| `experiments` | Design + policy JSON, status `draft\|active\|paused\|completed` |
| `experiment_variants` | One row per design cell (`config_json` / `config_key`) |
| `experiment_assignments` | Sticky partner → variant (`UNIQUE(experiment_id, partner_id)`) |
| `experiment_metrics` | Partner metric observations (`metric_name`, `metric_value`) |
| `experiment_cluster_assignments` | Cluster key → variant (spillover-aware assign) |
| `experiment_switchback_periods` | Within-partner time windows + washout |

## Naming

| Name | Meaning |
|------|---------|
| `FactorialEngine` | Primary API class (preferred for new code) |
| `generateDesign(factors, fractionDenom)` | Pure design; `fractionDenom` 1 = full, 2 = ½, … |
| `VariantConfig` | Factor name → level map for one design cell |
| `configKey(config)` | Stable JSON key (sorted keys) for uniqueness |
| `COVERAGE_FLOOR_KEYS` | `min_coverage_pct` · `coverage_floor` · `minPlatformCoverage` |
| `resolveExperimentCoverageFloor(db, partnerId)` | Active assignment floor for `canOfferOnPlatform` |
| `canOfferStakeForNode` | Subject resolve + sticky assign + coverage floor |
| `createExperiment` / `activateExperiment` / `assignVariant` / `logMetric` / `getResults` | Legacy-style A/B helpers on the same tables |

## CLI

Package script → `bun tools/ops-experiments.ts`.

```bash
bun run ops:experiments --help

# Design only (no DB)
bun run ops:experiments design \
  --factors 'routing:static,dynamic;cut:0.10,0.15' --fraction 1

# Production defaults: Resolution IV, 10 partners/cell, 28 days
bun run ops:experiments create --name routing-cut \
  --factors 'routing:static,dynamic;cut:0.10,0.15;min_coverage_pct:30,40'

# Sandbox / demo (relax launch policy at create time)
bun run ops:experiments create --name routing-cut \
  --factors 'routing:static,dynamic;cut:0.10,0.15;min_coverage_pct:30,40' \
  --min-partners-per-variant 1 --min-duration-days 0

bun run ops:experiments activate --id <experimentId>
bun run ops:experiments assign --id <experimentId> --partner <treeNodeId>
bun run ops:experiments record --id <experimentId> --partner <treeNodeId> --value 0.58
bun run ops:experiments analyze --id <experimentId>
```

Env: `OPS_DB_PATH` (default `data/operations.db` from `DEFAULT_OPS_DB_PATH`).

## Coverage gate hook

Active assignments may set any of `COVERAGE_FLOOR_KEYS` on the variant config.
`canOfferOnPlatform(db, platformId, stake, minPct, partnerId?)` uses that floor
when `partnerId` is provided. `canOfferStakeForNode` /
`reservePlay(..., { checkCoverage: true })` resolve the partner subject,
sticky-assign into active experiments, then apply the floor.

## Outcome plumbing (settlement)

`settlePlay` calls `recordPlaySettlementOutcomes` (best-effort):

1. Resolve partner subject (walk leaf → root; prefer `type = partner`)
2. Sticky-assign into every **active** experiment
3. Record primary metric (`win_rate` 1/0 on win/loss, or `pnl`) + auxiliary
   `pnl` when primary is win_rate
4. push/void → no win_rate row (no signal)

Analyze with `bun run ops:experiments analyze --id <id>` after settlements
accumulate.

## Operational design guardrails

- Creation rejects system-scoped factors (`model`, `automation_frequency`,
  `reconciliation_mode`, infrastructure) — evaluate those via backtest / shadow /
  champion–challenger, not per-partner factorial assignment.
- Default launch policy: Resolution IV for regular two-level fractions, **10**
  active partners per design cell, **28**-day minimum exposure.
- `balanced-subset` designs are exploratory (aliasing unknown).
- Overrides are persisted on the experiment; `activate` fails with an explicit
  readiness gap rather than launching underpowered designs.
- Analysis is marked descriptive until minimum exposure duration is met.
- Engine is between-partner today; do not treat cross-sectional results as proof
  of time-stable causal effects (use switchback for partner fixed effects).
- `assignClustered` persists one design cell per opaque cluster key, preventing
  related partners from receiving competing terms.
- `createSwitchbackSchedule` creates deterministic, counterbalanced treatment
  periods with baseline washout gaps; `recordSwitchbackMetric` rejects metrics
  outside treatment, and `analyzeSwitchback` returns time-adjusted descriptive
  effects rather than a promotion decision or p-value.

## Prove

```bash
bun test tests/experiments-factorial.test.ts \
         tests/experiments-outcomes.test.ts \
         tests/operations-schema.test.ts
bun run ops:experiments design --factors 'routing:static,dynamic;cut:0.10,0.15' --fraction 1
bun run ops:experiments --help
```
