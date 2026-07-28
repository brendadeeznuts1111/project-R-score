/**
 * Pages public limit summary — snapshot only (no bun:sqlite on edge).
 *
 * GET /api/limits/summary
 * GET /api/limits/summary?format=table|text|inspect
 *
 * Aggregates public/registry/limit-raises.json (and optionally ops-summary limitChanges).
 * Live SQLite: local serve-public handleLimitSummaryRequest.
 *
 * @see public/registry/limit-raises.json
 * @see docs/harness/tenants/partner-limits.md
 */

export type PagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

type SnapshotRaise = {
  sportsbook?: string;
  sport_id?: string; // brand-ok — snapshot wire sport key
  market_id?: string; // brand-ok — snapshot wire market key
  bet_type?: string;
  previous_max?: number;
  new_limit?: number;
  increased_at?: number;
  multi_factor_score?: number;
  [key: string]: unknown;
};

type LimitRaisesSnapshot = {
  schemaVersion?: number;
  generatedAt?: string;
  lookbackHours?: number;
  byNode?: Record<string, { node_id?: string; raises?: SnapshotRaise[] }>; // brand-ok
  patterns?: Record<string, unknown>;
};

async function loadJson(
  env: PagesEnv,
  origin: string,
  path: string
): Promise<unknown | null> {
  const url = new URL(path, origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(url.toString()));
    } else {
      res = await fetch(url.toString());
    }
    if (!res.ok) return null;
    return await res.json();
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

export const onRequestGet: PagesFunction<PagesEnv> = async context => {
  const url = new URL(context.request.url);
  const origin = url.origin;
  const format = (url.searchParams.get('format') ?? 'json').toLowerCase();

  const snapshot = (await loadJson(
    context.env,
    origin,
    '/registry/limit-raises.json'
  )) as LimitRaisesSnapshot | null;

  if (!snapshot?.byNode) {
    return json(
      {
        ok: false,
        mode: 'snapshot',
        error: 'limit-raises snapshot missing — run bun run ops:snapshot',
        links: {
          bake: 'bun run ops:snapshot',
          seed: 'bun tools/seed-limit-patterns.ts (force+bake)',
          portal: '/portal/limits/',
          registry: '/registry/limit-raises.json',
          tenant: 'docs/harness/tenants/partner-limits.md',
        },
      },
      503
    );
  }

  const changes: Array<{
    node_id: string; // brand-ok — snapshot wire
    sportsbook: string;
    sport_id: string; // brand-ok — snapshot wire sport key
    market_id: string; // brand-ok — snapshot wire market key
    bet_type: string;
    previous_max: number;
    new_limit: number;
    increased_at: number;
    direction: 'up' | 'down';
    multi_factor_score: number | null;
  }> = [];

  for (const [nodeKey, bucket] of Object.entries(snapshot.byNode)) {
    const nodeId = bucket.node_id ?? nodeKey;
    for (const r of bucket.raises ?? []) {
      const prev = Number(r.previous_max ?? 0);
      const next = Number(r.new_limit ?? 0);
      changes.push({
        node_id: nodeId,
        sportsbook: String(r.sportsbook ?? '—'),
        sport_id: String(r.sport_id ?? '—'),
        market_id: String(r.market_id ?? '—'),
        bet_type: String(r.bet_type ?? '—'),
        previous_max: prev,
        new_limit: next,
        increased_at: Number(r.increased_at ?? 0),
        direction: next >= prev ? 'up' : 'down',
        multi_factor_score:
          r.multi_factor_score != null && Number.isFinite(Number(r.multi_factor_score))
            ? Number(r.multi_factor_score)
            : null,
      });
    }
  }

  const total = changes.length;
  const raises = changes.filter(c => c.direction === 'up').length;
  const downs = changes.filter(c => c.direction === 'down').length;
  const netDelta = changes.reduce((s, c) => s + (c.new_limit - c.previous_max), 0);
  const scored = changes.filter(c => c.multi_factor_score != null);
  const avgScore =
    scored.length > 0
      ? scored.reduce((s, c) => s + (c.multi_factor_score ?? 0), 0) / scored.length
      : null;
  const books = new Set(changes.map(c => c.sportsbook)).size;
  const partners = new Set(changes.map(c => c.node_id)).size;

  if (format === 'table' || format === 'text' || format === 'inspect') {
    const lines = [
      `LimitSummary(snapshot) · total=${total} raises=${raises} decreases=${downs} netΔ=$${netDelta}`,
      `partners=${partners} books=${books} avgScore=${avgScore != null ? avgScore.toFixed(3) : '—'}`,
      `generatedAt=${snapshot.generatedAt ?? '—'}`,
      '',
    ];
    if (total === 0) {
      lines.push('(no limit changes in snapshot)');
      lines.push('hint: bun tools/seed-limit-patterns.ts (force+bake)');
    } else {
      for (const c of changes.slice(0, 40)) {
        const score = c.multi_factor_score != null ? c.multi_factor_score.toFixed(2) : '—';
        lines.push(
          `${c.node_id} ${c.sportsbook} ${c.sport_id}/${c.market_id} ${c.bet_type} $${c.previous_max}→$${c.new_limit} ${c.direction} score=${score}`
        );
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

  return json({
    ok: true,
    mode: 'snapshot',
    readOnly: true,
    schemaVersion: 1,
    generated: snapshot.generatedAt ?? new Date().toISOString(),
    lookbackHours: snapshot.lookbackHours ?? null,
    total,
    raises,
    decreases: downs,
    netDelta,
    avgScore: avgScore != null ? Number(avgScore.toFixed(4)) : null,
    uniqueSportsbooks: books,
    uniquePartners: partners,
    changes,
    patterns: snapshot.patterns ?? null,
    links: {
      portal: '/portal/limits/',
      registry: '/registry/limit-raises.json',
      agentRaises: '/api/agents/v1/limits/raises?node_id=…',
      live: 'local serve-public for SQLite-backed summary',
      tenant: 'docs/harness/tenants/partner-limits.md',
    },
  });
};

export const onRequestPost: PagesFunction = async () =>
  json(
    {
      ok: false,
      error: 'POST not supported on Pages summary — use local serve-public for mutations',
    },
    405
  );
