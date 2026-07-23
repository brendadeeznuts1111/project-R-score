/**
 * Local Bun server-rendered monitoring page (Bun.inspect.table).
 * @see lib/monitoring/page.ts
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../../lib/operations/db.ts';
import { collectMonitoring, renderMonitoringHtml } from '../../lib/monitoring/index.ts';

export async function onRequest(): Promise<Response> {
  const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      const data = await collectMonitoring(db, { source: 'live' });
      return new Response(renderMonitoringHtml(data), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    } finally {
      db.close();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`<pre>Monitoring unavailable: ${msg}</pre>`, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
