import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../../../../lib/http/outbound-policy.ts';

export interface FactoryR2Authority {
  readonly accountId: string;
  readonly origin: string;
}

export interface FactoryR2ExecutionOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

export interface FactoryR2Request {
  readonly bucket: string;
  readonly key?: string;
  readonly query?: Readonly<Record<string, string>>;
  readonly init?: BunFetchRequestInit;
}

const ACCOUNT_ID = /^[a-f0-9]{32}$/i;
const BUCKET = /^(?!.*\.\.)(?!.*--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

export function createFactoryR2Authority(
  accountId: string,
  configuredEndpoint?: string
): FactoryR2Authority {
  const normalizedAccount = accountId.trim().toLowerCase();
  if (!ACCOUNT_ID.test(normalizedAccount)) {
    throw new TypeError('Factory registry R2 authority requires a 32-character account id');
  }
  const origin = `https://${normalizedAccount}.r2.cloudflarestorage.com`;
  if (configuredEndpoint !== undefined) {
    let configured: URL;
    try {
      configured = new URL(configuredEndpoint);
    } catch {
      throw new TypeError('Factory registry R2 endpoint must be a valid URL');
    }
    if (
      configured.origin !== origin ||
      configured.pathname !== '/' ||
      configured.search ||
      configured.hash ||
      configured.username ||
      configured.password
    ) {
      throw new TypeError('Factory registry R2 endpoint must match its canonical account origin');
    }
  }
  return { accountId: normalizedAccount, origin };
}

function assertBucket(bucket: string): void {
  if (!BUCKET.test(bucket)) throw new TypeError('Factory registry R2 bucket is invalid');
}

function assertKey(key: string): void {
  let decodedSegments: string[];
  try {
    decodedSegments = key.split('/').map(segment => decodeURIComponent(segment));
  } catch {
    throw new TypeError('Factory registry R2 object key is invalid');
  }
  if (
    !key ||
    key.startsWith('/') ||
    key.includes('\\') ||
    key.includes('?') ||
    key.includes('#') ||
    decodedSegments.some(segment => segment === '.' || segment === '..') ||
    /[\u0000-\u001f\u007f]/.test(key)
  ) {
    throw new TypeError('Factory registry R2 object key is invalid');
  }
}

function requestUrl(authority: FactoryR2Authority, request: FactoryR2Request): URL {
  createFactoryR2Authority(authority.accountId, authority.origin);
  assertBucket(request.bucket);
  if (request.key !== undefined) assertKey(request.key);
  const url = new URL(`/${request.bucket}${request.key ? `/${request.key}` : ''}`, authority.origin);
  const bucketPath = `/${request.bucket}`;
  if (url.pathname !== bucketPath && !url.pathname.startsWith(`${bucketPath}/`)) {
    throw new TypeError('Factory registry R2 object key escapes its bucket');
  }
  for (const [name, value] of Object.entries(request.query ?? {})) {
    if (!name || /[\u0000-\u001f\u007f]/.test(name + value)) {
      throw new TypeError('Factory registry R2 query is invalid');
    }
    url.searchParams.set(name, value);
  }
  return url;
}

export async function fetchFactoryR2(
  authority: FactoryR2Authority,
  request: FactoryR2Request,
  options: FactoryR2ExecutionOptions = {}
): Promise<Response> {
  const { fetcher = fetch, networkMode = 'online', ...execution } = options;
  const init = request.init ?? {};
  const method = (init.method ?? 'GET').toUpperCase();
  const policy = {
    name: 'factory-registry-r2-object-store',
    allowedOrigins: [authority.origin],
    allowedMethods: ['GET', 'HEAD', 'PUT', 'DELETE'],
    credentialMode: 'scoped',
    credentialHeaders: ['authorization'],
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 8 * 1024 * 1024,
    route: { mode: 'direct' },
    networkMode,
    protocol: { allowed: ['auto', 'h1', 'h2'], default: 'auto' },
    ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    replayClass: method === 'GET' || method === 'HEAD' ? 'safe' : 'unsafe',
  } as const satisfies OutboundEndpointPolicy;
  return await fetchWithPolicy(requestUrl(authority, request), init, policy, fetcher, execution);
}
