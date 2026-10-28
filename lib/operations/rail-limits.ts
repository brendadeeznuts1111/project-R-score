// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @updated bun:sqlite · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated bun:sqlite · fixed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated bun:sqlite · fixed v0.5.6 · 2023-02-09 · https://bun.com/blog/bun-v0.5.6
// @updated bun:sqlite · changed v0.6.8 · 2023-06-09 · https://bun.com/blog/bun-v0.6.8
// @updated bun:sqlite · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated bun:sqlite · changed v0.7.1 · 2023-07-29 · https://bun.com/blog/bun-v0.7.1
// @updated bun:sqlite · fixed v0.7.3 · 2023-08-06 · https://bun.com/blog/bun-v0.7.3
// @updated bun:sqlite · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated bun:sqlite · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated bun:sqlite · fixed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated bun:sqlite · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated bun:sqlite · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated bun:sqlite · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated bun:sqlite · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated bun:sqlite · changed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated bun:sqlite · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated bun:sqlite · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated bun:sqlite · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated bun:sqlite · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated bun:sqlite · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated bun:sqlite · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated bun:sqlite · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated bun:sqlite · changed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.16 · 2024-06-23 · https://bun.com/blog/bun-v1.1.16
// @updated bun:sqlite · fixed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @updated bun:sqlite · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated bun:sqlite · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated bun:sqlite · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated bun:sqlite · changed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated bun:sqlite · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated bun:sqlite · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated bun:sqlite · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated bun:sqlite · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated bun:sqlite · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated bun:sqlite · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated bun:sqlite · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified bun:sqlite · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @updated Bun.randomUUIDv7 · changed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @verified Bun.randomUUIDv7 · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-randomuuidv7
// @see https://bun.com/docs/runtime/sqlite
/**
 * Rail funding with daily/monthly limit enforcement.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import {
  asFundingId,
  parseTreeNodeId,
  type FundingId,
  type RailId,
  type TreeNodeId,
} from '../types/branded.ts';

export type FundResult =
  { ok: true; fundingId: FundingId; netAmount: number } | { ok: false; reason: string };

export type FundInput = {
  railId: RailId;
  toAgentId: TreeNodeId;
  amount: number;
  fee?: number;
};

function railUsage(db: Database, railId: RailId, window: 'day' | 'month'): number {
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

  const fundingId = asFundingId(randomUUIDv7());
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
    db.run(
      'UPDATE sb_accounts SET balance = balance + $net WHERE agent_id = $aid AND status = $active',
      {
        $net: netAmount,
        $aid: toAgentId,
        $active: 'active',
      }
    );
  })();

  return { ok: true, fundingId, netAmount };
}

/** Risk-based daily limit from lifetime P&L and tenure. */
export function calculateRailLimit(db: Database, nodeId: TreeNodeId): number {
  const lifetime = db
    .query(
      `SELECT COALESCE(SUM(p.pnl), 0) as total
       FROM plays p
       JOIN play_distribution d ON p.id = d.play_id
       WHERE d.node_id = $nid AND p.result IN ('win', 'loss')`
    )
    .get({ $nid: nodeId }) as { total: number };

  const tenure = db
    .query(
      `SELECT julianday('now') - julianday(created_at) as days FROM tree_nodes WHERE id = $nid`
    )
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
    .all({ $s: 'active' }) as { id: string; agent_id: string }[]; // brand-ok x2 — opaque DB row

  let updated = 0;
  for (const { id, agent_id: agentId } of rails) {
    const limit = calculateRailLimit(db, parseTreeNodeId(agentId));
    db.run('UPDATE rails SET daily_limit = $lim WHERE id = $id', { $lim: limit, $id: id });
    updated++;
  }
  return updated;
}
