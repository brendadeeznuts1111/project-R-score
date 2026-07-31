/**
 * Pages stub — granular limit analyze needs bun:sqlite (local serve-public).
 *
 * GET /api/limits/analyze → 503 with operator links
 *
 * Contract: mode=snapshot · plane=local-sqlite · reason=bun:sqlite
 *
 * @see lib/operations/limit-raise-agent-api.ts handleLimitAnalyzeRequest
 * @see lib/http/pages-local-only.ts
 * @see docs/harness/tenants/partner-limits.md
 */
import { getOnly } from '../_get-only.ts';

function json(data: object, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export const onRequest: PagesFunction = async (context: { request: Request }) => {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  return json(
    {
      ok: false,
      mode: 'snapshot',
      plane: 'local-sqlite',
      reason: 'bun:sqlite',
      error: 'Analyze requires local SQLite — use serve-public or CLI',
      links: {
        local: 'GET /api/limits/analyze (serve-public)',
        cli: 'bun run ops:limits:analyze',
        summary: '/api/limits/summary',
        portal: '/portal/limits/',
        tenant: 'docs/harness/tenants/partner-limits.md',
      },
    },
    503
  );
};
