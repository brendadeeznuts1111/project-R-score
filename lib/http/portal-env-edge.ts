/**
 * Edge-safe env checklist for Pages Functions (/api/env, /api/health env slice).
 * Workers cannot run full env-check — surface bindings + snapshot when available.
 *
 * @see lib/http/portal-env-status.ts — origin buildPortalEnvStatus()
 * @see docs/portal-foundation.md
 */

export type EdgeEnvRow = {
  Key: string;
  Group: string;
  Severity: string;
  Status: string;
  Detail: string;
};

export type EdgeEnvContext = {
  hasAssets: boolean;
};

/** Minimal binding checklist available on Cloudflare Pages. */
export function buildEdgeEnvTable(ctx: EdgeEnvContext): EdgeEnvRow[] {
  return [
    {
      Key: 'CLOUDFLARE_API_TOKEN',
      Group: 'cloudflare',
      Severity: 'required',
      Status: 'edge-n/a',
      Detail: 'set on build host / reasonix; not in Pages Function env by default',
    },
    {
      Key: 'R2 binding REGISTRY_BUCKET',
      Group: 'r2',
      Severity: 'required',
      Status: 'binding',
      Detail: 'Pages dashboard binding → factory-wager-registry',
    },
    {
      Key: 'ASSETS',
      Group: 'pages',
      Severity: 'required',
      Status: ctx.hasAssets ? 'set' : 'missing',
      Detail: 'static file fetch for /registry/*',
    },
  ];
}

const EDGE_OK_STATUSES = new Set(['set', 'binding', 'edge-n/a']);

function summarizeTable(table: EdgeEnvRow[]) {
  return {
    total: table.length,
    ok: table.filter(r => EDGE_OK_STATUSES.has(r.Status)).length,
    missing: table.filter(r => r.Status === 'missing').length,
    placeholder: 0,
    requiredMissing: table.filter(r => r.Status === 'missing').length,
    note: 'Full secret checklist runs on origin: bun run env:check',
  };
}

/** JSON body for GET /api/env on edge when no monitoring snapshot is present. */
export function buildEdgeEnvStatus(ctx: EdgeEnvContext): Record<string, unknown> {
  const table = buildEdgeEnvTable(ctx);
  return {
    ok: true,
    source: 'edge-checklist',
    checkedAt: new Date().toISOString(),
    summary: summarizeTable(table),
    table,
    requiredMissingKeys: table.filter(r => r.Status === 'missing').map(r => r.Key),
  };
}

export function isEnvStatusPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Boolean(v.summary && Array.isArray(v.table));
}
