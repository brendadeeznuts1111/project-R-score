/**
 * Pages Function — Bun defaults proof status (from committed proof JSON).
 *
 * @see tools/verify-defaults.ts
 * @see public/registry/defaults-proof.json
 * @see lib/http/portal-cors.ts
 */
import { portalCorsHeaders, portalOptionsResponse } from '../../lib/http/portal-cors.ts';

export type DefaultsEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export async function onRequest(context: {
  request: Request;
  env: DefaultsEnv;
}): Promise<Response> {
  const url = new URL(context.request.url);
  if (context.request.method === 'OPTIONS') {
    return portalOptionsResponse();
  }
  if (context.request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: portalCorsHeaders({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      }),
    });
  }

  const sources = [
    async () => {
      if (!context.env?.ASSETS?.fetch) throw new Error('no ASSETS');
      return context.env.ASSETS.fetch(
        new Request(new URL('/registry/defaults-proof.json', url.origin).toString())
      );
    },
    async () =>
      fetch(
        'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/public/registry/defaults-proof.json'
      ),
  ];

  let lastErr: unknown;
  for (const src of sources) {
    try {
      const res = await src();
      if (!res.ok) continue;
      return new Response(await res.text(), {
        headers: portalCorsHeaders({
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Defaults-Source': 'artifact',
        }),
      });
    } catch (e) {
      lastErr = e;
    }
  }

  return Response.json(
    {
      error: 'Failed to load defaults proof',
      detail: lastErr instanceof Error ? lastErr.message : String(lastErr),
      hint: 'bun run verify:defaults:save',
    },
    {
      status: 503,
      headers: portalCorsHeaders(),
    }
  );
}
