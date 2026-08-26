import { describe, expect, test } from 'bun:test';
import type { AuthorityAddressResolver } from '../../../../../../../lib/http/ip-authority.ts';
import { fetchSurfaceOutbound } from './surface-outbound.ts';

const publicResolver: AuthorityAddressResolver = async () => [
  { address: '1.1.1.1', family: 4, ttl: 30, source: 'bun' },
];
const directEnvironment = { FIRE22_NETWORK_MODE: 'online', NO_PROXY: '*' };

describe('Fantasy42 residual surface outbound boundary', () => {
  test('binds fixed public, runtime loopback, and browser same-origin authorities', async () => {
    const cases = [
      ['https://registry.npmjs.org/', {}],
      ['https://fire22.workers.dev/registry/', {}],
      ['https://dashboard-worker.nolarose1968-806.workers.dev/health', {}],
      ['https://dashboard-worker.brendawill2233.workers.dev/api/health', {}],
      ['https://api.crystal-clear-architecture.com/v1/employees', {
        headers: { Authorization: 'Bearer fixture', 'X-API-Key': 'fixture' },
      }],
      ['http://localhost:49152/api/test', {}],
      ['/api/security/scan', { method: 'POST' }],
    ] as const;
    let calls = 0;
    for (const [url, init] of cases) {
      const response = await fetchSurfaceOutbound(url, init, {
        browserOrigin: 'https://dashboard.fire22.ag',
        resolver: publicResolver,
        environment: directEnvironment,
        fetcher: async () => {
          calls++;
          return new Response('ok');
        },
      });
      expect(response.ok).toBeTrue();
    }
    expect(calls).toBe(cases.length);
  });

  test('rejects unknown, lookalike, credentialed, and cross-origin browser routes before I/O', () => {
    let io = 0;
    const options = {
      browserOrigin: 'https://dashboard.fire22.ag',
      resolver: async () => {
        io++;
        return [];
      },
      environment: directEnvironment,
      fetcher: async () => {
        io++;
        return new Response('unexpected');
      },
    };
    expect(() => fetchSurfaceOutbound('https://example.com/hook', {}, options)).toThrow(
      'not allowlisted'
    );
    expect(() =>
      fetchSurfaceOutbound('https://api.fire22.com.example/v1', {}, options)
    ).toThrow('not allowlisted');
    expect(() =>
      fetchSurfaceOutbound('https://user:pass@api.fire22.com/v1', {}, options)
    ).toThrow('credentials');
    expect(() => fetchSurfaceOutbound('/assets/app.js', {}, options)).toThrow('/api routes');
    expect(io).toBe(0);
  });

  test('denies method credentials, redirects, proxy, TLS, and protocol overrides', () => {
    const cases: BunFetchRequestInit[] = [
      { method: 'CONNECT' },
      { headers: { Authorization: 'Bearer leaked' } },
      { redirect: 'follow' },
      { credentials: 'include' },
      { proxy: 'https://proxy.example' },
      { tls: { rejectUnauthorized: false } },
      { protocol: 'http2' },
    ];
    for (const init of cases) {
      expect(() =>
        fetchSurfaceOutbound('https://registry.npmjs.org/', init, {
          resolver: publicResolver,
          environment: directEnvironment,
        })
      ).toThrow();
    }
  });

  test('denies offline, ambient proxy, and private DNS before fetch', async () => {
    let fetches = 0;
    const fetcher = async () => {
      fetches++;
      return new Response('unexpected');
    };
    expect(() =>
      fetchSurfaceOutbound('https://api.fire22.com/v1', {}, {
        fetcher,
        resolver: publicResolver,
        networkMode: 'offline-no-socket',
        environment: directEnvironment,
      })
    ).toThrow('forbids network fetch');
    expect(() =>
      fetchSurfaceOutbound('https://api.fire22.com/v1', {}, {
        fetcher,
        resolver: publicResolver,
        environment: { FIRE22_NETWORK_MODE: 'online', HTTPS_PROXY: 'https://proxy.example' },
      })
    ).toThrow('active proxy environment');
    await expect(
      fetchSurfaceOutbound('https://api.fire22.com/v1', {}, {
        fetcher,
        environment: directEnvironment,
        resolver: async () => [
          { address: '127.0.0.1', family: 4, ttl: 30, source: 'bun' as const },
        ],
      })
    ).rejects.toThrow('DNS authority rejected');
    expect(fetches).toBe(0);
  });

  test('bounds responses and performs unsafe writes once', async () => {
    let calls = 0;
    await expect(
      fetchSurfaceOutbound(
        'http://localhost:8787/api/auth/login',
        { method: 'POST', body: '{}' },
        {
          environment: directEnvironment,
          fetcher: async () => {
            calls++;
            return new Response('x', { headers: { 'content-length': '5000000' } });
          },
        }
      )
    ).rejects.toThrow('exceeds');
    expect(calls).toBe(1);
  });
});
