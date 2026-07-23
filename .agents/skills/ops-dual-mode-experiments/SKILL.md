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

## Commit groups

| # | Scope | Status |
|---|--------|--------|
| C0 | this skill + README pointers | shipped |
| C1 | `is_test` + sandbox gate + coverage exclude | shipped |
| C2 | `provisioning_tasks` queue + CLI + automated_test wire | shipped |
| C3 | manual path + Telegram/KYC DOD | shipped |
| C4 | `FactorialEngine` + coverage / settlement hooks | shipped |
| C5 | `prediction_accuracy` + coverage backtest | shipped |

Stage named files only. Never sweep unrelated dirty portal/DOD trees.

## Env

| Variable | Role |
|----------|------|
| `PROVISION_ENCRYPTION_KEY` | credential AES-GCM key material |
| `OPS_DB_PATH` | ops DB path (default `data/operations.db`) |
| `OPS_MIN_PLATFORM_COVERAGE` | default coverage floor (variants may override) |

## Package scripts

| Script | Entry |
|--------|--------|
| `ops:experiments` | `bun tools/ops-experiments.ts` |
| `ops:prediction` | `bun tools/ops-prediction.ts` |
| `ops:snapshot` | `bun tools/ops-snapshot.ts` → `public/registry/ops-summary.json` |
| `ops:provision-queue` | `bun tools/provision-queue.ts` |

## Portal + Cloudflare Pages

| Path | Role |
|------|------|
| `public/portal/ops/` | Ops dashboard UI |
| `public/portal/operations-dashboard.js` | Fetches summary; panels for experiments + prediction |
| `functions/api/operations/summary.ts` | Live `buildOpsSummary` or snapshot fallback |
| `lib/operations/ops-summary.ts` | Shared payload builder (C4/C5 fields) |
| `public/registry/ops-summary.json` | Static seed / Pages deploy artifact |

**Local:** open `/portal/ops` with a running serve that mounts `functions/` + `public/` (SQLite live).  
**Pages:** no bun:sqlite — run `bun run ops:snapshot` before deploy so the dashboard still renders.

## Prove commands

```bash
bun test tests/operations-schema.test.ts tests/ops-summary.test.ts tests/platform-coverage.test.ts
bun test tests/provision-*.test.ts tests/provisioning-*.test.ts
bun test tests/experiments-*.test.ts tests/prediction-*.test.ts
bun run ops:provision-queue --help
bun run ops:experiments --help
bun run ops:prediction --help
bun run ops:snapshot --out /tmp/ops-summary.json
```

## C4 surface — factorial experiments

| Path | Role |
|------|------|
| [`lib/experiments/`](../../../lib/experiments/) | Design · `FactorialEngine` · analyze · policy · schema · cluster · switchback |
| [`lib/experiments/outcomes.ts`](../../../lib/experiments/outcomes.ts) | Settlement metrics + `canOfferStakeForNode` / subject resolution |
| [`lib/experiments/README.md`](../../../lib/experiments/README.md) | Agent map (paths, naming, CLI, prove) |
| [`tools/ops-experiments.ts`](../../../tools/ops-experiments.ts) | CLI |
| [`lib/operations/db.ts`](../../../lib/operations/db.ts) | `openOperationsDb` / `DEFAULT_OPS_DB_PATH` |
| [`lib/operations/liquidity.ts`](../../../lib/operations/liquidity.ts) | `ensurePosition` · `reservePlay(..., { checkCoverage })` |
| [`lib/operations/platform-coverage.ts`](../../../lib/operations/platform-coverage.ts) | `canOfferOnPlatform(..., partnerId?)` |
| `settlePlay` | Auto-records win_rate/pnl for active experiments via outcomes |
| Brands | `ExperimentId` · `ExperimentVariantId` · `ExperimentAssignmentId` · `TreeNodeId` |
| Tests | `tests/experiments-factorial.test.ts` · `tests/experiments-outcomes.test.ts` |

### Coverage floor keys (`COVERAGE_FLOOR_KEYS`)

Variant config may set: `min_coverage_pct` · `coverage_floor` · `minPlatformCoverage`.

Resolved by `resolveExperimentCoverageFloor(db, partnerId)` for active assignments.

### Sandbox CLI (relax launch policy)

Production defaults: **10** partners/cell, **28**-day min duration.

```bash
bun run ops:experiments create --name routing-cut \
  --factors 'routing:static,dynamic;cut:0.10,0.15;min_coverage_pct:30,40' \
  --min-partners-per-variant 1 --min-duration-days 0
bun run ops:experiments activate --id <experimentId>
bun run ops:experiments assign --id <experimentId> --partner <treeNodeId>
bun run ops:experiments record --id <experimentId> --partner <treeNodeId> --value 0.58
bun run ops:experiments analyze --id <experimentId>
```

## C5 surface — coverage prediction

| Path | Role |
|------|------|
| [`lib/prediction/`](../../../lib/prediction/) | Coverage backtest + accuracy rollup |
| [`lib/prediction/schema.ts`](../../../lib/prediction/schema.ts) | `prediction_accuracy` via `ensurePredictionSchema` |
| [`lib/prediction/tester.ts`](../../../lib/prediction/tester.ts) | `runCoverageBacktest` · `getPredictionAccuracy` |
| [`lib/prediction/README.md`](../../../lib/prediction/README.md) | Model notes + CLI |
| [`tools/ops-prediction.ts`](../../../tools/ops-prediction.ts) | CLI |
| Tests | `tests/prediction-backtest.test.ts` |

```bash
bun test tests/prediction-backtest.test.ts tests/experiments-*.test.ts
bun run ops:prediction daily --lookback 30
bun run ops:prediction backtest --from 2024-01-01 --to 2024-12-31
bun run ops:prediction accuracy
# alias (same CLI):
bun run ops:prediction-backtest --help
# cron process (daily snapshot+backtest at 01:00 UTC)
bun run ops:automation --once --coverage-prediction
```

### C4 extensions (policy · cluster · switchback)

| Path | Role |
|------|------|
| `lib/experiments/policy.ts` | Launch guardrails (resolution, partners/cell, duration, system-factor block) |
| `lib/experiments/cluster.ts` | `assignClustered` — shared cell per `clusterKey` |
| `lib/experiments/switchback.ts` | Within-partner schedules + washout + `analyzeSwitchback` |
| Tests | `tests/experiments-policy-cluster-switchback.test.ts` |
