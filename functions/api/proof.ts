/**
 * Pages Function — Bun API coverage proof status (snapshot from committed manifest).
 *
 * @see tools/bun-api-coverage-proof.json
 * @see https://developers.cloudflare.com/pages/functions/
 */

export type ProofEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export async function onRequest(context: {
  request: Request;
  env: ProofEnv;
}): Promise<Response> {
  const url = new URL(context.request.url);

  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Try committed manifest via ASSETS (if tools/ copied to build), else GitHub raw
  const sources = [
    // 1. Local ASSETS fetch (if tools/ is included in Pages build)
    async () => {
      if (!context.env?.ASSETS?.fetch) throw new Error('no ASSETS binding');
      return context.env.ASSETS.fetch(new URL('/tools/bun-api-coverage-proof.json', url.origin));
    },
    // 2. GitHub raw as fallback
    async () => {
      return fetch('https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/bun-api-coverage-proof.json');
    },
  ];

  let lastErr: unknown;
  for (const source of sources) {
    try {
      const res = await source();
      if (!res.ok) continue;
      const proof = await res.json() as Record<string, unknown>;
      const summary = proof.summary as Record<string, number> | undefined;
      return Response.json(
        {
          generated: proof.generated ?? null,
          bunVersion: proof.bunVersion ?? null,
          summary: proof.summary ?? null,
          demoPassRate: summary?.demos
            ? `${Math.round((summary.demosPassed! / summary.demos) * 100)}%`
            : '0%',
          allPassed: summary?.demosPassed === summary?.demos,
          source: 'github-raw',
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (e) {
      lastErr = e;
    }
  }

  return Response.json(
    {
      error: 'Failed to load proof manifest',
      detail: lastErr instanceof Error ? lastErr.message : String(lastErr),
    },
    { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
