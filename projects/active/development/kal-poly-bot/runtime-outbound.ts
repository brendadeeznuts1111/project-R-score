import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../lib/http/outbound-policy.ts';

const authorityBrand: unique symbol = Symbol('kal-poly-outbound-authority');

export interface KalPolyOutboundAuthority {
  readonly [authorityBrand]: true;
  readonly name: string;
  readonly origin: string;
  readonly pathPrefix: string;
  readonly methods: readonly string[];
  readonly credentialHeaders: readonly string[];
  readonly addressClass: 'public' | 'loopback' | 'internal';
  readonly networkMode: OutboundNetworkMode;
}

export interface KalPolyAuthorityInput {
  readonly name: string;
  readonly baseUrl: string;
  readonly pathPrefix?: string;
  readonly methods?: readonly ('GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE')[];
  readonly credentialHeaders?: readonly string[];
  readonly addressClass?: 'public' | 'loopback' | 'internal';
  readonly networkMode?: OutboundNetworkMode;
}

export interface KalPolyOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  /** Test/offline callers may only tighten an online authority to offline. */
  readonly networkMode?: OutboundNetworkMode;
}

const FORBIDDEN_RUNTIME_CONTROLS = [
  '--connect',
  '--fetch-preconnect',
  '--experimental-http2-fetch',
  '--experimental-http3-fetch',
] as const;

function parseBaseUrl(input: string): URL {
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError('Kal Poly outbound authority must not contain credentials or URL suffixes');
  }
  return url;
}

export function createKalPolyOutboundAuthority(
  input: KalPolyAuthorityInput
): KalPolyOutboundAuthority {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(input.name)) {
    throw new TypeError('Kal Poly outbound authority requires a stable kebab-case name');
  }
  const base = parseBaseUrl(input.baseUrl);
  const addressClass = input.addressClass ?? 'public';
  if (addressClass === 'public') {
    if (base.protocol !== 'https:' || isNormalizedLoopbackHostname(base.hostname)) {
      throw new TypeError('Kal Poly public authority requires a non-loopback HTTPS origin');
    }
  } else if (addressClass === 'loopback' && (
    (base.protocol !== 'http:' && base.protocol !== 'https:') ||
    !isNormalizedLoopbackHostname(base.hostname)
  )) {
    throw new TypeError('Kal Poly loopback authority requires an HTTP(S) loopback origin');
  } else if (
    addressClass === 'internal' &&
    base.protocol !== 'http:' &&
    base.protocol !== 'https:'
  ) {
    throw new TypeError('Kal Poly internal authority requires an HTTP(S) origin');
  }
  const pathPrefix = input.pathPrefix ?? (base.pathname === '/' ? '/' : base.pathname);
  if (!pathPrefix.startsWith('/') || pathPrefix.startsWith('//')) {
    throw new TypeError('Kal Poly outbound path prefix must be origin-relative');
  }
  const methods = input.methods ?? ['GET'];
  if (methods.length === 0) throw new TypeError('Kal Poly outbound authority requires a method');
  const networkMode = input.networkMode ?? 'online';
  if (networkMode === 'cached-only') {
    throw new TypeError('Kal Poly runtime has no verified network cache authority');
  }
  return Object.freeze({
    [authorityBrand]: true as const,
    name: input.name,
    origin: base.origin,
    pathPrefix,
    methods: [...methods],
    credentialHeaders: [...(input.credentialHeaders ?? [])],
    addressClass,
    networkMode,
  });
}

function assertRuntimeControls(environment: Readonly<Record<string, string | undefined>>): void {
  const bunOptions = environment.BUN_OPTIONS ?? '';
  const denied = FORBIDDEN_RUNTIME_CONTROLS.find(control => bunOptions.includes(control));
  if (denied) throw new Error(`Kal Poly outbound runtime control ${denied} is denied`);
  if (environment.BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT) {
    throw new Error('Kal Poly outbound experimental HTTP/2 runtime override is denied');
  }
  if (environment.BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT) {
    throw new Error('Kal Poly outbound experimental HTTP/3 runtime override is denied');
  }
}

function targetUrl(authority: KalPolyOutboundAuthority, input: string | URL): URL {
  if (authority[authorityBrand] !== true) throw new TypeError('Kal Poly outbound authority is invalid');
  const url = new URL(input.toString(), authority.origin);
  if (url.origin !== authority.origin || url.username || url.password || url.hash) {
    throw new Error(`Kal Poly outbound target escapes ${authority.name}`);
  }
  const allowedPath = authority.pathPrefix.endsWith('/')
    ? url.pathname.startsWith(authority.pathPrefix)
    : url.pathname === authority.pathPrefix || url.pathname.startsWith(`${authority.pathPrefix}/`);
  if (!allowedPath) {
    throw new Error(`Kal Poly outbound path is not allowed by ${authority.name}`);
  }
  return url;
}

export async function fetchKalPolyOutbound(
  authority: KalPolyOutboundAuthority,
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: KalPolyOutboundOptions = {}
): Promise<Response> {
  const environment = options.environment ?? Bun.env;
  assertRuntimeControls(environment);
  const requestedMode = options.networkMode ?? authority.networkMode;
  const networkMode =
    authority.networkMode === 'offline-no-socket' || requestedMode === 'offline-no-socket'
      ? 'offline-no-socket'
      : authority.networkMode;
  const method = (init.method ?? 'GET').toUpperCase();
  const policy = {
    name: authority.name,
    allowedOrigins: [authority.origin],
    allowedMethods: authority.methods,
    credentialMode: authority.credentialHeaders.length ? 'scoped' : 'forbid',
    credentialHeaders: authority.credentialHeaders,
    redirect: 'error',
    timeoutMs: 30_000,
    totalDeadlineMs: 30_000,
    responseByteLimit: 8 * 1024 * 1024,
    route: { mode: 'direct' },
    networkMode,
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: {
      mode: authority.addressClass === 'public' ? 'public-only' : 'allow-non-public',
      enforcement: 'resolve-before-connect',
    },
    replayClass: ['GET', 'HEAD'].includes(method) ? 'safe' : 'unsafe',
    controlProfile: networkMode === 'offline-no-socket' ? 'offline' : 'production',
  } as const satisfies OutboundEndpointPolicy;
  const { fetcher = fetch, networkMode: _networkMode, ...execution } = options;
  return await fetchWithPolicy(targetUrl(authority, input), init, policy, fetcher, {
    ...execution,
    environment,
  });
}
