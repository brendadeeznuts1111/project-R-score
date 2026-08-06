// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Partner / desk request auth for Bun Agent APIs.
 *
 * - Same-origin (desk) GET/`read` → allowed without token when tokens configured
 * - `write`/`execute` → always require token when tokens configured (no same-origin bypass)
 * - When no tokens configured → open (local ops mode). Dashboard write routes should
 *   additionally reject open mode when bind hostname is not loopback (503).
 */

import { randomUUIDv7 } from 'bun';
import { checkApiKey, extractApiKey, tokenMatchesAny } from './api-key.ts';

export type PartnerAuthResult =
  | { ok: true; mode: 'open' | 'token' | 'same-origin'; requestId: string } // brand-ok — opaque research/wire id
  | { ok: false; status: number; error: string; requestId: string }; // brand-ok — opaque research/wire id

function configuredPartnerTokens(): string[] {
  const raw = [
    Bun.env.PARTNER_API_TOKEN,
    Bun.env.OPERATOR_API_TOKEN,
    Bun.env.OPERATOR_RESEARCH_API_KEY,
    Bun.env.FACTORYWAGER_API_KEY,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .flatMap(v => v.split(',').map(s => s.trim()).filter(Boolean));
  return [...new Set(raw)];
}

export function requestIdFrom(req: Request): string {
  return req.headers.get('x-request-id')?.trim() || randomUUIDv7();
}

export function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]';
}

export function isSameOriginRequest(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site === 'same-origin') return true;

  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.host === url.host) return true;
    } catch {
      /* ignore */
    }
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const r = new URL(referer);
      if (r.host === url.host) return true;
    } catch {
      /* ignore */
    }
  }

  // Local loopback navigations often omit Origin/Sec-Fetch-Site.
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
    if (!origin && !referer) return true;
  }

  return false;
}

/**
 * @param sensitivity `read` allows same-origin bypass; `write` always requires token when configured.
 */
export function authenticatePartnerRequest(
  req: Request,
  sensitivity: 'read' | 'write' | 'execute' = 'read'
): PartnerAuthResult {
  const requestId = requestIdFrom(req);
  const tokens = configuredPartnerTokens();

  if (tokens.length === 0) {
    // Fall back to legacy checkApiKey (also open when unset).
    const legacy = checkApiKey(req);
    if (!legacy.ok) {
      return { ok: false, status: legacy.status, error: legacy.error, requestId };
    }
    return { ok: true, mode: 'open', requestId };
  }

  const provided = extractApiKey(req);
  if (provided && tokenMatchesAny(provided, tokens)) {
    return { ok: true, mode: 'token', requestId };
  }

  if (sensitivity === 'read' && isSameOriginRequest(req)) {
    return { ok: true, mode: 'same-origin', requestId };
  }

  return {
    ok: false,
    status: 401,
    error:
      'Partner API token required. Set Authorization: Bearer <PARTNER_API_TOKEN> (or OPERATOR_RESEARCH_API_KEY).',
    requestId,
  };
}

export function jsonWithRequestId(
  // wire: Response JSON body before domain parse
  // eslint-disable-next-line harness/no-unknown-function-param -- response envelope at HTTP edge
  data: unknown, // brand-ok — opaque research/wire id
  status: number,
  requestId: string // brand-ok — opaque research/wire id
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-request-id': requestId,
    },
  });
}
