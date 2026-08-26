// @see https://bun.com/docs/runtime/networking/fetch — fetch / Bun.fetch
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
/**
 * Process-wide, reversible offline guard for Bun's userland network entrypoints.
 *
 * The only network destinations admitted are loopback test fixtures. Unix-domain
 * sockets are local IPC and are admitted as well. Everything else fails before
 * the captured runtime function is invoked.
 */

import dgram from 'node:dgram';
// eslint-disable-next-line no-restricted-imports -- sentinel patches the client API; it does not create a server.
import http from 'node:http';
import http2 from 'node:http2';
// eslint-disable-next-line no-restricted-imports -- sentinel patches the client API; it does not create a server.
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

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

function assertLoopback(api: OfflineSocketApi, hostname: string | undefined): void {
  const host = hostname?.trim() || 'localhost';
  if (!isOfflineLoopbackHost(host)) throw new OfflineSocketDeniedError(api, host);
}

function urlHostname(input: string | URL | Request): { hostname?: string; target: string } {
  const raw = input instanceof Request ? input.url : input;
  const url = raw instanceof URL ? raw : new URL(raw);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
    return { target: url.href };
  }
  return { hostname: url.hostname, target: url.host || url.href };
}

function assertFetchTarget(
  api: 'fetch' | 'fetch.preconnect',
  input: string | URL | Request,
  init?: RequestInit
) {
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

function assertRequestTarget(
  api: OfflineSocketApi,
  args: readonly (string | URL | object | undefined)[]
) {
  const { hostname, target } = requestTarget(args);
  if (hostname !== undefined) assertLoopback(api, hostname);
  else if (!target.startsWith('/')) assertLoopback(api, hostname);
}

function bunConnectHost(options: object): string | undefined {
  const target = options as { hostname?: string; unix?: string };
  return target.unix ? undefined : target.hostname;
}

type Restore = () => void;
let activeUninstall: (() => void) | undefined;
const PROXY_ENVIRONMENT = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
] as const;

function assertNoAmbientProxy(api: 'fetch' | 'fetch.preconnect'): void {
  const configured = PROXY_ENVIRONMENT.find(name => Bun.env[name]);
  if (configured) throw new OfflineSocketDeniedError(api, `ambient-proxy:${configured}`);
}

function replace<T extends object, K extends keyof T>(
  owner: T,
  key: K,
  replacement: T[K],
  restores: Restore[]
): void {
  const original = owner[key];
  owner[key] = replacement;
  restores.push(() => {
    if (owner[key] === replacement) owner[key] = original;
  });
}

/** Install the process-wide sentinel. Calling install twice is an error. */
export function installOfflineSocketSentinel(): () => void {
  if (activeUninstall) throw new Error('Offline socket sentinel is already installed');
  const restores: Restore[] = [];

  for (const name of PROXY_ENVIRONMENT) {
    const original = Bun.env[name];
    delete Bun.env[name];
    restores.push(() => {
      if (Bun.env[name] !== undefined) return;
      if (original !== undefined) Bun.env[name] = original;
    });
  }

  const originalFetch = globalThis.fetch;
  const guardedFetch = ((input: string | URL | Request, init?: RequestInit) => {
    assertNoAmbientProxy('fetch');
    assertFetchTarget('fetch', input, init);
    return originalFetch(input, init);
  }) as typeof fetch;
  const originalPreconnect = originalFetch.preconnect;
  guardedFetch.preconnect = url => {
    assertNoAmbientProxy('fetch.preconnect');
    assertFetchTarget('fetch.preconnect', url);
    originalPreconnect.call(originalFetch, url);
  };
  replace(globalThis, 'fetch', guardedFetch, restores);

  const originalBunConnect = Bun.connect;
  replace(
    Bun,
    'connect',
    ((options: Parameters<typeof Bun.connect>[0]) => {
      const hostname = bunConnectHost(options);
      if (hostname !== undefined) assertLoopback('Bun.connect', hostname);
      return originalBunConnect(options);
    }) as typeof Bun.connect,
    restores
  );

  const guardSocketCall = <T extends (...args: never[]) => unknown>(
    api: OfflineSocketApi,
    original: T
  ): T =>
    function (this: object, ...args: Parameters<T>) {
      assertNoSocketOverride(api, args);
      const hostname = socketHost(args);
      if (hostname !== undefined) assertLoopback(api, hostname);
      return original.apply(this, args);
    } as T;

  replace(net, 'connect', guardSocketCall('node:net.connect', net.connect), restores);
  replace(
    net,
    'createConnection',
    guardSocketCall('node:net.createConnection', net.createConnection),
    restores
  );
  replace(tls, 'connect', guardSocketCall('node:tls.connect', tls.connect), restores);

  const guardRequest = <T extends (...args: never[]) => unknown>(
    api: OfflineSocketApi,
    original: T
  ): T =>
    function (this: object, ...args: Parameters<T>) {
      assertNoSocketOverride(api, args);
      assertRequestTarget(api, args);
      return original.apply(this, args);
    } as T;

  replace(http, 'request', guardRequest('node:http.request', http.request), restores);
  replace(http, 'get', guardRequest('node:http.get', http.get), restores);
  replace(https, 'request', guardRequest('node:https.request', https.request), restores);
  replace(https, 'get', guardRequest('node:https.get', https.get), restores);
  replace(http2, 'connect', guardRequest('node:http2.connect', http2.connect), restores);

  const originalCreateSocket = dgram.createSocket;
  replace(
    dgram,
    'createSocket',
    function (this: typeof dgram, ...args: Parameters<typeof dgram.createSocket>) {
      const socket = originalCreateSocket.apply(this, args);
      const originalConnect = socket.connect;
      socket.connect = function (
        this: dgram.Socket,
        ...connectArgs: Parameters<typeof socket.connect>
      ) {
        const address = typeof connectArgs[1] === 'string' ? connectArgs[1] : undefined;
        assertLoopback('node:dgram.connect', address);
        return originalConnect.apply(this, connectArgs);
      } as unknown as typeof socket.connect;
      const originalSend = socket.send;
      socket.send = function (this: dgram.Socket, ...sendArgs: Parameters<typeof socket.send>) {
        const address = sendArgs.find((arg, index) => index > 0 && typeof arg === 'string') as
          string | undefined;
        if (address !== undefined) assertLoopback('node:dgram.send', address);
        return originalSend.apply(this, sendArgs);
      } as unknown as typeof socket.send;
      return socket;
    } as typeof dgram.createSocket,
    restores
  );

  let uninstalled = false;
  activeUninstall = () => {
    if (uninstalled) return;
    uninstalled = true;
    for (const restore of restores.reverse()) restore();
    activeUninstall = undefined;
  };
  return activeUninstall;
}
