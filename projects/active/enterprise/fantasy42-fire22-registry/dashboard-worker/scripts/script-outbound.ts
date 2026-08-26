import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../../../lib/http/outbound-policy.ts';
import {
  SCRIPT_OUTBOUND_CONTRACTS,
  type ScriptOutboundAuthority,
  type ScriptOutboundContract,
} from './script-outbound-contracts.ts';

export interface ScriptOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

const NETWORK_MODES = new Set<OutboundNetworkMode>([
  'online',
  'cached-only',
  'offline-no-socket',
]);

export function parseScriptNetworkMode(input: unknown): OutboundNetworkMode {
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
    throw new TypeError('Script outbound URL must be absolute');
  }
  if (url.username || url.password) throw new TypeError('Script outbound URL credentials denied');
  if (url.hash) throw new TypeError('Script outbound URL fragments denied');
  return url;
}

function findContract(url: URL, authority?: ScriptOutboundAuthority): ScriptOutboundContract {
  const candidates = SCRIPT_OUTBOUND_CONTRACTS.filter(contract =>
    authority ? contract.authority === authority : contract.origins.includes(url.origin)
  );
  const contract = candidates.find(
    candidate => candidate.origins.includes(url.origin) && candidate.path(url)
  );
  if (!contract) throw new Error('Script outbound authority or route is not allowlisted');
  return contract;
}

export function fetchScriptOutbound(
  authority: ScriptOutboundAuthority,
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: ScriptOutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input);
  const contract = findContract(url, authority);
  const method = (init.method ?? 'GET').toUpperCase();
  if ((method === 'GET' || method === 'HEAD') && init.body != null) {
    throw new TypeError(`${method} script outbound requests must not carry a body`);
  }
  const environment = options.environment ?? Bun.env;
  const policy: OutboundEndpointPolicy = {
    name: `fantasy42-script-${authority}`,
    allowedOrigins: contract.origins,
    allowedMethods: contract.methods,
    credentialMode: contract.credentialHeaders.length ? 'scoped' : 'forbid',
    credentialHeaders: contract.credentialHeaders,
    redirect: 'error',
    timeoutMs: contract.timeoutMs,
    totalDeadlineMs: contract.timeoutMs,
    responseByteLimit: contract.responseByteLimit,
    route: { mode: 'direct' },
    networkMode:
      options.networkMode ?? parseScriptNetworkMode(environment.FIRE22_NETWORK_MODE),
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: {
      mode: contract.allowLoopback ? 'allow-non-public' : 'public-only',
      enforcement: 'resolve-before-connect',
    },
    replayClass: method === 'GET' || method === 'HEAD' ? 'safe' : 'unsafe',
  };
  return fetchWithPolicy(url, init, policy, options.fetcher ?? fetch, {
    resolver: options.resolver,
    environment,
  });
}

export function fetchKnownScriptOutbound(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: ScriptOutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input);
  return fetchScriptOutbound(findContract(url).authority, url, init, options);
}
