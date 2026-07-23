/**
 * DNS + connection warming for known hosts before a burst of `fetch`.
 *
 * Docs:
 * @see https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host — fetch.preconnect
 * @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
 * @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — dns.prefetch
 *
 * Runtime matrix (Bun 1.4 canary verified):
 * - `dns.prefetch(hostname)` — always OK
 * - `fetch.preconnect("http://host:port")` — OK when port is present
 * - `fetch.preconnect("https://…")` — **throws Invalid port** (oven-sh/bun#21633);
 *   prefer CLI `bun --fetch-preconnect https://host:443 ./app.ts` for HTTPS warmup at startup
 * - Preconnect only helps when there is a **gap** between knowing the host and the first request
 */

import { dns } from 'bun';

export const BUN_FETCH_PRECONNECT_DOCS =
  'https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host';
export const BUN_FETCH_PRECONNECT_STARTUP_DOCS =
  'https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup';
export const BUN_DNS_PREFETCH_DOCS =
  'https://bun.com/docs/runtime/networking/dns#dns-prefetch';

export type PreconnectResult = {
  origin: string;
  host: string;
  /** dns.prefetch ran without throw */
  dnsPrefetch: boolean;
  /** fetch.preconnect ran without throw (HTTP+port only on current Bun) */
  fetchPreconnect: boolean;
  /** Why fetch.preconnect was skipped or failed */
  note?: string;
};

/**
 * Build a CLI-safe preconnect URL (HTTPS needs explicit :443 on current Bun).
 *
 * @example
 * ```sh
 * bun --fetch-preconnect https://bun.com:443 ./my-script.ts
 * ```
 */
export function preconnectCliUrl(originOrUrl: string): string {
  const u = new URL(originOrUrl.includes('://') ? originOrUrl : `https://${originOrUrl}`);
  if (u.protocol === 'https:' && (u.port === '' || u.port === '443')) {
    return `https://${u.hostname}:443`;
  }
  if (u.protocol === 'http:' && (u.port === '' || u.port === '80')) {
    return `http://${u.hostname}:80`;
  }
  return u.origin;
}

/**
 * Best-effort warm: always DNS-prefetch; try fetch.preconnect when the runtime accepts it.
 * Never throws — callers may fire-and-forget at process start.
 */
export function preconnectOrigin(originOrUrl: string): PreconnectResult {
  let host = originOrUrl;
  let origin = originOrUrl;
  try {
    const u = new URL(originOrUrl.includes('://') ? originOrUrl : `http://${originOrUrl}`);
    host = u.hostname;
    origin = u.origin;
  } catch {
    return {
      origin: originOrUrl,
      host: originOrUrl,
      dnsPrefetch: false,
      fetchPreconnect: false,
      note: 'invalid URL',
    };
  }

  let dnsPrefetch = false;
  try {
    dns.prefetch(host);
    dnsPrefetch = true;
  } catch {
    /* optional */
  }

  let fetchPreconnect = false;
  let note: string | undefined;
  const u = new URL(origin);

  // HTTPS API preconnect is broken on current Bun (Invalid port even with :443).
  if (u.protocol === 'https:') {
    note = `fetch.preconnect HTTPS throws Invalid port — use CLI: bun --fetch-preconnect ${preconnectCliUrl(origin)} ./app.ts`;
    return { origin, host, dnsPrefetch, fetchPreconnect, note };
  }

  // HTTP requires an explicit port for preconnect on this runtime.
  const target =
    u.port !== ''
      ? origin
      : `http://${u.hostname}:80`;

  try {
    fetch.preconnect(target);
    fetchPreconnect = true;
  } catch (err) {
    note = err instanceof Error ? err.message : String(err);
  }

  return { origin, host, dnsPrefetch, fetchPreconnect, note };
}

/** Warm several bases (unique origins only). */
export function preconnectOrigins(urls: readonly string[]): PreconnectResult[] {
  const seen = new Set<string>();
  const out: PreconnectResult[] = [];
  for (const raw of urls) {
    try {
      const u = new URL(raw.includes('://') ? raw : `http://${raw}`);
      if (seen.has(u.origin)) continue;
      seen.add(u.origin);
      out.push(preconnectOrigin(u.origin));
    } catch {
      out.push({
        origin: raw,
        host: raw,
        dnsPrefetch: false,
        fetchPreconnect: false,
        note: 'invalid URL',
      });
    }
  }
  return out;
}
