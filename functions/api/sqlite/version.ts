/**
 * Pages Function — expose Bun's SQLite version info.
 *
 * GET /api/sqlite/version → { version, bunVersion, features, docs }
 */
import { getOnly } from '../_get-only.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  // We can't use bun:sqlite in Pages Functions, so return the expected version
  const version = '3.53.0'; // Bun 1.4.0 bundled SQLite (blog bun-v1.3.14)
  const bunVersion = '1.4.0'; // static — Bun.version unavailable on the edge
  return Response.json(
    {
      version,
      bunVersion,
      features: [
        'WAL mode (PRAGMA journal_mode=WAL)',
        'Synchronous NORMAL (PRAGMA synchronous=NORMAL)',
        'Prepared statements',
        'JSON functions',
      ],
      docs: 'https://bun.sh/docs/runtime/sqlite',
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
