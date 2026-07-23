#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Local portal + static public/ server with live ops API.
 *
 *   bun scripts/serve-public.ts
 *   open http://localhost:3000/portal/ops/
 *
 * Routes:
 *   /api/operations/summary  → live SQLite buildOpsSummary (same shape as Pages snapshot)
 *   /*                       → public/* (index.html for directories)
 *
 * Pages edge stays snapshot-only (functions/api/operations/summary.ts).
 * Local uses functions-bun-only live path.
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';

const PORT = Number(Bun.env.PORT || 3000);
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

function json(data: object, status = 200, cache = 'no-store'): Response {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
    },
  });
}

async function liveOpsSummary(): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      return json(buildOpsSummary(db, 'live'));
    } finally {
      db.close();
    }
  } catch (err) {
    // Fall back to committed snapshot so portal still loads offline
    const snap = Bun.file('public/registry/ops-summary.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      return json({ ...data, source: 'snapshot', fallback: 'db-unavailable' });
    }
    return json(
      {
        error: 'Failed to open operations DB',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      503
    );
  }
}

async function staticFile(pathname: string): Promise<Response | null> {
  let path = pathname === '/' ? '/index.html' : pathname;
  // directory → index.html (portal/ops/)
  if (path.endsWith('/')) path = `${path}index.html`;

  let file = Bun.file(`public${path}`);
  if (!(await file.exists()) && !path.endsWith('.html') && !path.includes('.')) {
    file = Bun.file(`public${path}/index.html`);
  }
  if (!(await file.exists())) return null;

  const headers = new Headers();
  if (path.endsWith('.json')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  } else if (path.endsWith('.svg')) {
    headers.set('Content-Type', 'image/svg+xml');
  }
  return new Response(file, { headers });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/api/operations/summary' || path === '/api/operations/summary/') {
      return liveOpsSummary();
    }

    const staticRes = await staticFile(path);
    if (staticRes) return staticRes;

    return new Response('Not found', { status: 404 });
  },
});

console.log(`Local portal:  http://localhost:${PORT}/portal/ops/`);
console.log(`Live API:      http://localhost:${PORT}/api/operations/summary`);
console.log(`Snapshot file: http://localhost:${PORT}/registry/ops-summary.json`);
console.log(`Prediction:    http://localhost:${PORT}/registry/prediction/report.html`);
console.log(`DB: ${dbPath}`);
