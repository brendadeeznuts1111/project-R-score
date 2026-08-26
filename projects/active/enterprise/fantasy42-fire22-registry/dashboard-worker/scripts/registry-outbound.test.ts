import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../../lib/http/outbound-policy.ts';
import {
  fetchFire22RegistryHealth,
  type RegistryOutboundOptions,
} from './registry-outbound.ts';

function hermetic(response = Response.json({ ok: true })) {
  const effects: {
    resolver: number;
    fetch: number;
    input?: string | URL;
    init?: BunFetchRequestInit;
  } = { resolver: 0, fetch: 0 };
  const fetcher: OutboundFetch = async (input, init) => {
    effects.fetch += 1;
    effects.input = input;
    effects.init = init;
    return response;
  };
  const options: RegistryOutboundOptions = {
    environment: {},
    resolver: async () => {
      effects.resolver += 1;
      return [{ address: '104.16.123.96', family: 4, ttl: 60, source: 'bun' }];
    },
    fetcher,
  };
  return { effects, options };
}

describe('Fire22 registry credential boundary', () => {
  test('binds the token to the exact health route and guarded transport', async () => {
    const { effects, options } = hermetic();
    const response = await fetchFire22RegistryHealth('fixture-token', {}, options);

    expect(response.ok).toBe(true);
    expect(effects.resolver).toBe(1);
    expect(effects.fetch).toBe(1);
    expect(effects.input?.toString()).toBe(
      'https://fire22-security-registry.nolarose1968-806.workers.dev/health'
    );
    expect(new Headers(effects.init?.headers).get('authorization')).toBe(
      'Bearer fixture-token'
    );
    expect(effects.init?.method).toBe('GET');
    expect(effects.init?.redirect).toBe('error');
    expect(effects.init?.credentials).toBe('omit');
    expect(effects.init?.signal).toBeInstanceOf(AbortSignal);
  });

  test('rejects empty, injected, and caller-owned credentials before I/O', () => {
    for (const [token, init] of [
      ['', {}],
      ['fixture\r\ninjected', {}],
      ['fixture', { headers: { authorization: 'Bearer attacker' } }],
      ['fixture', { headers: { cookie: 'session=attacker' } }],
    ] as const) {
      const { effects, options } = hermetic();
      expect(() => fetchFire22RegistryHealth(token, init, options)).toThrow();
      expect(effects).toMatchObject({ resolver: 0, fetch: 0 });
    }
  });

  test('denies method, proxy, TLS, protocol, redirect, and ambient overrides', () => {
    const overrides = [
      { method: 'POST' },
      { body: 'not replay-safe' },
      { proxy: 'https://proxy.example' },
      { tls: { rejectUnauthorized: false } },
      { protocol: 'http2' as const },
      { redirect: 'follow' as const },
      { credentials: 'include' as const },
    ] satisfies readonly BunFetchRequestInit[];
    for (const init of overrides) {
      const { effects, options } = hermetic();
      expect(() => fetchFire22RegistryHealth('fixture', init, options)).toThrow();
      expect(effects).toMatchObject({ resolver: 0, fetch: 0 });
    }
  });

  test('rejects offline, active proxy, private DNS, and oversized responses', async () => {
    const offline = hermetic();
    expect(() =>
      fetchFire22RegistryHealth('fixture', {}, {
        ...offline.options,
        networkMode: 'offline-no-socket',
      })
    ).toThrow('forbids network fetch');
    expect(offline.effects).toMatchObject({ resolver: 0, fetch: 0 });

    const invalidMode = hermetic();
    expect(() =>
      fetchFire22RegistryHealth('fixture', {}, {
        ...invalidMode.options,
        environment: { FIRE22_NETWORK_MODE: 'sometimes' },
      })
    ).toThrow('FIRE22_NETWORK_MODE');
    expect(invalidMode.effects).toMatchObject({ resolver: 0, fetch: 0 });

    const proxied = hermetic();
    expect(() =>
      fetchFire22RegistryHealth('fixture', {}, {
        ...proxied.options,
        environment: { HTTPS_PROXY: 'https://proxy.example' },
      })
    ).toThrow('blocked by active proxy environment');
    expect(proxied.effects).toMatchObject({ resolver: 0, fetch: 0 });

    let privateFetches = 0;
    await expect(
      fetchFire22RegistryHealth('fixture', {}, {
        environment: {},
        resolver: async () => [
          { address: '169.254.169.254', family: 4, ttl: 60, source: 'bun' },
        ],
        fetcher: async () => {
          privateFetches += 1;
          return Response.json({ ok: false });
        },
      })
    ).rejects.toThrow(/public|metadata/i);
    expect(privateFetches).toBe(0);

    const oversized = hermetic(
      new Response('x', { headers: { 'content-length': '1000001' } })
    );
    await expect(
      fetchFire22RegistryHealth('fixture', {}, oversized.options)
    ).rejects.toThrow('exceeds 1000000 bytes');
  });
});
