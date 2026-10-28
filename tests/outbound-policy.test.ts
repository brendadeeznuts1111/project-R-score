import { describe, expect, test } from 'bun:test';
import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  prepareOutboundRequest,
  type OutboundEndpointPolicy,
  type OutboundFetch,
} from '../lib/http/outbound-policy.ts';

const PUBLIC_READ_POLICY = {
  name: 'public-read',
  allowedOrigins: ['https://api.example.com'],
  allowedMethods: ['GET', 'HEAD'],
  credentialMode: 'forbid',
  redirect: 'error',
  timeoutMs: 2_000,
} as const satisfies OutboundEndpointPolicy;

describe('outbound endpoint policy', () => {
  test('shares one normalized loopback classifier without treating mDNS as local', () => {
    for (const host of ['localhost', 'api.localhost', '127.0.0.1', '127.255.1.2', '[::1]']) {
      expect(isNormalizedLoopbackHostname(host)).toBe(true);
    }
    for (const host of ['printer.local', '192.168.1.2', '::ffff:127.0.0.1']) {
      expect(isNormalizedLoopbackHostname(host)).toBe(false);
    }
  });

  test('binds a request to an exact origin, method, redirect mode, and deadline', () => {
    const request = prepareOutboundRequest(
      'https://api.example.com/v1/markets',
      { headers: { Accept: 'application/json' } },
      PUBLIC_READ_POLICY
    );
    expect(request.url.href).toBe('https://api.example.com/v1/markets');
    expect(request.init.method).toBe('GET');
    expect(request.init.credentials).toBe('omit');
    expect(request.init.redirect).toBe('error');
    expect(request.init.signal).toBeInstanceOf(AbortSignal);
  });

  test('rejects lookalike origins, alternate ports, URL credentials, and unsafe methods', () => {
    for (const url of [
      'https://api.example.com.evil.test/v1',
      'https://api.example.com:8443/v1',
      'https://user:secret@api.example.com/v1',
    ]) {
      expect(() => prepareOutboundRequest(url, {}, PUBLIC_READ_POLICY)).toThrow();
    }
    expect(() =>
      prepareOutboundRequest('https://api.example.com/v1', { method: 'POST' }, PUBLIC_READ_POLICY)
    ).toThrow('POST');
  });

  test('rejects credential and redirect overrides before invoking fetch', async () => {
    let fetchCalls = 0;
    const fetcher = (() => {
      fetchCalls++;
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as OutboundFetch;

    expect(() =>
      fetchWithPolicy(
        'https://api.example.com/v1',
        { headers: { Authorization: 'Bearer hidden' } },
        PUBLIC_READ_POLICY,
        fetcher
      )
    ).toThrow('credentials are forbidden');
    expect(() =>
      fetchWithPolicy(
        'https://api.example.com/v1',
        { redirect: 'follow' },
        PUBLIC_READ_POLICY,
        fetcher
      )
    ).toThrow('redirect mode');
    expect(fetchCalls).toBe(0);
  });

  test('allows explicit scoped headers only at the configured origin', () => {
    const scoped = {
      ...PUBLIC_READ_POLICY,
      name: 'scoped-write',
      allowedMethods: ['POST'],
      credentialMode: 'scoped',
      credentialHeaders: ['authorization'],
    } as const satisfies OutboundEndpointPolicy;
    expect(() =>
      prepareOutboundRequest(
        'https://api.example.com/v1',
        { method: 'POST', headers: { Authorization: 'Bearer hidden' } },
        scoped
      )
    ).not.toThrow();
    expect(() =>
      prepareOutboundRequest(
        'https://other.example/v1',
        { method: 'POST', headers: { Authorization: 'Bearer hidden' } },
        scoped
      )
    ).toThrow('origin');
    expect(() =>
      prepareOutboundRequest(
        'https://api.example.com/v1',
        { method: 'POST', headers: { Cookie: 'session=hidden' } },
        scoped
      )
    ).toThrow('credentials are forbidden');
  });

  test('default-denies Bun routing, TLS, Unix, protocol, S3, and response extensions', () => {
    for (const init of [
      { proxy: 'https://proxy.example.test' },
      { unix: '/tmp/service.sock' },
      { tls: { rejectUnauthorized: false } },
      { protocol: 'http2' },
      { s3: { region: 'us-east-1' } },
      { decompress: false },
    ] as BunFetchRequestInit[]) {
      expect(() => prepareOutboundRequest('https://api.example.com/v1', init, PUBLIC_READ_POLICY))
        .toThrow();
    }
  });

  test('owned named proxy and H2 require exact control grants', () => {
    const guarded = {
      ...PUBLIC_READ_POLICY,
      route: { mode: 'named-proxy', proxy: 'https://proxy.example.test' },
      protocol: { allowed: ['h1', 'h2'], default: 'h2' },
      controlProfile: 'production',
      controlGrants: [
        { control: 'request-proxy', values: ['https://proxy.example.test'], reason: 'named egress' },
        { control: 'request-protocol', values: ['h2'], reason: 'H2 transport' },
      ],
    } as const satisfies OutboundEndpointPolicy;
    const prepared = prepareOutboundRequest('https://api.example.com/v1', {}, guarded);
    expect(prepared.route.mode).toBe('named-proxy');
    expect(prepared.init.proxy).toBe('https://proxy.example.test');
    expect(prepared.init.protocol).toBe('http2');
    expect(() => prepareOutboundRequest('https://api.example.com/v1', { proxy: 'https://other.test' }, guarded))
      .toThrow('cannot override');
    expect(() => prepareOutboundRequest('https://api.example.com/v1', {}, {
      ...guarded, controlGrants: guarded.controlGrants.slice(1),
    })).toThrow('missing-grant');
  });

  test('direct and environment-proxy modes have distinct environment authority', async () => {
    let calls = 0;
    const fetcher: OutboundFetch = async () => { calls++; return new Response('ok'); };
    expect(() => fetchWithPolicy('https://api.example.com/v1', {}, PUBLIC_READ_POLICY, fetcher, {
      environment: { HTTPS_PROXY: 'https://proxy.example.test' },
    })).toThrow('active proxy environment');

    const envPolicy = {
      ...PUBLIC_READ_POLICY,
      route: { mode: 'env-proxy', allowedProxyOrigins: ['https://proxy.example.test'] },
      controlGrants: [{ control: 'request-proxy', values: ['https://proxy.example.test'], reason: 'env egress' }],
    } as const satisfies OutboundEndpointPolicy;
    await fetchWithPolicy('https://api.example.com/v1', {}, envPolicy, fetcher, {
      environment: { HTTPS_PROXY: 'https://proxy.example.test' },
    });
    expect(calls).toBe(1);
  });

  test('offline modes reject before resolver and fetch, while public-only rejects mixed DNS', async () => {
    let resolverCalls = 0;
    let fetchCalls = 0;
    const resolver = async () => { resolverCalls++; return [{ address: '1.1.1.1', family: 4 as const, ttl: 30, source: 'bun' as const }]; };
    const fetcher: OutboundFetch = async () => { fetchCalls++; return new Response('ok'); };
    expect(() => fetchWithPolicy('https://api.example.com/v1', {}, {
      ...PUBLIC_READ_POLICY, networkMode: 'offline-no-socket', ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    }, fetcher, { resolver, environment: {} })).toThrow('forbids network fetch');
    expect(resolverCalls).toBe(0);
    expect(fetchCalls).toBe(0);

    await expect(fetchWithPolicy('https://api.example.com/v1', {}, {
      ...PUBLIC_READ_POLICY, ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    }, fetcher, { environment: {}, resolver: async () => [
      { address: '1.1.1.1', family: 4, ttl: 30, source: 'bun' },
      { address: '10.0.0.1', family: 4, ttl: 30, source: 'bun' },
    ] })).rejects.toThrow('mixed public/non-public');
    expect(fetchCalls).toBe(0);
  });

  test('enforces declared and streaming response byte bounds', async () => {
    const bounded = { ...PUBLIC_READ_POLICY, responseByteLimit: 3 } as const satisfies OutboundEndpointPolicy;
    await expect(fetchWithPolicy('https://api.example.com/v1', {}, bounded,
      async () => new Response('large', { headers: { 'content-length': '5' } }), { environment: {} }))
      .rejects.toThrow('exceeds 3 bytes');
    const response = await fetchWithPolicy('https://api.example.com/v1', {}, bounded,
      async () => new Response('large'), { environment: {} });
    await expect(response.text()).rejects.toThrow('exceeds 3 bytes');
  });
});
