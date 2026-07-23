/**
 * Pages Function — expose Bun's SQLite version info.
 *
 * GET /api/sqlite/version → { version, bunVersion, features, docs }
 */
export async function onRequest(): Promise<Response> {
  // We can't use bun:sqlite in Pages Functions, so return the expected version
  const version = '3.53.0'; // Bun 1.4.0 bundled SQLite (blog bun-v1.3.14)
  const bunVersion = '1.4.0'; // static — Bun.version unavailable on the edge
  return Response.json({
    version,
    bunVersion,
    features: [
      'WAL mode (PRAGMA journal_mode=WAL)',
      'Synchronous NORMAL (PRAGMA synchronous=NORMAL)',
      'Prepared statements',
      'JSON functions',
    ],
    docs: 'https://bun.sh/docs/runtime/sqlite',
  }, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
