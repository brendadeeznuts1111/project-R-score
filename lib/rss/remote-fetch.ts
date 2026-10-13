// @see https://bun.com/docs/runtime/networking/fetch — fetch, redirect, timeout

import { blockedRemoteHost } from './remote-address.ts';
import { fetchPinnedHttps } from './remote-transport.ts';

export type RemoteFetchPolicy = {
  fetcher: typeof fetch;
  maxBytes: number;
  maxRedirects: number;
  timeoutMs: number;
  label: string;
  allowedOrigins?: ReadonlySet<string>;
  signal?: AbortSignal;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function validateRemoteHttpsUrl(
  input: string | URL,
  allowedOrigins?: ReadonlySet<string>,
  label = 'Remote resource'
): URL {
  const url = input instanceof URL ? new URL(input.href) : new URL(input);
  if (url.protocol !== 'https:')
    throw new Error(`${label} protocol is not allowed: ${url.protocol}`);
  if (url.username || url.password) throw new Error(`${label} URL must not contain credentials`);
  if (url.port && url.port !== '443') throw new Error(`${label} URL uses an unsupported port`);
  if (blockedRemoteHost(url.hostname)) throw new Error(`${label} URL targets a prohibited host`);
  url.hash = '';
  if (allowedOrigins && !allowedOrigins.has(url.origin)) {
    throw new Error(`${label} origin is not allowed: ${url.origin}`);
  }
  return url;
}

export async function fetchWithRedirectPolicy(
  initialUrl: URL,
  headers: Headers,
  policy: RemoteFetchPolicy
): Promise<{ response: Response; finalUrl: URL }> {
  let current = validateRemoteHttpsUrl(initialUrl, policy.allowedOrigins, policy.label);
  const visited = new Set<string>();
  const deadline = policy.signal ?? AbortSignal.timeout(policy.timeoutMs);
  for (let hop = 0; hop <= policy.maxRedirects; hop++) {
    if (visited.has(current.href)) throw new Error(`${policy.label} redirect loop`);
    visited.add(current.href);
    deadline.throwIfAborted();
    // Custom fetchers are trusted transports: their owner must enforce DNS/egress restrictions.
    const response =
      policy.fetcher === fetch
        ? await fetchPinnedHttps(current, headers, deadline)
        : await policy.fetcher(current.href, { headers, redirect: 'manual', signal: deadline });
    if (!REDIRECT_STATUSES.has(response.status)) return { response, finalUrl: current };
    // A response stream's cancellation hook can stall; cleanup must not block redirects or deadlines.
    void response.body?.cancel().catch(() => {});
    if (hop === policy.maxRedirects) throw new Error(`${policy.label} exceeded redirect limit`);
    const location = response.headers.get('location');
    if (!location) throw new Error(`${policy.label} redirect is missing Location`);
    const next = validateRemoteHttpsUrl(
      new URL(location, current),
      policy.allowedOrigins,
      policy.label
    );
    if (next.origin !== current.origin) {
      headers.delete('if-none-match');
      headers.delete('if-modified-since');
      for (const name of ['authorization', 'cookie', 'proxy-authorization', 'host']) {
        headers.delete(name);
      }
    }
    current = next;
  }
  throw new Error(`${policy.label} redirect policy failed`);
}

export async function readBoundedBody(
  response: Response,
  maxBytes: number,
  label: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  let onAbort: (() => void) | undefined;
  try {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0)
      throw new Error(`Invalid ${label} byte limit`);
    signal?.throwIfAborted();
    const encoding = response.headers.get('content-encoding');
    if (encoding && encoding.toLowerCase() !== 'identity') {
      throw new Error(`${label} content encoding is not allowed: ${encoding}`);
    }
    const declared = response.headers.get('content-length');
    if (declared) {
      const length = Number(declared);
      if (!Number.isSafeInteger(length) || length < 0)
        throw new Error(`Invalid ${label} Content-Length`);
      if (length > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes`);
    }
    if (!response.body) throw new Error(`${label} response has no body`);
    const chunks: Uint8Array[] = [];
    let size = 0;
    reader = response.body.getReader();
    onAbort = () => {
      void reader?.cancel().catch(() => {});
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    while (true) {
      const next = await reader.read();
      signal?.throwIfAborted();
      if (next.done) break;
      const chunk = next.value;
      size += chunk.byteLength;
      if (size > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes`);
      chunks.push(chunk);
    }
    if (size === 0) throw new Error(`${label} response is empty`);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    complete = true;
    return bytes;
  } finally {
    if (onAbort) signal?.removeEventListener('abort', onAbort);
    if (reader) {
      if (!complete) void reader.cancel().catch(() => {});
      reader.releaseLock();
    } else if (!complete) {
      void response.body?.cancel().catch(() => {});
    }
  }
}
