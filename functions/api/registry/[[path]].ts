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
  REGISTRY_BUCKET?: RegistryR2Bucket;
  /** Comma-separated origins; omit for same-origin only (no ACAO). */
  REGISTRY_CORS_ORIGINS?: string;
};

export type RegistryPagesContext = {
  request: Request;
  env: RegistryPagesEnv;
  params?: { path?: string | string[] };
};

const ALLOWED_EXACT = new Set(['registry.json']);
const ALLOWED_PREFIXES = ['@factorywager/', 'projects/', 'readme/'] as const;

/** JSON error with optional CORS + no-store cache. */
export function jsonError(
  status: number,
  error: string,
  cors: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
}

/**
 * Decode + validate an object key from `/api/registry/<key>`.
 * Rejects traversal, absolute paths, NULs, and non-allowlisted prefixes.
 */
export function parseRegistryObjectKey(raw: string): string | null {
  if (!raw) return null;
  let key: string;
  try {
    key = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!key || key.includes('\0')) return null;
  if (key.startsWith('/') || key.includes('\\')) return null;
  const segments = key.split('/');
  if (segments.some(s => s === '' || s === '.' || s === '..')) return null;
  if (ALLOWED_EXACT.has(key)) return key;
  if (ALLOWED_PREFIXES.some(p => key.startsWith(p))) return key;
  return null;
}

function pathParamToKey(params: RegistryPagesContext['params'], url: URL): string {
  const fromParams = params?.path;
  if (Array.isArray(fromParams)) return fromParams.join('/');
  if (typeof fromParams === 'string' && fromParams.length > 0) return fromParams;
  // Fallback when matched as exact /api/registry (no catch-all segments)
  return url.pathname.replace(/^\/api\/registry\/?/, '');
}

function corsHeaders(request: Request, env: RegistryPagesEnv): Record<string, string> {
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
  const cors = corsHeaders(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', ...cors },
    });
  }

  if (request.method !== 'GET') {
    return jsonError(405, 'Method not allowed', cors);
  }

  const bucket = env.REGISTRY_BUCKET;
  if (!bucket || typeof bucket.get !== 'function') {
    return jsonError(503, 'Registry binding unavailable', cors);
  }

  const key = parseRegistryObjectKey(pathParamToKey(params, new URL(request.url)));
  if (!key) {
    return jsonError(400, 'Invalid registry object key', cors);
  }

  try {
    const object = await bucket.get(key);
    if (!object || !object.body) {
      return jsonError(404, 'Not found', cors);
    }

    const headers: Record<string, string> = {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      ...cors,
    };
    if (object.httpEtag) headers.ETag = object.httpEtag;

    return new Response(object.body, { status: 200, headers });
  } catch {
    return jsonError(502, 'Registry unreachable', cors);
  }
}
