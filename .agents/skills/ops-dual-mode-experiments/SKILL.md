---
name: ops-dual-mode-experiments
description: >-
  Dual-mode provisioning (manual vs automated_test), A/B experiments, and
  coverage prediction backtests on FactoryWager operations. Use when working
  on provisioning queues, sandbox-gated WebView signup, experiment variants,
  or prediction_accuracy.
---

# Ops dual-mode + experiments

## Defaults

| Item | Value |
|------|--------|
| DB | `data/operations.db` (`lib/operations/db.ts`) |
| Modes | `manual` \| `automated_test` only |
| Crypto | AES-GCM via `encryptAesGcm` + `PROVISION_ENCRYPTION_KEY` |
| Automation | Extend `lib/automation/provision-accounts.ts` — no parallel provisioner |

## Agent lanes (do not cross)

| Agent | Write allowlist |
|-------|-----------------|
| Schema | `lib/operations/schema.ts`, `lib/operations/platform-coverage.ts` (migrate helpers), `tests/operations-schema.test.ts` |
| Provision | `lib/provisioning/**`, `lib/automation/provision-accounts.ts`, `tools/provision-*.ts`, provision tests |
| Experiment | `lib/experiments/**`, `tools/ops-experiments.ts`, coverage-gate hook in liquidity/platform-coverage |
| Prediction | `lib/prediction/**`, `tools/ops-prediction.ts`, prediction tests |
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
5. **C4** — experiments engine + `canOfferOnPlatform` variant hook  
6. **C5** — `prediction_accuracy` + coverage backtest  

Stage named files only. Never sweep unrelated dirty portal/DOD trees.

## Env

- `PROVISION_ENCRYPTION_KEY` — credential AES-GCM key material  
- `OPS_DB_PATH` — override operations DB  
- `OPS_MIN_PLATFORM_COVERAGE` — default coverage floor (variants may override per partner)

## Prove commands

```bash
bun test tests/operations-schema.test.ts tests/platform-coverage.test.ts
bun test tests/provision-*.test.ts tests/provisioning-*.test.ts
bun test tests/experiments-*.test.ts tests/prediction-*.test.ts
bun run ops:provision-queue --help
bun run ops:experiments --help
bun run ops:prediction-backtest --help
```

## C4 surface (shipped)

| Path | Role |
|------|------|
| `lib/experiments/` | Design + engine + analyze + schema |
| `lib/experiments/outcomes.ts` | Settlement metrics + `canOfferStakeForNode` |
| `tools/ops-experiments.ts` | CLI (`ops:experiments`) |
| `settlePlay` | Auto-records win_rate/pnl for active experiments |
| `reservePlay(..., { checkCoverage: true })` | Partner floor via experiment assignment |
| `canOfferOnPlatform(..., partnerId?)` | Variant `min_coverage_pct` / `coverage_floor` |
| Brands | `ExperimentId`, `ExperimentVariantId`, `ExperimentAssignmentId`, `TreeNodeId` |
