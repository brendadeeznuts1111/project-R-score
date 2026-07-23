// @see https://bun.com/docs/runtime/sqlite
/**
 * Cut cascade — each ancestor takes cut_percentage of remaining P&L flowing up-tree.
 */
import type { Database } from 'bun:sqlite';

export type CutAllocation = {
  nodeId: string; // brand-ok — TreeNodeId
  name: string;
  cutPercentage: number;
  amount: number;
};

export type CutCascadeResult = {
  grossPnl: number;
  netToOrigin: number;
  allocations: CutAllocation[];
};

type NodeRow = {
  id: string; // brand-ok
  parent_id: string | null; // brand-ok
  name: string;
  cut_percentage: number;
};

function getNode(db: Database, id: string /* brand-ok — TreeNodeId */): NodeRow | null {
  return db.query('SELECT id, parent_id, name, cut_percentage FROM tree_nodes WHERE id = $id').get({
    $id: id,
  }) as NodeRow | null;
}

/**
 * Walk from leaf node up through parents; each ancestor takes cut_percentage of **remaining**.
 * Origin (leaf) keeps whatever remains after all upstream cuts.
 */
export function calculateCutCascade(
  db: Database,
  leafNodeId: string, // brand-ok — TreeNodeId
  grossPnl: number
): CutCascadeResult {
  const allocations: CutAllocation[] = [];
  let remaining = grossPnl;

  let current = getNode(db, leafNodeId);
  if (!current) {
    return { grossPnl, netToOrigin: grossPnl, allocations };
  }

  while (current?.parent_id) {
    const parent = getNode(db, current.parent_id);
    if (!parent) break;

    const pct = parent.cut_percentage ?? 0;
    if (pct > 0 && remaining > 0) {
      const cut = (remaining * pct) / 100;
      allocations.push({
        nodeId: parent.id,
        name: parent.name,
        cutPercentage: pct,
        amount: Math.round(cut * 100) / 100,
      });
      remaining -= cut;
    }
    current = parent;
  }

  return {
    grossPnl,
    netToOrigin: Math.round(remaining * 100) / 100,
    allocations,
  };
}
