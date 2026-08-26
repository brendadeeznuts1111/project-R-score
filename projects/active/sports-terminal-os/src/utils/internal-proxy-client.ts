import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
  type OutboundFetch,
} from '../../../../../lib/http/outbound-policy.ts';

export const INTERNAL_PROXY_ROUTES = {
  accountInfo: '/api/proxy/accountInfo',
  agentBilling: '/api/proxy/agentBilling',
  agentDownline: '/api/proxy/agentDownline',
  agentPerformance: '/api/proxy/agentPerformance',
  auth: '/api/proxy/auth',
  pending: '/api/proxy/pending',
  players: '/api/proxy/players',
  renewToken: '/api/proxy/renewToken',
  wagers: '/api/proxy/wagers',
} as const;

export type InternalProxyRoute = (typeof INTERNAL_PROXY_ROUTES)[keyof typeof INTERNAL_PROXY_ROUTES];

const ALLOWED_ROUTES = new Set<string>(Object.values(INTERNAL_PROXY_ROUTES));
const FORWARDED_AUTH_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-session-id'] as const;
const DEFAULT_PROXY_ORIGIN = 'http://localhost:3001';

function parseProxyOrigin(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TypeError('PROXY_INTERNAL_URL must be a valid HTTP or HTTPS origin');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('PROXY_INTERNAL_URL must use HTTP or HTTPS');
  }
  if (url.username || url.password) {
    throw new TypeError('PROXY_INTERNAL_URL must not contain credentials');
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new TypeError('PROXY_INTERNAL_URL must be an origin without path, query, or fragment');
  }
  return url;
}

export function selectInternalProxyAuthHeaders(input: Headers): Headers {
  const selected = new Headers();
  for (const name of FORWARDED_AUTH_HEADERS) {
    const value = input.get(name);
    if (value !== null) selected.set(name, value);
  }
  return selected;
}

export function fetchInternalProxy(
  route: InternalProxyRoute,
  init: RequestInit = {},
  options: {
    readonly query?: URLSearchParams;
    readonly baseUrl?: string;
    readonly fetcher?: OutboundFetch;
  } = {}
): Promise<Response> {
  if (!ALLOWED_ROUTES.has(route)) {
    throw new TypeError('Internal proxy route is not registered');
  }

  const base = parseProxyOrigin(
    options.baseUrl ?? process.env.PROXY_INTERNAL_URL ?? DEFAULT_PROXY_ORIGIN
  );
  const target = new URL(route, base);
  if (options.query) target.search = options.query.toString();

  const policy: OutboundEndpointPolicy = {
    name: 'sports-terminal-internal-proxy',
    allowedOrigins: [base.origin],
    allowedMethods: ['GET', 'POST'],
    credentialMode: 'scoped',
    credentialHeaders: [
      'authorization',
      'cookie',
      'x-api-key',
      'x-internal-token',
      'x-session-id',
    ],
    redirect: 'error',
    timeoutMs: 10_000,
  };

  return fetchWithPolicy(target, init, policy, options.fetcher);
}
