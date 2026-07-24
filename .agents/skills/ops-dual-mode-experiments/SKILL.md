---
name: ops-dual-mode-experiments
description: >-
  Dual-mode provisioning (manual vs automated_test), factorial partner-policy
  experiments (FactorialEngine, phases, switchback, cluster), coverage prediction
  backtests, and champion/challenger shadow eval on FactoryWager operations.
  Use when working on provisioning queues, sandbox-gated WebView signup,
  experiment variants/phases, prediction_accuracy, ops-summary C4/C5 panels,
  or ops:diagnose / ops:snapshot freshness.
---

# Ops dual-mode + experiments

## When to use

- Provisioning queue / WebView signup / sandbox gate / `is_test` coverage exclude
- Factorial designs, sticky assign, switchback schedules, phased rollouts
- Coverage floor variants (`min_coverage_pct` …) affecting `canOfferOnPlatform`
- Prediction backtest / report / shadow champion-challenger
- Ops summary empty or stale on `/portal/ops/` · `/portal/dashboard/` · Pages

Deep maps (do not duplicate here): [`lib/experiments/README.md`](../../../lib/experiments/README.md) · [`lib/prediction/README.md`](../../../lib/prediction/README.md) · [`lib/provisioning/README.md`](../../../lib/provisioning/README.md) · [`docs/harness/ops-summary-endpoint.md`](../../../docs/harness/ops-summary-endpoint.md)

## Defaults

| Item | Value |
|------|--------|
| DB | `data/operations.db` via `openOperationsDb` ([`lib/operations/db.ts`](../../../lib/operations/db.ts)) |
| Modes | `manual` \| `automated_test` only ([`lib/provisioning/queue.ts`](../../../lib/provisioning/queue.ts)) |
| Crypto | AES-GCM via `encryptAesGcm` + `PROVISION_ENCRYPTION_KEY` |
| Automation | Extend `lib/automation/provision-accounts.ts` — no parallel provisioner |
| Experiments SSOT | [`lib/experiments/`](../../../lib/experiments/) — not under `lib/operations/` |
| Prediction SSOT | [`lib/prediction/`](../../../lib/prediction/) |

## Agent lanes (do not cross)

| Agent | Write allowlist |
|-------|-----------------|
| Schema | `lib/operations/schema.ts`, `lib/operations/platform-coverage.ts` (migrate helpers), `tests/operations-schema.test.ts` |
| Provision | `lib/provisioning/**`, `lib/automation/provision-accounts.ts`, `tools/provision-*.ts`, provision tests |
| Experiment | `lib/experiments/**`, `tools/ops-experiments.ts`, coverage hook in `platform-coverage.ts` / `liquidity.ts`, `tests/experiments-*.test.ts` |
| Prediction | `lib/prediction/**`, `tools/ops-prediction.ts`, shadow helpers in `lib/experiments/champion-challenger.ts`, `tests/prediction-*.test.ts` |
| Portal / summary | `lib/operations/ops-summary.ts`, `tools/ops-snapshot.ts`, `tools/ops-summary-diagnose.ts`, portal ops/dashboard clients — only when the task is summary/UI |
| Identity / bridge | `lib/operations/partner-profile-bridge.ts`, `lib/operations/ops-sync.ts`, `config/partner-templates/**`, `tests/partner-profile-bridge.test.ts`, [`docs/harness/tenants/ops-partner-bridge.md`](../../../docs/harness/tenants/ops-partner-bridge.md) |
| Channels harness | `lib/channels/ops-channel-event.ts`, `lib/channels/outbox.ts`, `tests/ops-channel-outbox.test.ts`, `public/portal/components/notification.js`, local `/api/channels/events` in `scripts/serve-public.ts` |
| Prove | Fix failing tests in owned files only |
| Orchestrator | Commits, `package.json` scripts, this skill |

Stage named files only. Never sweep unrelated dirty portal/DOD trees.

## Job loop

1. **Classify** — provision · experiment · prediction · summary/UI.
2. **Claim lane** — write only the allowlist above; name the split in the commit.
3. **Sandbox / policy** — live books fail closed; system factors are not partner-randomized.
4. **Prove** — lane tests + CLI `--help` smoke (below).
5. **Freeze for Pages** — `bun run ops:snapshot` when C4/C5 panels must ship; triage with `bun run ops:diagnose`.

## Env

| Variable | Role |
|----------|------|
| `PROVISION_ENCRYPTION_KEY` | credential AES-GCM key material |
| `OPS_DB_PATH` | ops DB path (default `data/operations.db`) |
| `OPS_MIN_PLATFORM_COVERAGE` | default coverage floor (variants may override) |
| `OPS_EXPERIMENT_SANDBOX=1` | relax partners/cell + duration gates for demos |

## Package scripts

| Script | Entry |
|--------|--------|
| `ops:experiments` | `bun tools/ops-experiments.ts` |
| `ops:prediction` | `bun tools/ops-prediction.ts` |
| `ops:snapshot` | `bun tools/ops-snapshot.ts` → `public/registry/ops-summary.json` |
| `ops:diagnose` | `bun tools/ops-summary-diagnose.ts` |
| `ops:provision-queue` | `bun tools/provision-queue.ts` |
| `ops:automation` | cron / `--once --coverage-prediction` |

## Dual-mode provision

| Path | Role |
|------|------|
| [`lib/provisioning/`](../../../lib/provisioning/) | Queue schema · enqueue · automated runner |
| [`lib/automation/provision-accounts.ts`](../../../lib/automation/provision-accounts.ts) | Sandbox-gated WebView signup |
| [`tools/provision-queue.ts`](../../../tools/provision-queue.ts) | CLI |
| Brands | provision task / account IDs via [`lib/types/branded.ts`](../../../lib/types/branded.ts) |

### Sandbox gate

Automated WebView provisioning is allowed only when:

- `platforms.url` matches `(?i)demo|test|sandbox`, **or**
- `platforms.sub_category = 'sandbox'`

Live books must fail closed. Test accounts set `partner_platform_accounts.is_test = 1` and are excluded from coverage “covered” counts.

## C4 — factorial experiments

| Path | Role |
|------|------|
| [`lib/experiments/`](../../../lib/experiments/) | Design · engine · phases · runner · analyze · policy · cluster · switchback · champion · outcomes |
| [`lib/experiments/engine.ts`](../../../lib/experiments/engine.ts) | `FactorialEngine` — create → sticky assign → metrics → analyze |
| [`lib/experiments/phases.ts`](../../../lib/experiments/phases.ts) | Sequential phase presets (1→4 factors) |
| [`lib/experiments/runner.ts`](../../../lib/experiments/runner.ts) | `launchPhase` + `dailyCheck` (no Bun.cron) |
| [`lib/experiments/outcomes.ts`](../../../lib/experiments/outcomes.ts) | Settlement metrics + `canOfferStakeForNode` |
| [`tools/ops-experiments.ts`](../../../tools/ops-experiments.ts) | CLI |
| Coverage | `resolveExperimentCoverageFloor` · `canOfferOnPlatform(..., partnerId?)` · `reservePlay(..., { checkCoverage })` |
| Brands | `ExperimentId` · `ExperimentVariantId` · `ExperimentAssignmentId` · `TreeNodeId` |

### Protocols (pick one per partner)

| Protocol | Use when | Mechanism |
|----------|----------|-----------|
| **between** | Cross-partner comparison | Sticky `assign` / `assign-cluster` |
| **switchback** | Control partner FE / time trends | `switchback-schedule` — **no** sticky assign for that partner |

Do not run both protocols for the same partner in one experiment.

### Phased timeline

Do **not** factorial all domains at once:

| Phase | Factors | Cells |
|-------|---------|-------|
| 1 | `routing` static\|dynamic | 2 |
| 2 | + `cut` 0.10\|0.15 | 4 |
| 3 | + `stake` fixed\|kelly | 8 |
| 4 | + `timing` immediate\|batched | 16 |

### Coverage floor keys (`COVERAGE_FLOOR_KEYS`)

Variant config may set: `min_coverage_pct` · `coverage_floor` · `minPlatformCoverage`.

### CLI (sandbox)

Production defaults: **10** partners/cell, **28**-day min duration (`OPS_EXPERIMENT_SANDBOX=1` or `--sandbox` relaxes).

```bash
OPS_EXPERIMENT_SANDBOX=1 bun run ops:experiments phase --n 1 --protocol switchback --period-days 7 --washout 1
bun run ops:experiments create --name routing-cut \
  --factors 'routing:static,dynamic;cut:0.10,0.15;min_coverage_pct:30,40' \
  --min-partners-per-variant 1 --min-duration-days 0
bun run ops:experiments activate --id <experimentId>
bun run ops:experiments assign --id <experimentId> --partner <treeNodeId>
bun run ops:experiments assign-cluster --id <experimentId> --partner <treeNodeId> --cluster-by expert
bun run ops:experiments switchback-schedule --id <experimentId> --partner <treeNodeId> --period-days 14
bun run ops:experiments check --id <experimentId>
bun run ops:experiments record --id <experimentId> --partner <treeNodeId> --value 0.58
bun run ops:experiments analyze --id <experimentId>
bun run ops:experiments switchback-analyze --id <experimentId>
```

`dailyCheck` harm pause is **operational** (mean gap + min n), not statistical significance. System-scoped factors (`model`, `automation_frequency`, …) → champion/challenger shadow, not partner randomization.

## C5 — coverage prediction + shadow

| Path | Role |
|------|------|
| [`lib/prediction/`](../../../lib/prediction/) | Backtest + accuracy rollup + report |
| [`lib/experiments/champion-challenger.ts`](../../../lib/experiments/champion-challenger.ts) | Shadow MAE promote (not p-values) |
| [`tools/ops-prediction.ts`](../../../tools/ops-prediction.ts) | CLI |
| Artifacts | `public/registry/prediction/*.{svg,html,png}` |

```bash
bun run ops:prediction daily --lookback 30
bun run ops:prediction backtest --from 2025-01-01 --to 2025-12-31
bun run ops:prediction report              # SVG+HTML
bun run ops:prediction report --webview    # + Bun.WebView → Bun.Image PNG
bun run ops:prediction accuracy --json
bun run ops:prediction shadow-log --champion naive --challenger rf --cpred 50 --gpred 48 --actual 49
bun run ops:prediction shadow-eval --min-n 100 --margin 0.01
bun run ops:automation --once --coverage-prediction
```

## Portal + summary

| Path | Role |
|------|------|
| [`/portal/ops/`](../../../public/portal/ops/) | Full verification + C4/C5 panels ([`operations-dashboard.js`](../../../public/portal/operations-dashboard.js)) |
| [`/portal/dashboard/`](../../../public/portal/dashboard/) | Executive KPIs (liquidity · growth · experiments · channel) |
| [`/monitoring/`](../../../public/monitoring/) | Routing/env/integrity compose |
| [`lib/operations/ops-summary.ts`](../../../lib/operations/ops-summary.ts) | Shared payload (`experiments`, `prediction`, `growth`, …) |
| [`functions/api/operations/summary.ts`](../../../functions/api/operations/summary.ts) | Pages: snapshot-only |
| `public/registry/ops-summary.json` | Deploy artifact from `ops:snapshot` |
| [`docs/harness/ops-summary-endpoint.md`](../../../docs/harness/ops-summary-endpoint.md) | Two-pipeline triage |

**Local:** `bun run serve:public` → `/api/operations/summary` is **live** `buildOpsSummary`.  
**Pages:** snapshot only — freeze with `bun run ops:snapshot` then deploy `public/`. Empty liquidity/plays with green proofs = empty DB, not a broken API.

```bash
bun run ops:diagnose
bun run ops:diagnose --compare-routing
bun run ops:snapshot --out /tmp/ops-summary.json
```

## Commit groups

| # | Scope | Status |
|---|--------|--------|
| C0 | this skill + README pointers | shipped |
| C1 | `is_test` + sandbox gate + coverage exclude | shipped |
| C2 | `provisioning_tasks` queue + CLI + automated_test wire | shipped |
| C3 | manual path + Telegram/KYC DOD | shipped |
| C4 | `FactorialEngine` + coverage / settlement hooks | shipped |
| C4b | phases · runner · cluster · switchback · champion shadow | shipped |
| C5 | `prediction_accuracy` + coverage backtest + report | shipped |
| I1 | partner profile bindings + bridge + ops-summary partners | shipped |
| I2 | evaluateForNode + gate decisions on publishAndDispatch | shipped |
| I3 | partner.bound + play.gate.* ops channel events | shipped |

## Prove

```bash
bun test tests/operations-schema.test.ts tests/ops-summary.test.ts tests/ops-summary-diagnose.test.ts
bun test tests/partner-profile-bridge.test.ts
bun test tests/platform-coverage.test.ts
bun test tests/provision-*.test.ts tests/provisioning-*.test.ts
bun test tests/experiments-*.test.ts
bun test tests/prediction-*.test.ts
bun run ops:provision-queue --help
bun run ops:experiments --help
bun run ops:prediction --help
bun run ops:diagnose
bun scripts/backfill-partner-bindings.ts --dry-run
bun run ops:snapshot --out /tmp/ops-summary.json
```

## Do not

- Parallel provisioners outside `lib/automation/provision-accounts.ts`
- Randomize system-scoped factors per partner
- Run **between** + **switchback** for the same partner in one experiment
- Factorial all four phase domains at once
- Treat `dailyCheck` pause or shadow MAE as statistical significance
- Sweep unrelated dirty portal/DOD trees into experiment/provision commits
- Expect live SQLite on Cloudflare Pages (snapshot only)
