// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Lightweight API key gate for operator-research dashboards.
 * Env: OPERATOR_RESEARCH_API_KEY (comma-separated for multiple keys).
 * When unset, auth is disabled (open local ops mode).
 */

export type AuthResult =
  | { ok: true; keyId: string } // brand-ok — opaque research/wire id
  | { ok: false; status: 401; error: string };

function configuredKeys(): string[] {
  const raw = [
    Bun.env.PARTNER_API_TOKEN,
    Bun.env.OPERATOR_API_TOKEN,
    Bun.env.OPERATOR_RESEARCH_API_KEY,
    Bun.env.FACTORYWAGER_API_KEY,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(',');
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function authEnabled(): boolean {
  return configuredKeys().length > 0;
}

export function extractApiKey(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const xKey = req.headers.get('x-api-key');
  if (xKey) return xKey.trim();
  const url = new URL(req.url);
  return url.searchParams.get('api_key');
}

export function checkApiKey(req: Request): AuthResult {
  const keys = configuredKeys();
  if (keys.length === 0) return { ok: true, keyId: 'open' };
  const provided = extractApiKey(req);
  if (!provided) {
    return { ok: false, status: 401, error: 'Missing API key (Authorization: Bearer or X-Api-Key)' };
  }
  // Constant-time-ish compare via Bun.password / subtle — for opaque keys use timingSafeEqual
  const enc = new TextEncoder();
  for (let i = 0; i < keys.length; i++) {
    const a = enc.encode(keys[i]!);
    const b = enc.encode(provided);
    if (a.byteLength === b.byteLength && timingSafeEqual(a, b)) {
      return { ok: true, keyId: `key-${i}` };
    }
  }
  return { ok: false, status: 401, error: 'Invalid API key' };
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let out = 0;
  for (let i = 0; i < a.byteLength; i++) out |= a[i]! ^ b[i]!;
  return out === 0;
}

/** Paths that stay open even when auth is enabled. */
export function isPublicPath(pathname: string): boolean {
  return pathname === '/health' || pathname === '/' || pathname === '/index.html' || pathname === '/ws';
}
