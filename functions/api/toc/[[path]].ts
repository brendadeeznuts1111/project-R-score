/**
 * Pages TOC Ops API — snapshot only (no bun:sqlite on edge).
 *
 * GET  /api/toc           → full fixture
 * GET  /api/toc/summary   → rollup
 * GET  /api/toc/partners  → partners[]
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
  summary?: Record<string, unknown>;
  buffer?: Record<string, unknown>;
  partners?: Array<Record<string, unknown>>;
  catalog?: Record<string, unknown>;
  schema?: string;
  source?: string;
  ssot?: Record<string, unknown>;
};

async function loadSnapshot(env: PagesEnv, origin: string): Promise<TocSnap | null> {
  const url = new URL('/registry/toc-ops.json', origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(url.toString()));
    } else {
      res = await fetch(url.toString());
    }
    if (!res.ok) return null;
    return (await res.json()) as TocSnap;
  } catch {
    return null;
  }
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
      { status: 503 }
    );
  }

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const snap = await loadSnapshot(env, origin);
  if (!snap) {
    return Response.json(
      {
        error: 'TOC Ops snapshot missing',
        hint: 'bun run ops:seed:toc && bun run ops:snapshot --no-routing',
      },
      { status: 404 }
    );
  }

  const envelope = {
    mode: 'snapshot' as const,
    readOnly: true,
    generatedAt: snap.generatedAt ?? null,
    schema: snap.schema ?? null,
    source: snap.source ?? 'snapshot',
  };

  if (sub === 'index' || sub === '') {
    return Response.json({ ...envelope, ...snap });
  }

  if (sub === 'summary') {
    return Response.json({
      ...envelope,
      summary: snap.summary ?? {},
      buffer: snap.buffer ?? {},
      ssot: snap.ssot ?? {},
    });
  }

  if (sub === 'partners') {
    return Response.json({
      ...envelope,
      partners: snap.partners ?? [],
    });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
