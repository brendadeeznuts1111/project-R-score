// @see https://bun.com/docs/runtime/sqlite
/**
 * Play settlement — close result, apply cut cascade, adjust liquidity,
 * and feed active factorial experiments (best-effort).
 *
 * Multi-node: every `play_distribution` row releases its own `stake_actual`
 * and receives a stake-proportional share of `pnl` / cut cascade. Outbox
 * fans out `play.settled` per node (idempotent).
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
  /** Primary leaf for experiment outcomes (cuts/liquidity still cover all dist nodes). */
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
  /** Distribution nodes whose liquidity was released. */
  nodesSettled: number;
};

type DistStakeRow = {
  node_id: string; // brand-ok
  stake_actual: number | null;
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

  const distRows = db
    .query(
      `SELECT node_id, stake_actual FROM play_distribution
       WHERE play_id = $pid ORDER BY received_at ASC`
    )
    .all({ $pid: input.playId }) as DistStakeRow[];

  if (distRows.length === 0) {
    distRows.push({ node_id: input.leafNodeId, stake_actual: input.stakeReserved ?? null });
  }

  const stakes = distRows.map(row => ({
    nodeId: row.node_id,
    stake:
      (row.node_id === input.leafNodeId ? input.stakeReserved : undefined) ??
      row.stake_actual ??
      play.stake_recommended,
  }));
  const totalStake = stakes.reduce((sum, row) => sum + row.stake, 0);

  const now = new Date().toISOString();

  db.run(`UPDATE plays SET result = $res, pnl = $pnl, closed_at = $now WHERE id = $id`, {
    $res: input.result,
    $pnl: input.pnl,
    $now: now,
    $id: input.playId,
  });

  let primaryCuts: CutCascadeResult = { grossPnl: input.pnl, netToOrigin: input.pnl, allocations: [] };
  let exposureRelease = 0;

  for (const { nodeId, stake } of stakes) {
    const nodePnl = totalStake > 0 ? input.pnl * (stake / totalStake) : input.pnl;
    const cuts = calculateCutCascade(db, nodeId, nodePnl);
    if (nodeId === input.leafNodeId) primaryCuts = cuts;

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
      releasePlay(db, nodeId, stake);
    } else {
      db.run(
        `UPDATE positions SET in_play = MAX(0, in_play - $stake),
         available = available + $stake + $pnl, version = version + 1
         WHERE node_id = $nid AND book = '_all'`,
        { $stake: stake, $pnl: nodePnl, $nid: nodeId }
      );
    }
    exposureRelease += stake;
  }

  if (input.result !== 'void' && input.result !== 'push') {
    db.run(
      `UPDATE operations SET total_exposure = MAX(0, total_exposure - $stake),
       total_liquidity = total_liquidity + $pnl, updated_at = $now WHERE id = 'main'`,
      { $stake: exposureRelease, $pnl: input.pnl, $now: now }
    );
  } else {
    db.run(
      `UPDATE operations SET total_exposure = MAX(0, total_exposure - $stake),
       updated_at = $now WHERE id = 'main'`,
      { $stake: exposureRelease, $now: now }
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
      experimentOutcomes = [];
    }
  }

  enqueueSettlementEventsForDistributionNodes(db, input.playId, input.result, input.pnl);

  return {
    playId: input.playId,
    result: input.result,
    pnl: input.pnl,
    cuts: primaryCuts,
    experimentOutcomes,
    nodesSettled: stakes.length,
  };
}

/** Enqueue play.settled for every distribution node (idempotent per node). */
function enqueueSettlementEventsForDistributionNodes(
  db: Database,
  playId: string, // brand-ok
  result: PlayResult,
  pnl: number
): void {
  const nodes = db
    .query(`SELECT node_id FROM play_distribution WHERE play_id = $pid ORDER BY received_at ASC`)
    .all({ $pid: playId }) as { node_id: string }[]; // brand-ok

  for (const { node_id } of nodes) {
    const leafId = asTreeNodeId(node_id);
    const profile = materializePartnerProfile(db, leafId);
    enqueueSettlementChannelEvent(db, {
      playId,
      leafNodeId: leafId,
      result,
      pnl,
      profileKey: profile?.binding.profileKey as string | undefined,
    });
  }
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
