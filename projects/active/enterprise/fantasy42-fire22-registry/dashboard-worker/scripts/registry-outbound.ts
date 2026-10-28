import {
  fetchWithPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../../../lib/http/outbound-policy.ts';

export const FIRE22_REGISTRY_ORIGIN =
  'https://fire22-security-registry.nolarose1968-806.workers.dev';

export interface RegistryOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

const NETWORK_MODES = new Set<OutboundNetworkMode>([
  'online',
  'cached-only',
  'offline-no-socket',
]);

function registryNetworkMode(
  options: RegistryOutboundOptions,
  environment: Readonly<Record<string, string | undefined>>
): OutboundNetworkMode {
  const raw = options.networkMode ?? environment.FIRE22_NETWORK_MODE;
  if (raw === undefined || raw === '') return 'online';
  if (NETWORK_MODES.has(raw as OutboundNetworkMode)) {
    return raw as OutboundNetworkMode;
  }
  throw new TypeError(
    'FIRE22_NETWORK_MODE must be online, cached-only, or offline-no-socket'
  );
}

function registryToken(token: string): string {
  const normalized = token.trim();
  if (!normalized) throw new TypeError('Fire22 registry token is required');
  if (/\r|\n/.test(normalized)) {
    throw new TypeError('Fire22 registry token must not contain line breaks');
  }
  return normalized;
}

export function fetchFire22RegistryHealth(
  token: string,
  init: BunFetchRequestInit = {},
  options: RegistryOutboundOptions = {}
): Promise<Response> {
  if (init.body !== undefined && init.body !== null) {
    throw new Error('Fire22 registry health GET must not carry a body');
  }
  const suppliedHeaders = new Headers(init.headers);
  if (suppliedHeaders.has('authorization') || suppliedHeaders.has('cookie')) {
    throw new Error('Fire22 registry credentials are owned by the registry boundary');
  }
  suppliedHeaders.set('authorization', `Bearer ${registryToken(token)}`);
  suppliedHeaders.set('accept', 'application/json');

  const environment = options.environment ?? Bun.env;
  return fetchWithPolicy(
    `${FIRE22_REGISTRY_ORIGIN}/health`,
    { ...init, headers: suppliedHeaders },
    {
      name: 'fantasy42-fire22-registry-health',
      allowedOrigins: [FIRE22_REGISTRY_ORIGIN],
      allowedMethods: ['GET'],
      credentialMode: 'scoped',
      credentialHeaders: ['authorization'],
      redirect: 'error',
      timeoutMs: 10_000,
      totalDeadlineMs: 10_000,
      responseByteLimit: 1_000_000,
      route: { mode: 'direct' },
      networkMode: registryNetworkMode(options, environment),
      protocol: { allowed: ['auto'], default: 'auto' },
      ipAuthority: {
        mode: 'public-only',
        enforcement: 'resolve-before-connect',
      },
      replayClass: 'safe',
    },
    options.fetcher ?? fetch,
    {
      resolver: options.resolver,
      environment,
    }
  );
}
