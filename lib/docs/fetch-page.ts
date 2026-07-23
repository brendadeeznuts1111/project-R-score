/**
 * Obtain a Response for an HTML page (body unread on success).
 *
 * Strong defaults for blog/docs ingestion: HTTPS, Accept text/html, BunHarness UA,
 * 15s timeout. Bun's own UA / Accept defaults remain fine for general-purpose fetch.
 *
 * DNS / connection warming (call-site only — not baked into this helper):
 * - Prefer `dns.prefetch(hostname)` or `dns.prefetch(hostname, port)` when the host
 *   is known early — see fetch#dns-prefetching (avoids first-request DNS latency).
 * - Helpers: `dnsPrefetchOrigin` / `preconnectOrigin` in `lib/http/fetch-preconnect.ts`.
 * - `fetch.preconnect("https://…")` still throws **Invalid port** on Bun 1.4
 *   (oven-sh/bun#21633) — use CLI `bun --fetch-preconnect https://host:443 ./app.ts`
 *   @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup
 *
 * Anchors (primary locus for fetch):
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/runtime/networking/fetch#custom-headers
 * @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout
 * @see https://bun.com/docs/runtime/networking/fetch#error-handling
 * @see https://bun.com/docs/runtime/networking/fetch#debugging
 * @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching
 * @see https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host
 * @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup
 * @see https://bun.com/docs/runtime/networking/dns#dns-prefetch
 * @see https://bun.com/docs/runtime/networking/dns#dns-getcachestats
 * @see https://bun.com/docs/runtime/networking/fetch#custom-headers
 */

import { mergeFetchHeaders } from '../http/fetch-client.ts';

const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT = 'BunHarness/1.0 (blog ingestion)';

export type FetchPageOptions = {
  signal?: AbortSignal;
  /** Default 15_000. Combined with `signal` via AbortSignal.any when both set. */
  timeoutMs?: number;
  /** Merged over defaults; Accept / User-Agent win unless caller sets them. */
  headers?: HeadersInit;
  /** Bun-specific: print request/response headers. Default false. */
  verbose?: boolean;
};

/** Drop `#fragment` so fetch never sends a fragment to the server. */
export function stripUrlFragment(url: string): string {
  const u = new URL(url);
  u.hash = '';
  return u.href;
}

function resolveSignal(opts?: FetchPageOptions): AbortSignal {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = AbortSignal.timeout(timeoutMs);
  return opts?.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
}

function resolveHeaders(opts?: FetchPageOptions): Headers {
  return mergeFetchHeaders(
    { Accept: 'text/html', 'User-Agent': USER_AGENT },
    opts?.headers
  );
}

/**
 * Shared page fetch: HTTPS + fragment strip, Accept/UA, timeout, throw on non-OK.
 * Success path returns the live Response — body is not consumed here.
 */
export async function fetchPage(url: string, opts?: FetchPageOptions): Promise<Response> {
  const cleanUrl = stripUrlFragment(url);
  if (!cleanUrl.startsWith('https:')) {
    throw new Error(`fetchPage requires https: (got ${new URL(cleanUrl).protocol})`);
  }

  const response = await fetch(cleanUrl, {
    signal: resolveSignal(opts),
    headers: resolveHeaders(opts),
    verbose: opts?.verbose ?? false,
  });

  if (!response.ok) {
    // Consume the body so the connection can be reused, then throw.
    await response.text().catch(() => {});
    throw new Error(`fetchPage ${response.status} for ${cleanUrl}`);
  }

  return response;
}
