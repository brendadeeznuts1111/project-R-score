import { afterEach, describe, expect, test } from 'bun:test';
import dgram from 'node:dgram';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

import {
  installOfflineSocketSentinel,
  isOfflineLoopbackHost,
  OfflineSocketDeniedError,
} from '../lib/security/offline-socket-sentinel.ts';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
});

function expectDenied(run: () => unknown, api: string): void {
  expect(run).toThrow(OfflineSocketDeniedError);
  expect(run).toThrow(`Offline socket sentinel denied ${api} target`);
}

describe('offline socket sentinel', () => {
  test('defines the exact no-DNS loopback allow policy', () => {
    for (const host of [
      'localhost',
      'LOCALHOST.',
      '127.0.0.1',
      '127.255.255.254',
      '::1',
      '[::1]',
      '::ffff:127.0.0.1',
    ]) {
      expect(isOfflineLoopbackHost(host)).toBe(true);
    }
    for (const host of ['example.com', 'localhost.example', '0.0.0.0', '10.0.0.1', '::', 'fe80::1']) {
      expect(isOfflineLoopbackHost(host)).toBe(false);
    }
  });

  test('denies every covered external entrypoint before its captured function runs', () => {
    const calls: string[] = [];
    const originals = {
      fetch: globalThis.fetch,
      bunConnect: Bun.connect,
      netConnect: net.connect,
      netCreateConnection: net.createConnection,
      tlsConnect: tls.connect,
      httpRequest: http.request,
      httpGet: http.get,
      httpsRequest: https.request,
      httpsGet: https.get,
      http2Connect: http2.connect,
      dgramCreateSocket: dgram.createSocket,
    };
    const invoked = (name: string) => {
      calls.push(name);
      throw new Error(`captured ${name} ran`);
    };
    const fakeDatagramSocket = {
      connect: () => invoked('dgram.connect'),
      send: () => invoked('dgram.send'),
    } as unknown as dgram.Socket;

    const trappedFetch = (() => invoked('fetch')) as unknown as typeof fetch;
    trappedFetch.preconnect = () => invoked('fetch.preconnect');
    globalThis.fetch = trappedFetch;
    Bun.connect = (() => invoked('Bun.connect')) as typeof Bun.connect;
    net.connect = (() => invoked('net.connect')) as typeof net.connect;
    net.createConnection = (() => invoked('net.createConnection')) as typeof net.createConnection;
    tls.connect = (() => invoked('tls.connect')) as typeof tls.connect;
    http.request = (() => invoked('http.request')) as typeof http.request;
    http.get = (() => invoked('http.get')) as typeof http.get;
    https.request = (() => invoked('https.request')) as typeof https.request;
    https.get = (() => invoked('https.get')) as typeof https.get;
    http2.connect = (() => invoked('http2.connect')) as typeof http2.connect;
    dgram.createSocket = (() => fakeDatagramSocket) as typeof dgram.createSocket;

    try {
      uninstall = installOfflineSocketSentinel();
      expectDenied(() => fetch('https://example.com/fetch'), 'fetch');
      expectDenied(() => fetch.preconnect('https://example.com/preconnect'), 'fetch.preconnect');
      expectDenied(
        () =>
          fetch('http://127.0.0.1:8080/fixture', {
            proxy: 'http://proxy.example',
          }),
        'fetch'
      );
      expectDenied(
        () =>
          Bun.connect({
            hostname: 'example.com',
            port: 443,
            socket: { data() {} },
          }),
        'Bun.connect'
      );
      expectDenied(() => net.connect(443, 'example.com'), 'node:net.connect');
      expectDenied(
        () => net.createConnection({ host: 'example.com', port: 443 }),
        'node:net.createConnection'
      );
      expectDenied(() => tls.connect({ host: 'example.com', port: 443 }), 'node:tls.connect');
      expectDenied(
        () => net.connect({ host: 'localhost', port: 443, lookup() {} }),
        'node:net.connect'
      );
      expectDenied(() => http.request('http://example.com/a'), 'node:http.request');
      expectDenied(
        () => http.request({ host: 'localhost', agent: new http.Agent() }),
        'node:http.request'
      );
      expectDenied(() => http.get('http://example.com/a'), 'node:http.get');
      expectDenied(() => https.request('https://example.com/a'), 'node:https.request');
      expectDenied(() => https.get('https://example.com/a'), 'node:https.get');
      expectDenied(() => http2.connect('https://example.com'), 'node:http2.connect');
      expectDenied(
        () => http2.connect('https://localhost', { createConnection: () => new net.Socket() }),
        'node:http2.connect'
      );
      const udp = dgram.createSocket('udp4');
      expectDenied(() => udp.connect(53, 'example.com'), 'node:dgram.connect');
      expectDenied(() => udp.send('x', 53, 'example.com'), 'node:dgram.send');
      expect(calls).toEqual([]);

      const expectDelegated = (run: () => unknown, name: string) => {
        expect(run).toThrow(`captured ${name} ran`);
      };
      expectDelegated(() => fetch('http://127.0.0.1:8080/fixture'), 'fetch');
      expectDelegated(() => fetch.preconnect('http://localhost:8080'), 'fetch.preconnect');
      expectDelegated(
        () => Bun.connect({ hostname: '::1', port: 8080, socket: { data() {} } }),
        'Bun.connect'
      );
      expectDelegated(
        () => Bun.connect({ unix: '/tmp/offline-fixture.sock', socket: { data() {} } }),
        'Bun.connect'
      );
      expectDelegated(() => net.connect(8080, '127.0.0.1'), 'net.connect');
      expectDelegated(
        () => net.createConnection('/tmp/offline-fixture.sock'),
        'net.createConnection'
      );
      expectDelegated(() => tls.connect({ host: 'localhost', port: 8443 }), 'tls.connect');
      expectDelegated(() => http.request('http://[::1]:8080/a'), 'http.request');
      expectDelegated(() => http.get('http://localhost:8080/a'), 'http.get');
      expectDelegated(() => https.request('https://127.0.0.1:8443/a'), 'https.request');
      expectDelegated(() => https.get('https://localhost:8443/a'), 'https.get');
      expectDelegated(() => http2.connect('https://[::1]:8443'), 'http2.connect');
      expectDelegated(() => udp.connect(53, '127.0.0.1'), 'dgram.connect');
      expectDelegated(() => udp.send('x', 53, '::1'), 'dgram.send');
      expect(calls).toEqual([
        'fetch',
        'fetch.preconnect',
        'Bun.connect',
        'Bun.connect',
        'net.connect',
        'net.createConnection',
        'tls.connect',
        'http.request',
        'http.get',
        'https.request',
        'https.get',
        'http2.connect',
        'dgram.connect',
        'dgram.send',
      ]);
    } finally {
      uninstall?.();
      uninstall = undefined;
      globalThis.fetch = originals.fetch;
      Bun.connect = originals.bunConnect;
      net.connect = originals.netConnect;
      net.createConnection = originals.netCreateConnection;
      tls.connect = originals.tlsConnect;
      http.request = originals.httpRequest;
      http.get = originals.httpGet;
      https.request = originals.httpsRequest;
      https.get = originals.httpsGet;
      http2.connect = originals.http2Connect;
      dgram.createSocket = originals.dgramCreateSocket;
    }
  });

  test('delegates loopback and local-only targets to the captured functions', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => new Response('loopback-ok'),
    });
    try {
      uninstall = installOfflineSocketSentinel();
      const response = await fetch(`http://127.0.0.1:${server.port}/fixture`);
      expect(await response.text()).toBe('loopback-ok');
      expect(await fetch('data:text/plain,local-only').then(value => value.text())).toBe(
        'local-only'
      );
    } finally {
      uninstall?.();
      uninstall = undefined;
      server.stop(true);
    }
  });

  test('clears ambient proxy routes while installed and restores them', () => {
    const previous = Bun.env.HTTPS_PROXY;
    Bun.env.HTTPS_PROXY = 'http://proxy.example';
    try {
      uninstall = installOfflineSocketSentinel();
      expect(Bun.env.HTTPS_PROXY).toBeUndefined();
      Bun.env.HTTPS_PROXY = 'http://late-proxy.example';
      expectDenied(() => fetch('http://127.0.0.1:8080/fixture'), 'fetch');
      uninstall();
      uninstall = undefined;
      expect(Bun.env.HTTPS_PROXY).toBe('http://late-proxy.example');
    } finally {
      if (previous === undefined) delete Bun.env.HTTPS_PROXY;
      else Bun.env.HTTPS_PROXY = previous;
    }
  });

  test('keeps TCP and UDP loopback fixtures usable', async () => {
    const tcp = Bun.listen({
      hostname: '127.0.0.1',
      port: 0,
      socket: {
        data(socket) {
          socket.write('tcp-ok');
          socket.end();
        },
      },
    });
    const udpServer = dgram.createSocket('udp4');
    await new Promise<void>(resolve => udpServer.bind(0, '127.0.0.1', resolve));
    const udpAddress = udpServer.address();
    if (typeof udpAddress === 'string') throw new Error('Expected an IP UDP fixture');

    try {
      uninstall = installOfflineSocketSentinel();
      const tcpText = await new Promise<string>((resolve, reject) => {
        const socket = net.connect(tcp.port, '127.0.0.1', () => socket.write('fixture'));
        socket.on('data', data => resolve(data.toString()));
        socket.on('error', reject);
      });
      expect(tcpText).toBe('tcp-ok');

      const udpClient = dgram.createSocket('udp4');
      try {
        const received = new Promise<string>(resolve =>
          udpServer.once('message', message => resolve(message.toString()))
        );
        udpClient.send('udp-ok', udpAddress.port, '127.0.0.1');
        expect(await received).toBe('udp-ok');
      } finally {
        udpClient.close();
      }
    } finally {
      uninstall?.();
      uninstall = undefined;
      tcp.stop(true);
      udpServer.close();
    }
  });
});
