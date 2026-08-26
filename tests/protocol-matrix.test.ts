// @see https://bun.com/docs/runtime/networking/fetch#protocol — Bun fetch protocol selection
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createSecureServer, type Http2SecureServer } from 'node:http2';

import { contentDigestForBytes } from '../lib/content-store/index.ts';
import { fetchWithPolicy, type OutboundEndpointPolicy } from '../lib/http/outbound-policy.ts';
import { HERMETIC_PROTOCOL_PROOF_MATRIX } from '../lib/http/protocol-matrix.ts';
import { createEphemeralServe, createTestWorkspace } from './harness.ts';

const payload = new TextEncoder().encode('factorywager-protocol-parity-v1');
const openssl = Bun.which('openssl');
let workspace: Awaited<ReturnType<typeof createTestWorkspace>>;
let h2Server: Http2SecureServer;
let h2Origin = '';

beforeAll(async () => {
  if (!openssl) throw new Error('guard:protocol-matrix:check requires openssl for loopback TLS');
  workspace = await createTestWorkspace('factorywager-protocol-matrix-');
  const keyPath = workspace.resolve('key.pem');
  const certificatePath = workspace.resolve('certificate.pem');
  const process = Bun.spawn(
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
      '/CN=localhost',
    ],
    { stdin: 'ignore', stdout: 'ignore', stderr: 'pipe' }
  );
  const stderr = await new Response(process.stderr).text();
  if ((await process.exited) !== 0) {
    throw new Error(`openssl certificate generation failed: ${stderr.trim()}`);
  }
  h2Server = createSecureServer({
    key: await Bun.file(keyPath).text(),
    cert: await Bun.file(certificatePath).text(),
  });
  h2Server.on('stream', stream => {
    stream.respond({ ':status': 200, 'content-type': 'application/octet-stream' });
    stream.end(payload);
  });
  await new Promise<void>((resolve, reject) => {
    h2Server.once('error', reject);
    h2Server.listen(0, '127.0.0.1', () => {
      h2Server.off('error', reject);
      resolve();
    });
  });
  const address = h2Server.address();
  if (!address || typeof address === 'string') throw new Error('HTTP/2 fixture did not bind TCP');
  h2Origin = `https://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (h2Server?.listening) {
    await new Promise<void>(resolve => h2Server.close(() => resolve()));
  }
  await workspace?.[Symbol.asyncDispose]();
});

describe('hermetic Bun 1.4 protocol matrix', () => {
  test('declares exercised H1/H2/CONNECT rows and an honest unavailable H3 candidate', () => {
    expect(HERMETIC_PROTOCOL_PROOF_MATRIX).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: 'direct', protocol: 'h1', status: 'exercised' }),
        expect.objectContaining({ route: 'direct', protocol: 'h2', status: 'exercised' }),
        expect.objectContaining({
          route: 'named-proxy-connect',
          protocol: 'h1',
          status: 'exercised',
        }),
        expect.objectContaining({
          protocol: 'h3',
          status: 'candidate-unavailable',
          limitation: expect.stringContaining('no deterministic loopback QUIC fixture'),
        }),
      ])
    );
  });

  test('real loopback H1 and H2 return identical content-addressed bytes', async () => {
    await using h1Server = createEphemeralServe({
      fetch: () => new Response(payload, { headers: { 'content-type': 'application/octet-stream' } }),
    });
    const h1Response = await fetch(`${h1Server.origin}/content`, { protocol: 'http1.1' });
    const h2Response = await fetch(`${h2Origin}/content`, {
      protocol: 'http2',
      tls: { rejectUnauthorized: false },
    });
    expect(h1Response.status).toBe(200);
    expect(h2Response.status).toBe(200);
    const [h1Bytes, h2Bytes] = await Promise.all([
      h1Response.bytes(),
      h2Response.bytes(),
    ]);
    expect(h1Bytes).toEqual(payload);
    expect(h2Bytes).toEqual(payload);
    expect(contentDigestForBytes(h1Bytes)).toBe(contentDigestForBytes(h2Bytes));
  });

  test('real H1 transport obeys the total deadline before a late response', async () => {
    await using server = createEphemeralServe({
      async fetch() {
        await Bun.sleep(100);
        return new Response(payload);
      },
    });
    const policy = {
      name: 'protocol-deadline-fixture',
      allowedOrigins: [server.origin],
      allowedMethods: ['GET'],
      credentialMode: 'forbid',
      redirect: 'error',
      timeoutMs: 25,
      totalDeadlineMs: 25,
      protocol: { allowed: ['h1'], default: 'h1' },
      controlGrants: [
        { control: 'request-protocol', values: ['h1'], reason: 'hermetic H1 fixture' },
      ],
    } as const satisfies OutboundEndpointPolicy;
    await expect(
      fetchWithPolicy(`${server.origin}/slow`, {}, policy, fetch, { environment: {} })
    ).rejects.toThrow();
  });

  test('H3 cannot be selected through the stable policy client', () => {
    const policy = {
      name: 'h3-candidate',
      allowedOrigins: ['https://h3.example.test'],
      allowedMethods: ['GET'],
      credentialMode: 'forbid',
      redirect: 'error',
      timeoutMs: 100,
      protocol: { allowed: ['h3'], default: 'h3' },
      controlGrants: [
        { control: 'request-protocol', values: ['h3'], reason: 'candidate proof only' },
      ],
    } as const satisfies OutboundEndpointPolicy;
    expect(() => fetchWithPolicy('https://h3.example.test', {}, policy)).toThrow(
      'requires the canary protocol client'
    );
  });
});
