// @see https://bun.com/docs/runtime/networking/fetch — fetch / Bun.fetch
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
import dgram from 'node:dgram';
// eslint-disable-next-line no-restricted-imports -- sentinel patches the client API; it does not create a server.
import http from 'node:http';
import http2 from 'node:http2';
// eslint-disable-next-line no-restricted-imports -- sentinel patches the client API; it does not create a server.
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

import {
  assertFetchTarget,
  assertLoopback,
  assertNoAmbientProxy,
  assertRequestTarget,
  assertSocketTarget,
  bunConnectHost,
  OFFLINE_PROXY_ENVIRONMENT,
  type OfflineSocketApi,
} from './offline-socket-sentinel-policy.ts';

type Restore = () => void;
let activeUninstall: (() => void) | undefined;

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

function patchFetch(restores: Restore[]): void {
  const original = globalThis.fetch;
  const guarded = ((input: string | URL | Request, init?: RequestInit) => {
    assertNoAmbientProxy('fetch');
    assertFetchTarget('fetch', input, init);
    return original(input, init);
  }) as typeof fetch;
  const originalPreconnect = original.preconnect;
  guarded.preconnect = url => {
    assertNoAmbientProxy('fetch.preconnect');
    assertFetchTarget('fetch.preconnect', url);
    originalPreconnect.call(original, url);
  };
  replace(globalThis, 'fetch', guarded, restores);
}

function patchBunConnect(restores: Restore[]): void {
  const original = Bun.connect;
  replace(
    Bun,
    'connect',
    ((options: Parameters<typeof Bun.connect>[0]) => {
      const hostname = bunConnectHost(options);
      if (hostname !== undefined) assertLoopback('Bun.connect', hostname);
      return original(options);
    }) as typeof Bun.connect,
    restores
  );
}

function guardSocketCall<T extends (...args: never[]) => unknown>(
  api: OfflineSocketApi,
  original: T
): T {
  return function (this: object, ...args: Parameters<T>) {
    assertSocketTarget(api, args);
    return original.apply(this, args);
  } as T;
}

function patchSocketClients(restores: Restore[]): void {
  replace(net, 'connect', guardSocketCall('node:net.connect', net.connect), restores);
  replace(
    net,
    'createConnection',
    guardSocketCall('node:net.createConnection', net.createConnection),
    restores
  );
  replace(tls, 'connect', guardSocketCall('node:tls.connect', tls.connect), restores);
}

function guardRequest<T extends (...args: never[]) => unknown>(
  api: OfflineSocketApi,
  original: T
): T {
  return function (this: object, ...args: Parameters<T>) {
    assertRequestTarget(api, args);
    return original.apply(this, args);
  } as T;
}

function patchRequests(restores: Restore[]): void {
  replace(http, 'request', guardRequest('node:http.request', http.request), restores);
  replace(http, 'get', guardRequest('node:http.get', http.get), restores);
  replace(https, 'request', guardRequest('node:https.request', https.request), restores);
  replace(https, 'get', guardRequest('node:https.get', https.get), restores);
  replace(http2, 'connect', guardRequest('node:http2.connect', http2.connect), restores);
}

function patchDatagram(restores: Restore[]): void {
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
}

/** Install the process-wide sentinel. Calling install twice is an error. */
export function installOfflineSocketSentinel(): () => void {
  if (activeUninstall) throw new Error('Offline socket sentinel is already installed');
  const restores: Restore[] = [];
  for (const name of OFFLINE_PROXY_ENVIRONMENT) {
    const original = Bun.env[name];
    delete Bun.env[name];
    restores.push(() => {
      if (Bun.env[name] !== undefined) return;
      if (original !== undefined) Bun.env[name] = original;
    });
  }
  patchFetch(restores);
  patchBunConnect(restores);
  patchSocketClients(restores);
  patchRequests(restores);
  patchDatagram(restores);

  let uninstalled = false;
  activeUninstall = () => {
    if (uninstalled) return;
    uninstalled = true;
    for (const restore of restores.reverse()) restore();
    activeUninstall = undefined;
  };
  return activeUninstall;
}
