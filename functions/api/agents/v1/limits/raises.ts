/**
 * Pages agent limit-raise API — snapshot only (no bun:sqlite on edge).
 *
 * GET /api/agents/v1/limits/raises?node_id=partner-42&hours=24
 *   → filter public/registry/limit-raises.json from ASSETS / origin
 * GET ...?format=table|text|inspect → plain-text dump of filtered raises
 * GET ...?format=csv|jsonl → account betlog / pattern export (download)
 *
 * Live SQLite enrichment: local serve-public (handleLimitRaiseAgentRequest).
 *
 * @see public/registry/limit-raises.json
 * @see lib/operations/partner-analytics-repo.ts exportLimitRaisesSnapshot
 * @see lib/operations/limit-betlog-export.ts
 * @see docs/harness/tenants/partner-limits.md
 * @see docs/platform-routing.md
 */

import { betlogDownloadResponse } from '../../../../../lib/operations/limit-betlog-export.ts';

export type PagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

type SnapshotRaise = Record<string, unknown>;
type LimitRaisesSnapshot = {
  schemaVersion?: number;
  generatedAt?: string;
  lookbackHours?: number;
  byNode?: Record<string, { node_id?: string; raises?: SnapshotRaise[] }>; // brand-ok — partner slug keys
  patterns?: {
    partners?: number;
    nodes?: number;
    downlineNodes?: number;
    books?: Array<Record<string, unknown>>;
    states?: Array<Record<string, unknown>>;
    zips?: Array<Record<string, unknown>>;
    nodePatterns?: Array<{
      node_id?: string; // brand-ok — snapshot wire
      partner_node_id?: string; // brand-ok — snapshot wire
      [key: string]: unknown;
    }>;
    audit?: Record<string, unknown>;
  };
};

async function loadSnapshot(env: PagesEnv, origin: string): Promise<LimitRaisesSnapshot | null> {
  const url = new URL('/registry/limit-raises.json', origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(url.toString()));
    } else {
      res = await fetch(url.toString());
    }
    if (!res.ok) return null;
    return (await res.json()) as LimitRaisesSnapshot;
  } catch {
    return null;
  }
}

function json(data: object, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
    },
  });
}

function parseHours(raw: string | null): { ok: true; hours: number } | { ok: false; error: string } {
  if (raw == null || raw.trim() === '') return { ok: true, hours: 24 };
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'hours must be a positive number' };
  }
  return { ok: true, hours: Math.min(24 * 30, n) };
}

export const onRequestGet: PagesFunction<PagesEnv> = async context => {
  const url = new URL(context.request.url);
  const nodeId = (url.searchParams.get('node_id') ?? url.searchParams.get('nodeId') ?? '').trim();
  if (!nodeId) {
    return json(
      {
        error: 'node_id is required',
        example: '/api/agents/v1/limits/raises?node_id=partner-42&hours=24',
        mode: 'snapshot',
        formats: ['json', 'table', 'csv', 'jsonl'],
        links: {
          summary: '/api/limits/summary',
          portal: '/portal/partner-history/',
          registry: '/registry/limit-raises.json',
          betlogCsv: '/api/agents/v1/limits/raises?node_id=partner-42&hours=168&format=csv',
          betlogJsonl: '/api/agents/v1/limits/raises?node_id=partner-42&hours=168&format=jsonl',
        },
      },
      400
    );
  }

  const hoursParsed = parseHours(url.searchParams.get('hours'));
  if (!hoursParsed.ok) {
    return json({ error: hoursParsed.error, mode: 'snapshot' }, 400);
  }
  const hours = hoursParsed.hours;

  const origin = url.origin;
  const snapshot = await loadSnapshot(context.env, origin);
  if (!snapshot?.byNode) {
    return json(
      {
        ok: false,
        mode: 'snapshot',
        error: 'limit-raises snapshot missing — run bun run ops:snapshot',
        links: {
          bake: 'bun run ops:snapshot',
          seed: 'bun tools/seed-limit-patterns.ts (force+bake)',
          demo: 'bun run ops:limits:demo',
          portal: '/portal/limits/',
          registry: '/registry/limit-raises.json',
          tenant: 'docs/harness/tenants/partner-limits.md',
        },
      },
      503
    );
  }

  const nodeKeys = Object.keys(snapshot.byNode);
  if (nodeKeys.length === 0) {
    return json(
      {
        ok: false,
        mode: 'snapshot',
        error: 'limit-raises snapshot empty (byNode={}) — seed then re-bake',
        links: {
          seed: 'bun tools/seed-limit-patterns.ts (force+bake)',
          demo: 'bun run ops:limits:demo',
          bake: 'bun run ops:snapshot',
          portal: '/portal/limits/',
          registry: '/registry/limit-raises.json',
        },
      },
      503
    );
  }

  const bucket = snapshot.byNode[nodeId];
  const found = bucket != null;
  const raises = bucket?.raises ?? [];
  const sinceTimestamp = Math.floor(Date.now() / 1000) - Math.round(hours * 3600);
  const filtered = raises.filter(r => {
    const at = Number((r as { increased_at?: number }).increased_at);
    return Number.isFinite(at) && at > 0 && at >= sinceTimestamp;
  });

  const nodePatterns = (snapshot.patterns?.nodePatterns ?? []).filter(
    row => row.node_id === nodeId || row.partner_node_id === nodeId
  );
  const scopedBooks = new Set(
    nodePatterns.flatMap(row =>
      Array.isArray(row.sportsbooks) ? row.sportsbooks.map(value => String(value)) : []
    )
  );
  const scopedStates = new Set(nodePatterns.map(row => String(row.state_code ?? '')));
  const scopedZips = new Set(nodePatterns.map(row => String(row.zip_prefix ?? '')));
  const patterns = snapshot.patterns
    ? {
        ...snapshot.patterns,
        partners: new Set(nodePatterns.map(row => row.partner_node_id)).size,
        nodes: nodePatterns.length,
        downlineNodes: nodePatterns.filter(row => row.node_type !== 'partner').length,
        books: (snapshot.patterns.books ?? []).filter(row => scopedBooks.has(String(row.key))),
        states: (snapshot.patterns.states ?? []).filter(row => scopedStates.has(String(row.key))),
        zips: (snapshot.patterns.zips ?? []).filter(row => scopedZips.has(String(row.key))),
        nodePatterns,
      }
    : null;

  const format = (url.searchParams.get('format') ?? 'json').toLowerCase();
  if (format === 'table' || format === 'text' || format === 'inspect') {
    const lines = [
      `LimitRaises(snapshot) · node=${nodeId} · found=${found} · ${hours}h · raises=${filtered.length}`,
      `generatedAt=${snapshot.generatedAt ?? '—'}`,
      '',
    ];
    if (!found) {
      lines.push(`(node not in snapshot — known nodes: ${nodeKeys.slice(0, 12).join(', ')})`);
    } else if (filtered.length === 0) {
      lines.push('(no raises in lookback window)');
    } else {
      for (const r of filtered.slice(0, 40)) {
        const book = String(r.sportsbook ?? '—');
        const sport = String(r.sport_id ?? '—');
        const market = String(r.market_id ?? '—');
        const prev = Number(r.previous_max ?? 0);
        const next = Number(r.new_limit ?? 0);
        const score = r.multi_factor_score != null ? Number(r.multi_factor_score).toFixed(2) : '—';
        lines.push(`${book} ${sport}/${market} $${prev}→$${next} score=${score}`);
      }
    }
    return new Response(lines.join('\n') + '\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  if (format === 'csv' || format === 'jsonl' || format === 'ndjson') {
    return betlogDownloadResponse(
      filtered.map(row => ({ ...row, node_id: nodeId })),
      nodeId,
      format === 'csv' ? 'csv' : 'jsonl',
      'public, max-age=60'
    );
  }

  return json({
    ok: true,
    mode: 'snapshot',
    readOnly: true,
    schemaVersion: 1,
    node_id: nodeId,
    found,
    lookback_hours: hours,
    since_timestamp: sinceTimestamp,
    generatedAt: snapshot.generatedAt ?? null,
    snapshotLookbackHours: snapshot.lookbackHours ?? null,
    raises: filtered,
    patterns,
    links: {
      portal: '/portal/partner-history/',
      registry: '/registry/limit-raises.json',
      summary: '/api/limits/summary',
      betlogCsv: `/api/agents/v1/limits/raises?node_id=${encodeURIComponent(nodeId)}&hours=${hours}&format=csv`,
      betlogJsonl: `/api/agents/v1/limits/raises?node_id=${encodeURIComponent(nodeId)}&hours=${hours}&format=jsonl`,
      live: 'local serve-public for SQLite-backed raises',
      tenant: 'docs/harness/tenants/partner-limits.md',
    },
  });
};

export const onRequestPost: PagesFunction = async () =>
  json(
    {
      ok: false,
      error: 'Mutations not available on Pages — use local serve-public or ops:limits:check',
      links: {
        recordLocal: 'POST /api/agents/v1/limits/record (serve-public)',
        cli: 'bun run ops:limits:check',
        tenant: 'docs/harness/tenants/partner-limits.md',
      },
    },
    503
  );
