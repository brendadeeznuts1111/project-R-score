import { describe, expect, test } from 'bun:test';
import type { AuthorityAddressResolver } from '../../../../../../lib/http/ip-authority.ts';
import {
  fetchFinalDeployment,
  fetchFinalEdge,
  fetchFinalServer,
} from './final-outbound.ts';

const publicResolver: AuthorityAddressResolver = async () => [
  { address: '1.1.1.1', family: 4, ttl: 30, source: 'bun' },
];
const directEnvironment = { FIRE22_NETWORK_MODE: 'online', NO_PROXY: '*' };
const options = {
  resolver: publicResolver,
  environment: directEnvironment,
  fetcher: async () => new Response('ok'),
};

describe('Fantasy42 final outbound runtime planes', () => {
  test('binds exact edge, server, deployment, and loopback authorities', async () => {
    const requests = [
      fetchFinalEdge('https://raw.githubusercontent.com/fire22/docs/main/index.md', {}, options),
      fetchFinalServer('https://registry.npmjs.org/bun', {}, options),
      fetchFinalServer('https://api.fantasy402.com/v2/events', {
        headers: { Authorization: 'Bearer fixture' },
      }, options),
      fetchFinalServer('https://api.fantasy42.com/v1/security', {
        headers: { Authorization: 'Bearer fixture' },
      }, options),
      fetchFinalServer('http://localhost:49152/api/health', {}, options),
      fetchFinalDeployment('https://docs.apexodds.net/health', {}, options),
      fetchFinalDeployment('https://api.github.com/repos/fire22/example', {}, options),
      fetchFinalDeployment('https://npm.enterprise.com/@enterprise/core', {}, options),
      fetchFinalDeployment(
        'https://crystal-clear-docs.nolarose1968.workers.dev/health',
        {},
        options
      ),
    ];
    for (const request of requests) expect((await request).ok).toBeTrue();
  });

  test('rejects cross-plane, unknown, lookalike, credentialed, and edge loopback URLs', () => {
    let io = 0;
    const noIo = {
      ...options,
      resolver: async () => {
        io++;
        return [];
      },
      fetcher: async () => {
        io++;
        return new Response('unexpected');
      },
    };
    expect(() => fetchFinalEdge('https://registry.npmjs.org/bun', {}, noIo)).toThrow();
    expect(() => fetchFinalServer('https://example.com/hook', {}, noIo)).toThrow();
    expect(() => fetchFinalServer('https://api.fantasy402.com.example/v2', {}, noIo)).toThrow();
    expect(() => fetchFinalServer('https://user:pass@api.fantasy402.com/v2', {}, noIo)).toThrow();
    expect(() => fetchFinalEdge('http://localhost:8787/api', {}, noIo)).toThrow();
    expect(io).toBe(0);
  });

  test('denies method, credentials, redirects, proxy, TLS, and protocol overrides', () => {
    const cases: BunFetchRequestInit[] = [
      { method: 'CONNECT' },
      { headers: { Authorization: 'Bearer leaked' } },
      { redirect: 'follow' },
      { credentials: 'include' },
      { proxy: 'https://proxy.example' },
      { tls: { rejectUnauthorized: false } },
      { protocol: 'http2' },
      { body: 'GET body' },
    ];
    for (const init of cases) {
      expect(() => fetchFinalServer('https://registry.npmjs.org/bun', init, options)).toThrow();
    }
  });

  test('denies offline, ambient proxy, and private DNS before fetch', async () => {
    let fetches = 0;
    const fetcher = async () => {
      fetches++;
      return new Response('unexpected');
    };
    expect(() => fetchFinalServer('https://api.apexodds.net/health', {}, {
      ...options,
      fetcher,
      networkMode: 'offline-no-socket',
    })).toThrow('forbids network fetch');
    expect(() => fetchFinalServer('https://api.apexodds.net/health', {}, {
      ...options,
      fetcher,
      environment: { HTTPS_PROXY: 'https://proxy.example' },
    })).toThrow('active proxy environment');
    await expect(fetchFinalServer('https://api.apexodds.net/health', {}, {
      ...options,
      fetcher,
      resolver: async () => [
        { address: '127.0.0.1', family: 4, ttl: 30, source: 'bun' as const },
      ],
    })).rejects.toThrow('DNS authority rejected');
    expect(fetches).toBe(0);
  });

  test('bounds responses and performs unsafe writes once', async () => {
    let calls = 0;
    await expect(fetchFinalServer('https://api.fantasy402.com/v2/session', {
      method: 'POST',
      body: '{}',
    }, {
      ...options,
      fetcher: async () => {
        calls++;
        return new Response('x', { headers: { 'content-length': '8000001' } });
      },
    })).rejects.toThrow('exceeds');
    expect(calls).toBe(1);
  });
});
