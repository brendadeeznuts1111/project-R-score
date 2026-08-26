import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../../lib/http/outbound-policy.ts';

export type FactoryRegistryOutboundKind =
  | 'local-dashboard'
  | 'npm-registry'
  | 'unpkg-readme'
  | 'rss-feed'
  | 'duoplus-api'
  | 'webhook';

export interface FactoryRegistryOutboundAuthority {
  readonly kind: FactoryRegistryOutboundKind;
  readonly configuredUrl: string;
  readonly origin: string;
  readonly pathPrefix: string;
  readonly exactUrl: boolean;
}

export interface FactoryRegistryOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

const FIXED_NPM_ORIGIN = 'https://registry.npmjs.org';
const FIXED_UNPKG_ORIGIN = 'https://unpkg.com';

function parseCredentialFreeHttpUrl(input: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TypeError(`${label} must be a valid URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError(`${label} must use HTTP or HTTPS`);
  }
  if (url.username || url.password) {
    throw new TypeError(`${label} must not contain URL credentials`);
  }
  return url;
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isHttpLoopback(url: URL): boolean {
  return url.protocol === 'http:' && isNormalizedLoopbackHostname(url.hostname);
}

function assertHttpsOrLoopback(url: URL, label: string): void {
  if (url.protocol !== 'https:' && !isHttpLoopback(url)) {
    throw new TypeError(`${label} must use HTTPS or HTTP loopback`);
  }
}

export function createFactoryRegistryOutboundAuthority(
  kind: FactoryRegistryOutboundKind,
  configuredUrl: string
): FactoryRegistryOutboundAuthority {
  const url = parseCredentialFreeHttpUrl(configuredUrl, `Factory registry ${kind} authority`);
  if (url.hash) throw new TypeError(`Factory registry ${kind} authority must not contain a fragment`);

  if (kind === 'local-dashboard') {
    if (!isHttpLoopback(url)) {
      throw new TypeError('Factory registry dashboard authority must use HTTP loopback');
    }
    if ((url.pathname !== '/dashboard' && url.pathname !== '/avatar') || url.search) {
      throw new TypeError('Factory registry dashboard authority must use an owned dashboard path');
    }
    return {
      kind,
      configuredUrl: withoutTrailingSlash(url.toString()),
      origin: url.origin,
      pathPrefix: '/',
      exactUrl: true,
    };
  }

  if (kind === 'npm-registry') {
    if (url.origin !== FIXED_NPM_ORIGIN && !isHttpLoopback(url)) {
      throw new TypeError(
        `Factory registry npm authority must use ${FIXED_NPM_ORIGIN} or HTTP loopback`
      );
    }
    if (url.origin === FIXED_NPM_ORIGIN && (url.pathname !== '/' || url.search)) {
      throw new TypeError('Factory registry npm production authority must use its origin root');
    }
  } else if (kind === 'unpkg-readme') {
    if (url.origin !== FIXED_UNPKG_ORIGIN || url.pathname !== '/' || url.search) {
      throw new TypeError(`Factory registry README authority must use ${FIXED_UNPKG_ORIGIN}`);
    }
  } else {
    assertHttpsOrLoopback(url, `Factory registry ${kind} authority`);
    if (kind === 'duoplus-api' && url.search) {
      throw new TypeError('Factory registry DuoPlus authority must not contain a query');
    }
  }

  const exactUrl = kind === 'rss-feed' || kind === 'webhook';
  return {
    kind,
    configuredUrl: exactUrl ? url.toString() : withoutTrailingSlash(url.toString()),
    origin: url.origin,
    pathPrefix: url.pathname.replace(/\/+$/, '') || '/',
    exactUrl,
  };
}

function revalidateAuthority(
  authority: FactoryRegistryOutboundAuthority
): FactoryRegistryOutboundAuthority {
  return createFactoryRegistryOutboundAuthority(authority.kind, authority.configuredUrl);
}

function assertRequestWithinAuthority(
  authority: FactoryRegistryOutboundAuthority,
  url: URL
): void {
  if (url.username || url.password || url.hash) {
    throw new Error('Factory registry outbound request contains forbidden URL state');
  }
  if (url.origin !== authority.origin) {
    throw new Error(`Factory registry ${authority.kind} request escaped its exact origin`);
  }
  if (authority.exactUrl) {
    if (url.toString() !== authority.configuredUrl) {
      throw new Error(`Factory registry ${authority.kind} request escaped its exact URL`);
    }
    return;
  }
  const prefix = authority.pathPrefix === '/' ? '' : authority.pathPrefix;
  if (prefix && url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) {
    throw new Error(`Factory registry ${authority.kind} request escaped its path prefix`);
  }
  if (
    authority.kind === 'local-dashboard' &&
    url.pathname !== '/dashboard' &&
    url.pathname !== '/avatar'
  ) {
    throw new Error('Factory registry dashboard request is not an owned dashboard path');
  }
  const ownedDuoPath = `${prefix}/api/v1/cloudPhone/info`;
  if (authority.kind === 'duoplus-api' && url.pathname !== ownedDuoPath) {
    throw new Error('Factory registry DuoPlus request is not the owned device-info path');
  }
}

function policyFor(
  authority: FactoryRegistryOutboundAuthority,
  method: string,
  networkMode: OutboundNetworkMode
): OutboundEndpointPolicy {
  const isPost = authority.kind === 'duoplus-api' || authority.kind === 'webhook';
  const credentialHeaders =
    authority.kind === 'duoplus-api' || authority.kind === 'webhook'
      ? ['authorization', 'x-api-key']
      : undefined;
  return {
    name: `factory-registry-${authority.kind}`,
    allowedOrigins: [authority.origin],
    allowedMethods: isPost ? ['POST'] : ['GET', 'HEAD'],
    credentialMode: credentialHeaders ? 'scoped' : 'forbid',
    credentialHeaders,
    redirect: 'error',
    timeoutMs: authority.kind === 'local-dashboard' ? 1_000 : 10_000,
    totalDeadlineMs: authority.kind === 'local-dashboard' ? 1_000 : 10_000,
    responseByteLimit: authority.kind === 'rss-feed' ? 2 * 1024 * 1024 : 8 * 1024 * 1024,
    route: { mode: 'direct' },
    networkMode,
    protocol: { allowed: ['auto', 'h1', 'h2'], default: 'auto' },
    ipAuthority: {
      mode: isHttpLoopback(new URL(authority.origin)) ? 'allow-non-public' : 'public-only',
      enforcement: 'resolve-before-connect',
    },
    replayClass: method === 'GET' || method === 'HEAD' ? 'safe' : 'unsafe',
  };
}

export function fetchFactoryRegistryOutbound(
  authorityInput: FactoryRegistryOutboundAuthority,
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: FactoryRegistryOutboundOptions = {}
): Promise<Response> {
  const authority = revalidateAuthority(authorityInput);
  const url = input instanceof URL ? input : new URL(input);
  assertRequestWithinAuthority(authority, url);
  const method = (init.method ?? 'GET').toUpperCase();
  const { fetcher = fetch, networkMode = 'online', ...execution } = options;
  return fetchWithPolicy(url, init, policyFor(authority, method, networkMode), fetcher, execution);
}
