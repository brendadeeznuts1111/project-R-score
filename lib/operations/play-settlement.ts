// @see https://bun.com/docs/runtime/sqlite
/**
 * Play settlement — close result, apply cut cascade, adjust liquidity,
 * and feed active factorial experiments (best-effort).
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import {
  recordPlaySettlementOutcomes,
  type SettlementOutcomeRecord,
} from '../experiments/outcomes.ts';
import { enqueueSettlementChannelEvent } from '../channels/outbox.ts';
import { asTreeNodeId } from '../types/branded/operations.ts';
import { materializePartnerProfile } from './partner-profile-bridge.ts';
import { calculateCutCascade, type CutCascadeResult } from './cut-engine.ts';
import { releasePlay } from './liquidity.ts';

export type PlayResult = 'win' | 'loss' | 'push' | 'void';

export type SettlePlayInput = {
  playId: string; // brand-ok — plays.id
  result: PlayResult;
  pnl: number;
  /** Agent/sub-agent node that placed the play (cut cascade leaf). */
  leafNodeId: string; // brand-ok — TreeNodeId at call site
  stakeReserved?: number;
  /** Skip experiment metric writes (tests / migrations). Default false. */
  skipExperimentOutcomes?: boolean;
};

export type SettlePlayResult = {
  playId: string; // brand-ok
  result: PlayResult;
  pnl: number;
  cuts: CutCascadeResult;
  /** Active-experiment metrics recorded for the partner subject (may be empty). */
  experimentOutcomes: SettlementOutcomeRecord[];
};

/** Close a play, persist cut ledger entries, and adjust position liquidity. */
export function settlePlay(db: Database, input: SettlePlayInput): SettlePlayResult {
  const play = db
    .query(`SELECT id, result, stake_recommended FROM plays WHERE id = $id`)
    .get({ $id: input.playId }) as {
    id: string; // brand-ok
    result: string;
    stake_recommended: number;
  } | null;

  if (!play) throw new Error(`Play not found: ${input.playId}`);
  if (play.result !== 'pending') throw new Error(`Play already settled: ${input.playId}`);

  const stake = input.stakeReserved ?? play.stake_recommended;
  const now = new Date().toISOString();

  db.run(`UPDATE plays SET result = $res, pnl = $pnl, closed_at = $now WHERE id = $id`, {
    $res: input.result,
    $pnl: input.pnl,
    $now: now,
    $id: input.playId,
  });

  const cuts = calculateCutCascade(db, input.leafNodeId, input.pnl);
  for (const alloc of cuts.allocations) {
    db.run(
      `INSERT INTO cut_ledger (id, play_id, node_id, amount, created_at)
       VALUES ($id, $pid, $nid, $amt, $now)`,
      {
        $id: randomUUIDv7(),
        $pid: input.playId,
        $nid: alloc.nodeId,
        $amt: alloc.amount,
        $now: now,
      }
    );
  }

  if (input.result === 'void' || input.result === 'push') {
    releasePlay(db, input.leafNodeId, stake);
  } else {
    db.run(
      `UPDATE positions SET in_play = MAX(0, in_play - $stake),
       available = available + $stake + $pnl, version = version + 1
       WHERE node_id = $nid AND book = '_all'`,
      { $stake: stake, $pnl: input.pnl, $nid: input.leafNodeId }
    );
    db.run(
      `UPDATE operations SET total_exposure = MAX(0, total_exposure - $stake),
       total_liquidity = total_liquidity + $pnl, updated_at = $now WHERE id = 'main'`,
      { $stake: stake, $pnl: input.pnl, $now: now }
    );
  }

  let experimentOutcomes: SettlementOutcomeRecord[] = [];
  if (!input.skipExperimentOutcomes) {
    try {
      experimentOutcomes = recordPlaySettlementOutcomes(db, {
        leafNodeId: input.leafNodeId,
        result: input.result,
        pnl: input.pnl,
        playId: input.playId,
      });
    } catch {
      // Settlement must not fail closed on experiment plumbing
      experimentOutcomes = [];
    }
  }

  const leafId = asTreeNodeId(input.leafNodeId);
  const profile = materializePartnerProfile(db, leafId);
  enqueueSettlementChannelEvent(db, {
    playId: input.playId,
    leafNodeId: leafId,
    result: input.result,
    pnl: input.pnl,
    profileKey: profile?.binding.profileKey as string | undefined,
  });

  return {
    playId: input.playId,
    result: input.result,
    pnl: input.pnl,
    cuts,
    experimentOutcomes,
  };
}

/** Sum cut ledger for a node in a period (YYYY-MM). */
export function sumCutsForNode(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId
  period: string
): number {
  const row = db
    .query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM cut_ledger
       WHERE node_id = $nid AND created_at LIKE $pfx`
    )
    .get({ $nid: nodeId, $pfx: `${period}%` }) as { total: number };
  return row.total;
}
