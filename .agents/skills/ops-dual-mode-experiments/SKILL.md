---
name: ops-dual-mode-experiments
description: >-
  Dual-mode provisioning (manual vs automated_test), factorial partner-policy
  experiments (FactorialEngine), and coverage prediction backtests on
  FactoryWager operations. Use when working on provisioning queues,
  sandbox-gated WebView signup, experiment variants, or prediction_accuracy.
---

# Ops dual-mode + experiments

## Defaults

| Item | Value |
|------|--------|
| DB | `data/operations.db` via `openOperationsDb` ([`lib/operations/db.ts`](../../../lib/operations/db.ts)) |
| Modes | `manual` \| `automated_test` only |
| Crypto | AES-GCM via `encryptAesGcm` + `PROVISION_ENCRYPTION_KEY` |
| Automation | Extend `lib/automation/provision-accounts.ts` — no parallel provisioner |

## Agent lanes (do not cross)

| Agent | Write allowlist |
|-------|-----------------|
| Schema | `lib/operations/schema.ts`, `lib/operations/platform-coverage.ts` (migrate helpers), `tests/operations-schema.test.ts` |
| Provision | `lib/provisioning/**`, `lib/automation/provision-accounts.ts`, `tools/provision-*.ts`, provision tests |
| Experiment | `lib/experiments/**`, `tools/ops-experiments.ts`, coverage hook in `lib/operations/platform-coverage.ts` / `liquidity.ts`, `tests/experiments-*.test.ts` |
| Prediction | `lib/prediction/**`, `tools/ops-prediction.ts`, `tests/prediction-*.test.ts` |
| Prove | Fix failing tests in owned files only |
| Orchestrator | Commits, `package.json` scripts, this skill |

## Sandbox gate

Automated WebView provisioning is allowed only when:

- `platforms.url` matches `(?i)demo|test|sandbox`, **or**
- `platforms.sub_category = 'sandbox'`

Live books must fail closed. Test accounts set `partner_platform_accounts.is_test = 1` and are excluded from coverage “covered” counts.

## Commit groups (logical)

1. **C0** — this skill + README pointers  
2. **C1** — `is_test` + sandbox gate + coverage exclude  
3. **C2** — `provisioning_tasks` queue + CLI + automated_test wire  
4. **C3** — manual path + Telegram/KYC DOD  
5. **C4** — `FactorialEngine` + `canOfferOnPlatform` variant hook  
6. **C5** — `prediction_accuracy` + coverage backtest  

Stage named files only. Never sweep unrelated dirty portal/DOD trees.

## Env

- `PROVISION_ENCRYPTION_KEY` — credential AES-GCM key material  
- `OPS_DB_PATH` — override operations DB (`DEFAULT_OPS_DB_PATH` = `data/operations.db`)  
- `OPS_MIN_PLATFORM_COVERAGE` — default coverage floor (variants may override per partner)

## Prove commands

```bash
bun test tests/operations-schema.test.ts tests/platform-coverage.test.ts
bun test tests/provision-*.test.ts tests/provisioning-*.test.ts
bun test tests/experiments-*.test.ts tests/prediction-*.test.ts
bun run ops:provision-queue --help
bun run ops:experiments --help
bun run ops:prediction --help
```

## C4 surface (shipped)

| Path | Role |
|------|------|
| [`lib/experiments/`](../../../lib/experiments/) | Design · `FactorialEngine` · analyze · policy · schema · cluster · switchback |
| [`lib/experiments/outcomes.ts`](../../../lib/experiments/outcomes.ts) | Settlement metrics + `canOfferStakeForNode` / subject resolution |
| [`lib/experiments/README.md`](../../../lib/experiments/README.md) | Agent map (paths, naming, CLI, prove) |
| [`tools/ops-experiments.ts`](../../../tools/ops-experiments.ts) | CLI · package script `ops:experiments` |
| [`lib/operations/db.ts`](../../../lib/operations/db.ts) | `openOperationsDb` / `DEFAULT_OPS_DB_PATH` |
| [`lib/operations/liquidity.ts`](../../../lib/operations/liquidity.ts) | `ensurePosition` · `reservePlay(..., { checkCoverage })` |
| [`lib/operations/platform-coverage.ts`](../../../lib/operations/platform-coverage.ts) | `canOfferOnPlatform(..., partnerId?)` |
| `settlePlay` | Auto-records win_rate/pnl for active experiments via outcomes |
| Brands | `ExperimentId` · `ExperimentVariantId` · `ExperimentAssignmentId` · `TreeNodeId` via `lib/types/branded` |
| Tests | `tests/experiments-factorial.test.ts` · schema tables include `experiments*` |

### Coverage floor keys (`COVERAGE_FLOOR_KEYS`)

Variant config may set any of: `min_coverage_pct` · `coverage_floor` · `minPlatformCoverage`.

Resolved by `resolveExperimentCoverageFloor(db, partnerId)` for active assignments.

### Sandbox CLI (relax launch policy)

Production defaults: 10 partners/cell, 28-day min duration. Demo:

```bash
bun run ops:experiments create --name routing-cut \
  --factors 'routing:static,dynamic;cut:0.10,0.15;min_coverage_pct:30,40' \
  --min-partners-per-variant 1 --min-duration-days 0
bun run ops:experiments activate --id <experimentId>
bun run ops:experiments assign --id <experimentId> --partner <treeNodeId>
bun run ops:experiments record --id <experimentId> --partner <treeNodeId> --value 0.58
bun run ops:experiments analyze --id <experimentId>
```

### Package scripts

| Script | Entry |
|--------|--------|
| `ops:experiments` | `bun tools/ops-experiments.ts` |
| `ops:prediction` | `bun tools/ops-prediction.ts` |
| `ops:provision-queue` | `bun tools/provision-queue.ts` |

## C5 surface (shipped)

| Path | Role |
|------|------|
| [`lib/prediction/`](../../../lib/prediction/) | Coverage backtest + accuracy rollup |
| [`lib/prediction/schema.ts`](../../../lib/prediction/schema.ts) | `prediction_accuracy` table via `ensurePredictionSchema` |
| [`lib/prediction/tester.ts`](../../../lib/prediction/tester.ts) | `runCoverageBacktest` · `getPredictionAccuracy` |
| [`tools/ops-prediction.ts`](../../../tools/ops-prediction.ts) | CLI · package script `ops:prediction` |
| Tests | `tests/prediction-backtest.test.ts` |

```bash
bun test tests/prediction-backtest.test.ts
bun run ops:prediction backtest --from 2024-01-01 --to 2024-12-31
bun run ops:prediction accuracy
```
