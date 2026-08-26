/** Typed Bun protocol client with replay-safe H2 fallback and expiring capability state. */

export type ProtocolRouteMode = 'direct' | 'env-proxy' | 'named-proxy';
export type ProtocolNetworkState = 'online' | 'cached-only' | 'offline-no-socket';
export type ProtocolPreference = 'h1' | 'h2-preferred';

export interface RecreatableRequestBody {
  readonly class: 'recreatable';
  readonly create: () => BodyInit;
}

export interface ProtocolFetchInit extends RequestInit {
  readonly forceHttp1?: boolean;
  readonly preference?: ProtocolPreference;
  readonly routeMode?: ProtocolRouteMode;
  readonly routeIdentity?: string;
  readonly proxyIdentity?: string;
  readonly tlsIdentity?: string;
  readonly networkState?: ProtocolNetworkState;
  readonly recreatableBody?: RecreatableRequestBody;
}

export interface ProtocolClientOptions {
  readonly fetcher?: (input: string | URL, init?: BunFetchRequestInit) => Promise<Response>;
  readonly capabilityTtlMs?: number;
  readonly now?: () => number;
}

type Capability = { readonly h2: boolean; readonly expiresAt: number };

function errorField(error: unknown, field: 'name' | 'code' | 'message'): unknown {
  return typeof error === 'object' && error !== null ? (error as Record<string, unknown>)[field] : undefined;
}

/** Bun's documented ALPN failure only; message fragments never authorize a replay. */
export function isExactHttp2Unsupported(error: unknown): boolean {
  if (
    errorField(error, 'code') === 'HTTP2Unsupported' ||
    errorField(error, 'name') === 'HTTP2Unsupported' ||
    errorField(error, 'message') === 'HTTP2Unsupported'
  ) return true;
  const cause = typeof error === 'object' && error !== null ? (error as { cause?: unknown }).cause : undefined;
  return cause !== undefined && cause !== error ? isExactHttp2Unsupported(cause) : false;
}

function normalizedOrigin(input: string | URL): string {
  const url = new URL(input.toString());
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return `${url.protocol}//${url.hostname}:${port}`;
}

function stableDimension(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  // Identities are labels, never credential-bearing proxy URLs.
  if (normalized.includes('@')) throw new TypeError('Protocol cache identities must not contain credentials');
  return normalized;
}

function cacheKey(input: string | URL, init: ProtocolFetchInit): string {
  return [
    normalizedOrigin(input),
    init.routeMode ?? 'direct',
    stableDimension(init.routeIdentity, 'default-route'),
    stableDimension(init.proxyIdentity, 'no-proxy'),
    stableDimension(init.tlsIdentity, 'default-tls'),
    init.preference ?? 'h2-preferred',
    init.networkState ?? 'online',
  ].join('\u001f');
}

function canFallback(method: string, body: RecreatableRequestBody | undefined): boolean {
  return ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method) || body?.class === 'recreatable';
}

function fetchInit(init: ProtocolFetchInit, protocol: 'http1.1' | 'http2'): BunFetchRequestInit {
  const {
    forceHttp1: _forceHttp1,
    preference: _preference,
    routeMode: _routeMode,
    routeIdentity: _routeIdentity,
    proxyIdentity: _proxyIdentity,
    tlsIdentity: _tlsIdentity,
    networkState: _networkState,
    recreatableBody,
    ...request
  } = init;
  return {
    ...request,
    ...(recreatableBody ? { body: recreatableBody.create() } : {}),
    protocol,
  };
}

export function createProtocolClient(options: ProtocolClientOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const ttlMs = options.capabilityTtlMs ?? 5 * 60_000;
  const now = options.now ?? Date.now;
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1) throw new TypeError('capabilityTtlMs must be a positive integer');
  const capabilities = new Map<string, Capability>();
  const discoveries = new Map<string, Promise<boolean | undefined>>();

  const protocolFetch = async (input: string | URL, init: ProtocolFetchInit = {}): Promise<Response> => {
    const url = new URL(input.toString());
    const networkState = init.networkState ?? 'online';
    if (networkState !== 'online') throw new Error(`Protocol client ${networkState} mode forbids network fetch`);
    if (init.recreatableBody && init.body !== undefined) throw new TypeError('Use recreatableBody instead of a one-shot body');
    const method = (init.method ?? 'GET').toUpperCase();
    const preference = init.forceHttp1 ? 'h1' : init.preference ?? 'h2-preferred';
    if (preference === 'h1' || url.protocol !== 'https:') return fetcher(url, fetchInit(init, 'http1.1'));

    const key = cacheKey(url, init);
    const cached = capabilities.get(key);
    if (cached && cached.expiresAt <= now()) capabilities.delete(key);
    const current = capabilities.get(key);
    if (current?.h2 === false) return fetcher(url, fetchInit(init, 'http1.1'));

    const pending = discoveries.get(key);
    if (!current && pending) {
      await pending;
      return protocolFetch(url, init);
    }

    let settleDiscovery: ((supported: boolean | undefined) => void) | undefined;
    if (!current) {
      discoveries.set(key, new Promise(resolve => { settleDiscovery = resolve; }));
    }

    try {
      const response = await fetcher(url, fetchInit(init, 'http2'));
      capabilities.set(key, { h2: true, expiresAt: now() + ttlMs });
      settleDiscovery?.(true);
      return response;
    } catch (error) {
      if (!isExactHttp2Unsupported(error)) {
        settleDiscovery?.(undefined);
        throw error;
      }
      capabilities.set(key, { h2: false, expiresAt: now() + ttlMs });
      settleDiscovery?.(false);
      if (!canFallback(method, init.recreatableBody)) throw error;
      return fetcher(url, fetchInit(init, 'http1.1'));
    } finally {
      if (settleDiscovery) discoveries.delete(key);
    }
  };

  protocolFetch.clear = (): void => {
    capabilities.clear();
    discoveries.clear();
  };
  return protocolFetch;
}

const defaultClient = createProtocolClient();

/** Compatibility entrypoint; unsafe writes are never transparently replayed. */
export function h2Fetch(url: string | URL, init: ProtocolFetchInit = {}): Promise<Response> {
  return defaultClient(url, init);
}

export function clearH2Cache(): void {
  defaultClient.clear();
}
