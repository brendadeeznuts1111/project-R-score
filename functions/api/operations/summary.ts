/**
 * Operations summary endpoint — live SQLite or static snapshot fallback.
 *
 * In local dev / self-hosted: reads from data/operations.db via bun:sqlite.
 * In Pages deploy (read-only filesystem): falls back to the static snapshot
 * at public/registry/ops-summary.json.
 *
 * Set OPS_DB_PATH to override the SQLite path. Set OPS_SNAPSHOT_PATH to
 * override the snapshot location.
 *
 * @see https://bun.sh/docs/runtime/sqlite — bun:sqlite
 * @see https://bun.sh/docs/runtime/file-io#reading-files-bun-file — Bun.file
 */

import { Database } from "bun:sqlite";

const DEFAULT_DB = "data/operations.db";
const DEFAULT_SNAPSHOT = "public/registry/ops-summary.json";

type SummaryRow = Record<string, unknown>;

function queryLive(db: Database) {
  db.run("PRAGMA journal_mode=WAL");

  const liquidity = db.query(
    "SELECT COALESCE(SUM(balance), 0) as total FROM sb_accounts WHERE status = 'active'",
  ).get() as { total: number };

  const experts = db.query(
    "SELECT name, sport, market, edge_score, active FROM experts ORDER BY edge_score DESC",
  ).all() as SummaryRow[];

  const tree = db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END), 0) as partners,
      COALESCE(SUM(CASE WHEN type = 'agent' THEN 1 ELSE 0 END), 0) as agents,
      COALESCE(SUM(CASE WHEN type = 'sub_agent' THEN 1 ELSE 0 END), 0) as subAgents
    FROM tree_nodes WHERE active = 1
  `).get() as { partners: number; agents: number; subAgents: number };

  const downstream = db.query(`
    WITH RECURSIVE down_tree AS (
      SELECT id FROM tree_nodes WHERE parent_id IS NULL AND active = 1
      UNION ALL
      SELECT n.id FROM tree_nodes n JOIN down_tree d ON n.parent_id = d.id WHERE n.active = 1
    )
    SELECT COALESCE(SUM(a.balance), 0) as total
    FROM sb_accounts a JOIN down_tree d ON a.agent_id = d.id WHERE a.status = 'active'
  `).get() as { total: number };

  const plays = db.query(`
    SELECT p.sport, p.market, p.event, p.selection, p.odds,
           p.confidence, p.sent_at, p.result,
           e.name as expert_name,
           (SELECT COUNT(*) FROM play_distribution WHERE play_id = p.id) as sent_count,
           (SELECT COUNT(*) FROM play_distribution WHERE play_id = p.id AND status = 'placed') as placed_count
    FROM plays p
    JOIN experts e ON p.expert_id = e.id
    WHERE date(p.sent_at) = date('now')
    ORDER BY p.sent_at DESC LIMIT 20
  `).all() as SummaryRow[];

  const rails = db.query(`
    SELECT type, COALESCE(SUM(total_sent), 0) as total_sent,
           COALESCE(SUM(monthly_limit), 0) as monthly_limit
    FROM rails WHERE status = 'active' GROUP BY type
  `).all() as SummaryRow[];

  const phones = db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'inventory' THEN 1 ELSE 0 END), 0) as inventory,
      COALESCE(SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END), 0) as issued,
      COALESCE(SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END), 0) as returned
    FROM phones
  `).get() as { inventory: number; issued: number; returned: number };

  return { liquidity, experts, tree, downstreamLiquidity: downstream.total, plays, rails, phones };
}

async function loadSnapshot() {
  const path = Bun.env.OPS_SNAPSHOT_PATH || DEFAULT_SNAPSHOT;
  const file = Bun.file(path);
  if (await file.exists()) return await file.json();
  return null;
}

export async function onRequest(): Promise<Response> {
  // Try live SQLite first
  const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_DB;
  try {
    const db = new Database(dbPath);
    const data = queryLive(db);
    return Response.json({
      source: "live",
      generated: new Date().toISOString(),
      liquidity: { total: data.liquidity.total },
      experts: data.experts,
      tree: { ...data.tree, downstreamLiquidity: data.downstreamLiquidity },
      plays: data.plays,
      rails: data.rails,
      phones: data.phones,
    });
  } catch {
    // Fall back to static snapshot
    const snapshot = await loadSnapshot();
    if (snapshot) {
      return Response.json({ source: "snapshot", ...snapshot });
    }
    return Response.json(
      { error: "No live database or snapshot available", source: "none" },
      { status: 503 },
    );
  }
}
