/**
 * Pages Function — canonical doc index JSON from public/registry/doc-index.json.
 * Edge-safe: reads via ASSETS binding / origin fetch (no Bun.file).
 */
import { getOnly } from '../_get-only.ts';

export async function onRequest(context: {
  request: Request;
  env?: { ASSETS?: { fetch: (req: Request) => Promise<Response> } };
}): Promise<Response> {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  const snapshotUrl = new URL('/registry/doc-index.json', context.request.url);
  const res = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(new Request(snapshotUrl.toString()))
    : await fetch(snapshotUrl.toString(), { headers: { Accept: 'application/json' } });

  if (!res.ok) {
    return Response.json(
      {
        error: 'Doc index not generated — run bun tools/build-doc-index.ts --save',
        _links: { script: '/api/doc-refs/script' },
      },
      { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
  return new Response(res.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
