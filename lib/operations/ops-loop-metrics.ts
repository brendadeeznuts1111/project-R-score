// @see https://bun.com/docs/runtime/sqlite
/**
 * Ops closed-loop throughput counters — dispatch → gate → reserve → settle → durable delivery.
 *
 * Metric SSOT: docs/harness/tenants/ops-loop-throughput.md
 */
import type { Database } from 'bun:sqlite';

export type OpsLoopMetricsSlice = {
  /** play_distribution fan-out rows (recipient dispatches). */
  dispatched: number;
  gatedAllow: number;
  gatedAdjust: number;
  gatedDeny: number;
  /** Rows in play_distribution (successful reserve + enqueue). */
  reserved: number;
  /** plays.result closed (not pending). */
  settled: number;
  /** Settled plays with gate allow/adjust + distribution + play.settled outbox sent. */
  settledViaFullLoop: number;
  outboxSent: number;
  outboxFailed: number;
  outboxPending: number;
  /** Seconds since oldest pending outbox row; null when none pending. */
  oldestPendingAgeSec: number | null;
  /** Manual intervention points still open (unsettled distributed, pending outbox). */
  manualStepsPerCycle: number;
  /** settledViaFullLoop / dispatched (0 when dispatched = 0). */
  loopCompletionRate: number;
};

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $n LIMIT 1`)
    .get({ $n: name }) as { ok: number } | null;
  return row != null;
}

/** Aggregate closed-loop counters from operations SQLite. */
export function queryLoopMetricsSlice(db: Database): OpsLoopMetricsSlice {
  if (!tableExists(db, 'play_distribution')) {
    return emptyLoopSlice();
  }

  const dispatched = (
    db.query(`SELECT COUNT(*) AS n FROM play_distribution`).get() as { n: number }
  ).n;

  let gatedAllow = 0;
  let gatedAdjust = 0;
  let gatedDeny = 0;
  if (tableExists(db, 'play_gate_decisions')) {
    const gate = db
      .query(
        `SELECT
           COALESCE(SUM(CASE WHEN allowed = 1 AND action = 'allow' THEN 1 ELSE 0 END), 0) AS allow_n,
           COALESCE(SUM(CASE WHEN allowed = 1 AND action = 'adjust' THEN 1 ELSE 0 END), 0) AS adjust_n,
           COALESCE(SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END), 0) AS deny_n
         FROM play_gate_decisions`
      )
      .get() as { allow_n: number; adjust_n: number; deny_n: number };
    gatedAllow = gate.allow_n;
    gatedAdjust = gate.adjust_n;
    gatedDeny = gate.deny_n;
  }

  const reserved = dispatched;

  const settled = (
    db
      .query(`SELECT COUNT(*) AS n FROM plays WHERE result IS NOT NULL AND result != 'pending'`)
      .get() as { n: number }
  ).n;

  let settledViaFullLoop = 0;
  if (tableExists(db, 'ops_channel_outbox') && tableExists(db, 'play_gate_decisions')) {
    settledViaFullLoop = (
      db
        .query(
          `SELECT COUNT(DISTINCT p.id) AS n
           FROM plays p
           INNER JOIN play_distribution d ON d.play_id = p.id
           INNER JOIN play_gate_decisions g ON g.play_id = p.id AND g.node_id = d.node_id AND g.allowed = 1
           INNER JOIN ops_channel_outbox o ON o.status = 'sent'
             AND o.event_type = 'play.settled'
             AND o.idempotency_key = ('settle:' || p.id || ':' || d.node_id)
           WHERE p.result IS NOT NULL AND p.result != 'pending'`
        )
        .get() as { n: number }
    ).n;
  }

  let outboxSent = 0;
  let outboxFailed = 0;
  let outboxPending = 0;
  let oldestPendingAgeSec: number | null = null;
  if (tableExists(db, 'ops_channel_outbox')) {
    const outbox = db
      .query(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent,
           COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending
         FROM ops_channel_outbox`
      )
      .get() as { sent: number; failed: number; pending: number };
    outboxSent = outbox.sent;
    outboxFailed = outbox.failed;
    outboxPending = outbox.pending;

    const oldest = db
      .query(
        `SELECT created_at FROM ops_channel_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`
      )
      .get() as { created_at: string } | null;
    if (oldest?.created_at) {
      oldestPendingAgeSec = Math.max(
        0,
        Math.floor((Date.now() - Date.parse(oldest.created_at)) / 1000)
      );
    }
  }

  const manualUnsettled = (
    db
      .query(
        `SELECT COUNT(DISTINCT p.id) AS n
         FROM plays p
         INNER JOIN play_distribution d ON d.play_id = p.id
         WHERE p.result = 'pending' OR p.result IS NULL`
      )
      .get() as { n: number }
  ).n;

  const manualStepsPerCycle = manualUnsettled + outboxPending;

  const loopCompletionRate = dispatched > 0 ? settledViaFullLoop / dispatched : 0;

  return {
    dispatched,
    gatedAllow,
    gatedAdjust,
    gatedDeny,
    reserved,
    settled,
    settledViaFullLoop,
    outboxSent,
    outboxFailed,
    outboxPending,
    oldestPendingAgeSec,
    manualStepsPerCycle,
    loopCompletionRate,
  };
}

function emptyLoopSlice(): OpsLoopMetricsSlice {
  return {
    dispatched: 0,
    gatedAllow: 0,
    gatedAdjust: 0,
    gatedDeny: 0,
    reserved: 0,
    settled: 0,
    settledViaFullLoop: 0,
    outboxSent: 0,
    outboxFailed: 0,
    outboxPending: 0,
    oldestPendingAgeSec: null,
    manualStepsPerCycle: 0,
    loopCompletionRate: 0,
  };
}

export type OpsLoopReport = {
  capturedAt: string;
  source: 'live' | 'fixture';
  metrics: OpsLoopMetricsSlice;
  velocity?: {
    harnessGateSumMs?: number;
    harnessGeneratedAt?: string;
  };
};

/** Compare post vs baseline throughput lift (fraction, e.g. 0.6 = 60%). */
export function loopThroughputLift(
  baseline: OpsLoopMetricsSlice,
  post: OpsLoopMetricsSlice
): number {
  const baseRate = baseline.loopCompletionRate;
  const postRate = post.loopCompletionRate;
  if (baseRate <= 0) return postRate;
  return (postRate - baseRate) / baseRate;
}
