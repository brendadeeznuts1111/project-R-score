import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../../lib/http/outbound-policy.ts';

const BUN_CATALOG_ORIGIN = 'https://api.buncatalog.com';
const BUN_CATALOG_ROUTES = [
  '/v1/audit',
  '/v1/audit/batch',
  '/v1/infrastructure/status',
  '/v1/security/violation',
  '/v1/threat',
] as const;

export type BunCatalogRoute = (typeof BUN_CATALOG_ROUTES)[number];

export interface BunCatalogExecutionOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

function parseBunCatalogRoute(value: string): BunCatalogRoute {
  if (!(BUN_CATALOG_ROUTES as readonly string[]).includes(value)) {
    throw new Error('Kal Poly Bot Bun catalog route is not allowed');
  }
  return value as BunCatalogRoute;
}

function policyFor(route: BunCatalogRoute, networkMode: OutboundNetworkMode): OutboundEndpointPolicy {
  const statusRead = route === '/v1/infrastructure/status';
  return {
    name: statusRead ? 'kal-poly-bun-catalog-status' : 'kal-poly-bun-catalog-telemetry',
    allowedOrigins: [BUN_CATALOG_ORIGIN],
    allowedMethods: [statusRead ? 'GET' : 'POST'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 5_000,
    totalDeadlineMs: 5_000,
    responseByteLimit: 64 * 1024,
    route: { mode: 'direct' },
    networkMode,
    protocol: { allowed: ['auto', 'h1', 'h2'], default: 'auto' },
    ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    replayClass: statusRead ? 'safe' : 'unsafe',
  };
}

/**
 * Exact, credential-free authority for the fixed Bun catalog service.
 *
 * Telemetry writes are deliberately `unsafe`: this boundary never retries a
 * rejected or ambiguous write. Callers must not reconstruct an arbitrary URL.
 */
export async function fetchBunCatalog(
  routeInput: BunCatalogRoute,
  init: BunFetchRequestInit = {},
  options: BunCatalogExecutionOptions = {}
): Promise<Response> {
  const route = parseBunCatalogRoute(routeInput);
  const url = new URL(route, BUN_CATALOG_ORIGIN);
  const { fetcher = fetch, networkMode = 'online', ...execution } = options;
  return await fetchWithPolicy(url, init, policyFor(route, networkMode), fetcher, execution);
}
