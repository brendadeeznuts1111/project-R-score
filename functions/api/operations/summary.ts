/**
 * Operations summary endpoint — live SQLite or static snapshot fallback.
 *
 * Local / self-hosted: reads `data/operations.db` (experiments + prediction included).
 * Cloudflare Pages (no bun:sqlite): falls back to `public/registry/ops-summary.json`
 * produced by `bun run ops:snapshot`.
 *
 * Env: `OPS_DB_PATH`, `OPS_SNAPSHOT_PATH`
 *
 * @see https://bun.com/docs/runtime/sqlite — bun:sqlite
 * @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
 * @see lib/operations/ops-summary.ts
 */

import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../../../lib/operations/db.ts';
import { buildOpsSummary } from '../../../lib/operations/ops-summary.ts';

const DEFAULT_SNAPSHOT = 'public/registry/ops-summary.json';

async function loadSnapshot(): Promise<Record<string, unknown> | null> {
  const path = Bun.env.OPS_SNAPSHOT_PATH || DEFAULT_SNAPSHOT;
  const file = Bun.file(path);
  if (await file.exists()) {
    return (await file.json()) as Record<string, unknown>;
  }
  return null;
}

export async function onRequest(): Promise<Response> {
  const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      const data = buildOpsSummary(db, 'live');
      return Response.json(data);
    } finally {
      db.close();
    }
  } catch {
    const snapshot = await loadSnapshot();
    if (snapshot) {
      return Response.json({ ...snapshot, source: 'snapshot' });
    }
    return Response.json(
      { error: 'No live database or snapshot available', source: 'none' },
      { status: 503 }
    );
  }
}
