// @see https://bun.com/docs/runtime/sqlite
/**
 * Batch settle pending plays that have play_distribution rows.
 */
import type { Database } from 'bun:sqlite';
import { processChannelOutbox, type ProcessOutboxOpts } from '../channels/outbox.ts';
import { settlePlay, type PlayResult } from './play-settlement.ts';

export type SettlePendingOpts = {
  limit?: number;
  /** Default win with zero pnl when unsettled play has no explicit result input. */
  defaultResult?: PlayResult;
  defaultPnl?: number;
  skipExperimentOutcomes?: boolean;
  outbox?: ProcessOutboxOpts;
};

export type SettlePendingResult = {
  settled: number;
  skipped: number;
  errors: string[];
  outbox?: { sent: number; failed: number };
};

type PendingRow = {
  play_id: string; // brand-ok
  node_id: string; // brand-ok
  stake_actual: number | null;
};

/** Settle plays still pending that already have distribution rows. */
export async function settlePendingPlays(
  db: Database,
  opts: SettlePendingOpts = {}
): Promise<SettlePendingResult> {
  const limit = opts.limit ?? 50;
  const defaultResult = opts.defaultResult ?? 'push';
  const defaultPnl = opts.defaultPnl ?? 0;

  const rows = db
    .query(
      `SELECT d.play_id, MIN(d.node_id) AS node_id, MAX(d.stake_actual) AS stake_actual
       FROM play_distribution d
       INNER JOIN plays p ON p.id = d.play_id
       WHERE p.result = 'pending'
       GROUP BY d.play_id
       ORDER BY MIN(d.received_at) ASC
       LIMIT $lim`
    )
    .all({ $lim: limit }) as PendingRow[];

  let settled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      settlePlay(db, {
        playId: row.play_id,
        leafNodeId: row.node_id,
        result: defaultResult,
        pnl: defaultPnl,
        stakeReserved: row.stake_actual ?? undefined,
        skipExperimentOutcomes: opts.skipExperimentOutcomes,
      });
      settled++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already settled')) {
        skipped++;
        continue;
      }
      errors.push(`${row.play_id}:${row.node_id} — ${msg}`);
    }
  }

  let outbox: { sent: number; failed: number } | undefined;
  if (opts.outbox !== null) {
    outbox = await processChannelOutbox(db, opts.outbox ?? { deliver: false });
  }

  return { settled, skipped, errors, outbox };
}
