// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/reference/bun/SQL — Bun.SQL
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sql
/**
 * Postgres migration bridge — DDL export + connectivity probe for Bun.SQL.
 *
 * SQLite remains SSOT for v1; set OPS_DATABASE_URL to probe/postgres readiness.
 */
import { initSchema } from './schema.ts';
import { Database } from 'bun:sqlite';

/** Export schema init as Postgres-compatible DDL (subset — no CHECK incompatibilities). */
export function exportPostgresDdl(): string {
  const db = new Database(':memory:');
  initSchema(db);
  const tables = db
    .query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as { sql: string }[];
  db.close();

  return (
    tables
      .map(t =>
        t.sql
          .replace(/INTEGER DEFAULT 1/g, 'INTEGER DEFAULT 1')
          .replace(/AUTOINCREMENT/g, 'GENERATED ALWAYS AS IDENTITY')
      )
      .join(';\n\n') + ';\n'
  );
}

export type PostgresProbeResult = { ok: true; version: string } | { ok: false; reason: string };

/** Probe Bun.SQL postgres connectivity (requires OPS_DATABASE_URL or DATABASE_URL). */
export async function probePostgresOps(url?: string): Promise<PostgresProbeResult> {
  const conn = url ?? Bun.env.OPS_DATABASE_URL ?? Bun.env.DATABASE_URL;
  if (!conn) return { ok: false, reason: 'No OPS_DATABASE_URL or DATABASE_URL' };
  if (!conn.startsWith('postgres')) {
    return { ok: false, reason: 'URL must be postgres:// or postgresql://' };
  }

  try {
    const sql = new Bun.SQL(conn);
    const rows = (await sql`SELECT version() as version`) as { version: string }[];
    const version = rows[0]?.version ?? 'unknown';
    return { ok: true, version };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
