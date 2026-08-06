// @see https://bun.com/docs/runtime/csrf#bun-csrf-generate — Bun.CSRF
// @see https://bun.com/docs/runtime/csrf#bun-csrf-generate — Bun.CSRF.generate
// @see https://bun.com/docs/runtime/csrf#bun-csrf-verify — Bun.CSRF.verify
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Session-bound CSRF for the research / agent-odds desk.
 * @see https://bun.sh/docs/runtime/csrf — Bun.CSRF.generate / verify
 */

import { extractApiKey, checkApiKey } from './api-key.ts';

export const CSRF_COOKIE = 'or_session';
export const CSRF_HEADER = 'x-csrf-token';

const DEFAULT_EXPIRES_MS = 24 * 60 * 60 * 1000;

function csrfSecret(): string {
  const fromEnv =
    Bun.env.CSRF_SECRET?.trim() ||
    Bun.env.OPERATOR_RESEARCH_CSRF_SECRET?.trim() ||
    Bun.env.OPERATOR_RESEARCH_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  // Dev fallback — stable per process, not across restarts/workers.
  // Prefer CSRF_SECRET in any shared / prod deploy.
  const g = globalThis as { __orCsrfSecret?: string };
  if (!g.__orCsrfSecret) g.__orCsrfSecret = crypto.randomUUID();
  return g.__orCsrfSecret;
}

/** Read desk session id from cookie. Never invent a shared placeholder. */
export function getSessionId(req: Request): string | null {
  const cookie = req.headers.get('cookie');
  if (!cookie) return null;
  const m = cookie.match(/(?:^|;\s*)or_session=([^;]+)/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function sessionCookieHeader(sessionId: string): string { // brand-ok — opaque research/wire id
  const secure =
    Bun.env.NODE_ENV === 'production' || Bun.env.CSRF_COOKIE_SECURE === '1'
      ? '; Secure'
      : '';
  return `${CSRF_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secure}`;
}

export type CsrfIssue = {
  sessionId: string; // brand-ok — opaque research/wire id
  token: string;
  /** Set-Cookie value when a new session was created (else null). */
  setCookie: string | null;
};

/** Ensure a per-visitor session and issue a bound CSRF token. */
export function issueCsrf(req: Request): CsrfIssue {
  let sessionId = getSessionId(req);
  let setCookie: string | null = null;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    setCookie = sessionCookieHeader(sessionId);
  }
  const token = Bun.CSRF.generate(csrfSecret(), {
    sessionId,
    expiresIn: DEFAULT_EXPIRES_MS,
  });
  return { sessionId, token, setCookie };
}

function extractCsrfToken(req: Request): string | null {
  const header = req.headers.get(CSRF_HEADER)?.trim();
  if (header) return header;
  const alt = req.headers.get('x-xsrf-token')?.trim();
  if (alt) return alt;
  return null;
}

export type CsrfCheck =
  | { ok: true; bypass?: 'api-key' }
  | { ok: false; status: 403; error: string };

/**
 * Verify CSRF for mutating desk requests.
 * API-key clients without a browser session cookie may skip (CLI / automation).
 * Browser sessions (cookie present) always require a valid token.
 */
export function checkCsrf(req: Request): CsrfCheck {
  const sessionId = getSessionId(req);
  const apiKeyPresent = !!extractApiKey(req);
  const apiKeyOk = apiKeyPresent && checkApiKey(req).ok;

  if (apiKeyOk && !sessionId) {
    return { ok: true, bypass: 'api-key' };
  }

  const token = extractCsrfToken(req);
  if (!sessionId) {
    return {
      ok: false,
      status: 403,
      error: 'Missing desk session (load /api/csrf or the dashboard first)',
    };
  }
  if (!token) {
    return { ok: false, status: 403, error: `Missing ${CSRF_HEADER} header` };
  }
  const valid = Bun.CSRF.verify(token, {
    secret: csrfSecret(),
    sessionId,
    maxAge: DEFAULT_EXPIRES_MS,
  });
  if (!valid) {
    return { ok: false, status: 403, error: 'Invalid or expired CSRF token' };
  }
  return { ok: true };
}

/** True for methods that change server state. */
export function isMutatingMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}
