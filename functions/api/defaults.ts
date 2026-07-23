/**
 * Pages Function — Bun defaults proof status (from committed proof JSON).
 *
 * @see tools/verify-defaults.ts
 * @see public/registry/defaults-proof.json
 */
export type DefaultsEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export async function onRequest(context: {
  request: Request;
  env: DefaultsEnv;
}): Promise<Response> {
  const url = new URL(context.request.url);
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Try ASSETS binding first, then GitHub raw as fallback
  const sources = [
    async () => {
      if (!context.env?.ASSETS?.fetch) throw new Error('no ASSETS');
      return context.env.ASSETS.fetch(new URL('/registry/defaults-proof.json', url.origin));
    },
    async () => fetch('https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/public/registry/defaults-proof.json'),
  ];

  let lastErr: unknown;
  for (const src of sources) {
    try {
      const res = await src();
      if (!res.ok) continue;
      return new Response(await res.text(), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) { lastErr = e; }
  }

  return Response.json(
    { error: 'Failed to load defaults proof', detail: lastErr instanceof Error ? lastErr.message : String(lastErr) },
    { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
