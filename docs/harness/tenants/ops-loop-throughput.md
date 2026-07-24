# Ops loop throughput (Identity → Gate → Settle → Channels)

**Claim:** `ops-loop-throughput` — closed-loop automation with measurable baseline/post lift (target ≥60% on `loopCompletionRate`).

| Piece | Path |
|-------|------|
| Metrics | [`lib/operations/ops-loop-metrics.ts`](../../lib/operations/ops-loop-metrics.ts) · `buildOpsSummary().loop` |
| Settlement caller | [`tools/ops-settle.ts`](../../../tools/ops-settle.ts) · `runOpsSettleCycle` in [`snapshot-cron.ts`](../../lib/operations/snapshot-cron.ts) |
| Sync consumer cron | `runOpsSyncCycle` · [`tools/ops-sync-consumer.ts`](../../../tools/ops-sync-consumer.ts) |
| Durable projector | [`lib/channels/outbox.ts`](../../lib/channels/outbox.ts) · `opts.r2Store` |
| Portal panel | **Ops loop** on `/portal/ops/` · `<notification-center>` topics `identity` + `plays` |
| Reports | [`reports/ops-loop-baseline.json`](../../../reports/ops-loop-baseline.json) · [`reports/ops-loop-post.json`](../../../reports/ops-loop-post.json) |

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

# Production callers
bun run ops:settle -- --help
bun run ops:sync
bun run ops:snapshot:once   # also runs sync + settle ticks

# Cron daemon (snapshot + sync + settle UTC schedules)
bun run ops:snapshot:cron

# Tests
bun test tests/ops-loop-hardening.test.ts tests/ops-summary.test.ts
```

## Closed loop (target)

```text
Pages onboard → R2 ops-sync → runOpsSyncCycle → bindPartnerProfile
  → publishAndDispatch → gate → reservePlayWithRetry → ops_channel_outbox
  → runOpsSettleCycle / ops:settle → play.settled → R2 projector
  → /portal/ops/ notification-center
```

## Auth note

`/api/channels/events` on `serve-public` requires `REGISTRY_SECRET` bearer outside `SERVE_PUBLIC_DEV=1` / `NODE_ENV=development`.
