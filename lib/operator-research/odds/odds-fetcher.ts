// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/networking/fetch — fetch
// @see https://bun.com/blog/bun-v1.3.14#http2-client — per-request protocol
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
import { joinPath } from '../../path-bun.ts';
import { fetchWithRetry as sharedFetchWithRetry } from '../fetch-url.ts';
import { FIXTURES_DIR } from '../paths.ts';
import type { OddsEndpoint } from './types.ts';
import { prewarmBookmaker } from './connection-pool.ts';

export type OddsFetchOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  protocol?: NonNullable<BunFetchRequestInit['protocol']>;
  maxRetries?: number;
  backoffMs?: number;
  timeoutMs?: number;
};

export type FetchOddsResult = {
  ok: boolean;
  status: number | null;
  url: string;
  bodyText: string;
  contentType: string | null;
  elapsedMs: number;
  source: 'live' | 'fixture' | 'none';
  error?: string;
};

function politeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    accept: 'application/json, text/html;q=0.9, */*;q=0.8',
    'user-agent': 'FactoryWager-operator-odds/1.0 (+research; polite)',
    ...extra,
  };
}

async function loadFixtureBody(fixtureId: string): Promise<string | null> {
  // brand-ok — opaque research/wire id
  const candidates = [
    joinPath(FIXTURES_DIR, 'odds', `${fixtureId}.json`),
    joinPath(FIXTURES_DIR, `${fixtureId}.odds.json`),
    joinPath(FIXTURES_DIR, `${fixtureId}.json`),
  ];
  for (const path of candidates) {
    const f = Bun.file(path);
    if (await f.exists()) return f.text();
  }
  return null;
}

/** Build the shared retry request without inventing a provider protocol. */
export function buildOddsFetchOptions(opts: OddsFetchOptions = {}) {
  return {
    method: opts.method ?? 'GET',
    headers: politeHeaders(opts.headers),
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    ...(opts.protocol ? { protocol: opts.protocol } : {}),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
    redirect: 'follow' as const,
    maxRetries: opts.maxRetries ?? 3,
    baseDelayMs: opts.backoffMs ?? 500,
  };
}

/**
 * Fetch a single odds endpoint with exponential backoff (429 / 5xx / network).
 * HTTP/2 is an explicit per-provider opt-in; omission preserves Bun's default
 * transport and process-level experimental negotiation.
 */
export async function fetchWithRetry(url: string, opts: OddsFetchOptions = {}): Promise<Response> {
  return sharedFetchWithRetry(url, buildOddsFetchOptions(opts));
}

export async function fetchOddsOne(
  endpoint: OddsEndpoint,
  opts: { fixtureFallback?: boolean; prewarm?: boolean } = {}
): Promise<FetchOddsResult> {
  const fixtureFallback = opts.fixtureFallback !== false;
  const started = Bun.nanoseconds();
  const hostStr = String(endpoint.host);

  if (opts.prewarm !== false) {
    prewarmBookmaker(hostStr);
  }

  const tryFixture = async (
    elapsedMs: number,
    error?: string,
    status: number | null = null
  ): Promise<FetchOddsResult | null> => {
    if (!fixtureFallback) return null;
    const fid = endpoint.fixtureId ?? hostStr.split('.')[0] ?? 'unknown';
    const fixture = await loadFixtureBody(fid);
    if (!fixture) return null;
    return {
      ok: true,
      status: status ?? 200,
      url: endpoint.url,
      bodyText: fixture,
      contentType: 'application/json',
      elapsedMs,
      source: 'fixture',
      error,
    };
  };

  try {
    const res = await fetchWithRetry(endpoint.url, {
      method: endpoint.method,
      headers: endpoint.headers,
      body: endpoint.body,
      ...(endpoint.protocol ? { protocol: endpoint.protocol } : {}),
    });
    const bodyText = await res.text();
    const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
    // Prefer fixture when live is blocked/empty so research stays offline-reproducible
    if (!res.ok || bodyText.trim().length === 0) {
      const fx = await tryFixture(
        elapsedMs,
        `live status=${res.status} bytes=${bodyText.length}`,
        res.status
      );
      if (fx) return fx;
    }
    return {
      ok: res.ok,
      status: res.status,
      url: res.url || endpoint.url,
      bodyText,
      contentType: res.headers.get('content-type'),
      elapsedMs,
      source: 'live',
    };
  } catch (err) {
    const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
    const error = err instanceof Error ? err.message : String(err);
    const fx = await tryFixture(elapsedMs, error);
    if (fx) return fx;
    return {
      ok: false,
      status: null,
      url: endpoint.url,
      bodyText: '',
      contentType: null,
      elapsedMs,
      source: 'none',
      error,
    };
  }
}

/** Parallel batch fetch; Bun connection pool reuses sockets across the batch. */
export async function fetchOddsBatch(
  endpoints: OddsEndpoint[],
  opts: { fixtureFallback?: boolean; prewarm?: boolean } = {}
): Promise<FetchOddsResult[]> {
  return Promise.all(endpoints.map(ep => fetchOddsOne(ep, opts)));
}
