import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../../../lib/http/outbound-policy.ts';
import type { Fantasy42OutboundOptions } from './outbound-client.ts';
import { fetchConfiguredWebhook, fetchFixedFantasyApi } from './runtime-outbound.ts';

function hermetic(response = new Response('{}')): {
  readonly options: Fantasy42OutboundOptions;
  readonly effects: { dns: number; fetch: number; init?: BunFetchRequestInit };
} {
  const effects: { dns: number; fetch: number; init?: BunFetchRequestInit } = {
    dns: 0,
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
        effects.dns += 1;
        return [{ address: '93.184.216.34', family: 4, ttl: 60, source: 'bun' }];
      },
      fetcher,
    },
  };
}

describe('Fantasy42 runtime outbound authorities', () => {
  test('fixed API authority rejects origin and path changes before effects', () => {
    const { effects, options } = hermetic();
    expect(() =>
      fetchFixedFantasyApi(
        'https://attacker.example/cloud/api/Manager/getCustomers',
        { headers: { authorization: 'Bearer secret' } },
        options
      )
    ).toThrow('fixed API authority allowlist');
    expect(() =>
      fetchFixedFantasyApi(
        'https://fire22.ag/not-cloud-api',
        { headers: { authorization: 'Bearer secret' } },
        options
      )
    ).toThrow('fixed API authority allowlist');
    expect(effects).toEqual({ dns: 0, fetch: 0 });
  });

  test('fixed API scopes credentials and fixes redirect and deadlines', async () => {
    const { effects, options } = hermetic();
    await fetchFixedFantasyApi(
      'https://fire22.ag/cloud/api/Manager/getCustomers',
      {
        method: 'POST',
        headers: { authorization: 'Bearer fixture', cookie: 'session=fixture' },
        body: '{}',
      },
      options
    );
    expect(effects).toMatchObject({ dns: 1, fetch: 1 });
    expect(effects.init?.redirect).toBe('error');
    expect(effects.init?.credentials).toBe('omit');
    expect(effects.init?.signal).toBeInstanceOf(AbortSignal);
  });

  test('webhooks reject credentials, insecure URLs, and active proxies before DNS', () => {
    const insecure = hermetic();
    expect(() =>
      fetchConfiguredWebhook('http://alerts.example/hook', { method: 'POST' }, insecure.options)
    ).toThrow('must use HTTPS');
    expect(insecure.effects).toEqual({ dns: 0, fetch: 0 });

    const credentialed = hermetic();
    expect(() =>
      fetchConfiguredWebhook(
        'https://alerts.example/hook',
        { method: 'POST', headers: { authorization: 'Bearer secret' } },
        credentialed.options
      )
    ).toThrow('credentials are forbidden');
    expect(credentialed.effects).toEqual({ dns: 0, fetch: 0 });

    const proxied = hermetic();
    expect(() =>
      fetchConfiguredWebhook('https://alerts.example/hook', { method: 'POST' }, {
        ...proxied.options,
        environment: { HTTPS_PROXY: 'https://proxy.example' },
      })
    ).toThrow('blocked by active proxy environment');
    expect(proxied.effects).toEqual({ dns: 0, fetch: 0 });

    const offline = hermetic();
    expect(() =>
      fetchConfiguredWebhook('https://alerts.example/hook', { method: 'POST' }, {
        ...offline.options,
        environment: { FIRE22_NETWORK_MODE: 'offline-no-socket' },
      })
    ).toThrow('forbids network fetch');
    expect(offline.effects).toEqual({ dns: 0, fetch: 0 });
  });

  test('webhook writes are single-attempt and responses are bounded', async () => {
    let attempts = 0;
    await expect(
      fetchConfiguredWebhook(
        'https://alerts.example/hook',
        { method: 'POST', body: '{}' },
        {
          environment: {},
          resolver: async () => [
            { address: '93.184.216.34', family: 4, ttl: 60, source: 'bun' },
          ],
          fetcher: async () => {
            attempts += 1;
            throw new Error('synthetic failure');
          },
        }
      )
    ).rejects.toThrow('synthetic failure');
    expect(attempts).toBe(1);

    const oversized = hermetic(
      new Response('x', { headers: { 'content-length': '1000001' } })
    );
    await expect(
      fetchConfiguredWebhook(
        'https://alerts.example/hook',
        { method: 'POST', body: '{}' },
        oversized.options
      )
    ).rejects.toThrow('exceeds 1000000 bytes');
  });
});
