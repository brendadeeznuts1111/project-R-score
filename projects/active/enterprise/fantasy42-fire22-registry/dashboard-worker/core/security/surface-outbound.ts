import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../../../../lib/http/outbound-policy.ts';

export interface SurfaceOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
  readonly browserOrigin?: string;
}

const PUBLIC_ORIGINS = new Set([
  'https://api.crystal-clear-architecture.com',
  'https://api.fire22.ag',
  'https://api.fire22.com',
  'https://dashboard.fire22.ag',
  'https://dashboard-worker.brendawill2233.workers.dev',
  'https://dashboard-worker.nolarose1968-806.workers.dev',
  'https://fire22-dashboard.pages.dev',
  'https://fire22.workers.dev',
  'https://registry.npmjs.org',
]);
const CREDENTIAL_ORIGINS = new Set([
  'https://api.crystal-clear-architecture.com',
  'https://api.fire22.ag',
  'https://api.fire22.com',
]);
const NETWORK_MODES = new Set<OutboundNetworkMode>([
  'online',
  'cached-only',
  'offline-no-socket',
]);

function networkMode(input: unknown): OutboundNetworkMode {
  if (input === undefined || input === '') return 'online';
  if (typeof input === 'string' && NETWORK_MODES.has(input as OutboundNetworkMode)) {
    return input as OutboundNetworkMode;
  }
  throw new TypeError('FIRE22_NETWORK_MODE must be online, cached-only, or offline-no-socket');
}

function parseOrigin(input: string, label: string): URL {
  const origin = new URL(input);
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new TypeError(`${label} must be a credential-free origin`);
  }
  return origin;
}

function browserOrigin(options: SurfaceOutboundOptions): string | undefined {
  if (options.browserOrigin) return parseOrigin(options.browserOrigin, 'Browser origin').origin;
  if (typeof location !== 'undefined' && location.origin !== 'null') return location.origin;
  return undefined;
}

function parseRequestUrl(input: string | URL, options: SurfaceOutboundOptions): URL {
  const raw = input.toString();
  const base = browserOrigin(options);
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    throw new TypeError('Surface outbound URL must be absolute outside a browser authority');
  }
  if (url.username || url.password || url.hash) {
    throw new TypeError('Surface outbound credentials and fragments are denied');
  }
  if (!raw.match(/^https?:/i) && (!base || url.origin !== base || !url.pathname.startsWith('/api/'))) {
    throw new Error('Browser outbound is restricted to same-origin /api routes');
  }
  return url;
}

function assertAuthority(url: URL): boolean {
  const loopback =
    url.protocol === 'http:' && isNormalizedLoopbackHostname(url.hostname.replace(/^\[|\]$/g, ''));
  if (!loopback && (!PUBLIC_ORIGINS.has(url.origin) || url.protocol !== 'https:')) {
    throw new Error('Surface outbound authority is not allowlisted');
  }
  return loopback;
}

function requestMethod(init: BunFetchRequestInit): string {
  const method = (init.method ?? 'GET').toUpperCase();
  if ((method === 'GET' || method === 'HEAD') && init.body != null) {
    throw new TypeError(`${method} surface requests must not carry a body`);
  }
  return method;
}

export function fetchSurfaceOutbound(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: SurfaceOutboundOptions = {}
): Promise<Response> {
  const url = parseRequestUrl(input, options);
  const loopback = assertAuthority(url);
  const method = requestMethod(init);
  const environment = options.environment ?? {
    FIRE22_NETWORK_MODE:
      typeof process === 'undefined' ? undefined : process.env.FIRE22_NETWORK_MODE,
    NO_PROXY: '*',
  };
  const credentialHeaders = CREDENTIAL_ORIGINS.has(url.origin) || loopback
    ? ['authorization', 'x-api-key']
    : [];
  const policy: OutboundEndpointPolicy = {
    name: `fantasy42-surface-${url.hostname}`,
    allowedOrigins: [url.origin],
    allowedMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentialMode: credentialHeaders.length ? 'scoped' : 'forbid',
    credentialHeaders,
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 4_000_000,
    route: { mode: 'direct' },
    networkMode: options.networkMode ?? networkMode(environment.FIRE22_NETWORK_MODE),
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: {
      mode: loopback ? 'allow-non-public' : 'public-only',
      enforcement: 'resolve-before-connect',
    },
    replayClass: method === 'GET' || method === 'HEAD' ? 'safe' : 'unsafe',
  };
  return fetchWithPolicy(url, init, policy, options.fetcher ?? fetch, {
    resolver: options.resolver,
    environment,
  });
}
