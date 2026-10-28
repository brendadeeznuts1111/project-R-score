import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../../lib/http/outbound-policy.ts';
import { fetchBunCatalog } from '../infrastructure/outbound-client.ts';

const publicResolver = async () => [
  { address: '93.184.216.34', family: 4 as const, ttl: 60, source: 'dns' as const },
];

describe('Kal Poly Bot outbound authority', () => {
  test('builds one exact credential-free request', async () => {
    let observed: { readonly url: string; readonly init?: BunFetchRequestInit } | undefined;
    const fetcher: OutboundFetch = async (input, init) => {
      observed = { url: input.toString(), init };
      return new Response('{"ok":true}', {
        headers: { 'content-type': 'application/json' },
      });
    };

    const response = await fetchBunCatalog(
      '/v1/audit',
      { method: 'POST', body: '{}' },
      { fetcher, resolver: publicResolver, environment: {} }
    );

    expect(response.status).toBe(200);
    expect(observed?.url).toBe('https://api.buncatalog.com/v1/audit');
    expect(observed?.init?.method).toBe('POST');
    expect(observed?.init?.redirect).toBe('error');
    expect(observed?.init?.credentials).toBe('omit');
  });

  test('offline denial happens before DNS or fetch', async () => {
    let resolutions = 0;
    let effects = 0;
    await expect(
      fetchBunCatalog(
        '/v1/audit',
        { method: 'POST', body: '{}' },
        {
          networkMode: 'offline-no-socket',
          environment: {},
          resolver: async () => {
            resolutions++;
            return [];
          },
          fetcher: async () => {
            effects++;
            return new Response();
          },
        }
      )
    ).rejects.toThrow('forbids network fetch');
    expect(resolutions).toBe(0);
    expect(effects).toBe(0);
  });

  test.each([
    ['arbitrary route', '/v1/audit?redirect=https://evil.test', {}, 'route is not allowed'],
    ['wrong method', '/v1/audit', { method: 'GET' }, 'method GET is not allowed'],
    [
      'credential header',
      '/v1/audit',
      { method: 'POST', headers: { authorization: 'Bearer secret' } },
      'credentials are forbidden',
    ],
    [
      'redirect override',
      '/v1/audit',
      { method: 'POST', redirect: 'follow' },
      'redirect mode cannot override',
    ],
    [
      'proxy override',
      '/v1/audit',
      { method: 'POST', proxy: 'https://proxy.example' },
      'proxy cannot override',
    ],
  ] as const)('%s is denied before any effect', async (_name, route, init, message) => {
    let effects = 0;
    await expect(
      fetchBunCatalog(route as '/v1/audit', init as BunFetchRequestInit, {
        environment: {},
        resolver: publicResolver,
        fetcher: async () => {
          effects++;
          return new Response();
        },
      })
    ).rejects.toThrow(message);
    expect(effects).toBe(0);
  });

  test('an unsafe telemetry failure is never replayed', async () => {
    let effects = 0;
    const response = await fetchBunCatalog(
      '/v1/audit',
      { method: 'POST', body: '{}' },
      {
        environment: {},
        resolver: publicResolver,
        fetcher: async () => {
          effects++;
          return new Response('ambiguous', { status: 503 });
        },
      }
    );
    expect(response.status).toBe(503);
    expect(effects).toBe(1);
  });

  test('response bodies are bounded while streaming', async () => {
    await expect(
      fetchBunCatalog('/v1/infrastructure/status', {}, {
        environment: {},
        resolver: publicResolver,
        fetcher: async () =>
          new Response(new Uint8Array(65 * 1024), {
            headers: { 'content-length': String(65 * 1024) },
          }),
      })
    ).rejects.toThrow('response exceeds 65536 bytes');
  });
});
