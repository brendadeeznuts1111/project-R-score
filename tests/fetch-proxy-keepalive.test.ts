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
  HTTPS_PROXY_TUNNEL_REUSE_DIMENSIONS,
  isProxyObjectForm,
  type FetchProxyOptions,
} from '../lib/net/proxy.ts';
import { createTestWorkspace, withTestEnvironment } from './harness.ts';

type ProxyClientState = {
  buffer: Buffer;
  upstream?: Bun.Socket<ProxyUpstreamState>;
  tunneled: boolean;
};

type ProxyUpstreamState = {
  client: Bun.Socket<ProxyClientState>;
};

type ConnectProxy = AsyncDisposable & {
  readonly origin: string;
  readonly connectRequests: string[];
  readonly proxyAuthorization: string[];
};

const openssl = Bun.which('openssl');

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

function startConnectProxy(targetPort: number): ConnectProxy {
  const connectRequests: string[] = [];
  const proxyAuthorization: string[] = [];
  const listener = Bun.listen<ProxyClientState>({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      open(client) {
        client.data = { buffer: Buffer.alloc(0), tunneled: false };
      },
      data(client, chunk) {
        if (client.data.tunneled) {
          client.data.upstream?.write(chunk);
          return;
        }

        client.data.buffer = Buffer.concat([client.data.buffer, chunk]);
        const headerEnd = client.data.buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;

        const header = client.data.buffer.subarray(0, headerEnd + 4).toString('utf8');
        const lines = header.split('\r\n');
        connectRequests.push(lines[0] ?? '');
        const authorization = lines.find(line =>
          line.toLowerCase().startsWith('proxy-authorization:'),
        );
        proxyAuthorization.push(authorization?.slice(authorization.indexOf(':') + 1).trim() ?? '');
        const remainder = client.data.buffer.subarray(headerEnd + 4);

        void Bun.connect<ProxyUpstreamState>({
          hostname: '127.0.0.1',
          port: targetPort,
          data: { client },
          socket: {
            open(upstream) {
              client.data.upstream = upstream;
              client.data.tunneled = true;
              client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
              if (remainder.byteLength > 0) upstream.write(remainder);
            },
            data(upstream, data) {
              upstream.data.client.write(data);
            },
            end(upstream) {
              upstream.data.client.end();
            },
            close(upstream) {
              if (upstream.data.client.readyState > 0) upstream.data.client.end();
            },
            error(upstream) {
              upstream.data.client.terminate();
            },
          },
        }).catch(() => client.terminate());
      },
      close(client) {
        if (client.data?.upstream?.readyState && client.data.upstream.readyState > 0) {
          client.data.upstream.end();
        }
      },
      error(client) {
        client.data?.upstream?.terminate();
      },
    },
  });

  return {
    origin: `http://127.0.0.1:${listener.port}`,
    connectRequests,
    proxyAuthorization,
    async [Symbol.asyncDispose]() {
      listener.stop(true);
    },
  };
}

describe('Bun fetch HTTPS proxy CONNECT keep-alive', () => {
  test('documents every runtime tunnel reuse dimension', () => {
    expect(HTTPS_PROXY_TUNNEL_REUSE_DIMENSIONS).toEqual([
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
    ];
    expect(forms.map(isProxyObjectForm)).toEqual([false, false, true]);
  });

  test.skipIf(!openssl)(
    'reuses one tunnel for equal keys and separates changed credentials',
    async () => {
      await using workspace = await createTestWorkspace('factorywager-proxy-keepalive-');
      const keyPath = workspace.resolve('key.pem');
      const certificatePath = workspace.resolve('certificate.pem');
      await generateSelfSignedCertificate(keyPath, certificatePath);

      let targetRequests = 0;
      const target = Bun.serve({
        hostname: '127.0.0.1',
        port: 0,
        tls: { key: Bun.file(keyPath), cert: Bun.file(certificatePath) },
        fetch() {
          targetRequests += 1;
          return Response.json({ targetRequests });
        },
      });
      await using proxy = startConnectProxy(target.port ?? 0);

      try {
        await withTestEnvironment({ NO_PROXY: undefined, no_proxy: undefined }, async () => {
          const targetUrl = `https://factorywager-proxy-target.invalid:${target.port}/proof`;
          const fetchThrough = async (credentials: string): Promise<number> => {
            const response = await fetch(targetUrl, {
              proxy: `${proxy.origin.replace('http://', `http://${credentials}@`)}`,
              tls: { rejectUnauthorized: false },
            });
            expect(response.status).toBe(200);
            const body = (await response.json()) as { targetRequests: number };
            return body.targetRequests;
          };

          expect(await fetchThrough('first:fixture')).toBe(1);
          expect(await fetchThrough('first:fixture')).toBe(2);
          expect(await fetchThrough('first:fixture')).toBe(3);
          expect(proxy.connectRequests).toHaveLength(1);

          expect(await fetchThrough('second:fixture')).toBe(4);
          expect(await fetchThrough('second:fixture')).toBe(5);
          expect(proxy.connectRequests).toHaveLength(2);
        });

        expect(targetRequests).toBe(5);
        expect(proxy.connectRequests).toEqual([
          `CONNECT factorywager-proxy-target.invalid:${target.port} HTTP/1.1`,
          `CONNECT factorywager-proxy-target.invalid:${target.port} HTTP/1.1`,
        ]);
        expect(new Set(proxy.proxyAuthorization).size).toBe(2);
      } finally {
        await target.stop(true);
      }
    },
    15_000,
  );
});
