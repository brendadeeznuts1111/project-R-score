/**
 * HTTP/2 fetch wrapper — graceful fallback to HTTP/1.1.
 *
 * Bun 1.3.14+ supports experimental HTTP/2 client fetch via
 * `{ protocol: "http2" }`. If the server doesn't support h2
 * (no ALPN negotiation), Bun throws `HTTP2Unsupported`.
 * This wrapper tries h2 first, then falls back to h1.1 on
 * that specific error — transparent to callers.
 *
 * Used by:
 *   - Telegram Bot API workers (SendMessageClient, TopicManager)
 *   - Pipeline health monitor alerts
 */

// ---------------------------------------------------------------------------
// Cached detection — once we know the origin supports h2, skip the fallback
// ---------------------------------------------------------------------------

const h2SupportCache = new Map<string, boolean>();

/**
 * Fetch with HTTP/2 negotiation. Tries h2 first for TLS origins;
 * falls back to standard fetch on `HTTP2Unsupported` errors.
 * Caches per-origin h2 support to avoid repeated fallback attempts.
 *
 * Accepts the same signature as `fetch()` plus an optional
 * `forceHttp1` override.
 */
export async function h2Fetch(
  url: string | URL,
  init?: RequestInit & { forceHttp1?: boolean }
): Promise<Response> {
  const target = url.toString();
  const origin = extractOrigin(target);

  // If caller explicitly wants h1, or we already know this origin
  // doesn't support h2, skip the h2 attempt.
  if (init?.forceHttp1 || h2SupportCache.get(origin) === false) {
    const { forceHttp1: _, ...rest } = (init ?? {});
    return fetch(target, rest);
  }

  // Only attempt h2 for HTTPS URLs
  if (!target.startsWith("https://")) {
    return fetch(target, init ?? {});
  }

  try {
    const { forceHttp1: _, ...rest } = (init ?? {});
    const response = await fetch(target, { ...rest, protocol: "http2" } as RequestInit);
    // Success — cache that this origin supports h2
    h2SupportCache.set(origin, true);
    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("HTTP2") || msg.includes("http2") || msg.includes("h2")) {
      // Origin doesn't support h2 — cache and fall back
      h2SupportCache.set(origin, false);
      const { forceHttp1: _, ...rest } = (init ?? {});
      return fetch(target, rest);
    }
    // Not an HTTP/2 error — rethrow
    throw err;
  }
}

/**
 * Clear the h2 support cache (useful between test runs or after proxy changes).
 */
export function clearH2Cache(): void {
  h2SupportCache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractOrigin(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port || (u.protocol === "https:" ? "443" : "80")}`;
  } catch {
    return url;
  }
}
