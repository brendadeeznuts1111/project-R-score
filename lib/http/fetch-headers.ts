// @see https://bun.com/docs/runtime/networking/fetch#custom-headers — fetch custom headers
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — Blob/FormData MIME
// @see https://bun.com/docs/runtime/networking/fetch#request-options — keepalive/decompress
// @see https://bun.com/docs/runtime/networking/fetch#connection-pooling-http-keep-alive — defaults
/**
 * Fetch header helpers — shared Accept/UA merging for HTTP clients.
 * (Replaces the deleted lib/http/fetch-client.ts; see git history.)
 */

import { fetchHeadersForBody } from './content-type.ts';

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

/**
 * Deliberate per-request overrides for Bun's fetch performance defaults.
 *
 * Bun already pools connections and decompresses responses by default. Leave
 * these fields undefined for that fast path. Set either field to `false` only
 * when a request must opt out (for example, a proxy forwarding compressed
 * bytes without decoding them).
 */
export type BunFetchPerformanceOptions = {
  /** `false` disables connection reuse for this request; undefined keeps Bun's default pool. */
  keepalive?: boolean;
  /** `false` preserves the compressed response body and Content-Encoding header. */
  decompress?: boolean;
};

export type BuildBunFetchInitOptions = Omit<
  BunFetchRequestInit,
  'body' | 'headers' | 'keepalive' | 'decompress'
> & {
  body?: BodyInit | null;
  headers?: HeadersInit;
  /**
   * Explicit MIME override for non-FormData bodies. For Blob bodies, omission
   * lets Bun use `blob.type`. FormData rejects this option because Bun must add
   * its generated multipart boundary.
   */
  explicitMime?: string;
  performance?: BunFetchPerformanceOptions;
};

/**
 * Build a Bun fetch init without erasing Bun's native MIME/performance defaults.
 *
 * Content-Type precedence:
 * 1. FormData: no manual header; Bun generates multipart + boundary.
 * 2. explicitMime (or an existing Content-Type header): caller contract.
 * 3. Blob/File: no manual header; Bun uses `blob.type`.
 * 4. Other bodies: shared content-type policy (JSON/text inference today).
 */
export function buildBunFetchInit(options: BuildBunFetchInitOptions = {}): BunFetchRequestInit {
  const { explicitMime, performance, ...init } = options;
  const headers = fetchHeadersForBody(
    init.body,
    mergeFetchHeaders(globalDefaults, init.headers),
    explicitMime
  );
  const output: BunFetchRequestInit = { ...init, headers };

  // Omission matters: it preserves Bun's runtime defaults and future tuning.
  if (performance?.keepalive !== undefined) output.keepalive = performance.keepalive;
  if (performance?.decompress !== undefined) output.decompress = performance.decompress;

  return output;
}
