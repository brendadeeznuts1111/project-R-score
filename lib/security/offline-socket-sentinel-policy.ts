export type OfflineSocketApi =
  | 'fetch'
  | 'fetch.preconnect'
  | 'Bun.connect'
  | 'node:net.connect'
  | 'node:net.createConnection'
  | 'node:tls.connect'
  | 'node:http.request'
  | 'node:http.get'
  | 'node:https.request'
  | 'node:https.get'
  | 'node:http2.connect'
  | 'node:dgram.connect'
  | 'node:dgram.send';

export class OfflineSocketDeniedError extends Error {
  readonly code = 'OFFLINE_SOCKET_DENIED';

  constructor(
    readonly api: OfflineSocketApi,
    readonly target: string
  ) {
    super(`Offline socket sentinel denied ${api} target ${target}`);
    this.name = 'OfflineSocketDeniedError';
  }
}

export const OFFLINE_PROXY_ENVIRONMENT = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
] as const;

/** Exact hostname policy; this performs no DNS lookup. */
export function isOfflineLoopbackHost(hostname: string): boolean {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (host === 'localhost' || host === '::1') return true;
  if (host.startsWith('::ffff:')) return isOfflineLoopbackHost(host.slice('::ffff:'.length));
  const octets = host.split('.');
  return (
    octets.length === 4 &&
    octets.every(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255) &&
    Number(octets[0]) === 127
  );
}

export function assertLoopback(api: OfflineSocketApi, hostname: string | undefined): void {
  const host = hostname?.trim() || 'localhost';
  if (!isOfflineLoopbackHost(host)) throw new OfflineSocketDeniedError(api, host);
}

export function assertNoAmbientProxy(api: 'fetch' | 'fetch.preconnect'): void {
  const configured = OFFLINE_PROXY_ENVIRONMENT.find(name => Bun.env[name]);
  if (configured) throw new OfflineSocketDeniedError(api, `ambient-proxy:${configured}`);
}

function urlHostname(input: string | URL | Request): { hostname?: string; target: string } {
  const raw = input instanceof Request ? input.url : input;
  const url = raw instanceof URL ? raw : new URL(raw);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
    return { target: url.href };
  }
  return { hostname: url.hostname, target: url.host || url.href };
}

export function assertFetchTarget(
  api: 'fetch' | 'fetch.preconnect',
  input: string | URL | Request,
  init?: RequestInit
): void {
  const proxy = (init as (RequestInit & { proxy?: string }) | undefined)?.proxy;
  if (proxy) throw new OfflineSocketDeniedError(api, `proxy:${proxy}`);
  const { hostname, target } = urlHostname(input);
  if (hostname !== undefined && !isOfflineLoopbackHost(hostname)) {
    throw new OfflineSocketDeniedError(api, target);
  }
}

function socketHost(args: readonly (string | number | object | undefined)[]): string | undefined {
  const first = args[0];
  if (typeof first === 'string') return undefined; // Unix-domain socket path.
  if (typeof first === 'object' && first !== null) {
    const options = first as {
      host?: string;
      hostname?: string;
      path?: string;
      socketPath?: string;
    };
    if (options.path || options.socketPath) return undefined;
    return options.host ?? options.hostname;
  }
  return typeof args[1] === 'string' ? args[1] : undefined;
}

function assertNoSocketOverride(
  api: OfflineSocketApi,
  args: readonly (string | number | URL | object | undefined)[]
): void {
  for (const arg of args) {
    if (typeof arg !== 'object' || arg === null || arg instanceof URL) continue;
    const options = arg as {
      agent?: object | ((...args: never[]) => unknown) | false;
      createConnection?: (...args: never[]) => unknown;
      lookup?: (...args: never[]) => unknown;
    };
    if (options.agent !== undefined && options.agent !== false) {
      throw new OfflineSocketDeniedError(api, 'custom-agent');
    }
    if (options.createConnection) {
      throw new OfflineSocketDeniedError(api, 'custom-createConnection');
    }
    if (options.lookup) throw new OfflineSocketDeniedError(api, 'custom-lookup');
  }
}

export function assertSocketTarget(
  api: OfflineSocketApi,
  args: readonly (string | number | URL | object | undefined)[]
): void {
  assertNoSocketOverride(api, args);
  const hostname = socketHost(args);
  if (hostname !== undefined) assertLoopback(api, hostname);
}

function requestTarget(args: readonly (string | URL | object | undefined)[]): {
  hostname?: string;
  target: string;
} {
  const first = args[0];
  if (typeof first === 'string' || first instanceof URL) {
    const url = first instanceof URL ? first : new URL(first);
    return { hostname: url.hostname, target: url.host || url.href };
  }
  const options = (first ?? {}) as {
    host?: string;
    hostname?: string;
    port?: string | number;
    path?: string;
    socketPath?: string;
  };
  if (options.socketPath) return { target: options.socketPath };
  const hostname = options.hostname ?? options.host;
  return { hostname, target: `${hostname ?? 'localhost'}:${options.port ?? ''}` };
}

export function assertRequestTarget(
  api: OfflineSocketApi,
  args: readonly (string | URL | object | undefined)[]
): void {
  assertNoSocketOverride(api, args);
  const { hostname, target } = requestTarget(args);
  if (hostname !== undefined) assertLoopback(api, hostname);
  else if (!target.startsWith('/')) assertLoopback(api, hostname);
}

export function bunConnectHost(options: object): string | undefined {
  const target = options as { hostname?: string; unix?: string };
  return target.unix ? undefined : target.hostname;
}
