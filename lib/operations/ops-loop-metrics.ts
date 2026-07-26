// @see https://bun.com/docs/runtime/sqlite
/**
 * Ops closed-loop throughput counters — dispatch → gate → reserve → settle → durable delivery.
 *
 * Metric SSOT: docs/harness/tenants/ops-loop-throughput.md
 *
 * Capital-return proxies (mirror toc-ops RETURN_EFFICIENCY; null when inputs missing):
 * - **CE** `capitalEfficiencyProxy` — Σ ProfitSplit / peak I from `toc_soft_entries`
 *   (peak I = max net deployed: Σ CapitalDeployment − Σ CapitalReturn).
 * - **LE** `limitEfficiencyProxy` — avg ΔL / (C_asset × days) on WARMED accounts with fresh
 *   limits in baked `/registry/toc-ops.json` (ΔL = dailyMax, C_asset = hardBalance + principal).
 * - **RP** `processReturnProxy` — settled Σ plays.pnl / (peak exposure + OE), where peak exposure
 *   is max(`operations.total_exposure`, Σ positions.in_play) and OE is Σ |CostOfPriming|+|Loss|
 *   from `toc_soft_entries` (0 when journal empty).
 */
import type { Database } from 'bun:sqlite';
import { loadTocOpsSnapshotSync } from '../toc-ops/export-snapshot.ts';

export type OpsLoopMetricsSlice = {
  /** play_distribution fan-out rows (recipient dispatches). */
  dispatched: number;
  gatedAllow: number;
  gatedAdjust: number;
  /** Gate blocks/denies excluding TOC/lifecycle `defer`. */
  gatedDeny: number;
  /** `play_gate_decisions.action = 'defer'` (TOC rope / lifecycle hold). */
  gatedDefer: number;
  /** Rows in play_distribution (successful reserve + enqueue). */
  reserved: number;
  /** plays.result closed (not pending). */
  settled: number;
  /** Distribution rows with gate allow/adjust + play.settled outbox sent (same unit as dispatched). */
  settledViaFullLoop: number;
  outboxSent: number;
  outboxFailed: number;
  outboxPending: number;
  /** Seconds since oldest pending outbox row; null when none pending. */
  oldestPendingAgeSec: number | null;
  /** Manual intervention points still open (unsettled distributed, pending + failed outbox). */
  manualStepsPerCycle: number;
  /** settledViaFullLoop / dispatched (0 when dispatched = 0). Attribution only — not R2 durability. */
  loopCompletionRate: number;
  /** Distinct plays with ≥1 play_distribution row. */
  distinctPlaysDispatched: number;
  /** Distinct settled plays with gate allow/adjust + play.settled outbox on ≥1 node. */
  settledPlaysViaFullLoop: number;
  /** settledPlaysViaFullLoop / distinctPlaysDispatched (play-level; not fan-out inflated). */
  loopCompletionRateByPlay: number;
  /** Σ ProfitSplit / peak I from toc_soft_entries; null when journal empty or peak I = 0. */
  capitalEfficiencyProxy: number | null;
  /** Avg usable-limit uplift from baked toc-ops fixture; null when no fresh WARMED limits. */
  limitEfficiencyProxy: number | null;
  /** Settled plays.pnl / (peak exposure + OE); null when no settled pnl or denominator = 0. */
  processReturnProxy: number | null;
  /**
   * Host projector backend at snapshot time (`r2` durable · `memory` attribution-only).
   * Null when not probed (pure SQL query without host opts).
   */
  projectorBackend: 'r2' | 'memory' | null;
  /** True when projectorBackend === 'r2'. */
  projectorDurable: boolean | null;
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
  let gatedDefer = 0;
  if (tableExists(db, 'play_gate_decisions')) {
    const gate = db
      .query(
        `SELECT
           COALESCE(SUM(CASE WHEN allowed = 1 AND action = 'allow' THEN 1 ELSE 0 END), 0) AS allow_n,
           COALESCE(SUM(CASE WHEN allowed = 1 AND action = 'adjust' THEN 1 ELSE 0 END), 0) AS adjust_n,
           COALESCE(SUM(CASE WHEN allowed = 0 AND action = 'defer' THEN 1 ELSE 0 END), 0) AS defer_n,
           COALESCE(SUM(CASE WHEN allowed = 0 AND action != 'defer' THEN 1 ELSE 0 END), 0) AS deny_n
         FROM play_gate_decisions`
      )
      .get() as { allow_n: number; adjust_n: number; defer_n: number; deny_n: number };
    gatedAllow = gate.allow_n;
    gatedAdjust = gate.adjust_n;
    gatedDefer = gate.defer_n;
    gatedDeny = gate.deny_n;
  }

  const distinctPlaysDispatched = (
    db.query(`SELECT COUNT(DISTINCT play_id) AS n FROM play_distribution`).get() as { n: number }
  ).n;

  const reserved = dispatched;

  const settled = (
    db
      .query(`SELECT COUNT(*) AS n FROM plays WHERE result IS NOT NULL AND result != 'pending'`)
      .get() as { n: number }
  ).n;

  let settledViaFullLoop = 0;
  let settledPlaysViaFullLoop = 0;
  if (tableExists(db, 'ops_channel_outbox') && tableExists(db, 'play_gate_decisions')) {
    settledViaFullLoop = (
      db
        .query(
          `SELECT COUNT(*) AS n
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
    settledPlaysViaFullLoop = (
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

  const manualStepsPerCycle = manualUnsettled + outboxPending + outboxFailed;

  const loopCompletionRate = dispatched > 0 ? settledViaFullLoop / dispatched : 0;
  const loopCompletionRateByPlay =
    distinctPlaysDispatched > 0 ? settledPlaysViaFullLoop / distinctPlaysDispatched : 0;

  const soft = querySoftBalanceRollup(db);
  const capitalEfficiencyProxy = computeCapitalEfficiencyProxy(soft);
  const limitEfficiencyProxy = computeLimitEfficiencyProxy();
  const processReturnProxy = computeProcessReturnProxy(db, soft?.oe ?? 0);

  return {
    dispatched,
    gatedAllow,
    gatedAdjust,
    gatedDeny,
    gatedDefer,
    reserved,
    settled,
    settledViaFullLoop,
    outboxSent,
    outboxFailed,
    outboxPending,
    oldestPendingAgeSec,
    manualStepsPerCycle,
    loopCompletionRate,
    distinctPlaysDispatched,
    settledPlaysViaFullLoop,
    loopCompletionRateByPlay,
    capitalEfficiencyProxy,
    limitEfficiencyProxy,
    processReturnProxy,
    projectorBackend: null,
    projectorDurable: null,
  };
}

/** Attach host projector durability signal (R2 vs memory) for portal honesty. */
export function withProjectorBackendSignal(
  slice: OpsLoopMetricsSlice,
  backend: 'r2' | 'memory' | null
): OpsLoopMetricsSlice {
  return {
    ...slice,
    projectorBackend: backend,
    projectorDurable: backend == null ? null : backend === 'r2',
  };
}

type SoftBalanceRollup = {
  profitSplit: number;
  peakCapital: number;
  oe: number;
};

function querySoftBalanceRollup(db: Database): SoftBalanceRollup | null {
  if (!tableExists(db, 'toc_soft_entries')) return null;
  const row = db
    .query(
      `SELECT
         COALESCE(SUM(CASE WHEN entry_type = 'ProfitSplit' THEN amount ELSE 0 END), 0) AS profit_split,
         COALESCE(SUM(CASE WHEN entry_type = 'CapitalDeployment' THEN amount ELSE 0 END), 0) AS deployed,
         COALESCE(SUM(CASE WHEN entry_type = 'CapitalReturn' THEN amount ELSE 0 END), 0) AS returned,
         COALESCE(SUM(CASE WHEN entry_type IN ('CostOfPriming', 'Loss') THEN ABS(amount) ELSE 0 END), 0) AS oe,
         COUNT(*) AS n
       FROM toc_soft_entries`
    )
    .get() as {
    profit_split: number;
    deployed: number;
    returned: number;
    oe: number;
    n: number;
  };
  if (!row?.n) return null;
  const peakCapital = Math.max(row.deployed - row.returned, 0);
  return { profitSplit: row.profit_split, peakCapital, oe: row.oe };
}

function computeCapitalEfficiencyProxy(soft: SoftBalanceRollup | null): number | null {
  if (!soft || soft.peakCapital <= 0) return null;
  return soft.profitSplit / soft.peakCapital;
}

function computeLimitEfficiencyProxy(): number | null {
  const snap = loadTocOpsSnapshotSync();
  if (!snap) return null;

  const values: number[] = [];
  for (const partner of snap.partners) {
    for (const account of partner.accounts) {
      if (account.status !== 'WARMED') continue;
      const deltaL = account.limits.dailyMax;
      if (deltaL == null || deltaL <= 0) continue;
      if (account.limits.freshness !== 'fresh') continue;
      const cAsset = account.hardBalance + account.gate12.housePrincipalOutstanding;
      if (cAsset <= 0) continue;
      values.push(deltaL / cAsset);
    }
  }
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function queryPeakExposureProxy(db: Database): number {
  let exposure = 0;
  if (tableExists(db, 'operations')) {
    const row = db
      .query(`SELECT COALESCE(total_exposure, 0) AS exposure FROM operations WHERE id = 'main'`)
      .get() as { exposure: number } | null;
    exposure = row?.exposure ?? 0;
  }
  if (tableExists(db, 'positions')) {
    const inPlay = db
      .query(`SELECT COALESCE(SUM(in_play), 0) AS exposure FROM positions`)
      .get() as { exposure: number };
    exposure = Math.max(exposure, inPlay.exposure ?? 0);
  }
  return exposure;
}

function computeProcessReturnProxy(db: Database, oeProxy: number): number | null {
  if (!tableExists(db, 'plays')) return null;
  const settled = db
    .query(
      `SELECT COALESCE(SUM(pnl), 0) AS pnl, COUNT(*) AS n
       FROM plays
       WHERE result IS NOT NULL AND result != 'pending' AND pnl IS NOT NULL`
    )
    .get() as { pnl: number; n: number };
  if (!settled?.n) return null;

  const iPeak = queryPeakExposureProxy(db);
  const denominator = iPeak + oeProxy;
  if (denominator <= 0) return null;
  return settled.pnl / denominator;
}

function emptyLoopSlice(): OpsLoopMetricsSlice {
  return {
    dispatched: 0,
    gatedAllow: 0,
    gatedAdjust: 0,
    gatedDeny: 0,
    gatedDefer: 0,
    reserved: 0,
    settled: 0,
    settledViaFullLoop: 0,
    outboxSent: 0,
    outboxFailed: 0,
    outboxPending: 0,
    oldestPendingAgeSec: null,
    manualStepsPerCycle: 0,
    loopCompletionRate: 0,
    distinctPlaysDispatched: 0,
    settledPlaysViaFullLoop: 0,
    loopCompletionRateByPlay: 0,
    capitalEfficiencyProxy: null,
    limitEfficiencyProxy: null,
    processReturnProxy: null,
    projectorBackend: null,
    projectorDurable: null,
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
