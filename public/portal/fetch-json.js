/**
 * Shared registry JSON fetch for portal client modules.
 * Returns parsed JSON or structured failure (Pages-safe, no throw).
 *
 * Aligns with Bun fetch request options / error cases where they overlap the web API:
 * - GET only (no request body — GET/HEAD + body throws)
 * - AbortSignal timeout
 * - Explicit Accept for JSON
 * - Soft Content-Type check after response
 *
 * Bun-only `verbose: true` is **not** passed in the browser (extension, not web standard).
 * Use `?portal_fetch_debug=1` or `localStorage.PORTAL_FETCH_DEBUG=1` for console debug.
 *
 * @see https://bun.com/docs/runtime/networking/fetch#request-options
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 */

/** @typedef {'network'|'timeout'|'http'|'parse'|'empty'|'method'} FetchErrorKind */

/**
 * @typedef {object} FetchJsonOk
 * @property {true} ok
 * @property {object} data
 * @property {number} [status]
 * @property {string} [contentType]
 */

/**
 * @typedef {object} FetchJsonErr
 * @property {false} ok
 * @property {FetchErrorKind} [kind]
 * @property {number} [status]
 * @property {string} [error]
 * @property {string} [contentType]
 */

/**
 * @returns {boolean}
 */
export function isPortalFetchDebug() {
  try {
    if (typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search);
      if (q.get('portal_fetch_debug') === '1' || q.get('verbose') === '1') return true;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem('PORTAL_FETCH_DEBUG') === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Classify a thrown value from fetch / json parse.
 * @param {unknown} err
 * @returns {{ kind: FetchErrorKind, error: string }}
 */
export function classifyFetchError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? 'unknown');
  const name = err instanceof Error ? err.name : '';
  if (name === 'TimeoutError' || /timeout|timed out/i.test(msg)) {
    return { kind: 'timeout', error: msg };
  }
  if (name === 'AbortError') {
    return { kind: 'timeout', error: msg || 'aborted' };
  }
  if (/Failed to fetch|NetworkError|Load failed|ECONNREFUSED|ENOTFOUND/i.test(msg)) {
    return { kind: 'network', error: msg };
  }
  if (/JSON|Unexpected token|is not valid JSON/i.test(msg)) {
    return { kind: 'parse', error: msg };
  }
  return { kind: 'network', error: msg };
}

/**
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [opts]
 * @returns {Promise<object|null>}
 */
export async function fetchJson(url, opts = {}) {
  const r = await fetchJsonResult(url, opts);
  return r.ok ? r.data : null;
}

/**
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [opts]
 * @returns {Promise<FetchJsonOk|FetchJsonErr>}
 */
export async function fetchJsonResult(url, opts = {}) {
  const debug = isPortalFetchDebug();
  const method = (opts.method || 'GET').toUpperCase();
  // Web + Bun: body with GET/HEAD is invalid
  if ((method === 'GET' || method === 'HEAD') && opts.body != null) {
    const error = 'fetchJsonResult: request body not allowed with GET/HEAD';
    if (debug) console.warn('[portal-fetch]', error, url);
    return { ok: false, kind: 'method', error };
  }

  const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 5000;
  const headers = new Headers(opts.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json, text/json;q=0.9, */*;q=0.1');

  /** @type {RequestInit} */
  const init = {
    method,
    cache: opts.cache ?? 'no-store',
    credentials: opts.credentials ?? 'same-origin',
    headers,
    signal: opts.signal ?? AbortSignal.timeout(timeoutMs),
  };
  // Do not forward body/proxy/unix — browser path only

  if (debug) {
    console.info('[portal-fetch] >', method, url, { timeoutMs });
  }

  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (debug) {
      console.info(
        '[portal-fetch] <',
        res.status,
        res.statusText,
        contentType || '(no content-type)'
      );
    }
    if (!res.ok) {
      return {
        ok: false,
        kind: 'http',
        status: res.status,
        error: `HTTP ${res.status}`,
        contentType,
      };
    }
    const text = await res.text();
    if (!text || !text.trim()) {
      return { ok: false, kind: 'empty', status: res.status, error: 'empty body', contentType };
    }
    try {
      const data = JSON.parse(text);
      if (data === null || typeof data !== 'object') {
        return {
          ok: false,
          kind: 'parse',
          status: res.status,
          error: 'JSON root must be object/array',
          contentType,
        };
      }
      if (
        debug &&
        contentType &&
        !/json/i.test(contentType) &&
        !contentType.includes('text/plain')
      ) {
        console.warn('[portal-fetch] unexpected Content-Type for JSON body:', contentType);
      }
      return { ok: true, data, status: res.status, contentType };
    } catch (e) {
      const c = classifyFetchError(e);
      return {
        ok: false,
        kind: 'parse',
        status: res.status,
        error: c.error,
        contentType,
      };
    }
  } catch (e) {
    const c = classifyFetchError(e);
    if (debug) console.warn('[portal-fetch] !', c.kind, c.error, url);
    return { ok: false, kind: c.kind, error: c.error };
  }
}
