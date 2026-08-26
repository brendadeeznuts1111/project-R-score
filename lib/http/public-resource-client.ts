import {
  fetchWithPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundEndpointPolicy,
  type OutboundNetworkMode,
} from './outbound-policy.ts';

export interface PublicResourceOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly responseByteLimit?: number;
  readonly timeoutMs?: number;
  readonly networkMode?: OutboundNetworkMode;
}

export function parsePublicResourceUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError('Public resource URL must be valid');
  }
  if (url.protocol !== 'https:') throw new TypeError('Public resource URL must use HTTPS');
  if (url.username || url.password)
    throw new TypeError('Public resource URL must not contain credentials');
  if (url.hash) throw new TypeError('Public resource URL must not contain a fragment');
  return url;
}

export function fetchPublicResource(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: PublicResourceOptions = {}
): Promise<Response> {
  const url = parsePublicResourceUrl(input);
  const policy: OutboundEndpointPolicy = {
    name: 'public-resource-read',
    allowedOrigins: [url.origin],
    allowedMethods: ['GET', 'HEAD'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: options.timeoutMs ?? 10_000,
    totalDeadlineMs: options.timeoutMs ?? 10_000,
    responseByteLimit: options.responseByteLimit ?? 2_000_000,
    route: { mode: 'direct' },
    networkMode: options.networkMode ?? 'online',
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    replayClass: 'safe',
  };
  return fetchWithPolicy(url, init, policy, options.fetcher, options);
}
