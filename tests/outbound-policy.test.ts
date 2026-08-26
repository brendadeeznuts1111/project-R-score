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
});
