import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../../../lib/http/outbound-policy.ts';
import {
  fetchCloudflareApi,
  fetchPublicRead,
  fetchR2S3,
  fetchServiceOrigin,
  parseFantasy42NetworkMode,
  type Fantasy42OutboundOptions,
} from './outbound-client.ts';
import { BunR2Client } from '../utils/bun-r2-client.ts';
import { AuthTestClient } from '../../core/api/handlers/jwt-auth-test-client.ts';

function hermeticOptions(response = new Response('{}')): {
  readonly options: Fantasy42OutboundOptions;
  readonly effects: { resolver: number; fetch: number; init?: BunFetchRequestInit };
} {
  const effects: { resolver: number; fetch: number; init?: BunFetchRequestInit } = {
    resolver: 0,
    fetch: 0,
  };
  const fetcher: OutboundFetch = async (_input, init) => {
    effects.fetch += 1;
    effects.init = init;
    return response;
  };
  return {
    effects,
    options: {
      environment: {},
      resolver: async () => {
        effects.resolver += 1;
        return [{ address: '93.184.216.34', family: 4, ttl: 60, source: 'bun' }];
      },
      fetcher,
    },
  };
}

describe('Fantasy42 outbound boundary', () => {
  test('rejects credential authority changes before DNS or fetch', () => {
    const { effects, options } = hermeticOptions();

    expect(() =>
      fetchCloudflareApi(
        'https://attacker.example/client/v4/accounts/abc/storage/kv/namespaces',
        { headers: { authorization: 'Bearer secret' } },
        options
      )
    ).toThrow('api.cloudflare.com');
    expect(() =>
      fetchR2S3(
        'https://account.r2.cloudflarestorage.com',
        'https://other.r2.cloudflarestorage.com/bucket/key',
        { headers: { authorization: 'AWS4-HMAC-SHA256 secret' } },
        options
      )
    ).toThrow('credential authority');
    expect(effects).toMatchObject({ resolver: 0, fetch: 0 });
  });

  test('rejects offline and invalid environment modes before DNS or fetch', () => {
    const offline = hermeticOptions();
    expect(() =>
      fetchCloudflareApi(
        'https://api.cloudflare.com/client/v4/user/tokens/verify',
        { method: 'GET' },
        { ...offline.options, networkMode: 'offline-no-socket' }
      )
    ).toThrow('forbids network fetch');
    expect(offline.effects).toMatchObject({ resolver: 0, fetch: 0 });

    const invalid = hermeticOptions();
    expect(() =>
      fetchCloudflareApi(
        'https://api.cloudflare.com/client/v4/user/tokens/verify',
        { method: 'GET' },
        { ...invalid.options, environment: { FIRE22_NETWORK_MODE: 'sometimes' } }
      )
    ).toThrow('FIRE22_NETWORK_MODE');
    expect(invalid.effects).toMatchObject({ resolver: 0, fetch: 0 });
  });

  test('blocks private DNS and credentialed public reads before fetch', async () => {
    let fetchCalls = 0;
    await expect(
      fetchPublicRead('https://metadata.example/resource', {}, {
        environment: {},
        resolver: async () => [
          { address: '169.254.169.254', family: 4, ttl: 60, source: 'bun' },
        ],
        fetcher: async () => {
          fetchCalls += 1;
          return new Response('forbidden');
        },
      })
    ).rejects.toThrow(/metadata|public/i);
    expect(fetchCalls).toBe(0);

    const credentialed = hermeticOptions();
    expect(() =>
      fetchPublicRead(
        'https://example.com/resource',
        { headers: { authorization: 'Bearer secret' } },
        credentialed.options
      )
    ).toThrow('credentials are forbidden');
    expect(credentialed.effects).toMatchObject({ resolver: 0, fetch: 0 });
  });

  test('binds loopback credentials and fixes redirect, deadline, and ambient credentials', async () => {
    const { effects, options } = hermeticOptions(new Response('{"ok":true}'));
    const response = await fetchServiceOrigin(
      'http://localhost:8787',
      'http://localhost:8787/auth/verify',
      {
        method: 'POST',
        headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
        body: '{}',
      },
      options
    );

    expect(response.ok).toBe(true);
    expect(effects.resolver).toBe(0);
    expect(effects.fetch).toBe(1);
    expect(effects.init?.redirect).toBe('error');
    expect(effects.init?.credentials).toBe('omit');
    expect(effects.init?.signal).toBeInstanceOf(AbortSignal);
  });

  test('enforces method/body replay shape and does not retry failed writes', async () => {
    const invalid = hermeticOptions();
    expect(() =>
      fetchPublicRead(
        'https://example.com/resource',
        { method: 'GET', body: 'not replay-safe' },
        invalid.options
      )
    ).toThrow('must not carry a body');
    expect(invalid.effects).toMatchObject({ resolver: 0, fetch: 0 });

    let attempts = 0;
    await expect(
      fetchCloudflareApi(
        'https://api.cloudflare.com/client/v4/accounts/abc/storage/kv/namespaces',
        {
          method: 'POST',
          headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
          body: '{}',
        },
        {
          environment: {},
          resolver: async () => [
            { address: '104.16.123.96', family: 4, ttl: 60, source: 'bun' },
          ],
          fetcher: async () => {
            attempts += 1;
            throw new Error('synthetic failure');
          },
        }
      )
    ).rejects.toThrow('synthetic failure');
    expect(attempts).toBe(1);
  });

  test('bounds responses and rejects active proxy overrides before DNS', async () => {
    const oversized = hermeticOptions(
      new Response('x', { headers: { 'content-length': '5000000' } })
    );
    await expect(
      fetchCloudflareApi(
        'https://api.cloudflare.com/client/v4/user/tokens/verify',
        { method: 'GET' },
        oversized.options
      )
    ).rejects.toThrow('exceeds 4000000 bytes');
    expect(oversized.effects).toMatchObject({ resolver: 1, fetch: 1 });

    const proxied = hermeticOptions();
    expect(() =>
      fetchCloudflareApi(
        'https://api.cloudflare.com/client/v4/user/tokens/verify',
        { method: 'GET' },
        { ...proxied.options, environment: { HTTPS_PROXY: 'https://proxy.example' } }
      )
    ).toThrow('blocked by active proxy environment');
    expect(proxied.effects).toMatchObject({ resolver: 0, fetch: 0 });
  });

  test('network mode parser is exact and default-online', () => {
    expect(parseFantasy42NetworkMode(undefined)).toBe('online');
    expect(parseFantasy42NetworkMode('cached-only')).toBe('cached-only');
    expect(() => parseFantasy42NetworkMode('offline')).toThrow('FIRE22_NETWORK_MODE');
  });

  test('signed R2 operations route through the guarded S3 authority', async () => {
    const { effects, options } = hermeticOptions(new Response('', { status: 200 }));
    const client = new BunR2Client({
      endpoint: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
      accessKeyId: 'fixture-access-key',
      secretAccessKey: 'fixture-secret-key',
      bucket: 'fixture-bucket',
      outbound: options,
    });

    await client.putObject('fixture.txt', 'guarded');

    expect(effects).toMatchObject({ resolver: 1, fetch: 1 });
    expect(new Headers(effects.init?.headers).get('authorization')).toStartWith(
      'AWS4-HMAC-SHA256'
    );
    expect(effects.init?.method).toBe('PUT');
  });

  test('JWT credential flow routes through its exact loopback service origin', async () => {
    const { effects, options } = hermeticOptions(
      Response.json({
        message: 'ok',
        user: { id: 'fixture', username: 'fixture', role: 'test' },
        token: 'fixture-token',
      })
    );
    const client = new AuthTestClient('http://localhost:8787', options);

    await client.testBasicAuth('fixture', 'fixture-password');

    expect(effects).toMatchObject({ resolver: 0, fetch: 1 });
    expect(new Headers(effects.init?.headers).get('authorization')).toStartWith('Basic ');
    expect(effects.init?.method).toBe('POST');
  });
});
