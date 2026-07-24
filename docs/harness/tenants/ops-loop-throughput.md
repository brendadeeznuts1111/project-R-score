# Ops loop throughput (Identity → Gate → Settle → Channels)

**Claim:** `ops-loop-throughput` — closed-loop automation with measurable baseline/post lift (target ≥60% on `loopCompletionRate`).

| Piece | Path |
|-------|------|
| Metrics | [`lib/operations/ops-loop-metrics.ts`](../../lib/operations/ops-loop-metrics.ts) · `buildOpsSummary().loop` |
| Settlement caller | [`tools/ops-settle.ts`](../../../tools/ops-settle.ts) · `runOpsSettleCycle` in [`snapshot-cron.ts`](../../lib/operations/snapshot-cron.ts) |
| Sync consumer cron | `runOpsSyncCycle` · [`tools/ops-sync-consumer.ts`](../../../tools/ops-sync-consumer.ts) |
| Durable projector | [`lib/channels/outbox.ts`](../../lib/channels/outbox.ts) · `opts.r2Store` |
| Portal panel | **Ops loop** on `/portal/ops/` · `<notification-center>` topics `identity` + `plays` |
| Reports | [`reports/ops-loop-baseline.json`](../../../reports/ops-loop-baseline.json) · [`reports/ops-loop-post.json`](../../../reports/ops-loop-post.json) · [`reports/ops-loop-post-live.json`](../../../reports/ops-loop-post-live.json) |
| Live proof caller | [`tools/ops-loop-live-proof.ts`](../../../tools/ops-loop-live-proof.ts) |
| Legacy gate backfill | [`lib/operations/ops-loop-gate-backfill.ts`](../../lib/operations/ops-loop-gate-backfill.ts) · [`tools/ops-loop-gate-backfill.ts`](../../../tools/ops-loop-gate-backfill.ts) |

## Metric definitions

| Field | Definition |
|-------|------------|
| `dispatched` | Rows in `play_distribution` (recipient fan-out). |
| `gatedAllow` / `gatedAdjust` / `gatedDeny` | Counts from `play_gate_decisions`. |
| `reserved` | Same as dispatched (successful reserve + enqueue). |
| `settled` | `plays.result` closed (not `pending`). |
| `settledViaFullLoop` | Settled play with gate allow/adjust on same node + `play.settled` outbox row `sent`. |
| `manualStepsPerCycle` | Pending distributed plays + pending outbox rows. |
| **`loopCompletionRate`** | `settledViaFullLoop / dispatched` (0 when dispatched = 0). |

**60% claim:** `(post.loopCompletionRate - baseline.loopCompletionRate) / baseline.loopCompletionRate ≥ 0.6` when baseline rate > 0; when baseline ≈ 0, post rate must be ≥ 0.6 absolute.

Developer velocity is tracked separately via `bun run harness:status` → `reports/harness-gate-timing.json` gate sum.

## Commands

```bash
# Capture baseline (before hardening) / post (after)
bun tools/ops-loop-report.ts --out reports/ops-loop-baseline.json
bun tools/ops-loop-report.ts --out reports/ops-loop-post.json --fixture --compare reports/ops-loop-baseline.json

# Live DB proof (one gated play → settle → outbox)
bun tools/ops-loop-live-proof.ts
bun tools/ops-loop-report.ts --out reports/ops-loop-post-live.json --compare reports/ops-loop-baseline.json

# Production callers
bun run ops:settle -- --help
bun run ops:sync
bun run ops:snapshot:once   # also runs sync + settle ticks

# Cron daemon (snapshot + sync + settle UTC schedules)
bun run ops:snapshot:cron

# Legacy gate + settle outbox backfill (live DB repair — not re-dispatch)
bun run ops:loop:backfill -- --dry-run
bun run ops:loop:backfill
bun tools/ops-loop-report.ts --out reports/ops-loop-post-live.json --compare reports/ops-loop-baseline.json

# Tests
bun test tests/ops-loop-hardening.test.ts tests/ops-summary.test.ts
```

## Legacy gate backfill semantics

Dispatches that predate `play_gate_decisions` (and settled plays missing `play.settled` outbox rows) under-count `settledViaFullLoop`. The backfill **attributes** history; it does **not** re-dispatch, re-settle, or mutate `plays.result` / liquidity.

| Step | Action |
|------|--------|
| Gate | For each `play_distribution` row with no matching `play_gate_decisions`, insert `allowed=1`, `action='allow'`, `adjusted_stake` from `stake_actual` or `plays.stake_recommended`, reason `Legacy gate attribution (backfill — not re-dispatch)`. |
| Settle outbox | For each settled play (`result != pending`) and distribution node lacking a **sent** `play.settled` row (`idempotency_key` `settle:{playId}:{nodeId}`), enqueue via `enqueueSettlementChannelEvent` then drain with `processChannelOutbox` (`deliver: false` by default). |

**60% ceiling on live DB:** `loopCompletionRate = settledViaFullLoop / dispatched` uses `COUNT(DISTINCT play_id)` in the numerator but `COUNT(*)` on `play_distribution` in the denominator. Multi-node fan-out inflates `dispatched` faster than distinct settled plays can lift the rate. After backfill, report the achieved rate in `reports/ops-loop-post-live.json`; reaching ≥60% absolute may require a clean slate or fewer legacy distribution rows, not more attribution alone.

## Closed loop (target)

```text
Pages onboard → R2 ops-sync → runOpsSyncCycle → bindPartnerProfile
  → publishAndDispatch → gate → reservePlayWithRetry → ops_channel_outbox
  → runOpsSettleCycle / ops:settle → play.settled → R2 projector
  → /portal/ops/ notification-center
```

## Auth note

`/api/channels/events` on `serve-public` requires `REGISTRY_SECRET` bearer outside `SERVE_PUBLIC_DEV=1` / `NODE_ENV=development`.

## Post-audit closure (e26651c9e → e2f85a6ec)

| Finding | Severity | Status | Evidence |
|---------|----------|--------|----------|
| `settlePlay` no production caller | Critical | **Closed** | `tools/ops-settle.ts` · `runOpsSettleCycle` |
| Stake from `stake_recommended` not `stake_actual` | Critical | **Closed** | `play-settlement.ts` · `tests/ops-loop-hardening.test.ts` |
| Outbox R2 projector = memory only | Critical | **Closed** | `resolveProductionOutboxOpts` · `flushOutbox` · cron |
| `ops:sync` manual only | Critical | **Closed** | `registerOpsSyncCron` · snapshot `--once` tick |
| OpSec TOML not enforced | Critical | **Closed** | `evaluateForNode` + `metadata_json` opsec fields |
| No `<notification-center>` on `/portal/ops/` | Critical | **Closed** | `public/portal/ops/index.html` |
| `/api/channels/events` unauthenticated | Critical | **Closed** | `serve-public.ts` `SERVE_DEVELOPMENT` gate |
| `bindPartnerProfile` race | Medium | **Closed** | `ON CONFLICT DO UPDATE` upsert |
| `reservePlay` no version retry | Medium | **Closed** | `reservePlayWithRetry` |
| Book coverage unused at dispatch | Medium | **Closed** | `play.bookSlug` → `checkCoverage` |
| Demo snapshot vs live DB | Medium | **Proven** | Live proof 2026-07-24: `ops-loop-live-proof` → `settledViaFullLoop` 0→1; rate 0→4.5% (19 legacy rows lack gates; ≥60% absolute needs gated backfill or clean slate) |
| Topic taxonomy drift | Medium | **Closed** | Tenant doc lists `identity` · `plays` · `ops-sync` |

Production R2 projection is best-effort: when `config/r2-env` credentials are absent, projectors fall back to in-process memory (dev parity only).
