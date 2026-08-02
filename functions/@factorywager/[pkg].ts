/**
 * Pages Function — npm packument endpoint for the @factorywager scope.
 *
 * npm/bun clients request `/@factorywager%2f<pkg>`; Pages decodes the slash,
 * so this dynamic route catches `/@factorywager/<pkg>`. Serves the baked
 * packument (`public/registry/npm/@factorywager/<pkg>.json`, produced by
 * `bun run bake:npm-packument`) with a JSON content type so the pm
 * publish-plane probes (`bun run verify:pm`) run live instead of skipping
 * on the Pages SPA HTML fallback.
 *
 * @see https://developers.cloudflare.com/pages/functions/ — Pages Functions
 * @see scripts/bake-npm-packument.ts — packument source
 */

export type NpmPackumentPagesEnv = {
  /** Pages static assets binding. */
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export type NpmPackumentPagesContext = {
  request: Request;
  env: NpmPackumentPagesEnv;
  params?: { pkg?: string };
};

/** Package segment must be a bare npm name (no path traversal / sub-paths). */
export function parseNpmPackageSegment(pkg: string | undefined): string | null {
  if (!pkg) return null;
  return /^[a-z0-9][a-z0-9._-]{0,213}$/.test(pkg) ? pkg : null;
}

export function npmJsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function onRequest(context: NpmPackumentPagesContext): Promise<Response> {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return npmJsonError(405, 'Method not allowed');
  }

  const pkg = parseNpmPackageSegment(params?.pkg);
  if (!pkg) {
    return npmJsonError(400, 'Invalid package name');
  }

  const assetUrl = new URL(`/registry/npm/@factorywager/${pkg}.json`, new URL(request.url).origin);
  try {
    const res = env.ASSETS?.fetch
      ? await env.ASSETS.fetch(new Request(assetUrl.toString()))
      : await fetch(assetUrl.toString(), { headers: { Accept: 'application/json,*/*' } });
    if (res.ok) {
      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      });
    }
  } catch {
    // fall through to 404
  }
  return npmJsonError(404, `No packument baked for @factorywager/${pkg}`);
}
