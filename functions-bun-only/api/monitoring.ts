/**
 * Local Bun monitoring API — live collectMonitoring.
 * @see lib/monitoring/collect.ts
 * @see https://bun.com/docs/runtime/sqlite — bun:sqlite
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../../lib/operations/db.ts';
import { collectMonitoring } from '../../lib/monitoring/index.ts';

export async function onRequest(): Promise<Response> {
  const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      const data = await collectMonitoring(db, { source: 'live' });
      return Response.json(data, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } finally {
      db.close();
    }
  } catch (err) {
    return Response.json(
      {
        error: 'monitoring collect failed',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      { status: 503 }
    );
  }
}
