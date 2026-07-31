/**
 * Pages stub — limit record is local-only (needs bun:sqlite).
 *
 * POST /api/agents/v1/limits/record → 503 with operator links
 *
 * Contract: mode=snapshot · plane=local-sqlite · reason=bun:sqlite
 *
 * @see lib/operations/limit-raise-agent-api.ts handleLimitRecordRequest
 * @see lib/http/pages-local-only.ts
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

export const onRequestPost: PagesFunction = async () =>
  json(
    {
      ok: false,
      mode: 'snapshot',
      plane: 'local-sqlite',
      reason: 'bun:sqlite',
      error: 'Mutations not available on Pages — use local serve-public or CLI',
      example: {
        node_id: 'partner-42',
        sportsbook: 'draftkings',
        sport_id: 'nba',
        market_id: 'totals',
        bet_type: 'straight',
        max_wager: 1500,
      },
      links: {
        local: 'POST /api/agents/v1/limits/record (serve-public + operations.db)',
        cli: 'bun run ops:limits:check',
        demo: 'bun run ops:limits:demo',
        tenant: 'docs/harness/tenants/partner-limits.md',
      },
    },
    503
  );

export const onRequestGet: PagesFunction = async () =>
  json(
    {
      ok: false,
      mode: 'snapshot',
      plane: 'local-sqlite',
      reason: 'bun:sqlite',
      error: 'POST required',
      links: {
        local: 'POST /api/agents/v1/limits/record',
        tenant: 'docs/harness/tenants/partner-limits.md',
      },
    },
    405
  );
