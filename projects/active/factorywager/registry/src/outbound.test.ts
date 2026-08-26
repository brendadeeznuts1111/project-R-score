import { describe, expect, it } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy.ts';
import {
  createFactoryRegistryOutboundAuthority,
  fetchFactoryRegistryOutbound,
  type FactoryRegistryOutboundOptions,
} from './outbound.ts';

const publicResolver = async () => [
  { address: '104.16.1.1', family: 4 as const, ttl: 60, source: 'node-resolver' as const },
];

function execution(fetcher: OutboundFetch): FactoryRegistryOutboundOptions {
  return { fetcher, resolver: publicResolver, environment: {} };
}

describe('factory registry outbound boundary', () => {
  it('binds fixed production authorities and local development to exact origins', () => {
    expect(() =>
      createFactoryRegistryOutboundAuthority('npm-registry', 'https://evil.example')
    ).toThrow('registry.npmjs.org');
    expect(() =>
      createFactoryRegistryOutboundAuthority('unpkg-readme', 'https://cdn.example')
    ).toThrow('unpkg.com');
    expect(() =>
      createFactoryRegistryOutboundAuthority('local-dashboard', 'https://localhost:3006/dashboard')
    ).toThrow('HTTP loopback');
    expect(() =>
      createFactoryRegistryOutboundAuthority('local-dashboard', 'http://localhost:3006/admin')
    ).toThrow('owned dashboard path');
    expect(
      createFactoryRegistryOutboundAuthority(
        'npm-registry',
        'http://127.0.0.1:4873/private'
      ).origin
    ).toBe('http://127.0.0.1:4873');
  });

  it('rejects origin, exact-URL, and owned-path escapes before transport', () => {
    let effects = 0;
    const guarded = execution(async () => {
      effects++;
      return new Response('never');
    });
    const npm = createFactoryRegistryOutboundAuthority(
      'npm-registry',
      'https://registry.npmjs.org'
    );
    const feed = createFactoryRegistryOutboundAuthority(
      'rss-feed',
      'https://bun.sh/blog.rss'
    );
    const duo = createFactoryRegistryOutboundAuthority(
      'duoplus-api',
      'https://api.duoplus.example'
    );
    expect(() =>
      fetchFactoryRegistryOutbound(npm, 'https://example.com/pkg', {}, guarded)
    ).toThrow('exact origin');
    expect(() =>
      fetchFactoryRegistryOutbound(feed, 'https://bun.sh/other.rss', {}, guarded)
    ).toThrow('exact URL');
    expect(() =>
      fetchFactoryRegistryOutbound(duo, 'https://api.duoplus.example/api/v1/admin', {
        method: 'POST',
      }, guarded)
    ).toThrow('owned device-info path');
    expect(effects).toBe(0);
  });

  it('denies credentials, redirects, proxy, TLS, protocol, and offline sockets', () => {
    let effects = 0;
    const guarded = execution(async () => {
      effects++;
      return new Response('never');
    });
    const authority = createFactoryRegistryOutboundAuthority(
      'npm-registry',
      'https://registry.npmjs.org'
    );
    const call = (init: BunFetchRequestInit, options = guarded) =>
      fetchFactoryRegistryOutbound(authority, 'https://registry.npmjs.org/pkg', init, options);
    expect(() => call({ headers: { Authorization: 'secret' } })).toThrow(
      'credentials are forbidden'
    );
    expect(() => call({ redirect: 'follow' })).toThrow('redirect mode');
    expect(() => call({ proxy: 'http://proxy.test' })).toThrow('proxy cannot override');
    expect(() => call({ tls: { rejectUnauthorized: false } })).toThrow(
      'Outbound request extension is denied'
    );
    expect(() =>
      call({ protocol: 'http3' } as unknown as BunFetchRequestInit)
    ).toThrow('protocol h3 is not allowed');
    expect(() => call({}, { ...guarded, networkMode: 'offline-no-socket' })).toThrow(
      'forbids network fetch'
    );
    expect(effects).toBe(0);
  });

  it('permits scoped webhook authorization but denies ambient credentials', async () => {
    let captured: BunFetchRequestInit | undefined;
    const authority = createFactoryRegistryOutboundAuthority(
      'webhook',
      'https://hooks.example/alert'
    );
    await fetchFactoryRegistryOutbound(
      authority,
      'https://hooks.example/alert',
      { method: 'POST', headers: { Authorization: 'Bearer owned' }, body: '{}' },
      execution(async (_input, init) => {
        captured = init;
        return new Response('ok');
      })
    );
    expect(captured?.credentials).toBe('omit');
    expect(captured?.redirect).toBe('error');
    expect(() =>
      fetchFactoryRegistryOutbound(
        authority,
        'https://hooks.example/alert',
        { method: 'POST', credentials: 'include' },
        execution(async () => new Response('never'))
      )
    ).toThrow('ambient credentials');
  });

  it('rejects production proxy routing and private DNS authority before transport', async () => {
    let effects = 0;
    const authority = createFactoryRegistryOutboundAuthority(
      'npm-registry',
      'https://registry.npmjs.org'
    );
    expect(() =>
      fetchFactoryRegistryOutbound(authority, 'https://registry.npmjs.org/pkg', {}, {
        environment: { HTTPS_PROXY: 'http://proxy.test' },
        fetcher: async () => {
          effects++;
          return new Response('never');
        },
      })
    ).toThrow('blocked by active proxy environment');
    await expect(
      fetchFactoryRegistryOutbound(authority, 'https://registry.npmjs.org/pkg', {}, {
        environment: {},
        resolver: async () => [
          {
            address: '127.0.0.1',
            family: 4,
            ttl: 60,
            source: 'node-resolver' as const,
          },
        ],
        fetcher: async () => {
          effects++;
          return new Response('never');
        },
      })
    ).rejects.toThrow('DNS authority rejected');
    expect(effects).toBe(0);
  });
});
