// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables
// @see https://bun.com/docs/runtime/networking/fetch — Bun fetch extensions
import {
  evaluateControlPolicy,
  type ControlGrant,
  type ControlProfile,
} from '../security/control-policy.ts';
import { isIP } from 'node:net';
import {
  assertPublicAuthorityAddresses,
  resolveAuthorityAddresses,
  type AuthorityAddressResolver,
} from './ip-authority.ts';

const STANDARD_CREDENTIAL_HEADERS = [
  'authorization',
  'api-key',
  'cookie',
  'proxy-authorization',
  'x-api-key',
] as const;
const DENIED_BUN_FETCH_EXTENSIONS = ['s3', 'verbose', 'decompress'] as const;

export type OutboundCredentialMode = 'forbid' | 'scoped';
export type OutboundRedirectMode = 'error' | 'manual';
export type OutboundNetworkMode = 'online' | 'cached-only' | 'offline-no-socket';
export type OutboundReplayClass = 'safe' | 'idempotent' | 'unsafe-recreatable' | 'unsafe';
export type OutboundProtocol = 'auto' | 'h1' | 'h2' | 'h3';
export type OutboundFetch = (input: string | URL, init?: BunFetchRequestInit) => Promise<Response>;

export type OutboundRoutePolicy =
  | { readonly mode: 'direct' }
  | { readonly mode: 'env-proxy'; readonly allowedProxyOrigins: readonly string[] }
  | { readonly mode: 'named-proxy'; readonly proxy: string };

export interface OutboundIpAuthorityPolicy {
  readonly mode: 'public-only' | 'allow-non-public';
  /** Named proxies resolve final destinations and must own an equivalent check. */
  readonly enforcement: 'resolve-before-connect' | 'proxy-delegated';
}

export interface OutboundProtocolPolicy {
  readonly allowed: readonly OutboundProtocol[];
  readonly default: OutboundProtocol;
}

export interface OutboundEndpointPolicy {
  readonly name: string;
  readonly allowedOrigins: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly credentialMode: OutboundCredentialMode;
  readonly credentialHeaders?: readonly string[];
  readonly redirect: OutboundRedirectMode;
  readonly timeoutMs: number;
  readonly totalDeadlineMs?: number;
  readonly responseByteLimit?: number;
  readonly route?: OutboundRoutePolicy;
  readonly networkMode?: OutboundNetworkMode;
  readonly protocol?: OutboundProtocolPolicy;
  readonly ipAuthority?: OutboundIpAuthorityPolicy;
  readonly replayClass?: OutboundReplayClass;
  readonly controlProfile?: ControlProfile;
  readonly controlGrants?: readonly ControlGrant[];
}

export interface PreparedOutboundRequest {
  readonly url: URL;
  readonly init: BunFetchRequestInit;
  readonly policy: OutboundEndpointPolicy;
  readonly route: OutboundRoutePolicy;
  readonly networkMode: OutboundNetworkMode;
  readonly protocol: OutboundProtocol;
  readonly replayClass: OutboundReplayClass;
}

export interface OutboundExecutionOptions {
  readonly resolver?: AuthorityAddressResolver;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export function isNormalizedLoopbackHostname(input: string): boolean {
  const bracketless = input.replace(/^\[|\]$/g, '').toLowerCase();
  const host = bracketless.endsWith('.') ? bracketless.slice(0, -1) : bracketless;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1') return true;
  return host.split('.')[0] === '127' && /^127(?:\.\d{1,3}){3}$/.test(host);
}

function parseHttpUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError('Outbound endpoint must be a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new TypeError('Outbound endpoint must use HTTP or HTTPS');
  if (url.username || url.password)
    throw new TypeError('Outbound endpoint URL must not contain credentials');
  return url;
}

function parsePolicyOrigin(input: string): string {
  const url = parseHttpUrl(input);
  if (url.pathname !== '/' || url.search || url.hash)
    throw new TypeError('Outbound policy origins must not contain a path, query, or fragment');
  return url.origin;
}

function assertPositiveInteger(value: number, label: string, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new TypeError(`Outbound policy ${name} requires a positive integer ${label}`);
}

function assertPolicy(policy: OutboundEndpointPolicy): void {
  if (!policy.name.trim()) throw new TypeError('Outbound policy name is required');
  if (!policy.allowedOrigins.length)
    throw new TypeError(`Outbound policy ${policy.name} requires at least one allowed origin`);
  if (!policy.allowedMethods.length)
    throw new TypeError(`Outbound policy ${policy.name} requires at least one allowed method`);
  assertPositiveInteger(policy.timeoutMs, 'timeoutMs', policy.name);
  if (policy.totalDeadlineMs !== undefined) {
    assertPositiveInteger(policy.totalDeadlineMs, 'totalDeadlineMs', policy.name);
    if (policy.totalDeadlineMs > policy.timeoutMs)
      throw new TypeError(`Outbound policy ${policy.name} totalDeadlineMs cannot exceed timeoutMs`);
  }
  if (policy.responseByteLimit !== undefined)
    assertPositiveInteger(policy.responseByteLimit, 'responseByteLimit', policy.name);
  if (policy.protocol && !policy.protocol.allowed.includes(policy.protocol.default))
    throw new TypeError(`Outbound policy ${policy.name} protocol default must be allowed`);
  if (policy.route?.mode === 'named-proxy') parsePolicyOrigin(policy.route.proxy);
  if (
    policy.route?.mode === 'named-proxy' &&
    policy.ipAuthority?.enforcement === 'resolve-before-connect'
  ) {
    throw new TypeError(
      `Outbound policy ${policy.name} named proxy must use proxy-delegated IP enforcement`
    );
  }
}

function boundedSignal(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function parseProtocolOverride(value: unknown): OutboundProtocol | undefined {
  if (value === undefined) return undefined;
  if (value === 'h1' || value === 'http1.1') return 'h1';
  if (value === 'h2' || value === 'http2') return 'h2';
  if (value === 'h3' || value === 'http3') return 'h3';
  return undefined;
}

function protocolWire(protocol: OutboundProtocol): BunFetchRequestInit['protocol'] | undefined {
  return protocol === 'h1' ? 'http1.1' : protocol === 'h2' ? 'http2' : undefined;
}

function requestExtensionRecord(init: BunFetchRequestInit): Record<string, unknown> {
  const record = init as BunFetchRequestInit & Record<string, unknown>;
  return Object.fromEntries(
    ['proxy', 'unix', 'tls', 'protocol'].flatMap(key =>
      record[key] === undefined ? [] : [[key, record[key]]]
    )
  );
}

function evaluateExtensions(
  init: BunFetchRequestInit,
  policy: OutboundEndpointPolicy,
  route: OutboundRoutePolicy,
  protocol: OutboundProtocol
): BunFetchRequestInit {
  const record = init as BunFetchRequestInit & Record<string, unknown>;
  for (const extension of DENIED_BUN_FETCH_EXTENSIONS) {
    if (record[extension] !== undefined)
      throw new Error(`Outbound Bun fetch extension ${extension} is denied by ${policy.name}`);
  }
  if (record.proxy !== undefined)
    throw new Error(
      `Outbound request proxy cannot override the ${route.mode} route owned by ${policy.name}`
    );
  if (protocol === 'h3') throw new Error('Outbound HTTP/3 requires the canary protocol client');
  const ownedInit: BunFetchRequestInit = { ...init };
  if (route.mode === 'named-proxy') ownedInit.proxy = route.proxy;
  const wire = protocolWire(protocol);
  if (wire) ownedInit.protocol = wire;
  const evaluated = evaluateControlPolicy({
    profile: policy.controlProfile ?? 'production',
    command: 'runtime',
    request: requestExtensionRecord(ownedInit),
    grants: policy.controlGrants ?? [],
  });
  if (!evaluated.ok) {
    const first = evaluated.rejected[0];
    throw new Error(
      `Outbound request extension is denied by ${policy.name}: ${first?.control ?? first?.spelling} (${first?.code})`
    );
  }
  return ownedInit;
}

export function prepareOutboundRequest(
  input: string | URL,
  init: BunFetchRequestInit,
  policy: OutboundEndpointPolicy
): PreparedOutboundRequest {
  assertPolicy(policy);
  const url = parseHttpUrl(input);
  if (!policy.allowedOrigins.map(parsePolicyOrigin).includes(url.origin))
    throw new Error(`Outbound endpoint origin is not allowed by ${policy.name}`);
  const method = (init.method ?? 'GET').toUpperCase();
  if (!policy.allowedMethods.map(value => value.toUpperCase()).includes(method))
    throw new Error(`Outbound method ${method} is not allowed by ${policy.name}`);
  if (init.redirect && init.redirect !== policy.redirect)
    throw new Error(`Outbound redirect mode cannot override ${policy.name}`);
  if (init.credentials && init.credentials !== 'omit')
    throw new Error(`Outbound ambient credentials are forbidden by ${policy.name}`);
  const headers = new Headers(init.headers);
  const declared = (policy.credentialHeaders ?? []).map(value => value.toLowerCase());
  const allowed = new Set(policy.credentialMode === 'scoped' ? declared : []);
  const credentialHeaders = new Set([...STANDARD_CREDENTIAL_HEADERS, ...declared]);
  if ([...credentialHeaders].some(header => headers.has(header) && !allowed.has(header)))
    throw new Error(`Outbound credentials are forbidden by ${policy.name}`);
  const route = policy.route ?? { mode: 'direct' as const };
  const rawProtocol = (init as BunFetchRequestInit).protocol;
  const requested = parseProtocolOverride(rawProtocol);
  if (rawProtocol !== undefined && !requested)
    throw new Error(`Outbound protocol override is invalid for ${policy.name}`);
  const protocol = requested ?? policy.protocol?.default ?? 'auto';
  if (policy.protocol && !policy.protocol.allowed.includes(protocol))
    throw new Error(`Outbound protocol ${protocol} is not allowed by ${policy.name}`);
  const ownedInit = evaluateExtensions(init, policy, route, protocol);
  return {
    url,
    policy,
    route,
    protocol,
    networkMode: policy.networkMode ?? 'online',
    replayClass:
      policy.replayClass ??
      (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method) ? 'safe' : 'unsafe'),
    init: {
      ...ownedInit,
      method,
      headers,
      credentials: 'omit',
      redirect: policy.redirect,
      signal: boundedSignal(init.signal, policy.totalDeadlineMs ?? policy.timeoutMs),
    },
  };
}

function activeEnvironmentProxy(
  url: URL,
  environment: Readonly<Record<string, string | undefined>>
): string | undefined {
  const bypass = environment.no_proxy || environment.NO_PROXY || '';
  if (
    bypass
      .split(',')
      .map(value => value.trim())
      .includes('*')
  )
    return undefined;
  const raw =
    url.protocol === 'https:'
      ? environment.https_proxy || environment.HTTPS_PROXY
      : environment.http_proxy || environment.HTTP_PROXY;
  return raw?.trim() || undefined;
}

function assertRouteEnvironment(
  request: PreparedOutboundRequest,
  environment: Readonly<Record<string, string | undefined>>
): void {
  const active = activeEnvironmentProxy(request.url, environment);
  if (request.route.mode === 'direct' && active)
    throw new Error(
      `Outbound direct route ${request.policy.name} is blocked by active proxy environment`
    );
  if (request.route.mode !== 'env-proxy') return;
  if (!active)
    throw new Error(`Outbound env-proxy route ${request.policy.name} requires an active proxy`);
  const origin = parsePolicyOrigin(active);
  if (!request.route.allowedProxyOrigins.map(parsePolicyOrigin).includes(origin))
    throw new Error(`Outbound environment proxy origin is not allowed by ${request.policy.name}`);
  const evaluated = evaluateControlPolicy({
    profile: request.policy.controlProfile ?? 'production',
    command: 'runtime',
    request: { proxy: active },
    grants: request.policy.controlGrants ?? [],
  });
  if (!evaluated.ok)
    throw new Error(`Outbound environment proxy lacks an exact grant for ${request.policy.name}`);
}

async function assertIpAuthority(
  request: PreparedOutboundRequest,
  resolver: AuthorityAddressResolver
): Promise<void> {
  const policy = request.policy.ipAuthority;
  if (!policy || policy.mode === 'allow-non-public' || policy.enforcement === 'proxy-delegated')
    return;
  const hostname = request.url.hostname.replace(/^\[|\]$/g, '');
  const family = isIP(hostname);
  const rows = family
    ? [{ address: hostname, family: family as 4 | 6, ttl: 0, source: 'literal' as const }]
    : await resolver(hostname);
  assertPublicAuthorityAddresses(request.url.hostname, rows);
}

function boundResponse(response: Response, limit: number | undefined, name: string): Response {
  if (limit === undefined) return response;
  const declared = response.headers.get('content-length');
  if (declared !== null && Number(declared) > limit) {
    response.body?.cancel().catch(() => {});
    throw new Error(`Outbound response exceeds ${limit} bytes for ${name}`);
  }
  if (!response.body) return response;
  let observed = 0;
  const body = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        observed += chunk.byteLength;
        if (observed > limit)
          return controller.error(
            new Error(`Outbound response exceeds ${limit} bytes for ${name}`)
          );
        controller.enqueue(chunk);
      },
    })
  );
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export function fetchWithPolicy(
  input: string | URL,
  init: BunFetchRequestInit,
  policy: OutboundEndpointPolicy,
  fetcher: OutboundFetch = fetch,
  options: OutboundExecutionOptions = {}
): Promise<Response> {
  const request = prepareOutboundRequest(input, init, policy);
  if (request.networkMode !== 'online')
    throw new Error(`Outbound ${request.networkMode} policy ${policy.name} forbids network fetch`);
  assertRouteEnvironment(request, options.environment ?? Bun.env);
  const resolver = options.resolver ?? (hostname => resolveAuthorityAddresses(hostname));
  return assertIpAuthority(request, resolver)
    .then(() => fetcher(request.url, request.init))
    .then(response => boundResponse(response, policy.responseByteLimit, policy.name));
}
