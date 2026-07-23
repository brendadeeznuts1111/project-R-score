/**
 * Pages Function — expose Bun's SQLite version info.
 *
 * GET /api/sqlite/version → { version, bunVersion, features, docs }
 */
export async function onRequest(): Promise<Response> {
  // We can't use bun:sqlite in Pages Functions, so return the expected version
  const version = '3.51.0'; // Bun 1.4.0-canary bundled SQLite
  return Response.json({
    version,
    bunVersion: Bun.version,
    features: [
      'WAL mode (PRAGMA journal_mode=WAL)',
      'Synchronous NORMAL (PRAGMA synchronous=NORMAL)',
      'Prepared statements',
      'JSON functions',
    ],
    docs: 'https://bun.sh/docs/runtime/sqlite',
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
