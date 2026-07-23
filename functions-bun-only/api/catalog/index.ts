/**
 * Partner account catalog — searchable, filterable list of all platform
 * accounts across partners, with balance and status.
 *
 * Query params: ?search=...&category=...&status=...&sort=...
 *
 * @see https://bun.sh/docs/runtime/sqlite — bun:sqlite
 */

import { Database } from "bun:sqlite";
import { DEFAULT_OPS_DB_PATH } from '../../../lib/operations/db.ts';

export async function onRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const status = url.searchParams.get("status") || "";

  try {
    const db = new Database(Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH);
    db.run("PRAGMA journal_mode=WAL");

    let sql = `
      SELECT
        p.id as platform_id, p.name as platform, p.category, p.sub_category,
        a.id as account_id, a.partner_id, a.account_identifier,
        a.balance, a.status, a.notes,
        a.opened_at, a.last_verified_at,
        n.name as partner_name, n.type as partner_type
      FROM partner_platform_accounts a
      JOIN platforms p ON a.platform_id = p.id
      JOIN tree_nodes n ON a.partner_id = n.id
      WHERE a.status != 'closed'
    `;
    const params: (string | number)[] = [];

    if (search) {
      sql += ` AND (p.name LIKE ? OR a.account_identifier LIKE ? OR n.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ` AND p.category = ?`;
      params.push(category);
    }
    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY p.category, p.name`;

    const rows = db.query(sql).all(...params);
    return Response.json({ source: "live", accounts: rows });
  } catch {
    // Fallback to static snapshot
    const file = Bun.file("public/registry/catalog-snapshot.json");
    if (await file.exists()) {
      return Response.json(await file.json());
    }
    return Response.json(
      { error: "No live database or snapshot available", source: "none", accounts: [] },
      { status: 503 },
    );
  }
}
