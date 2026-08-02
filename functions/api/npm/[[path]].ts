/**
 * Pages Function — npm registry prefix endpoint (`/api/npm/*`).
 *
 * Real npm/bun clients request packuments as `<registry>/@scope%2fname`, and
 * Pages filesystem routing does not decode `%2f` into a path separator — so a
 * scoped route can never match npm-encoded traffic (proven on production:
 * `/@factorywager/[pkg]` only matched plain-slash requests). This catch-all
 * matches any depth, decodes each segment itself, and serves the baked
 * packument (`public/registry/npm/@factorywager/<name>.json`, produced by
 * `bun run bake:npm-packument`).
 *
 * Registry base for clients: `https://registry.factory-wager.com/api/npm`
 *
 * @see https://developers.cloudflare.com/pages/functions/ — Pages Functions
 * @see scripts/bake-npm-packument.ts — packument source
 */

export type NpmPrefixPagesEnv = {
  /** Pages static assets binding. */
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export type NpmPrefixPagesContext = {
  request: Request;
  env: NpmPrefixPagesEnv;
  params?: { path?: string | string[] };
};

const SCOPE = '@factorywager';

/**
 * Resolve catch-all segments to a scoped package name. Handles both the
 * npm-encoded form (`@factorywager%2fregistry-client` — one segment with an
 * encoded slash) and the plain form (`@factorywager/registry-client`).
 */
export function parseNpmPrefixPackage(path: string | string[] | undefined): string | null {
  const segments = (Array.isArray(path) ? path : [path ?? ''])
    .filter(s => s.length > 0)
    .map(s => decodeURIComponent(s));
  const joined = segments.join('/');
  const m = joined.match(/^(@[a-z0-9][a-z0-9._~-]*)\/([a-z0-9][a-z0-9._-]{0,213})$/i);
  if (!m || m[1].toLowerCase() !== SCOPE) return null;
  return m[2];
}

export function npmPrefixJsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function onRequest(context: NpmPrefixPagesContext): Promise<Response> {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return npmPrefixJsonError(405, 'Method not allowed');
  }

  const name = parseNpmPrefixPackage(params?.path);
  if (!name) {
    return npmPrefixJsonError(400, 'Invalid package path — expected /api/npm/@factorywager/<name>');
  }

  const assetUrl = new URL(`/registry/npm/${SCOPE}/${name}.json`, new URL(request.url).origin);
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
  return npmPrefixJsonError(404, `No packument baked for ${SCOPE}/${name}`);
}
