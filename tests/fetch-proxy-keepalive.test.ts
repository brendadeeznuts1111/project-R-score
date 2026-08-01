// @see https://bun.com/blog/bun-v1.3.12#keep-alive-for-https-proxy-connect-tunnels
// @see https://bun.com/docs/runtime/networking/fetch#proxying-requests — fetch proxy option
// @see https://bun.com/docs/runtime/networking/tcp — Bun.listen / Bun.connect
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/tls — Bun.serve TLS
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  BUN_V1_3_12_HTTPS_PROXY_POOL_KEY_DIMENSIONS,
  isProxyObjectForm,
  type FetchProxyOptions,
} from '../lib/net/proxy.ts';
import { createTestWorkspace, withTestEnvironment } from './harness.ts';

type ProxyPhase = 'reading' | 'connecting' | 'tunneled' | 'closed';

type ProxyClientState = {
  buffer: Buffer;
  phase: ProxyPhase;
  upstream?: Bun.Socket<ProxyUpstreamState>;
};

type ProxyUpstreamState = {
  client: Bun.Socket<ProxyClientState>;
};

type ConnectProxy = AsyncDisposable & {
  readonly connectHeaders: Headers[];
  readonly origin: string;
  readonly connectRequests: string[];
  readonly proxyAuthorization: string[];
};

const openssl = Bun.which('openssl');
const MAX_CONNECT_HEADER_BYTES = 32 * 1024;

async function generateSelfSignedCertificate(
  keyPath: string,
  certificatePath: string,
): Promise<void> {
  if (!openssl) throw new Error('openssl is unavailable');
  const proc = Bun.spawn(
    [
      openssl,
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-keyout',
      keyPath,
      '-out',
      certificatePath,
      '-days',
      '1',
      '-nodes',
      '-subj',
      '/CN=factorywager-proxy-test',
    ],
    { stdout: 'ignore', stderr: 'pipe', stdin: 'ignore' },
  );
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`openssl certificate generation failed: ${stderr.trim()}`);
}

function startConnectProxy(): ConnectProxy {
  const connectHeaders: Headers[] = [];
  const connectRequests: string[] = [];
  const pendingConnections = new Set<Promise<Bun.Socket<ProxyUpstreamState>>>();
  const proxyAuthorization: string[] = [];
  const upstreams = new Set<Bun.Socket<ProxyUpstreamState>>();
  const listener = Bun.listen<ProxyClientState>({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      open(client) {
        client.data = { buffer: Buffer.alloc(0), phase: 'reading' };
      },
      data(client, chunk) {
        if (client.data.phase === 'tunneled') {
          client.data.upstream?.write(chunk);
          return;
        }
        if (client.data.phase === 'closed') return;

        client.data.buffer = Buffer.concat([client.data.buffer, chunk]);
        if (client.data.buffer.byteLength > MAX_CONNECT_HEADER_BYTES) {
          client.terminate();
          return;
        }
        if (client.data.phase === 'connecting') return;

        const headerEnd = client.data.buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;

        const header = client.data.buffer.subarray(0, headerEnd + 4).toString('utf8');
        const lines = header.split('\r\n');
        const requestLine = lines[0] ?? '';
        connectRequests.push(requestLine);
        const headers = new Headers();
        for (const line of lines.slice(1)) {
          const separator = line.indexOf(':');
          if (separator > 0) headers.append(line.slice(0, separator), line.slice(separator + 1).trim());
        }
        connectHeaders.push(headers);
        proxyAuthorization.push(headers.get('proxy-authorization') ?? '');
        client.data.buffer = client.data.buffer.subarray(headerEnd + 4);
        const [method, authority] = requestLine.split(' ');
        let targetPort = 0;
        try {
          targetPort = Number(new URL(`http://${authority}`).port);
        } catch {
          client.terminate();
          return;
        }

        if (method !== 'CONNECT' || !Number.isSafeInteger(targetPort) || targetPort <= 0) {
          client.terminate();
          return;
        }
        client.data.phase = 'connecting';

        const connection = Bun.connect<ProxyUpstreamState>({
          hostname: '127.0.0.1',
          port: targetPort,
          data: { client },
          socket: {
            open(upstream) {
              if (client.data.phase === 'closed') {
                upstream.terminate();
                return;
              }
              upstreams.add(upstream);
              client.data.upstream = upstream;
              client.data.phase = 'tunneled';
              client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
              if (client.data.buffer.byteLength > 0) upstream.write(client.data.buffer);
              client.data.buffer = Buffer.alloc(0);
            },
            data(upstream, data) {
              upstream.data.client.write(data);
            },
            end(upstream) {
              upstream.data.client.end();
            },
            close(upstream) {
              upstreams.delete(upstream);
              if (upstream.data.client.readyState > 0) upstream.data.client.end();
            },
            error(upstream) {
              upstream.data.client.terminate();
            },
          },
        });
        pendingConnections.add(connection);
        void connection
          .catch(() => client.terminate())
          .finally(() => pendingConnections.delete(connection));
      },
      close(client) {
        client.data.phase = 'closed';
        if (client.data?.upstream?.readyState && client.data.upstream.readyState > 0) {
          client.data.upstream.end();
        }
      },
      error(client) {
        client.data.phase = 'closed';
        client.data?.upstream?.terminate();
      },
    },
  });

  return {
    connectHeaders,
    origin: `http://127.0.0.1:${listener.port}`,
    connectRequests,
    proxyAuthorization,
    async [Symbol.asyncDispose]() {
      listener.stop(true);
      await Promise.allSettled(pendingConnections);
      for (const upstream of upstreams) upstream.terminate();
    },
  };
}

describe('Bun fetch HTTPS proxy CONNECT keep-alive', () => {
  test('documents every v1.3.12 release-level pool-key dimension', () => {
    expect(BUN_V1_3_12_HTTPS_PROXY_POOL_KEY_DIMENSIONS).toEqual([
      'proxy-host-port',
      'proxy-credentials',
      'target-host-port',
      'tls-configuration',
    ]);
  });

  test('accepts all documented FetchProxyOptions forms', () => {
    const forms: FetchProxyOptions[] = [
      'http://127.0.0.1:8080',
      new URL('http://127.0.0.1:8080'),
      { url: 'http://127.0.0.1:8080', headers: { 'X-Proxy-Test': '1' } },
      { url: 'http://127.0.0.1:8080', headers: [['X-Proxy-Test', '1']] },
      { url: 'http://127.0.0.1:8080', headers: new Headers({ 'X-Proxy-Test': '1' }) },
      { url: 'http://127.0.0.1:8080', headers: { 'X-Proxy-Test': ['1', '2'] } },
    ];
    expect(forms.map(isProxyObjectForm)).toEqual([false, false, true, true, true, true]);
  });

  test(
    'reuses equal keys and separates every changed pool-key dimension',
    async () => {
      await using workspace = await createTestWorkspace('factorywager-proxy-keepalive-');
      const keyPath = workspace.resolve('key.pem');
      const certificatePath = workspace.resolve('certificate.pem');
      await generateSelfSignedCertificate(keyPath, certificatePath);

      const originRequests: Headers[] = [];
      let targetRequests = 0;
      const startTarget = () =>
        Bun.serve({
          hostname: '127.0.0.1',
          port: 0,
          tls: { key: Bun.file(keyPath), cert: Bun.file(certificatePath) },
          fetch(request) {
            originRequests.push(new Headers(request.headers));
            targetRequests += 1;
            return Response.json({ targetRequests });
          },
        });
      const primaryTarget = startTarget();
      const secondaryTarget = startTarget();
      await using primaryProxy = startConnectProxy();
      await using secondaryProxy = startConnectProxy();

      type FetchThroughOptions = {
        credentials?: string;
        proxyOrigin?: string;
        serverName?: string;
        targetPort?: number;
      };

      try {
        await withTestEnvironment({ NO_PROXY: undefined, no_proxy: undefined }, async () => {
          const fetchThrough = async (options: FetchThroughOptions = {}): Promise<void> => {
            const {
              credentials = 'first:fixture',
              proxyOrigin = primaryProxy.origin,
              serverName = 'alpha.factorywager.invalid',
              targetPort = primaryTarget.port,
            } = options;
            const targetUrl = `https://factorywager-proxy-target.invalid:${targetPort}/proof`;
            const response = await fetch(targetUrl, {
              proxy: proxyOrigin.replace('http://', `http://${credentials}@`),
              tls: { rejectUnauthorized: false, serverName },
            });
            expect(response.status).toBe(200);
            const body = (await response.json()) as { targetRequests: number };
            expect(body.targetRequests).toBeGreaterThan(0);
          };
          const expectPairReusesTunnel = async (
            options: FetchThroughOptions,
            observedProxy: ConnectProxy,
            expectedConnects: number,
          ): Promise<void> => {
            await fetchThrough(options);
            await fetchThrough(options);
            expect(observedProxy.connectRequests).toHaveLength(expectedConnects);
          };

          await expectPairReusesTunnel({}, primaryProxy, 1);
          await expectPairReusesTunnel({ credentials: 'second:fixture' }, primaryProxy, 2);
          await expectPairReusesTunnel({}, primaryProxy, 2);
          await expectPairReusesTunnel(
            { credentials: 'second:fixture', targetPort: secondaryTarget.port },
            primaryProxy,
            3,
          );
          await expectPairReusesTunnel(
            {
              credentials: 'second:fixture',
              serverName: 'beta.factorywager.invalid',
              targetPort: secondaryTarget.port,
            },
            primaryProxy,
            4,
          );
          await expectPairReusesTunnel(
            {
              credentials: 'second:fixture',
              proxyOrigin: secondaryProxy.origin,
              serverName: 'beta.factorywager.invalid',
              targetPort: secondaryTarget.port,
            },
            secondaryProxy,
            1,
          );

          const objectProxyUrl = secondaryProxy.origin.replace(
            'http://',
            'http://embedded:fixture@',
          );
          const fetchWithProxyHeaders = async (): Promise<void> => {
            const response = await fetch(
              `https://factorywager-proxy-target.invalid:${secondaryTarget.port}/proof`,
              {
                proxy: {
                  url: objectProxyUrl,
                  headers: [
                    ['Proxy-Authorization', 'Bearer fixture-override'],
                    ['X-Proxy-Test', 'connect-only'],
                  ],
                },
                tls: {
                  rejectUnauthorized: false,
                  serverName: 'beta.factorywager.invalid',
                },
              },
            );
            expect(response.status).toBe(200);
            await response.json();
          };
          await fetchWithProxyHeaders();
          await fetchWithProxyHeaders();
          expect(secondaryProxy.connectRequests).toHaveLength(2);
        });

        expect(targetRequests).toBe(14);
        expect(primaryProxy.connectRequests).toEqual([
          `CONNECT factorywager-proxy-target.invalid:${primaryTarget.port} HTTP/1.1`,
          `CONNECT factorywager-proxy-target.invalid:${primaryTarget.port} HTTP/1.1`,
          `CONNECT factorywager-proxy-target.invalid:${secondaryTarget.port} HTTP/1.1`,
          `CONNECT factorywager-proxy-target.invalid:${secondaryTarget.port} HTTP/1.1`,
        ]);
        expect(secondaryProxy.connectRequests).toEqual(
          Array.from(
            { length: 2 },
            () => `CONNECT factorywager-proxy-target.invalid:${secondaryTarget.port} HTTP/1.1`,
          ),
        );
        expect(new Set(primaryProxy.proxyAuthorization)).toEqual(
          new Set([
            `Basic ${Buffer.from('first:fixture').toString('base64')}`,
            `Basic ${Buffer.from('second:fixture').toString('base64')}`,
          ]),
        );
        expect(new Set(secondaryProxy.proxyAuthorization)).toEqual(
          new Set([
            `Basic ${Buffer.from('second:fixture').toString('base64')}`,
            'Bearer fixture-override',
          ]),
        );
        expect(secondaryProxy.connectHeaders.at(-1)?.get('x-proxy-test')).toBe('connect-only');
        expect(originRequests.every(headers => headers.get('proxy-authorization') === null)).toBe(
          true,
        );
        expect(originRequests.every(headers => headers.get('x-proxy-test') === null)).toBe(true);
      } finally {
        await Promise.all([primaryTarget.stop(true), secondaryTarget.stop(true)]);
      }
    },
    15_000,
  );
});
