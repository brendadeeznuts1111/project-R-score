// @see https://bun.com/docs/runtime/sqlite
/**
 * Rail funding with daily/monthly limit enforcement.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';

export type FundResult =
  | { ok: true; fundingId: string; netAmount: number }
  | { ok: false; reason: string };

export type FundInput = {
  railId: string;
  toAgentId: string;
  amount: number;
  fee?: number;
};

function railUsage(db: Database, railId: string, window: 'day' | 'month'): number {
  const filter =
    window === 'day'
      ? "sent_at >= datetime('now', 'start of day')"
      : "sent_at >= datetime('now', 'start of month')";
  const row = db
    .query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM funding
       WHERE rail_id = $rid AND status IN ('sent', 'received') AND ${filter}`
    )
    .get({ $rid: railId }) as { total: number };
  return row.total;
}

export function fundViaRail(db: Database, input: FundInput): FundResult {
  const { railId, toAgentId, amount } = input;
  const fee = input.fee ?? 0;
  const netAmount = amount - fee;

  if (amount <= 0) return { ok: false, reason: 'Amount must be positive' };

  const rail = db
    .query('SELECT daily_limit, monthly_limit, status FROM rails WHERE id = $id')
    .get({ $id: railId }) as { daily_limit: number; monthly_limit: number; status: string } | null;

  if (!rail) return { ok: false, reason: 'Rail not found' };
  if (rail.status !== 'active') return { ok: false, reason: 'Rail is not active' };

  const dailyUsed = railUsage(db, railId, 'day');
  const monthlyUsed = railUsage(db, railId, 'month');

  if (rail.daily_limit > 0 && dailyUsed + amount > rail.daily_limit) {
    return {
      ok: false,
      reason: `Daily limit exceeded: $${dailyUsed + amount} > $${rail.daily_limit}`,
    };
  }
  if (rail.monthly_limit > 0 && monthlyUsed + amount > rail.monthly_limit) {
    return {
      ok: false,
      reason: `Monthly limit exceeded: $${monthlyUsed + amount} > $${rail.monthly_limit}`,
    };
  }

  const fundingId = randomUUIDv7();
  const sentAt = new Date().toISOString();

  db.transaction(() => {
    db.run(
      `INSERT INTO funding (id, rail_id, from_operations, to_agent_id, amount, fee, net_amount, status, sent_at)
       VALUES ($id, $rid, 1, $aid, $amt, $fee, $net, 'sent', $sent)`,
      {
        $id: fundingId,
        $rid: railId,
        $aid: toAgentId,
        $amt: amount,
        $fee: fee,
        $net: netAmount,
        $sent: sentAt,
      }
    );
    db.run('UPDATE rails SET total_sent = total_sent + $amt WHERE id = $rid', {
      $amt: amount,
      $rid: railId,
    });
    db.run('UPDATE sb_accounts SET balance = balance + $net WHERE agent_id = $aid AND status = $active', {
      $net: netAmount,
      $aid: toAgentId,
      $active: 'active',
    });
  })();

  return { ok: true, fundingId, netAmount };
}

/** Risk-based daily limit from lifetime P&L and tenure. */
export function calculateRailLimit(db: Database, nodeId: string): number {
  const lifetime = db
    .query(
      `SELECT COALESCE(SUM(p.pnl), 0) as total
       FROM plays p
       JOIN play_distribution d ON p.id = d.play_id
       WHERE d.node_id = $nid AND p.result IN ('win', 'loss')`
    )
    .get({ $nid: nodeId }) as { total: number };

  const tenure = db
    .query(`SELECT julianday('now') - julianday(created_at) as days FROM tree_nodes WHERE id = $nid`)
    .get({ $nid: nodeId }) as { days: number } | null;

  const base = 5_000;
  const pnlBonus = Math.floor((lifetime?.total ?? 0) / 10_000) * 1_000;
  const tenureBonus = Math.floor((tenure?.days ?? 0) / 365) * 2_000;
  return Math.min(base + pnlBonus + tenureBonus, 100_000);
}

/** Apply risk-based limits to all agent-linked rails. Returns count updated. */
export function applyDynamicRailLimits(db: Database): number {
  const rails = db
    .query('SELECT id, agent_id FROM rails WHERE agent_id IS NOT NULL AND status = $s')
    .all({ $s: 'active' }) as { id: string; agent_id: string }[];

  let updated = 0;
  for (const { id, agent_id: agentId } of rails) {
    const limit = calculateRailLimit(db, agentId);
    db.run('UPDATE rails SET daily_limit = $lim WHERE id = $id', { $lim: limit, $id: id });
    updated++;
  }
  return updated;
}
