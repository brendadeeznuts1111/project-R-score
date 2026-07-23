/**
 * Local Bun-only ops summary — live SQLite via `buildOpsSummary`.
 *
 * Not for Cloudflare Pages (Workers lack bun:sqlite). Pages uses
 * root `functions/api/operations/summary.ts` → static snapshot.
 *
 * Same JSON contract as `lib/operations/ops-summary.ts` / `ops:snapshot`.
 *
 * @see https://bun.com/docs/runtime/sqlite — bun:sqlite
 * @see lib/operations/ops-summary.ts
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../../../lib/operations/db.ts';
import { buildOpsSummary } from '../../../lib/operations/ops-summary.ts';

export async function onRequest(): Promise<Response> {
  const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      const data = buildOpsSummary(db, 'live');
      return Response.json(data, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      db.close();
    }
  } catch (err) {
    return Response.json(
      {
        error: 'Failed to open operations DB',
        detail: err instanceof Error ? err.message : String(err),
        hint: 'Set OPS_DB_PATH or run from repo with data/operations.db',
        source: 'none',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
