/**
 * Pages Function — GET /api/content-type
 *
 * Serves committed policy matrix snapshot (no Bun runtime on edge).
 *
 * @see public/registry/content-type-matrix.json
 * @see lib/http/content-type.ts
 */

export type ContentTypePagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=300, must-revalidate',
  'Access-Control-Allow-Origin': '*',
};

async function loadMatrix(
  env: ContentTypePagesEnv,
  origin: string
): Promise<Record<string, unknown> | null> {
  const snapUrl = new URL('/registry/content-type-matrix.json', origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(snapUrl.toString()));
    } else {
      res = await fetch(snapUrl.toString(), { headers: { Accept: 'application/json' } });
    }
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function onRequest(context: {
  request: Request;
  env: ContentTypePagesEnv;
}): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Accept',
      },
    });
  }

  const origin = new URL(context.request.url).origin;
  const body =
    (await loadMatrix(context.env, origin)) ??
    ({
      source: 'edge-fallback',
      summary: { total: 0, pass: 0, warn: 0, fail: 0 },
      rows: [],
      hint: 'Run: bun tools/content-type-table.ts --json > public/registry/content-type-matrix.json',
    } satisfies Record<string, unknown>);

  return Response.json(body, { headers: JSON_HEADERS });
}
