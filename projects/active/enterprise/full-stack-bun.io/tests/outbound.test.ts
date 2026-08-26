import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy.ts';
import {
  createFullStackBunOutboundAuthority,
  fetchFullStackBunOutbound,
  type FullStackBunOutboundOptions,
} from '../src/security/outbound.ts';

const publicResolver = async () => [
  { address: '104.16.1.1', family: 4 as const, ttl: 60, source: 'node-resolver' as const },
];

const api = createFullStackBunOutboundAuthority({
  kind: 'market-data',
  name: 'fixture-market-api',
  baseUrl: 'https://api.example.com/v1/',
  pathPrefix: '/v1/',
  methods: ['GET', 'POST'],
  credentialHeaders: ['authorization'],
});

function execution(fetcher: OutboundFetch): FullStackBunOutboundOptions {
  return { fetcher, resolver: publicResolver, environment: {}, argv: [] };
}

describe('full-stack Bun outbound boundary', () => {
  test('binds exact authorities, credentials, methods, and production defaults', async () => {
    let captured: { url: string; init?: BunFetchRequestInit } | undefined;
    await fetchFullStackBunOutbound(
      api,
      'https://api.example.com/v1/markets',
      { method: 'POST', headers: { authorization: 'Bearer fixture' }, body: '{}' },
      execution(async (input, init) => {
        captured = { url: input.toString(), init };
        return new Response('{}');
      })
    );
    expect(captured?.url).toBe('https://api.example.com/v1/markets');
    expect(captured?.init?.redirect).toBe('error');
    expect(captured?.init?.credentials).toBe('omit');
    expect(captured?.init?.protocol).toBeUndefined();
  });

  test('default-denies malformed, lookalike, path, method, and credential authority drift', () => {
    expect(() => createFullStackBunOutboundAuthority({
      kind: 'scrape', name: 'insecure', baseUrl: 'http://example.com/',
    })).toThrow('non-loopback HTTPS');
    expect(() => createFullStackBunOutboundAuthority({
      kind: 'health', name: 'fake-loopback', baseUrl: 'http://10.0.0.1/', addressClass: 'loopback',
    })).toThrow('HTTP(S) loopback');
    let effects = 0;
    const guarded = execution(async () => { effects++; return new Response('never'); });
    expect(() => fetchFullStackBunOutbound(api, 'https://api.example.com.evil/v1/', {}, guarded))
      .toThrow('escapes');
    expect(() => fetchFullStackBunOutbound(api, 'https://api.example.com/v2/', {}, guarded))
      .toThrow('path is not allowed');
    expect(() => fetchFullStackBunOutbound(api, 'https://api.example.com/v1/', { method: 'CONNECT' }, guarded))
      .toThrow('method CONNECT');
    expect(() => fetchFullStackBunOutbound(api, 'https://api.example.com/v1/', { headers: { cookie: 'secret' } }, guarded))
      .toThrow('credentials are forbidden');
    expect(effects).toBe(0);
  });

  test('denies registry, connect, preload O/R, preconnect, and experimental runtime controls', () => {
    const cases: readonly [Record<string, string>, string][] = [
      [{ BUN_CONFIG_REGISTRY: 'https://evil.example' }, 'registry environment'],
      [{ BUN_OPTIONS: '--registry=https://evil.example' }, '--registry'],
      [{ BUN_OPTIONS: '--connect=https://evil.example' }, '--connect'],
      [{ BUN_OPTIONS: '--fetch-preconnect=https://evil.example' }, '--fetch-preconnect'],
      [{ BUN_OPTIONS: '-O=attacker.ts' }, '-O'],
      [{ BUN_OPTIONS: '-R=attacker.ts' }, '-R'],
      [{ BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT: '1' }, 'experimental HTTP/2'],
      [{ BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT: '1' }, 'experimental HTTP/3'],
    ];
    for (const [environment, message] of cases) {
      expect(() => fetchFullStackBunOutbound(api, '/v1/markets', {}, {
        ...execution(async () => new Response('never')),
        environment,
      })).toThrow(message);
    }
    expect(() => fetchFullStackBunOutbound(api, '/v1/markets', {}, {
      ...execution(async () => new Response('never')),
      argv: ['bun', '--connect=https://evil.example', 'app.ts'],
    })).toThrow('--connect');
  });

  test('denies caller proxy, redirect, TLS, protocol, Unix, and ambient proxy overrides', () => {
    const guarded = execution(async () => new Response('never'));
    const cases: readonly [BunFetchRequestInit, string][] = [
      [{ proxy: 'https://proxy.example' }, 'proxy cannot override'],
      [{ redirect: 'follow' }, 'redirect mode'],
      [{ tls: { rejectUnauthorized: false } }, 'request-tls'],
      [{ protocol: 'http2' }, 'protocol h2'],
      [{ unix: '/tmp/owned.sock' }, 'request-unix'],
    ];
    for (const [init, message] of cases) {
      expect(() => fetchFullStackBunOutbound(api, '/v1/markets', init, guarded)).toThrow(message);
    }
    expect(() => fetchFullStackBunOutbound(api, '/v1/markets', {}, {
      ...guarded,
      environment: { HTTPS_PROXY: 'https://proxy.example' },
    })).toThrow('active proxy environment');
  });

  test('owns one exact named proxy without allowing caller overrides', async () => {
    const proxied = createFullStackBunOutboundAuthority({
      kind: 'example-api',
      name: 'proxied-example',
      baseUrl: 'https://api.example.com/status',
      exact: true,
      proxy: 'https://proxy.example:8443',
    });
    let captured: BunFetchRequestInit | undefined;
    await fetchFullStackBunOutbound(proxied, 'https://api.example.com/status', {}, {
      environment: {},
      fetcher: async (_input, init) => { captured = init; return new Response('ok'); },
    });
    expect(captured?.proxy).toBe('https://proxy.example:8443');
    expect(() => fetchFullStackBunOutbound(proxied, 'https://api.example.com/status', {
      proxy: 'https://other.example',
    }, execution(async () => new Response('never')))).toThrow('proxy cannot override');
  });

  test('offline authority is monotonic and private DNS fails before transport', async () => {
    const offline = createFullStackBunOutboundAuthority({
      kind: 'registry',
      name: 'offline-registry',
      baseUrl: 'https://registry.example/',
      networkMode: 'offline-no-socket',
    });
    let resolutions = 0;
    let effects = 0;
    expect(() => fetchFullStackBunOutbound(offline, '/', {}, {
      networkMode: 'online',
      environment: {},
      resolver: async () => { resolutions++; return []; },
      fetcher: async () => { effects++; return new Response('never'); },
    })).toThrow('forbids network fetch');
    await expect(fetchFullStackBunOutbound(api, '/v1/markets', {}, {
      environment: {},
      resolver: async () => [
        { address: '127.0.0.1', family: 4, ttl: 60, source: 'node-resolver' as const },
      ],
      fetcher: async () => { effects++; return new Response('never'); },
    })).rejects.toThrow('DNS authority rejected');
    expect(resolutions).toBe(0);
    expect(effects).toBe(0);
  });

  test('unsafe writes execute once and oversized responses fail closed', async () => {
    let effects = 0;
    const response = await fetchFullStackBunOutbound(api, '/v1/events', {
      method: 'POST', body: '{}',
    }, execution(async () => { effects++; return new Response('ambiguous', { status: 503 }); }));
    expect(response.status).toBe(503);
    expect(effects).toBe(1);
    await expect(fetchFullStackBunOutbound(api, '/v1/markets', {}, execution(async () =>
      new Response('x', { headers: { 'content-length': '8000001' } })
    ))).rejects.toThrow('response exceeds');
  });
});
