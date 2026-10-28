import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
  type OutboundRoutePolicy,
} from '../../../../../../lib/http/outbound-policy.ts';

const authorityBrand: unique symbol = Symbol('full-stack-bun-outbound-authority');

export type FullStackBunOutboundKind =
  | 'alert'
  | 'registry'
  | 'market-data'
  | 'scrape'
  | 'r2'
  | 'bookie'
  | 'health'
  | 'ipfs-gateway'
  | 'ipfs-api'
  | 'ipfs-pinning'
  | 'example-api'
  | 'webhook';

export interface FullStackBunOutboundAuthority {
  readonly [authorityBrand]: true;
  readonly kind: FullStackBunOutboundKind;
  readonly name: string;
  readonly origin: string;
  readonly pathPrefix: string;
  readonly exactUrl?: string;
  readonly methods: readonly ('GET' | 'HEAD' | 'POST' | 'PUT')[];
  readonly credentialHeaders: readonly string[];
  readonly addressClass: 'public' | 'loopback' | 'internal';
  readonly route: OutboundRoutePolicy;
  readonly networkMode: OutboundNetworkMode;
}

export interface FullStackBunAuthorityInput {
  readonly kind: FullStackBunOutboundKind;
  readonly name: string;
  readonly baseUrl: string;
  readonly pathPrefix?: string;
  readonly exact?: boolean;
  readonly methods?: readonly ('GET' | 'HEAD' | 'POST' | 'PUT')[];
  readonly credentialHeaders?: readonly string[];
  readonly addressClass?: 'public' | 'loopback' | 'internal';
  readonly proxy?: string;
  readonly networkMode?: OutboundNetworkMode;
}

export interface FullStackBunOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly argv?: readonly string[];
  /** Callers may tighten online authority to offline, never loosen an offline authority. */
  readonly networkMode?: OutboundNetworkMode;
}

const DENIED_BUN_OPTIONS = [
  '--registry',
  '--connect',
  '--fetch-preconnect',
  '-O',
  '-R',
  '--experimental-http2-fetch',
  '--experimental-http3-fetch',
] as const;

function parseAuthorityUrl(input: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TypeError(`${label} must be an absolute URL`);
  }
  if (url.username || url.password || url.hash) {
    throw new TypeError(`${label} must not contain credentials or a fragment`);
  }
  return url;
}

function assertAddressClass(url: URL, addressClass: 'public' | 'loopback' | 'internal'): void {
  const loopback = isNormalizedLoopbackHostname(url.hostname);
  if (addressClass === 'loopback') {
    if (!loopback || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
      throw new TypeError('Full-stack Bun loopback authority requires HTTP(S) loopback');
    }
    return;
  }
  if (addressClass === 'internal') {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new TypeError('Full-stack Bun internal authority requires HTTP(S)');
    }
    return;
  }
  if (url.protocol !== 'https:' || loopback) {
    throw new TypeError('Full-stack Bun public authority requires non-loopback HTTPS');
  }
}

function normalizePrefix(input: string): string {
  if (!input.startsWith('/') || input.startsWith('//')) {
    throw new TypeError('Full-stack Bun outbound path prefix must be origin-relative');
  }
  return input.endsWith('/') ? input : `${input}/`;
}

export function createFullStackBunOutboundAuthority(
  input: FullStackBunAuthorityInput
): FullStackBunOutboundAuthority {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(input.name)) {
    throw new TypeError('Full-stack Bun outbound authority requires a stable kebab-case name');
  }
  const url = parseAuthorityUrl(input.baseUrl, `Full-stack Bun ${input.kind} authority`);
  const addressClass = input.addressClass ?? 'public';
  assertAddressClass(url, addressClass);
  if (input.networkMode === 'cached-only') {
    throw new TypeError('Full-stack Bun has no verified outbound response cache');
  }
  const methods = input.methods ?? ['GET'];
  if (!methods.length) throw new TypeError('Full-stack Bun outbound authority requires a method');
  const proxy = input.proxy
    ? parseAuthorityUrl(input.proxy, 'Full-stack Bun named proxy').origin
    : undefined;
  if (proxy && !proxy.startsWith('https://')) {
    throw new TypeError('Full-stack Bun named proxy requires HTTPS');
  }
  const pathPrefix = normalizePrefix(input.pathPrefix ?? url.pathname);
  const route: OutboundRoutePolicy = proxy
    ? { mode: 'named-proxy', proxy }
    : { mode: 'direct' };
  return Object.freeze({
    [authorityBrand]: true as const,
    kind: input.kind,
    name: input.name,
    origin: url.origin,
    pathPrefix,
    exactUrl: input.exact ? url.toString() : undefined,
    methods: [...methods],
    credentialHeaders: [...(input.credentialHeaders ?? [])],
    addressClass,
    route,
    networkMode: input.networkMode ?? 'online',
  });
}

function assertRuntimeControls(
  environment: Readonly<Record<string, string | undefined>>,
  argv: readonly string[]
): void {
  if (environment.BUN_CONFIG_REGISTRY) {
    throw new Error('Full-stack Bun outbound registry environment override is denied');
  }
  const bunOptions = `${environment.BUN_OPTIONS ?? ''} ${argv.join(' ')}`;
  const denied = DENIED_BUN_OPTIONS.find(control =>
    new RegExp(`(?:^|\\s)${control.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:=|\\s|$)`).test(
      bunOptions
    )
  );
  if (denied) throw new Error(`Full-stack Bun outbound runtime control ${denied} is denied`);
  if (environment.BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT) {
    throw new Error('Full-stack Bun experimental HTTP/2 runtime override is denied');
  }
  if (environment.BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT) {
    throw new Error('Full-stack Bun experimental HTTP/3 runtime override is denied');
  }
}

function requestUrl(authority: FullStackBunOutboundAuthority, input: string | URL): URL {
  if (authority[authorityBrand] !== true) {
    throw new TypeError('Full-stack Bun outbound authority is invalid');
  }
  const url = new URL(input.toString(), authority.origin);
  if (url.origin !== authority.origin || url.username || url.password || url.hash) {
    throw new Error(`Full-stack Bun outbound target escapes ${authority.name}`);
  }
  if (authority.exactUrl) {
    if (url.toString() !== authority.exactUrl) {
      throw new Error(`Full-stack Bun outbound target escapes exact URL ${authority.name}`);
    }
  } else if (!url.pathname.startsWith(authority.pathPrefix)) {
    throw new Error(`Full-stack Bun outbound path is not allowed by ${authority.name}`);
  }
  return url;
}

export function fetchFullStackBunOutbound(
  authority: FullStackBunOutboundAuthority,
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: FullStackBunOutboundOptions = {}
): Promise<Response> {
  const environment = options.environment ?? Bun.env;
  assertRuntimeControls(environment, options.argv ?? Bun.argv);
  const method = (init.method ?? 'GET').toUpperCase();
  if ((method === 'GET' || method === 'HEAD') && init.body != null) {
    throw new TypeError(`${method} Full-stack Bun outbound requests must not carry a body`);
  }
  const requestedMode = options.networkMode ?? authority.networkMode;
  const networkMode =
    authority.networkMode === 'offline-no-socket' || requestedMode === 'offline-no-socket'
      ? 'offline-no-socket'
      : authority.networkMode;
  const policy = {
    name: `full-stack-bun-${authority.name}`,
    allowedOrigins: [authority.origin],
    allowedMethods: authority.methods,
    credentialMode: authority.credentialHeaders.length ? 'scoped' : 'forbid',
    credentialHeaders: authority.credentialHeaders,
    redirect: 'error',
    timeoutMs: 30_000,
    totalDeadlineMs: 30_000,
    responseByteLimit: authority.kind === 'scrape' ? 4_000_000 : 8_000_000,
    route: authority.route,
    networkMode,
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: {
      mode: authority.addressClass === 'public' ? 'public-only' : 'allow-non-public',
      enforcement: authority.route.mode === 'named-proxy' ? 'proxy-delegated' : 'resolve-before-connect',
    },
    replayClass: method === 'GET' || method === 'HEAD' ? 'safe' : 'unsafe',
    controlProfile: networkMode === 'offline-no-socket' ? 'offline' : 'production',
    controlGrants:
      authority.route.mode === 'named-proxy'
        ? [
            {
              control: 'request-proxy',
              values: [authority.route.proxy],
              reason: `Exact named egress owned by ${authority.name}`,
            },
          ]
        : [],
  } as const satisfies OutboundEndpointPolicy;
  const { fetcher = fetch, networkMode: _networkMode, argv: _argv, ...execution } = options;
  return fetchWithPolicy(requestUrl(authority, input), init, policy, fetcher, {
    ...execution,
    environment,
  });
}
