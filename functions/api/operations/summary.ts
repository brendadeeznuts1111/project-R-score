/**
 * Operations summary endpoint — aggregate view for the ops dashboard.
 *
 * @see https://bun.sh/docs/runtime/sqlite — bun:sqlite
 */

import { Database } from "bun:sqlite";

export async function onRequest(): Promise<Response> {
  const db = new Database("data/operations.db");
  db.run("PRAGMA journal_mode=WAL");

  const liquidity = db.query(
    "SELECT COALESCE(SUM(balance), 0) as total FROM sb_accounts WHERE status = 'active'",
  ).get() as { total: number };

  const experts = db.query(
    "SELECT name, sport, market, edge_score, active FROM experts ORDER BY edge_score DESC",
  ).all();

  const tree = db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END), 0) as partners,
      COALESCE(SUM(CASE WHEN type = 'agent' THEN 1 ELSE 0 END), 0) as agents,
      COALESCE(SUM(CASE WHEN type = 'sub_agent' THEN 1 ELSE 0 END), 0) as subAgents
    FROM tree_nodes WHERE active = 1
  `).get() as { partners: number; agents: number; subAgents: number };

  const plays = db.query(`
    SELECT p.sport, p.market, p.event, p.selection, p.odds,
           p.confidence, p.sent_at, p.result,
           e.name as expert_name,
           (SELECT COUNT(*) FROM play_distribution WHERE play_id = p.id) as sent_count,
           (SELECT COUNT(*) FROM play_distribution WHERE play_id = p.id AND status = 'placed') as placed_count
    FROM plays p
    JOIN experts e ON p.expert_id = e.id
    WHERE date(p.sent_at) = date('now')
    ORDER BY p.sent_at DESC
    LIMIT 20
  `).all();

  const rails = db.query(`
    SELECT type, COALESCE(SUM(total_sent), 0) as total_sent,
           COALESCE(SUM(monthly_limit), 0) as monthly_limit
    FROM rails WHERE status = 'active'
    GROUP BY type
  `).all();

  const phones = db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'inventory' THEN 1 ELSE 0 END), 0) as inventory,
      COALESCE(SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END), 0) as issued,
      COALESCE(SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END), 0) as returned
    FROM phones
  `).get() as { inventory: number; issued: number; returned: number };

  return Response.json({
    liquidity: { total: liquidity.total },
    experts,
    tree,
    plays,
    rails,
    phones,
  });
}
