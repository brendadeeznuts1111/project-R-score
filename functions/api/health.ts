/**
 * Pages Function — combined health endpoint for Bun runtime + registry + proof.
 *
 * GET /api/health
 *
 * @see https://developers.cloudflare.com/pages/functions/
 */

export type HealthEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export async function onRequest(context: {
  request: Request;
  env: HealthEnv;
}): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Bun API proof status
  let proofStatus: Record<string, unknown> = { available: false };
  try {
    const proofUrl = new URL('/tools/bun-api-coverage-proof.json', new URL(context.request.url).origin);
    let res: Response;
    if (context.env?.ASSETS?.fetch) {
      res = await context.env.ASSETS.fetch(new Request(proofUrl.toString()));
    } else {
      res = await fetch(proofUrl.toString());
    }
    if (res.ok) {
      const proof = (await res.json()) as { generated?: string; bunVersion?: string; summary?: Record<string, unknown> };
      proofStatus = {
        available: true,
        generated: proof.generated ?? null,
        bunVersion: proof.bunVersion ?? null,
        summary: proof.summary ?? null,
      };
    }
  } catch {
    // proof manifest not committed yet
  }

  return Response.json(
    {
      status: 'ok',
      runtime: 'cloudflare-pages',
      edge: true,
      checkedAt: new Date().toISOString(),
      bunApiProof: proofStatus,
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
