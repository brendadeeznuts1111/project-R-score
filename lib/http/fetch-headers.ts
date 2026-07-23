// @see https://bun.com/docs/runtime/networking/fetch#custom-headers — fetch custom headers
/**
 * Fetch header helpers — shared Accept/UA merging for HTTP clients.
 * (Replaces the deleted lib/http/fetch-client.ts; see git history.)
 */

export const ACCEPT_JSON = 'application/json';
export const ACCEPT_PLAIN = 'text/plain';

/** Canonical docs anchor for Bun fetch custom headers. */
export const BUN_FETCH_CUSTOM_HEADERS_DOCS =
  'https://bun.com/docs/runtime/networking/fetch#custom-headers';

let globalDefaults: Record<string, string> = {
  'User-Agent': 'factorywager-http/1.0',
};

/** Install process-wide default headers merged into every mergeFetchInit call. */
export function installGlobalFetchHeaders(headers?: Record<string, string>): void {
  if (headers) globalDefaults = { ...globalDefaults, ...headers };
}

/** Merge header records/Records/Maps into a single Headers instance (extra wins). */
export function mergeFetchHeaders(
  base: Record<string, string>,
  extra?: HeadersInit | Record<string, string>
): Headers {
  const headers = new Headers(base);
  if (extra) {
    const extraHeaders = extra instanceof Headers ? extra : new Headers(extra as HeadersInit);
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

/** Merge a RequestInit with the installed global default headers (init wins). */
export function mergeFetchInit(init: RequestInit = {}): RequestInit {
  return { ...init, headers: mergeFetchHeaders(globalDefaults, init.headers) };
}
