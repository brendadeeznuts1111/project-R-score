import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy.ts';
import {
  createKalPolyOutboundAuthority,
  fetchKalPolyOutbound,
} from '../runtime-outbound.ts';

const publicResolver = async () => [
  { address: '93.184.216.34', family: 4 as const, ttl: 60, source: 'node-resolver' as const },
];

const publicAuthority = createKalPolyOutboundAuthority({
  name: 'kal-poly-fixture',
  baseUrl: 'https://api.example.com',
  pathPrefix: '/v1/',
  methods: ['GET', 'POST'],
  credentialHeaders: ['authorization'],
});

describe('Kal Poly final outbound boundary', () => {
  test('binds an exact typed authority with production transport defaults', async () => {
    let observed: { url: string; init?: BunFetchRequestInit } | undefined;
    const fetcher: OutboundFetch = async (input, init) => {
      observed = { url: input.toString(), init };
      return new Response('{}');
    };
    await fetchKalPolyOutbound(
      publicAuthority,
      '/v1/status',
      { headers: { authorization: 'Bearer fixture' } },
      { fetcher, resolver: publicResolver, environment: {} }
    );
    expect(observed?.url).toBe('https://api.example.com/v1/status');
    expect(observed?.init?.redirect).toBe('error');
    expect(observed?.init?.credentials).toBe('omit');
    expect(observed?.init?.protocol).toBeUndefined();
  });

  test('rejects authority, path, credential, method, and address-class drift before I/O', async () => {
    expect(() => createKalPolyOutboundAuthority({ name: 'public-http', baseUrl: 'http://api.example.com' })).toThrow('non-loopback HTTPS');
    expect(() => createKalPolyOutboundAuthority({ name: 'loopback', baseUrl: 'http://10.0.0.1', addressClass: 'loopback' })).toThrow('loopback origin');
    for (const [target, init, message] of [
      ['https://evil.example/v1/status', {}, 'escapes'],
      ['/v2/status', {}, 'path is not allowed'],
      ['/v1/status', { method: 'DELETE' }, 'method DELETE is not allowed'],
      ['/v1/status', { headers: { cookie: 'secret' } }, 'credentials are forbidden'],
    ] as const) {
      let effects = 0;
      await expect(fetchKalPolyOutbound(publicAuthority, target, init, {
        environment: {},
        resolver: publicResolver,
        fetcher: async () => { effects++; return new Response(); },
      })).rejects.toThrow(message);
      expect(effects).toBe(0);
    }
  });

  test('connect, proxy, protocol, TLS, and experimental overrides cannot loosen production', async () => {
    const cases: readonly [BunFetchRequestInit, Record<string, string>, string][] = [
      [{ proxy: 'https://proxy.example' }, {}, 'proxy cannot override'],
      [{ protocol: 'http2' }, {}, 'protocol h2 is not allowed'],
      [{ tls: { rejectUnauthorized: false } }, {}, 'request-tls'],
      [{}, { BUN_OPTIONS: '--connect=https://evil.example' }, '--connect'],
      [{}, { BUN_OPTIONS: '--fetch-preconnect=https://evil.example' }, '--fetch-preconnect'],
      [{}, { BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT: '1' }, 'experimental HTTP/2'],
      [{}, { BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT: '1' }, 'experimental HTTP/3'],
    ];
    for (const [init, environment, message] of cases) {
      let effects = 0;
      await expect(fetchKalPolyOutbound(publicAuthority, '/v1/status', init, {
        environment,
        resolver: publicResolver,
        fetcher: async () => { effects++; return new Response(); },
      })).rejects.toThrow(message);
      expect(effects).toBe(0);
    }
  });

  test('offline authority is monotonic and rejects before DNS or transport', async () => {
    const offline = createKalPolyOutboundAuthority({
      name: 'kal-poly-offline-fixture',
      baseUrl: 'https://api.example.com',
      networkMode: 'offline-no-socket',
    });
    let resolutions = 0;
    let effects = 0;
    await expect(fetchKalPolyOutbound(offline, '/', {}, {
      networkMode: 'online',
      environment: {},
      resolver: async () => { resolutions++; return []; },
      fetcher: async () => { effects++; return new Response(); },
    })).rejects.toThrow('forbids network fetch');
    expect(resolutions).toBe(0);
    expect(effects).toBe(0);
  });

  test('unsafe writes are issued once and bounded responses fail closed', async () => {
    let effects = 0;
    const response = await fetchKalPolyOutbound(publicAuthority, '/v1/events', { method: 'POST' }, {
      environment: {}, resolver: publicResolver,
      fetcher: async () => { effects++; return new Response('ambiguous', { status: 503 }); },
    });
    expect(response.status).toBe(503);
    expect(effects).toBe(1);
    await expect(fetchKalPolyOutbound(publicAuthority, '/v1/status', {}, {
      environment: {}, resolver: publicResolver,
      fetcher: async () => new Response(new Uint8Array(9 * 1024 * 1024), {
        headers: { 'content-length': String(9 * 1024 * 1024) },
      }),
    })).rejects.toThrow('response exceeds');
  });
});
