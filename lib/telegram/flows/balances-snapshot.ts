// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Read-only balances snapshot for TOC-aligned flow cards.
 */
import type { Database } from 'bun:sqlite';
import type { TreeNodeId } from '../../types/branded/operations.ts';

export type BalancesSnapshot = {
  label: string;
  callSign: string | null;
  soft: { partner: number; expert: number; house: number };
  principalOut: number;
  hard: number;
  pending: number;
};

export function fmt(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export { fmt as formatMoney };

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = $n`)
    .get({ $n: name });
  return row != null;
}

function resolveNode(
  db: Database,
  treeNodeId?: TreeNodeId,
  callSign?: string | null
): { id: string; name: string; call_sign: string | null } | null {
  // brand-ok — tree_nodes row
  if (treeNodeId) {
    return db
      .query('SELECT id, name, call_sign FROM tree_nodes WHERE id = $id AND active = 1')
      .get({ $id: treeNodeId as string }) as {
      id: string; // brand-ok
      name: string;
      call_sign: string | null;
    } | null;
  }
  if (callSign?.trim()) {
    return db
      .query(
        'SELECT id, name, call_sign FROM tree_nodes WHERE call_sign = $cs AND active = 1 LIMIT 1'
      )
      .get({ $cs: callSign.trim() }) as {
      id: string; // brand-ok
      name: string;
      call_sign: string | null;
    } | null;
  }
  return null;
}

/** Read-only Soft / hard pulse for a seat (no mutations). */
export function getBalancesSnapshot(
  db: Database,
  opts: { treeNodeId?: TreeNodeId; callSign?: string | null }
): BalancesSnapshot {
  const node = resolveNode(db, opts.treeNodeId, opts.callSign);
  const label = node ? (node.call_sign ? `${node.name} (${node.call_sign})` : node.name) : '—';
  const callSign = node?.call_sign ?? opts.callSign ?? null;
  const agentId = node?.id;

  const snap: BalancesSnapshot = {
    label,
    callSign,
    soft: { partner: 0, expert: 0, house: 0 },
    principalOut: 0,
    hard: 0,
    pending: 0,
  };

  if (agentId) {
    const hardRow = db
      .query(
        `SELECT COALESCE(SUM(balance), 0) AS total FROM sb_accounts WHERE agent_id = $a AND status = 'active'`
      )
      .get({ $a: agentId }) as { total: number };
    snap.hard = hardRow?.total ?? 0;

    const pendingRow = db
      .query(
        `SELECT COUNT(*) AS n FROM play_distribution d
         JOIN plays p ON p.id = d.play_id
         WHERE d.node_id = $n AND p.result = 'pending' AND d.ack_status NOT IN ('placed', 'skipped')`
      )
      .get({ $n: agentId }) as { n: number };
    snap.pending = pendingRow?.n ?? 0;
  }

  if (callSign && tableExists(db, 'toc_soft_entries')) {
    const rows = db
      .query(
        `SELECT entry_type, stakeholder, COALESCE(SUM(amount), 0) AS total
         FROM toc_soft_entries WHERE call_sign = $cs
         GROUP BY entry_type, stakeholder`
      )
      .all({ $cs: callSign }) as Array<{
      entry_type: string;
      stakeholder: string;
      total: number;
    }>;

    for (const r of rows) {
      const sh = r.stakeholder.toLowerCase();
      if (r.entry_type === 'CapitalDeployment') snap.principalOut += r.total;
      if (r.entry_type === 'ProfitSplit') {
        if (sh.includes('partner')) snap.soft.partner += r.total;
        else if (sh.includes('expert')) snap.soft.expert += r.total;
        else snap.soft.house += r.total;
      }
    }
  }

  return snap;
}
