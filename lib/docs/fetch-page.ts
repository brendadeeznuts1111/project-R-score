/**
 * Shared HTTP client for docs/blog page fetches — returns an untouched success Response
 * so callers can stream into HTMLRewriter (or read the body once).
 *
 * Locus: runtime/networking/fetch must-tier (request · headers · timeout · errors).
 * Deferred here: DNS prefetch/preconnect, proxy/unix/TLS/S3, POST bodies.
 *
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/runtime/networking/fetch#custom-headers
 * @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout
 * @see https://bun.com/docs/runtime/networking/fetch#error-handling
 * @see https://bun.com/docs/runtime/networking/fetch#streaming-response-bodies
 * @see https://bun.com/docs/runtime/networking/fetch#debugging
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_USER_AGENT = 'factorywager-docs-fetch/1.0';

export type FetchPageOptions = {
  /** When set, used instead of AbortSignal.timeout(timeoutMs). */
  signal?: AbortSignal;
  /** Default 15_000; ignored when `signal` is provided. */
  timeoutMs?: number;
  headers?: HeadersInit;
  userAgent?: string;
  /** Bun extension: print request/response headers (`verbose: true` or `"curl"`). */
  verbose?: boolean | 'curl';
};

/** Drop `#fragment` so fetch never sends a fragment to the server. */
export function stripUrlFragment(url: string): string {
  const u = new URL(url);
  u.hash = '';
  return u.href;
}

/**
 * Fetch a page URL: strip fragment, set Accept/UA, timeout, throw on non-OK.
 * Success path returns the Response without consuming the body.
 */
export async function fetchPage(url: string, opts?: FetchPageOptions): Promise<Response> {
  const cleaned = stripUrlFragment(url);
  const signal = opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const userAgent = opts?.userAgent ?? DEFAULT_USER_AGENT;

  const headers = new Headers(opts?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'text/html');
  if (!headers.has('User-Agent')) headers.set('User-Agent', userAgent);

  const res = await fetch(cleaned, {
    signal,
    headers,
    ...(opts?.verbose !== undefined ? { verbose: opts.verbose } : {}),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const snippet = detail.replace(/\s+/g, ' ').trim().slice(0, 200);
    throw new Error(
      `fetchPage failed (${res.status} ${res.statusText}): ${cleaned}${
        snippet ? ` — ${snippet}` : ''
      }`
    );
  }

  return res;
}
