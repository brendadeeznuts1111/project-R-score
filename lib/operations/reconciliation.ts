// @see https://bun.com/docs/runtime/sqlite
/**
 * Operations reconciliation — rails vs deposits, positions vs sportsbook balances.
 */
import type { Database } from 'bun:sqlite';
import { reconcilePositionFromAccounts } from './liquidity.ts';

export type ReconcileMismatch = {
  kind: 'rail_deposit' | 'position_balance' | 'platform_liquidity' | 'book_balance';
  nodeId?: string;
  railId?: string;
  detail: string;
  diff: number;
};

export type ReconciliationReport = {
  generated: string;
  agentsChecked: number;
  positionsReconciled: number;
  mismatches: ReconcileMismatch[];
  ok: boolean;
};

const DEPOSIT_TOLERANCE = 1_000;

/** Compare rail total_sent aggregate vs sum of agent sb_account balances (soft check). */
export function reconcileRailsVsDeposits(db: Database): ReconcileMismatch[] {
  const mismatches: ReconcileMismatch[] = [];

  const agents = db
    .query(`SELECT id FROM tree_nodes WHERE type IN ('agent', 'sub_agent') AND active = 1`)
    .all() as { id: string }[];

  for (const { id: nodeId } of agents) {
    const deposits = db
      .query(
        `SELECT COALESCE(SUM(balance), 0) as total FROM sb_accounts
         WHERE agent_id = $nid AND status = 'active'`
      )
      .get({ $nid: nodeId }) as { total: number };

    const funded = db
      .query(
        `SELECT COALESCE(SUM(net_amount), 0) as total FROM funding
         WHERE to_agent_id = $nid AND status IN ('sent', 'received')`
      )
      .get({ $nid: nodeId }) as { total: number };

    const diff = Math.abs(funded.total - deposits.total);
    if (diff > DEPOSIT_TOLERANCE && funded.total > 0) {
      mismatches.push({
        kind: 'rail_deposit',
        nodeId,
        detail: `Funding $${funded.total} vs book balances $${deposits.total}`,
        diff,
      });
    }
  }

  return mismatches;
}

/** Refresh positions from sb_accounts and flag stale available balances. */
export function reconcileAllPositions(db: Database): {
  reconciled: number;
  mismatches: ReconcileMismatch[];
} {
  const mismatches: ReconcileMismatch[] = [];
  const agents = db
    .query(`SELECT id FROM tree_nodes WHERE type IN ('agent', 'partner') AND active = 1`)
    .all() as { id: string }[];

  let reconciled = 0;
  for (const { id } of agents) {
    const before = db
      .query(
        `SELECT deposited, available, in_play FROM positions WHERE node_id = $id AND book = '_all'`
      )
      .get({ $id: id }) as { deposited: number; available: number; in_play: number } | null;

    const bookTotal = reconcilePositionFromAccounts(db, id);
    reconciled++;

    const after = db
      .query(`SELECT deposited, available FROM positions WHERE node_id = $id AND book = '_all'`)
      .get({ $id: id }) as { deposited: number; available: number };

    if (before && Math.abs(before.deposited - after.deposited) > DEPOSIT_TOLERANCE) {
      mismatches.push({
        kind: 'position_balance',
        nodeId: id,
        detail: `Position deposit shifted $${before.deposited} → $${after.deposited} (books $${bookTotal})`,
        diff: Math.abs(after.deposited - before.deposited),
      });
    }
  }

  return { reconciled, mismatches };
}

export function runReconciliation(db: Database): ReconciliationReport {
  const railMm = reconcileRailsVsDeposits(db);
  const { reconciled, mismatches: posMm } = reconcileAllPositions(db);

  const platform = db
    .query(`SELECT total_liquidity, total_exposure FROM operations WHERE id = 'main'`)
    .get() as { total_liquidity: number; total_exposure: number } | null;

  const mismatches = [...railMm, ...posMm];
  if (platform && platform.total_liquidity < 0) {
    mismatches.push({
      kind: 'platform_liquidity',
      detail: `Platform liquidity negative: $${platform.total_liquidity}`,
      diff: Math.abs(platform.total_liquidity),
    });
  }

  return {
    generated: new Date().toISOString(),
    agentsChecked: reconciled,
    positionsReconciled: reconciled,
    mismatches,
    ok: mismatches.length === 0,
  };
}
