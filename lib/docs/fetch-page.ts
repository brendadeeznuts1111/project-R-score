/**
 * Obtain a Response for an HTML page (body unread on success).
 *
 * Anchors (primary locus for fetch):
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/runtime/networking/fetch#custom-headers
 * @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout
 * @see https://bun.com/docs/runtime/networking/fetch#error-handling
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT = 'BunHarness/1.0 (blog ingestion)';

export type FetchPageOptions = {
  signal?: AbortSignal;
  /** Default 15_000. Combined with `signal` via AbortSignal.any when both set. */
  timeoutMs?: number;
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

/**
 * Shared page fetch: strip fragment, Accept/UA, timeout, throw on non-OK.
 * Success path returns the live Response — body is not consumed here.
 */
export async function fetchPage(url: string, opts?: FetchPageOptions): Promise<Response> {
  const cleanUrl = stripUrlFragment(url);
  const response = await fetch(cleanUrl, {
    signal: resolveSignal(opts),
    headers: {
      Accept: 'text/html',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    // Consume the body so the connection can be reused, then throw.
    await response.text().catch(() => {});
    throw new Error(`fetchPage ${response.status} for ${cleanUrl}`);
  }

  return response;
}
