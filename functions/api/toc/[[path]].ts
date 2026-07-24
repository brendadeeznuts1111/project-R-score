/**
 * Pages TOC Ops API — snapshot only (no bun:sqlite on edge).
 *
 * GET  /api/toc           → full fixture
 * GET  /api/toc/summary   → rollup + enforcement + returnEfficiency
 * GET  /api/toc/partners  → partners[]
 * GET  /api/toc/proof     → bake proof from ASSETS (or derived)
 * POST /api/toc/*         → 503 (mutations: toc-ops-repo Central Tool)
 *
 * @see public/registry/toc-ops.json
 * @see docs/harness/tenants/toc-ops.md
 */
export type PagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

type TocSnap = {
  generatedAt?: string;
  readOnly?: boolean;
  plane?: string;
  summary?: Record<string, unknown>;
  buffer?: Record<string, unknown>;
  partners?: Array<Record<string, unknown>>;
  catalog?: Record<string, unknown>;
  schema?: string;
  source?: string;
  ssot?: Record<string, unknown>;
  identity?: Record<string, unknown>;
  enforcement?: {
    plane?: string;
    passed?: number;
    failed?: number;
    criticalFailed?: number;
    diagnosis?: { focus?: string; summary?: string };
    throughput?: { T?: number; I?: number; OE?: number };
  };
  returnEfficiency?: Record<string, unknown>;
  rankedActions?: Array<Record<string, unknown>>;
};

async function loadJson(
  env: PagesEnv,
  origin: string,
  path: string
): Promise<Record<string, unknown> | null> {
  const url = new URL(path, origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(url.toString()));
    } else {
      res = await fetch(url.toString());
    }
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tocHeaders(snap: TocSnap | null, extra?: Record<string, string>): HeadersInit {
  const focus = snap?.enforcement?.diagnosis?.focus ?? '';
  const failed = snap?.enforcement?.failed;
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    'X-TOC-Source': 'snapshot',
    'X-TOC-Read-Only': '1',
    'X-TOC-Plane': snap?.plane ?? 'demo-readonly',
    ...(snap?.enforcement?.plane
      ? { 'X-TOC-Enforcement': snap.enforcement.plane }
      : {}),
    ...(focus ? { 'X-TOC-Focus': focus } : {}),
    ...(typeof failed === 'number' ? { 'X-TOC-Gates-Failed': String(failed) } : {}),
    ...extra,
  };
}

export async function onRequest(context: {
  request: Request;
  env: PagesEnv;
}): Promise<Response> {
  const { request, env } = context;
  const origin = new URL(request.url).origin;
  const sub = new URL(request.url).pathname.replace(/^\/api\/toc\/?/, '') || 'index';

  if (request.method === 'POST') {
    return Response.json(
      {
        error: 'TOC Ops mutations are not available on Pages',
        hint: 'Use toc-ops-repo Central Tool (ct) locally; Pages serves /registry/toc-ops.json only',
      },
      {
        status: 503,
        headers: {
          'X-TOC-Read-Only': '1',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (sub === 'proof') {
    const proof = await loadJson(env, origin, '/registry/toc-ops-bake-proof.json');
    if (!proof) {
      return Response.json(
        {
          error: 'TOC Ops bake proof missing',
          hint: 'bun run ops:seed:toc -- --force && bun run ops:snapshot --no-routing',
        },
        { status: 404, headers: tocHeaders(null) }
      );
    }
    return Response.json(
      { mode: 'snapshot', readOnly: true, ...proof },
      { headers: tocHeaders(null, { 'X-TOC-Proof': '1' }) }
    );
  }

  const snap = (await loadJson(env, origin, '/registry/toc-ops.json')) as TocSnap | null;
  if (!snap) {
    return Response.json(
      {
        error: 'TOC Ops snapshot missing',
        hint: 'bun run ops:seed:toc && bun run ops:snapshot --no-routing',
      },
      { status: 404, headers: tocHeaders(null) }
    );
  }

  const envelope = {
    mode: 'snapshot' as const,
    readOnly: true as const,
    generatedAt: snap.generatedAt ?? null,
    schema: snap.schema ?? null,
    source: snap.source ?? 'snapshot',
    plane: snap.plane ?? 'demo-readonly',
  };

  if (sub === 'index' || sub === '') {
    return Response.json({ ...envelope, ...snap }, { headers: tocHeaders(snap) });
  }

  if (sub === 'summary') {
    return Response.json(
      {
        ...envelope,
        summary: snap.summary ?? {},
        buffer: snap.buffer ?? {},
        ssot: snap.ssot ?? {},
        identity: snap.identity
          ? {
              linked: snap.identity.linked ?? false,
              linkedPartners: snap.identity.linkedPartners ?? 0,
              linkedAccounts: snap.identity.linkedAccounts ?? 0,
            }
          : null,
        enforcement: snap.enforcement
          ? {
              plane: snap.enforcement.plane ?? null,
              focus: snap.enforcement.diagnosis?.focus ?? null,
              summary: snap.enforcement.diagnosis?.summary ?? null,
              passed: snap.enforcement.passed ?? 0,
              failed: snap.enforcement.failed ?? 0,
              criticalFailed: snap.enforcement.criticalFailed ?? 0,
              throughput: snap.enforcement.throughput ?? null,
            }
          : null,
        returnEfficiency: snap.returnEfficiency ?? null,
        rankedActions: (snap.rankedActions ?? []).slice(0, 5),
        housePresence: snap.housePresence ?? null,
        presence: snap.presence ?? null,
        venues: snap.venues ?? null,
        venueCatalog: snap.catalog?.venues ?? null,
        profiles: snap.profiles ?? null,
        experts: (snap.experts ?? []).map(
          (e: {
            expertId?: string; // brand-ok — fixture expert key
            displayName?: string;
            markets?: string[];
            weight?: number;
            profile?: {
              clv?: unknown;
              liquidity?: unknown;
              style?: unknown;
              telegram?: unknown;
              bot?: unknown;
              deals?: unknown[];
              accounting?: unknown;
            };
          }) => ({
            expertId: e.expertId,
            displayName: e.displayName,
            markets: e.markets,
            weight: e.weight,
            clv: e.profile?.clv ?? null,
            liquidity: e.profile?.liquidity ?? null,
            style: e.profile?.style ?? null,
            telegram: e.profile?.telegram ?? null,
            bot: e.profile?.bot ?? null,
            deals: e.profile?.deals?.length ?? 0,
            accounting: e.profile?.accounting ?? null,
          })
        ),
      },
      { headers: tocHeaders(snap) }
    );
  }

  if (sub === 'partners') {
    return Response.json(
      {
        ...envelope,
        partners: snap.partners ?? [],
      },
      { headers: tocHeaders(snap) }
    );
  }

  return Response.json({ error: 'Not found' }, { status: 404, headers: tocHeaders(snap) });
}
