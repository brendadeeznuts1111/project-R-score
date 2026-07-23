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
  const proofUrl = new URL('/tools/bun-api-coverage-proof.json', url.origin);

  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    let res: Response;
    if (context.env?.ASSETS?.fetch) {
      res = await context.env.ASSETS.fetch(new Request(proofUrl.toString()));
    } else {
      res = await fetch(proofUrl.toString());
    }

    if (!res.ok) {
      return Response.json(
        {
          error: 'Proof manifest not found',
          hint: 'Run bun run docs:api-verify --write to generate tools/bun-api-coverage-proof.json',
        },
        { status: 404 }
      );
    }

    const proof = (await res.json()) as {
      generated?: string;
      bunVersion?: string;
      summary?: {
        demos?: number;
        demosPassed?: number;
        apis?: number;
        apisVerified?: number;
      };
    };

    return Response.json(
      {
        generated: proof.generated ?? null,
        bunVersion: proof.bunVersion ?? null,
        summary: proof.summary ?? null,
        demoPassRate: proof.summary?.demos
          ? `${Math.round((proof.summary.demosPassed! / proof.summary.demos) * 100)}%`
          : '0%',
        allPassed: proof.summary?.demosPassed === proof.summary?.demos,
        source: 'pages-snapshot',
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    return Response.json(
      {
        error: 'Failed to load proof manifest',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}
