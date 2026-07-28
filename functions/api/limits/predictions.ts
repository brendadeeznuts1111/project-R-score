/**
 * Pages stub — limit predictions need bun:sqlite (local serve-public).
 *
 * GET|POST /api/limits/predictions → 503 with operator links
 *
 * @see lib/operations/limit-raise-agent-api.ts handleLimitPredictionsRequest
 * @see docs/harness/tenants/partner-limits.md
 */

function json(data: object, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

const body = {
  ok: false,
  mode: 'snapshot',
  error: 'Predictions require local SQLite — use serve-public or CLI',
  links: {
    local: 'GET|POST /api/limits/predictions (serve-public)',
    cli: 'bun run ops:limits:predict',
    summary: '/api/limits/summary',
    portal: '/portal/limits/',
    tenant: 'docs/harness/tenants/partner-limits.md',
  },
} as const;

export const onRequestGet: PagesFunction = async () => json(body, 503);
export const onRequestPost: PagesFunction = async () => json(body, 503);
