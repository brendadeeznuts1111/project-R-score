// @see https://bun.com/docs/runtime/networking/fetch — Bun fetch extensions

const STANDARD_CREDENTIAL_HEADERS = [
  'authorization',
  'api-key',
  'cookie',
  'proxy-authorization',
  'x-api-key',
] as const;

export type OutboundCredentialMode = 'forbid' | 'scoped';
export type OutboundRedirectMode = 'error' | 'manual';
export type OutboundFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface OutboundEndpointPolicy {
  readonly name: string;
  readonly allowedOrigins: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly credentialMode: OutboundCredentialMode;
  readonly credentialHeaders?: readonly string[];
  readonly redirect: OutboundRedirectMode;
  readonly timeoutMs: number;
}

export interface PreparedOutboundRequest {
  readonly url: URL;
  readonly init: RequestInit;
  readonly policy: OutboundEndpointPolicy;
}

/** Classify a hostname already normalized by URL parsing. `.local` is not loopback. */
export function isNormalizedLoopbackHostname(input: string): boolean {
  const bracketless = input.replace(/^\[|\]$/g, '').toLowerCase();
  const host = bracketless.endsWith('.') ? bracketless.slice(0, -1) : bracketless;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1') return true;
  return host.split('.')[0] === '127' && /^127(?:\.\d{1,3}){3}$/.test(host);
}

function parseHttpUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError('Outbound endpoint must be a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('Outbound endpoint must use HTTP or HTTPS');
  }
  if (url.username || url.password) {
    throw new TypeError('Outbound endpoint URL must not contain credentials');
  }
  return url;
}

function parsePolicyOrigin(input: string): string {
  const url = parseHttpUrl(input);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new TypeError('Outbound policy origins must not contain a path, query, or fragment');
  }
  return url.origin;
}

function assertPolicy(policy: OutboundEndpointPolicy): void {
  if (!policy.name.trim()) throw new TypeError('Outbound policy name is required');
  if (policy.allowedOrigins.length === 0) {
    throw new TypeError(`Outbound policy ${policy.name} requires at least one allowed origin`);
  }
  if (policy.allowedMethods.length === 0) {
    throw new TypeError(`Outbound policy ${policy.name} requires at least one allowed method`);
  }
  if (!Number.isSafeInteger(policy.timeoutMs) || policy.timeoutMs < 1) {
    throw new TypeError(`Outbound policy ${policy.name} requires a positive integer timeoutMs`);
  }
}

function boundedSignal(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** Parse and bind one request to an exact origin, auth scope, redirect mode, and deadline. */
export function prepareOutboundRequest(
  input: string | URL,
  init: RequestInit,
  policy: OutboundEndpointPolicy
): PreparedOutboundRequest {
  assertPolicy(policy);
  const url = parseHttpUrl(input);
  const allowedOrigins = policy.allowedOrigins.map(parsePolicyOrigin);
  if (!allowedOrigins.includes(url.origin)) {
    throw new Error(`Outbound endpoint origin is not allowed by ${policy.name}`);
  }

  const method = (init.method ?? 'GET').toUpperCase();
  const allowedMethods = policy.allowedMethods.map(value => value.toUpperCase());
  if (!allowedMethods.includes(method)) {
    throw new Error(`Outbound method ${method} is not allowed by ${policy.name}`);
  }
  if (init.redirect && init.redirect !== policy.redirect) {
    throw new Error(`Outbound redirect mode cannot override ${policy.name}`);
  }
  if (init.credentials && init.credentials !== 'omit') {
    throw new Error(`Outbound ambient credentials are forbidden by ${policy.name}`);
  }

  const headers = new Headers(init.headers);
  const declaredCredentialHeaders = (policy.credentialHeaders ?? []).map(value =>
    value.toLowerCase()
  );
  const allowedCredentialHeaders = new Set(
    policy.credentialMode === 'scoped' ? declaredCredentialHeaders : []
  );
  const credentialHeaders = new Set([...STANDARD_CREDENTIAL_HEADERS, ...declaredCredentialHeaders]);
  const forwarded = [...credentialHeaders].find(
    header => headers.has(header) && !allowedCredentialHeaders.has(header)
  );
  if (forwarded) {
    throw new Error(`Outbound credentials are forbidden by ${policy.name}`);
  }

  return {
    url,
    policy,
    init: {
      ...init,
      method,
      headers,
      credentials: 'omit',
      redirect: policy.redirect,
      signal: boundedSignal(init.signal, policy.timeoutMs),
    },
  };
}

export function fetchWithPolicy(
  input: string | URL,
  init: RequestInit,
  policy: OutboundEndpointPolicy,
  fetcher: OutboundFetch = fetch
): Promise<Response> {
  const request = prepareOutboundRequest(input, init, policy);
  return fetcher(request.url, request.init);
}
