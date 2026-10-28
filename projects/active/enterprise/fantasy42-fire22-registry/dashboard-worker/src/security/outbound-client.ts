import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
  type OutboundReplayClass,
} from '../../../../../../../lib/http/outbound-policy.ts';

export interface Fantasy42OutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

type Fantasy42OutboundScope =
  | 'cloudflare-api'
  | 'github-api'
  | 'r2-s3'
  | 'service'
  | 'public-read';

interface ScopeContract {
  readonly name: Fantasy42OutboundScope;
  readonly origin: URL;
  readonly allowedMethods: readonly string[];
  readonly credentialHeaders: readonly string[];
  readonly timeoutMs: number;
  readonly responseByteLimit: number;
  readonly allowLoopback: boolean;
}

const CLOUDFLARE_API_ORIGIN = new URL('https://api.cloudflare.com');
const GITHUB_API_ORIGIN = new URL('https://api.github.com');
const R2_HOST_SUFFIX = '.r2.cloudflarestorage.com';
const NETWORK_MODES = new Set<OutboundNetworkMode>([
  'online',
  'cached-only',
  'offline-no-socket',
]);

export function parseFantasy42NetworkMode(input: unknown): OutboundNetworkMode {
  if (input === undefined || input === '') return 'online';
  if (typeof input === 'string' && NETWORK_MODES.has(input as OutboundNetworkMode)) {
    return input as OutboundNetworkMode;
  }
  throw new TypeError('FIRE22_NETWORK_MODE must be online, cached-only, or offline-no-socket');
}

function parseUrl(input: string | URL, label: string): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError(`${label} must be a valid URL`);
  }
  if (url.username || url.password) throw new TypeError(`${label} must not contain credentials`);
  if (url.hash) throw new TypeError(`${label} must not contain a fragment`);
  return url;
}

function parseOrigin(input: string | URL, label: string): URL {
  const url = parseUrl(input, label);
  if (url.pathname !== '/' || url.search) {
    throw new TypeError(`${label} must be an origin without a path or query`);
  }
  return url;
}

function assertHttpsOrLoopback(url: URL, label: string): boolean {
  if (url.protocol === 'https:') return false;
  if (url.protocol === 'http:' && isNormalizedLoopbackHostname(url.hostname)) return true;
  throw new TypeError(`${label} must use HTTPS or normalized HTTP loopback`);
}

function parseR2Origin(input: string | URL): URL {
  const origin = parseOrigin(input, 'R2 endpoint');
  if (origin.protocol !== 'https:') throw new TypeError('R2 endpoint must use HTTPS');
  const hostname = origin.hostname.toLowerCase();
  if (!hostname.endsWith(R2_HOST_SUFFIX) || hostname === R2_HOST_SUFFIX.slice(1)) {
    throw new TypeError('R2 endpoint must use a Cloudflare R2 S3 origin');
  }
  return origin;
}

function requestReplayClass(method: string): OutboundReplayClass {
  if (method === 'GET' || method === 'HEAD') return 'safe';
  if (method === 'PUT' || method === 'DELETE') return 'idempotent';
  return 'unsafe';
}

function assertRequestShape(init: BunFetchRequestInit): string {
  const method = (init.method ?? 'GET').toUpperCase();
  if ((method === 'GET' || method === 'HEAD') && init.body !== undefined && init.body !== null) {
    throw new TypeError(`${method} outbound requests must not carry a body`);
  }
  return method;
}

function fetchFantasy42Scope(
  input: string | URL,
  init: BunFetchRequestInit,
  scope: ScopeContract,
  options: Fantasy42OutboundOptions
): Promise<Response> {
  const url = parseUrl(input, `${scope.name} request URL`);
  if (url.origin !== scope.origin.origin) {
    throw new Error(`${scope.name} request origin does not match its credential authority`);
  }
  const method = assertRequestShape(init);
  const environment = options.environment ?? Bun.env;
  const networkMode =
    options.networkMode ?? parseFantasy42NetworkMode(environment.FIRE22_NETWORK_MODE);
  const policy: OutboundEndpointPolicy = {
    name: `fantasy42-${scope.name}`,
    allowedOrigins: [scope.origin.origin],
    allowedMethods: scope.allowedMethods,
    credentialMode: scope.credentialHeaders.length ? 'scoped' : 'forbid',
    credentialHeaders: scope.credentialHeaders,
    redirect: 'error',
    timeoutMs: scope.timeoutMs,
    totalDeadlineMs: scope.timeoutMs,
    responseByteLimit: scope.responseByteLimit,
    route: { mode: 'direct' },
    networkMode,
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: {
      mode: scope.allowLoopback ? 'allow-non-public' : 'public-only',
      enforcement: 'resolve-before-connect',
    },
    replayClass: requestReplayClass(method),
  };
  return fetchWithPolicy(url, init, policy, options.fetcher ?? fetch, {
    resolver: options.resolver,
    environment,
  });
}

export function fetchCloudflareApi(
  input: string | URL,
  init: BunFetchRequestInit,
  options: Fantasy42OutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input, 'Cloudflare API request URL');
  if (url.origin !== CLOUDFLARE_API_ORIGIN.origin || !url.pathname.startsWith('/client/v4/')) {
    throw new Error('Cloudflare API requests require the api.cloudflare.com /client/v4 authority');
  }
  return fetchFantasy42Scope(
    url,
    init,
    {
      name: 'cloudflare-api',
      origin: CLOUDFLARE_API_ORIGIN,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentialHeaders: ['authorization'],
      timeoutMs: 20_000,
      responseByteLimit: 4_000_000,
      allowLoopback: false,
    },
    options
  );
}

export function fetchGithubApi(
  input: string | URL,
  init: BunFetchRequestInit,
  options: Fantasy42OutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input, 'GitHub API request URL');
  if (url.origin !== GITHUB_API_ORIGIN.origin) {
    throw new Error('GitHub API requests require the api.github.com credential authority');
  }
  return fetchFantasy42Scope(
    url,
    init,
    {
      name: 'github-api',
      origin: GITHUB_API_ORIGIN,
      allowedMethods: ['GET'],
      credentialHeaders: ['authorization'],
      timeoutMs: 15_000,
      responseByteLimit: 4_000_000,
      allowLoopback: false,
    },
    options
  );
}

export function fetchR2S3(
  endpoint: string | URL,
  input: string | URL,
  init: BunFetchRequestInit,
  options: Fantasy42OutboundOptions = {}
): Promise<Response> {
  const origin = parseR2Origin(endpoint);
  return fetchFantasy42Scope(
    input,
    init,
    {
      name: 'r2-s3',
      origin,
      allowedMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
      credentialHeaders: ['authorization', 'x-amz-security-token'],
      timeoutMs: 60_000,
      responseByteLimit: 512 * 1024 * 1024,
      allowLoopback: false,
    },
    options
  );
}

export function fetchServiceOrigin(
  baseUrl: string | URL,
  input: string | URL,
  init: BunFetchRequestInit,
  options: Fantasy42OutboundOptions = {}
): Promise<Response> {
  const origin = parseOrigin(baseUrl, 'Service base URL');
  const allowLoopback = assertHttpsOrLoopback(origin, 'Service base URL');
  return fetchFantasy42Scope(
    input,
    init,
    {
      name: 'service',
      origin,
      allowedMethods: ['GET', 'POST'],
      credentialHeaders: ['authorization'],
      timeoutMs: 10_000,
      responseByteLimit: 2_000_000,
      allowLoopback,
    },
    options
  );
}

export function fetchPublicRead(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: Fantasy42OutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input, 'Public read URL');
  if (url.protocol !== 'https:') throw new TypeError('Public read URL must use HTTPS');
  return fetchFantasy42Scope(
    url,
    init,
    {
      name: 'public-read',
      origin: new URL(url.origin),
      allowedMethods: ['GET', 'HEAD'],
      credentialHeaders: [],
      timeoutMs: 10_000,
      responseByteLimit: 4_000_000,
      allowLoopback: false,
    },
    options
  );
}
