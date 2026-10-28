import {
  fetchWithPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
  type OutboundReplayClass,
} from '../../../../../../../../../lib/http/outbound-policy.ts';

const REGISTRY_ORIGIN = 'https://fire22.workers.dev';
const REGISTRY_PREFIX = '/registry/';
const NETWORK_MODES = new Set<OutboundNetworkMode>([
  'online',
  'cached-only',
  'offline-no-socket',
]);

export interface RegistryOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

export function assertFire22RegistryBaseUrl(input: string): void {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TypeError('Fire22 registry URL must be valid');
  }
  if (
    url.origin !== REGISTRY_ORIGIN ||
    url.pathname !== REGISTRY_PREFIX ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new TypeError(`Fire22 registry URL must be ${REGISTRY_ORIGIN}${REGISTRY_PREFIX}`);
  }
}

function parseNetworkMode(
  input: unknown,
  environment: Readonly<Record<string, string | undefined>>
): OutboundNetworkMode {
  const value = input ?? environment.FIRE22_NETWORK_MODE ?? 'online';
  if (typeof value === 'string' && NETWORK_MODES.has(value as OutboundNetworkMode)) {
    return value as OutboundNetworkMode;
  }
  throw new TypeError('FIRE22_NETWORK_MODE must be online, cached-only, or offline-no-socket');
}

function parseRegistryUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError('Fire22 registry request URL must be valid');
  }
  if (
    url.origin !== REGISTRY_ORIGIN ||
    !url.pathname.startsWith(REGISTRY_PREFIX) ||
    url.pathname.includes('/../') ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new TypeError('Fire22 registry request escaped its fixed HTTPS authority');
  }
  return url;
}

function replayClass(method: string): OutboundReplayClass {
  return method === 'GET' || method === 'HEAD' ? 'safe' : 'unsafe';
}

export function fetchFire22Registry(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: RegistryOutboundOptions = {}
): Promise<Response> {
  const url = parseRegistryUrl(input);
  const method = (init.method ?? 'GET').toUpperCase();
  const environment = options.environment ?? Bun.env;
  const responseByteLimit = url.pathname.includes('/-/') ? 64 * 1024 * 1024 : 4 * 1024 * 1024;

  return fetchWithPolicy(
    url,
    init,
    {
      name: 'fantasy42-fire22-security-registry',
      allowedOrigins: [REGISTRY_ORIGIN],
      allowedMethods: ['GET', 'HEAD', 'PUT'],
      credentialMode: 'scoped',
      credentialHeaders: ['authorization'],
      redirect: 'error',
      timeoutMs: 30_000,
      totalDeadlineMs: 30_000,
      responseByteLimit,
      route: { mode: 'direct' },
      networkMode: parseNetworkMode(options.networkMode, environment),
      protocol: { allowed: ['auto'], default: 'auto' },
      ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
      replayClass: replayClass(method),
    },
    options.fetcher ?? fetch,
    { ...(options.resolver ? { resolver: options.resolver } : {}), environment }
  );
}
