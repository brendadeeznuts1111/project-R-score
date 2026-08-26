export type BrowserFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface BrowserOutboundOptions {
  readonly origin?: string | URL;
  readonly fetcher?: BrowserFetch;
  readonly timeoutMs?: number;
  readonly responseByteLimit?: number;
}

const CREDENTIAL_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization']);

function runtimeOrigin(input?: string | URL): URL {
  const value = input ?? globalThis.location?.origin;
  if (!value) throw new TypeError('Browser outbound requires an explicit same-origin authority');
  const origin = new URL(value.toString());
  if (!['http:', 'https:'].includes(origin.protocol)) {
    throw new TypeError('Browser outbound origin must use HTTP or HTTPS');
  }
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new TypeError('Browser outbound origin must be a credential-free origin');
  }
  return origin;
}

function assertHeaders(headers: HeadersInit | undefined): Headers {
  const parsed = new Headers(headers);
  for (const name of CREDENTIAL_HEADERS) {
    if (parsed.has(name)) throw new TypeError(`Browser outbound forbids ${name} credentials`);
  }
  return parsed;
}

function assertCallerPolicy(init: RequestInit, method: string): void {
  const requested = (init.method ?? method).toUpperCase();
  if (requested !== method) throw new TypeError(`Browser outbound requires ${method}`);
  if (init.redirect !== undefined && init.redirect !== 'error') {
    throw new TypeError('Browser outbound redirects are fixed to error');
  }
  if (init.credentials !== undefined && init.credentials !== 'same-origin') {
    throw new TypeError('Browser outbound credentials are fixed to same-origin');
  }
  if (init.mode !== undefined && init.mode !== 'same-origin') {
    throw new TypeError('Browser outbound mode is fixed to same-origin');
  }
  if (method === 'GET' && init.body != null) {
    throw new TypeError('Browser outbound GET requests must not carry a body');
  }
}

async function fetchSameOrigin(
  input: string | URL,
  method: 'GET' | 'POST' | 'PUT',
  init: RequestInit,
  options: BrowserOutboundOptions
): Promise<Response> {
  const origin = runtimeOrigin(options.origin);
  const url = new URL(input.toString(), origin);
  if (url.origin !== origin.origin) throw new TypeError('Browser outbound denied cross-origin URL');
  if (url.username || url.password || url.hash) {
    throw new TypeError('Browser outbound URL must not contain credentials or fragments');
  }
  assertCallerPolicy(init, method);
  const headers = assertHeaders(init.headers);
  const controller = new AbortController();
  if (init.signal?.aborted) controller.abort(init.signal.reason);
  init.signal?.addEventListener('abort', () => controller.abort(init.signal?.reason), {
    once: true,
  });
  const timeout = setTimeout(() => controller.abort('browser outbound deadline'), options.timeoutMs ?? 10_000);
  try {
    const fetch = options.fetcher ?? globalThis.fetch;
    const response = await fetch(url, {
      ...init,
      method,
      headers,
      credentials: 'same-origin',
      redirect: 'error',
      mode: 'same-origin',
      referrerPolicy: 'same-origin',
      signal: controller.signal,
    });
    const limit = options.responseByteLimit ?? 4_000_000;
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > limit) {
      throw new RangeError(`Browser outbound response exceeds ${limit} bytes`);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchSameOriginGet(
  input: string | URL,
  init: Omit<RequestInit, 'method'> = {},
  options: BrowserOutboundOptions = {}
): Promise<Response> {
  return fetchSameOrigin(input, 'GET', init, options);
}

export function fetchSameOriginPost(
  input: string | URL,
  init: Omit<RequestInit, 'method'> = {},
  options: BrowserOutboundOptions = {}
): Promise<Response> {
  return fetchSameOrigin(input, 'POST', init, options);
}

export function fetchSameOriginPut(
  input: string | URL,
  init: Omit<RequestInit, 'method'> = {},
  options: BrowserOutboundOptions = {}
): Promise<Response> {
  return fetchSameOrigin(input, 'PUT', init, options);
}
