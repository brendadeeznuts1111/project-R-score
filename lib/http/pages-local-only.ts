// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Stable Pages → local-only contract for SQLite mutation/query routes.
 *
 * Pages edge returns 503 with machine fields; local serve-public implements
 * the real handlers. Do not lift these stubs without Access + durable store.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

export type PagesLocalOnlyBody = {
  ok: false;
  mode: 'snapshot';
  plane: 'local-sqlite';
  reason: 'bun:sqlite';
  error: string;
  links: Record<string, string>;
  example?: Record<string, unknown>;
};

export function pagesLocalOnlyJson(
  error: string,
  links: Record<string, string>,
  opts?: { example?: Record<string, unknown>; status?: number }
): Response {
  const body: PagesLocalOnlyBody = {
    ok: false,
    mode: 'snapshot',
    plane: 'local-sqlite',
    reason: 'bun:sqlite',
    error,
    links,
    ...(opts?.example ? { example: opts.example } : {}),
  };
  return Response.json(body, {
    status: opts?.status ?? 503,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
