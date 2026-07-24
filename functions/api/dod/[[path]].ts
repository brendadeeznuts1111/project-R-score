/**
 * Pages DOD API — snapshot queue only (no bun:sqlite on edge).
 *
 * GET  /api/dod?status=flagged → { mode, readOnly, generatedAt, byStatus, entries }
 * POST /api/dod/*              → 503 (mutations: local serve-public only)
 *
 * @see functions-bun-only/api/dod/index.ts — live SQLite + approve/reject
 * @see docs/platform-routing.md
 */
export type PagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

type DodQueueSnapshot = {
  entries?: Array<Record<string, unknown>>;
  readOnly?: boolean;
  generatedAt?: string;
  byStatus?: Record<string, number>;
  pendingCount?: number;
};

async function loadSnapshot(env: PagesEnv, origin: string): Promise<DodQueueSnapshot | null> {
  const url = new URL('/registry/dod-queue.json', origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(url.toString()));
    } else {
      res = await fetch(url.toString());
    }
    if (!res.ok) return null;
    return (await res.json()) as DodQueueSnapshot;
  } catch {
    return null;
  }
}

function countByStatus(entries: Array<Record<string, unknown>>): Record<string, number> {
  const byStatus: Record<string, number> = {};
  for (const row of entries) {
    const st = String(row.status ?? 'unknown');
    byStatus[st] = (byStatus[st] ?? 0) + 1;
  }
  return byStatus;
}

export async function onRequest(context: {
  request: Request;
  env: PagesEnv;
}): Promise<Response> {
  const { request, env } = context;
  const origin = new URL(request.url).origin;
  const sub = new URL(request.url).pathname.replace(/^\/api\/dod\/?/, '');

  if (request.method === 'POST') {
    return Response.json(
      {
        error: 'DOD review actions are not available on Pages',
        hint: 'Run bun run serve:public locally for approve/reject (functions-bun-only)',
      },
      { status: 503 }
    );
  }

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (sub && sub !== 'index') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const snap = await loadSnapshot(env, origin);
  const all = snap?.entries ?? [];
  const status = new URL(request.url).searchParams.get('status') || 'all';
  const entries =
    status === 'all' ? all : all.filter(row => String(row.status ?? '') === status);
  const byStatus = snap?.byStatus ?? countByStatus(all);

  return Response.json(
    {
      mode: 'snapshot',
      readOnly: true,
      generatedAt: snap?.generatedAt ?? null,
      byStatus,
      pendingCount: byStatus.pending ?? snap?.pendingCount ?? 0,
      entries,
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'X-DOD-Source': 'snapshot',
        'X-DOD-Read-Only': '1',
      },
    }
  );
}
