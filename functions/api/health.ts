/**
 * Pages Function — combined health for edge + static artifacts.
 *
 * GET /api/health
 * Shared on portal UI (/portal/health) and topbar probes.
 *
 * @see https://developers.cloudflare.com/pages/functions/
 */

export type HealthEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

async function assetJson(
  env: HealthEnv,
  origin: string,
  path: string
): Promise<Record<string, unknown> | null> {
  try {
    const url = new URL(path, origin);
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

export async function onRequest(context: {
  request: Request;
  env: HealthEnv;
}): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'If-None-Match, Accept',
      },
    });
  }

  const origin = new URL(context.request.url).origin;

  const [ops, monitoring, staticSnap, registry, proof] = await Promise.all([
    assetJson(context.env, origin, '/registry/ops-summary.json'),
    assetJson(context.env, origin, '/registry/monitoring.json'),
    assetJson(context.env, origin, '/registry/static.json'),
    assetJson(context.env, origin, '/registry/registry.json'),
    assetJson(context.env, origin, '/tools/bun-api-coverage-proof.json'),
  ]);

  // Proof fallback: raw GitHub (optional)
  let bunApiProof: Record<string, unknown> = { available: false };
  if (proof) {
    bunApiProof = {
      available: true,
      generated: proof.generated ?? null,
      bunVersion: proof.bunVersion ?? null,
      summary: proof.summary ?? null,
    };
  } else {
    try {
      const res = await fetch(
        'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/bun-api-coverage-proof.json'
      );
      if (res.ok) {
        const p = (await res.json()) as Record<string, unknown>;
        bunApiProof = {
          available: true,
          generated: p.generated ?? null,
          bunVersion: p.bunVersion ?? null,
          summary: p.summary ?? null,
          source: 'github-raw',
        };
      }
    } catch {
      /* ignore */
    }
  }

  const packages =
    registry && typeof registry.packages === 'object' && registry.packages
      ? Object.keys(registry.packages as object).length
      : (monitoring?.packageCount as number | undefined) ?? null;

  const versions =
    registry && typeof registry.packages === 'object' && registry.packages
      ? Object.values(registry.packages as Record<string, { versions?: string[] }>).reduce(
          (n, p) => n + (p.versions?.length ?? 0),
          0
        )
      : null;

  // Edge workers rarely have CF/R2 secrets in process.env — surface expected checklist.
  const envTable = [
    {
      Key: 'CLOUDFLARE_API_TOKEN',
      Group: 'cloudflare',
      Severity: 'required',
      Status: 'edge-n/a',
      Detail: 'set on build host / reasonix; not in Pages Function env by default',
    },
    {
      Key: 'R2 binding REGISTRY_BUCKET',
      Group: 'r2',
      Severity: 'required',
      Status: 'binding',
      Detail: 'Pages dashboard binding → factory-wager-registry',
    },
    {
      Key: 'ASSETS',
      Group: 'pages',
      Severity: 'required',
      Status: context.env?.ASSETS?.fetch ? 'set' : 'missing',
      Detail: 'static file fetch for /registry/*',
    },
  ];

  const body = {
    status: 'ok',
    schemaVersion: 1,
    runtime: 'cloudflare-pages',
    edge: true,
    checkedAt: new Date().toISOString(),
    portal: '/portal/health/',
    artifacts: {
      opsSummary: {
        exists: Boolean(ops),
        generated: (ops?.generated as string) ?? null,
        source: ops?.source ?? null,
      },
      staticAggregate: { exists: Boolean(staticSnap) },
      monitoring: { exists: Boolean(monitoring) },
    },
    registry: {
      packages,
      versions,
    },
    monitoring: monitoring
      ? {
          packageCount: monitoring.packageCount,
          dodQueue: monitoring.dodQueue,
          timestamp: monitoring.timestamp,
        }
      : null,
    bunApiProof,
    env: {
      summary: {
        total: envTable.length,
        ok: envTable.filter(r => r.Status === 'set' || r.Status === 'binding' || r.Status === 'edge-n/a')
          .length,
        missing: envTable.filter(r => r.Status === 'missing').length,
        placeholder: 0,
        requiredMissing: envTable.filter(r => r.Status === 'missing').length,
        note: 'Full secret checklist runs on origin: bun run env:check',
      },
      table: envTable,
      requiredMissingKeys: envTable.filter(r => r.Status === 'missing').map(r => r.Key),
    },
    routeStats: ops?.routing
      ? {
          note: 'from last ops snapshot routing slice (edge has no in-process static cache)',
          routing: ops.routing,
        }
      : {
          note: 'route hit counters require origin serve-public; edge serves ASSETS only',
        },
    serve: {
      strategies: {
        static: 'Pages ASSETS + optional R2 for registry keys',
        file: 'large artifacts via R2/ASSETS stream',
      },
      etagScope: 'edge /api/health is snapshot-based (no process uptime)',
    },
  };

  const text = JSON.stringify(body);
  const etag = `"${await crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(text))
    .then((buf) =>
      [...new Uint8Array(buf)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32)
    )}"`;

  const inm = context.request.headers.get('If-None-Match');
  if (inm && inm.includes(etag.replace(/"/g, ''))) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        Vary: 'Accept',
        'Cache-Control': 'public, max-age=15, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return new Response(text, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=15, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'X-ETag-Scope': 'health-edge-snapshot',
    },
  });
}
