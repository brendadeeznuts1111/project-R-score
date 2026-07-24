// @see https://bun.com/docs/runtime/sqlite
/**
 * Legacy ops-loop attribution backfill — gate decisions + play.settled outbox repair.
 *
 * Does **not** re-dispatch plays; only fills missing `play_gate_decisions` and
 * `play.settled` outbox rows so `settledViaFullLoop / dispatched` reflects history.
 *
 * SSOT: docs/harness/tenants/ops-loop-throughput.md
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import {
  enqueueSettlementChannelEvent,
  processChannelOutbox,
  type ProcessOutboxOpts,
} from '../channels/outbox.ts';
import { asGateDecisionId, asTreeNodeId } from '../types/branded/operations.ts';
import { materializePartnerProfile } from './partner-profile-bridge.ts';
import { queryLoopMetricsSlice, type OpsLoopMetricsSlice } from './ops-loop-metrics.ts';

const LEGACY_GATE_REASON = 'Legacy gate attribution (backfill — not re-dispatch)';

type MissingGateRow = {
  play_id: string; // brand-ok
  node_id: string; // brand-ok
  stake_actual: number | null;
  stake_recommended: number;
  received_at: string;
};

type MissingSettleOutboxRow = {
  play_id: string; // brand-ok
  node_id: string; // brand-ok
  result: string;
  pnl: number | null;
};

export type OpsLoopGateBackfillOpts = {
  dryRun?: boolean;
  outbox?: ProcessOutboxOpts | null;
};

export type OpsLoopGateBackfillResult = {
  dryRun: boolean;
  gatesInserted: number;
  settleOutboxEnqueued: number;
  outboxProcessed?: { sent: number; failed: number };
  metricsBefore: OpsLoopMetricsSlice;
  metricsAfter: OpsLoopMetricsSlice;
};

function queryMissingGateRows(db: Database): MissingGateRow[] {
  return db
    .query(
      `SELECT d.play_id, d.node_id, d.stake_actual, p.stake_recommended, d.received_at
       FROM play_distribution d
       INNER JOIN plays p ON p.id = d.play_id
       LEFT JOIN play_gate_decisions g ON g.play_id = d.play_id AND g.node_id = d.node_id
       WHERE g.id IS NULL
       ORDER BY d.received_at ASC`
    )
    .all() as MissingGateRow[];
}

function queryMissingSettleOutboxRows(db: Database): MissingSettleOutboxRow[] {
  return db
    .query(
      `SELECT d.play_id, d.node_id, p.result, p.pnl
       FROM play_distribution d
       INNER JOIN plays p ON p.id = d.play_id
       WHERE p.result IS NOT NULL AND p.result != 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM ops_channel_outbox o
           WHERE o.event_type = 'play.settled'
             AND o.idempotency_key = ('settle:' || d.play_id || ':' || d.node_id)
             AND o.status = 'sent'
         )
       ORDER BY d.received_at ASC`
    )
    .all() as MissingSettleOutboxRow[];
}

function insertLegacyGateAllow(db: Database, row: MissingGateRow): void {
  const stake = row.stake_actual ?? row.stake_recommended;
  const now = new Date().toISOString();
  db.run(
    `INSERT OR IGNORE INTO play_gate_decisions
     (id, play_id, node_id, allowed, action, reason, adjusted_stake, decision_id, created_at)
     VALUES ($id, $pid, $nid, 1, 'allow', $reason, $adj, $did, $now)`,
    {
      $id: randomUUIDv7(),
      $pid: row.play_id,
      $nid: row.node_id,
      $reason: LEGACY_GATE_REASON,
      $adj: stake,
      $did: asGateDecisionId(randomUUIDv7()) as string,
      $now: now,
    }
  );
}

function enqueueLegacySettleOutbox(db: Database, row: MissingSettleOutboxRow): void {
  const leafId = asTreeNodeId(row.node_id);
  const profile = materializePartnerProfile(db, leafId);
  enqueueSettlementChannelEvent(db, {
    playId: row.play_id,
    leafNodeId: leafId,
    result: row.result,
    pnl: row.pnl ?? 0,
    profileKey: profile?.binding.profileKey as string | undefined,
  });
}

/** Backfill missing gate decisions and play.settled outbox rows for loop metrics. */
export async function backfillOpsLoopGateAttribution(
  db: Database,
  opts: OpsLoopGateBackfillOpts = {}
): Promise<OpsLoopGateBackfillResult> {
  const dryRun = opts.dryRun === true;
  const metricsBefore = queryLoopMetricsSlice(db);

  const missingGates = queryMissingGateRows(db);
  const missingSettleOutbox = queryMissingSettleOutboxRows(db);

  if (dryRun) {
    return {
      dryRun: true,
      gatesInserted: missingGates.length,
      settleOutboxEnqueued: missingSettleOutbox.length,
      metricsBefore,
      metricsAfter: metricsBefore,
    };
  }

  for (const row of missingGates) {
    insertLegacyGateAllow(db, row);
  }

  for (const row of missingSettleOutbox) {
    enqueueLegacySettleOutbox(db, row);
  }

  let outboxProcessed: { sent: number; failed: number } | undefined;
  if (opts.outbox !== null) {
    outboxProcessed = await processChannelOutbox(db, opts.outbox ?? { deliver: false });
  }

  return {
    dryRun: false,
    gatesInserted: missingGates.length,
    settleOutboxEnqueued: missingSettleOutbox.length,
    outboxProcessed,
    metricsBefore,
    metricsAfter: queryLoopMetricsSlice(db),
  };
}
