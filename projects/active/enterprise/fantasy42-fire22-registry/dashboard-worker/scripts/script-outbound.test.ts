import { describe, expect, test } from 'bun:test';
import type { AuthorityAddressResolver } from '../../../../../../lib/http/ip-authority.ts';
import { fetchKnownScriptOutbound, fetchScriptOutbound } from './script-outbound.ts';

const publicResolver: AuthorityAddressResolver = async () => [
  { address: '1.1.1.1', family: 4, ttl: 30, source: 'bun' },
];
const noProxyEnvironment = { FIRE22_NETWORK_MODE: 'online', NO_PROXY: '*' };

describe('Fantasy42 script outbound boundary', () => {
  test('binds an exact registry route and owns transport defaults', async () => {
    let observed: BunFetchRequestInit | undefined;
    const response = await fetchScriptOutbound(
      'package-registry',
      'https://registry.npmjs.org/@changesets/cli/latest',
      { method: 'HEAD' },
      {
        resolver: publicResolver,
        environment: noProxyEnvironment,
        fetcher: async (_input, init) => {
          observed = init;
          return new Response(null, { status: 200 });
        },
      }
    );

    expect(response.status).toBe(200);
    expect(observed?.method).toBe('HEAD');
    expect(observed?.redirect).toBe('error');
    expect(observed?.credentials).toBe('omit');
    expect(observed?.proxy).toBeUndefined();
    expect(observed?.protocol).toBeUndefined();
  });

  test('covers every script authority with hermetic exact-route fixtures', async () => {
    const urls = [
      'https://registry.npmjs.org/lodash/latest',
      'https://registry.yarnpkg.com/-/ping',
      'https://registry.npmmirror.com/-/ping',
      'https://cdn.jsdelivr.net/',
      'https://npm.cloudflare.com/@changesets/cli/latest',
      'https://packages.apexodds.net/',
      'https://fire22.workers.dev/registry/',
      'https://fire22-security-registry.nolarose1968-806.workers.dev/health',
      'https://dashboard-worker.nolarose1968-806.workers.dev/feeds/error-codes-rss.xml',
      'https://dashboard-worker-development.nolarose1968-806.workers.dev/',
      'https://dashboard-worker-staging.nolarose1968-806.workers.dev/',
      'https://brendadeeznuts1111.github.io/fire22-dashboard-worker/wiki',
      'https://dashboard.fire22.ag/api/health',
      'https://fire22-dashboard.pages.dev/finance',
      'https://staging.fire22-dashboard.pages.dev/technology/',
      'https://api.github.com/repos/brendadeeznuts1111/fire22-dashboard-worker/pages',
      'https://httpbin.org/user-agent',
      'https://api.fire22.com/health',
      'https://api.staging.fire22.com/health',
      'https://fire22.ag/cloud/api/health',
      'http://localhost:3000/dashboard',
      'http://localhost:3000/api/customer-config/list',
      'http://localhost:3001/health',
      'http://localhost:3001/api/status',
      'http://localhost:8080/api/health/detailed',
      'http://localhost:8787/api/agents',
    ];
    let calls = 0;
    for (const url of urls) {
      const response = await fetchKnownScriptOutbound(url, {}, {
        resolver: publicResolver,
        environment: noProxyEnvironment,
        fetcher: async () => {
          calls++;
          return new Response('ok');
        },
      });
      expect(response.ok).toBeTrue();
    }
    expect(calls).toBe(urls.length);
  });

  test('rejects unknown origins, lookalikes, paths, and URL credentials before I/O', async () => {
    let io = 0;
    const options = {
      resolver: async () => {
        io++;
        return [];
      },
      environment: noProxyEnvironment,
      fetcher: async () => {
        io++;
        return new Response('unexpected');
      },
    };

    expect(() => fetchKnownScriptOutbound('https://example.com/', {}, options)).toThrow(
      'not allowlisted'
    );
    expect(() =>
      fetchScriptOutbound('httpbin', 'https://httpbin.org.example/user-agent', {}, options)
    ).toThrow('not allowlisted');
    expect(() =>
      fetchScriptOutbound('httpbin', 'https://httpbin.org/anything', {}, options)
    ).toThrow('not allowlisted');
    expect(() =>
      fetchKnownScriptOutbound('https://user:pass@registry.npmjs.org/-/ping', {}, options)
    ).toThrow('credentials denied');
    expect(io).toBe(0);
  });

  test('denies method, credentials, redirect, proxy, TLS, and protocol overrides', async () => {
    const denied: BunFetchRequestInit[] = [
      { method: 'POST' },
      { headers: { Authorization: 'Bearer secret' } },
      { redirect: 'follow' },
      { proxy: 'https://proxy.example' },
      { tls: { rejectUnauthorized: false } },
      { protocol: 'http2' },
    ];

    for (const init of denied) {
      expect(() =>
        fetchScriptOutbound('httpbin', 'https://httpbin.org/user-agent', init, {
          resolver: publicResolver,
          environment: noProxyEnvironment,
        })
      ).toThrow();
    }
  });

  test('denies offline mode and ambient proxy before DNS or fetch', async () => {
    let io = 0;
    const resolver = async () => {
      io++;
      return [];
    };
    const fetcher = async () => {
      io++;
      return new Response('unexpected');
    };

    expect(() =>
      fetchScriptOutbound('httpbin', 'https://httpbin.org/user-agent', {}, {
        resolver,
        fetcher,
        networkMode: 'offline-no-socket',
        environment: noProxyEnvironment,
      })
    ).toThrow('forbids network fetch');
    expect(() =>
      fetchScriptOutbound('httpbin', 'https://httpbin.org/user-agent', {}, {
        resolver,
        fetcher,
        environment: { FIRE22_NETWORK_MODE: 'online', HTTPS_PROXY: 'https://proxy.example' },
      })
    ).toThrow('active proxy environment');
    expect(io).toBe(0);
  });

  test('bounds responses and performs unsafe local writes once', async () => {
    let calls = 0;
    const options = {
      environment: noProxyEnvironment,
      fetcher: async () => {
        calls++;
        return new Response('x', { headers: { 'content-length': '5000000' } });
      },
    };

    await expect(
      fetchScriptOutbound(
        'dashboard-local',
        'http://localhost:3000/api/customer-config',
        { method: 'POST', body: '{}' },
        options
      )
    ).rejects.toThrow('exceeds');
    expect(calls).toBe(1);
  });
});
