/**
 * Pages Function — serve allowlisted registry objects via R2 binding.
 *
 * Keeps account API tokens out of the edge path: bind `REGISTRY_BUCKET`
 * (R2Bucket) in the Pages project. Anonymous callers only receive keys that
 * pass {@link parseRegistryObjectKey}.
 *
 * @see https://developers.cloudflare.com/pages/functions/ — Pages Functions
 * @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ — R2 bindings
 */

import { parseRegistryObjectKey } from '../../../lib/factory/http-keys';

export { parseRegistryObjectKey };

/** Minimal R2 object shape used by this handler (Workers R2Bucket.get). */
export type RegistryR2Object = {
  body: ReadableStream | null;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
};

/** Minimal R2 bucket binding. */
export type RegistryR2Bucket = {
  get(key: string): Promise<RegistryR2Object | null>;
};

export type RegistryPagesEnv = {
  /** Pages static assets — used when R2 is unbound or key missing. */
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
  REGISTRY_BUCKET?: RegistryR2Bucket;
  /** Comma-separated origins; omit for same-origin only (no ACAO). */
  REGISTRY_CORS_ORIGINS?: string;
};

export type RegistryPagesContext = {
  request: Request;
  env: RegistryPagesEnv;
  params?: { path?: string | string[] };
};

/** JSON error with optional CORS + no-store cache. */
export function jsonError(
  status: number,
  error: string,
  cors: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
}

function pathParamToKey(params: RegistryPagesContext['params'], url: URL): string {
  const fromParams = params?.path;
  if (Array.isArray(fromParams)) return fromParams.join('/');
  if (typeof fromParams === 'string' && fromParams.length > 0) return fromParams;
  // Fallback when matched as exact /api/registry (no catch-all segments)
  return url.pathname.replace(/^\/api\/registry\/?/, '');
}

export function registryCorsHeaders(
  request: Request,
  env: RegistryPagesEnv
): Record<string, string> {
  const allow = (env.REGISTRY_CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allow.length === 0) return {};
  const origin = request.headers.get('Origin');
  if (!origin || !allow.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

export async function onRequest(context: RegistryPagesContext): Promise<Response> {
  const { request, env, params } = context;
  const cors = registryCorsHeaders(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', ...cors },
    });
  }

  if (request.method !== 'GET') {
    return jsonError(405, 'Method not allowed', cors);
  }

  const key = parseRegistryObjectKey(pathParamToKey(params, new URL(request.url)));
  if (!key) {
    return jsonError(400, 'Invalid registry object key', cors);
  }

  const bucket = env.REGISTRY_BUCKET;
  // Prefer R2 when bound; fall back to static ASSETS under /registry/<key>
  // so allowlisted proofs (static.json, @factorywager/*) still serve without R2.
  if (bucket && typeof bucket.get === 'function') {
    try {
      const object = await bucket.get(key);
      if (object?.body) {
        const headers: Record<string, string> = {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=60, s-maxage=300',
          ...cors,
        };
        if (object.httpEtag) headers.ETag = object.httpEtag;
        return new Response(object.body, { status: 200, headers });
      }
    } catch {
      // fall through to ASSETS
    }
  }

  const origin = new URL(request.url).origin;
  const assetUrl = new URL(`/registry/${key}`, origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(assetUrl.toString()));
    } else {
      res = await fetch(assetUrl.toString(), { headers: { Accept: 'application/json,*/*' } });
    }
    if (!res.ok) {
      return jsonError(res.status === 404 ? 404 : 503, res.status === 404 ? 'Not found' : 'Registry binding unavailable', cors);
    }
    const headers: Record<string, string> = {
      'Content-Type': res.headers.get('Content-Type') || 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      ...cors,
    };
    return new Response(res.body, { status: 200, headers });
  } catch {
    return jsonError(502, 'Registry unreachable', cors);
  }
}
