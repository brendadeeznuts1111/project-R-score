import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../../../lib/http/outbound-policy.ts';

export type FinalOutboundPlane = 'edge' | 'server' | 'deployment';

export interface FinalOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

const ORIGINS: Record<FinalOutboundPlane, ReadonlySet<string>> = {
  edge: new Set([
    'https://crystal-clear-architecture.pages.dev',
    'https://raw.githubusercontent.com',
  ]),
  server: new Set([
    'https://api.apexodds.net',
    'https://api.fantasy402.com',
    'https://api.fantasy42.com',
    'https://api.github.com',
    'https://apexodds.net',
    'https://github.com',
    'https://httpbin.org',
    'https://npm.enterprise.com',
    'https://npm.private.com',
    'https://raw.githubusercontent.com',
    'https://registry.fire22.com',
    'https://registry.npmjs.org',
  ]),
  deployment: new Set([
    'https://api.apexodds.net',
    'https://api.github.com',
    'https://apexodds.net',
    'https://crystal-clear-docs.nolarose1968.workers.dev',
    'https://dashboard.apexodds.net',
    'https://dev.apexodds.net',
    'https://dev.fantasy42.com',
    'https://docs.apexodds.net',
    'https://httpbin.org',
    'https://npm.enterprise.com',
    'https://npm.private.com',
    'https://registry.apexodds.net',
    'https://registry.fire22.com',
    'https://staging.apexodds.net',
    'https://staging.fantasy42.com',
    'https://fantasy42.com',
  ]),
};
const CREDENTIAL_ORIGINS = new Set([
  'https://api.apexodds.net',
  'https://api.fantasy402.com',
  'https://api.fantasy42.com',
  'https://raw.githubusercontent.com',
]);
const NETWORK_MODES = new Set<OutboundNetworkMode>([
  'online',
  'cached-only',
  'offline-no-socket',
]);

function parseNetworkMode(input: unknown): OutboundNetworkMode {
  if (input === undefined || input === '') return 'online';
  if (typeof input === 'string' && NETWORK_MODES.has(input as OutboundNetworkMode)) {
    return input as OutboundNetworkMode;
  }
  throw new TypeError('FIRE22_NETWORK_MODE must be online, cached-only, or offline-no-socket');
}

function parseUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError('Fantasy42 outbound URL must be absolute');
  }
  if (url.username || url.password || url.hash) {
    throw new TypeError('Fantasy42 outbound credentials and fragments are denied');
  }
  return url;
}

function assertAuthority(plane: FinalOutboundPlane, url: URL): boolean {
  const loopback =
    url.protocol === 'http:' && isNormalizedLoopbackHostname(url.hostname.replace(/^\[|\]$/g, ''));
  if (!loopback && (url.protocol !== 'https:' || !ORIGINS[plane].has(url.origin))) {
    throw new Error(`Fantasy42 ${plane} outbound authority is not allowlisted`);
  }
  if (loopback && plane === 'edge') throw new Error('Fantasy42 edge loopback authority is denied');
  return loopback;
}

function methodOf(init: BunFetchRequestInit): string {
  const method = (init.method ?? 'GET').toUpperCase();
  if ((method === 'GET' || method === 'HEAD') && init.body != null) {
    throw new TypeError(`${method} Fantasy42 outbound requests must not carry a body`);
  }
  return method;
}

export function fetchFinalOutbound(
  plane: FinalOutboundPlane,
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: FinalOutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input);
  const loopback = assertAuthority(plane, url);
  const method = methodOf(init);
  const environment = options.environment ??
    (typeof process === 'undefined' ? {} : process.env);
  const credentialHeaders = CREDENTIAL_ORIGINS.has(url.origin) || loopback
    ? ['authorization', 'cookie', 'x-api-key']
    : [];
  const policy: OutboundEndpointPolicy = {
    name: `fantasy42-final-${plane}-${url.hostname}`,
    allowedOrigins: [url.origin],
    allowedMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentialMode: credentialHeaders.length ? 'scoped' : 'forbid',
    credentialHeaders,
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 8_000_000,
    route: { mode: 'direct' },
    networkMode: options.networkMode ?? parseNetworkMode(environment.FIRE22_NETWORK_MODE),
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: {
      mode: loopback || plane === 'edge' ? 'allow-non-public' : 'public-only',
      enforcement: 'resolve-before-connect',
    },
    replayClass: method === 'GET' || method === 'HEAD' ? 'safe' : 'unsafe',
  };
  return fetchWithPolicy(url, init, policy, options.fetcher ?? fetch, {
    resolver: options.resolver,
    environment,
  });
}

export const fetchFinalEdge = (
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: FinalOutboundOptions = {}
) => fetchFinalOutbound('edge', input, init, options);

export const fetchFinalServer = (
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: FinalOutboundOptions = {}
) => fetchFinalOutbound('server', input, init, options);

export const fetchFinalDeployment = (
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: FinalOutboundOptions = {}
) => fetchFinalOutbound('deployment', input, init, options);
