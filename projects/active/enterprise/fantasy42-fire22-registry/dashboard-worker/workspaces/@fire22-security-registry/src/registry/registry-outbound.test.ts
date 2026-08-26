import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../../../../../lib/http/outbound-policy.ts';
import {
  assertFire22RegistryBaseUrl,
  fetchFire22Registry,
  type RegistryOutboundOptions,
} from './registry-outbound.ts';

const publicResolver = async () => [
  { address: '93.184.216.34', family: 4 as const, ttl: 60, source: 'dns' as const },
];

function options(fetcher: OutboundFetch): RegistryOutboundOptions {
  return { fetcher, resolver: publicResolver, environment: {} };
}

describe('Fire22 registry outbound boundary', () => {
  test('allows the fixed registry authority with scoped authorization', async () => {
    let observed: RequestInit | undefined;
    const response = await fetchFire22Registry(
      'https://fire22.workers.dev/registry/@fire22/example',
      { headers: { Authorization: 'Bearer test' } },
      options(async (_url, init) => {
        observed = init;
        return new Response('{}');
      })
    );

    expect(response.status).toBe(200);
    expect(new Headers(observed?.headers).get('authorization')).toBe('Bearer test');
    expect(observed?.redirect).toBe('error');
    expect(observed?.credentials).toBe('omit');
  });

  test('rejects configured origin substitution before I/O', () => {
    expect(() => assertFire22RegistryBaseUrl('https://evil.example/registry/')).toThrow();
    expect(() => assertFire22RegistryBaseUrl('http://fire22.workers.dev/registry/')).toThrow();
    expect(() => assertFire22RegistryBaseUrl('https://fire22.workers.dev/registry/extra')).toThrow();
  });

  test('rejects authority and path escape before I/O', () => {
    const never: OutboundFetch = async () => {
      throw new Error('network effect occurred');
    };
    expect(() => fetchFire22Registry('https://evil.example/registry/a', {}, options(never))).toThrow(
      'escaped'
    );
    expect(() => fetchFire22Registry('https://fire22.workers.dev/admin', {}, options(never))).toThrow(
      'escaped'
    );
  });

  test('denies unscoped credentials and ambient credentials', () => {
    const never: OutboundFetch = async () => new Response('unexpected');
    expect(() =>
      fetchFire22Registry(
        'https://fire22.workers.dev/registry/a',
        { headers: { Cookie: 'session=secret' } },
        options(never)
      )
    ).toThrow('credentials are forbidden');
    expect(() =>
      fetchFire22Registry(
        'https://fire22.workers.dev/registry/a',
        { credentials: 'include' },
        options(never)
      )
    ).toThrow('ambient credentials');
  });

  test('denies proxy, TLS, protocol, redirect, and method overrides', () => {
    const never: OutboundFetch = async () => new Response('unexpected');
    const endpoint = 'https://fire22.workers.dev/registry/a';
    for (const init of [
      { proxy: 'https://proxy.example' },
      { tls: { rejectUnauthorized: false } },
      { protocol: 'http2' },
      { redirect: 'follow' as const },
      { method: 'DELETE' },
    ]) {
      expect(() => fetchFire22Registry(endpoint, init, options(never))).toThrow();
    }
  });

  test('denies offline and active environment proxy before I/O', async () => {
    let calls = 0;
    const fetcher: OutboundFetch = async () => {
      calls += 1;
      return new Response('unexpected');
    };
    const endpoint = 'https://fire22.workers.dev/registry/a';
    expect(() =>
      fetchFire22Registry(endpoint, {}, { ...options(fetcher), networkMode: 'offline-no-socket' })
    ).toThrow('forbids network fetch');
    expect(() =>
      fetchFire22Registry(endpoint, {}, {
        ...options(fetcher),
        environment: { HTTPS_PROXY: 'https://proxy.example' },
      })
    ).toThrow('active proxy');
    expect(calls).toBe(0);
  });

  test('bounds response bytes and performs unsafe writes only once', async () => {
    let calls = 0;
    const fetcher: OutboundFetch = async () => {
      calls += 1;
      return new Response(new Uint8Array(4 * 1024 * 1024 + 1));
    };
    const response = await fetchFire22Registry(
      'https://fire22.workers.dev/registry/@fire22/example',
      { method: 'PUT', body: '{}' },
      options(fetcher)
    );
    await expect(response.arrayBuffer()).rejects.toThrow('exceeds');
    expect(calls).toBe(1);
  });
});
