import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy.ts';
import {
  createKalPolyLoopbackAuthority,
  fetchKalPolyLoopback,
  fetchKalPolyTelegramSendMessage,
} from '../outbound-client.ts';

const publicResolver = async () => [
  { address: '149.154.167.220', family: 4 as const, ttl: 60, source: 'dns' as const },
];

describe('Kal Poly Bot Telegram outbound authority', () => {
  test('binds a shaped token to the one reviewed method and origin', async () => {
    let observed = '';
    const fetcher: OutboundFetch = async input => {
      observed = input.toString();
      return new Response('{}');
    };
    await fetchKalPolyTelegramSendMessage(
      '123456:abc_DEF-789',
      { method: 'POST', body: 'chat_id=1' },
      { fetcher, resolver: publicResolver, environment: {} }
    );
    expect(observed).toBe('https://api.telegram.org/bot123456:abc_DEF-789/sendMessage');
  });

  test('malformed secret-bearing path data is denied without effect or disclosure', async () => {
    let effects = 0;
    const secret = '../token?redirect=https://evil.test';
    let message = '';
    try {
      await fetchKalPolyTelegramSendMessage(secret, { method: 'POST' }, {
        fetcher: async () => {
          effects++;
          return new Response();
        },
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('invalid transport shape');
    expect(message).not.toContain(secret);
    expect(effects).toBe(0);
  });

  test('offline and method denials happen before DNS and transport', async () => {
    for (const [networkMode, method, expected] of [
      ['offline-no-socket', 'POST', 'forbids network fetch'],
      ['online', 'GET', 'method GET is not allowed'],
    ] as const) {
      let resolutions = 0;
      let effects = 0;
      await expect(
        fetchKalPolyTelegramSendMessage(
          '123456:abc_DEF-789',
          { method },
          {
            networkMode,
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
      ).rejects.toThrow(expected);
      expect(resolutions).toBe(0);
      expect(effects).toBe(0);
    }
  });

  test('does not replay an ambiguous send', async () => {
    let effects = 0;
    const response = await fetchKalPolyTelegramSendMessage(
      '123456:abc_DEF-789',
      { method: 'POST', body: 'chat_id=1' },
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
});

describe('Kal Poly Bot loopback HTTP authority', () => {
  test('accepts only normalized loopback hosts and valid ports', () => {
    expect(createKalPolyLoopbackAuthority('localhost', 50045).origin).toBe(
      'http://localhost:50045'
    );
    expect(() => createKalPolyLoopbackAuthority('0.0.0.0', 50045)).toThrow('must be loopback');
    expect(() => createKalPolyLoopbackAuthority('internal.example', 50045)).toThrow(
      'must be loopback'
    );
    expect(() => createKalPolyLoopbackAuthority('localhost', 0)).toThrow('valid port');
  });

  test('binds configurable ports without allowing an authority escape', async () => {
    const authority = createKalPolyLoopbackAuthority('127.0.0.1', 50045);
    let observed = '';
    await fetchKalPolyLoopback(authority, '/health', {}, {
      environment: {},
      fetcher: async input => {
        observed = input.toString();
        return new Response('{}');
      },
    });
    expect(observed).toBe('http://127.0.0.1:50045/health');

    for (const route of ['//evil.test/steal', 'https://evil.test/steal', '/ok#secret']) {
      let effects = 0;
      await expect(
        fetchKalPolyLoopback(authority, route, {}, {
          environment: {},
          fetcher: async () => {
            effects++;
            return new Response();
          },
        })
      ).rejects.toThrow();
      expect(effects).toBe(0);
    }
  });

  test('offline and unsafe-method denials happen before socket effects', async () => {
    const authority = createKalPolyLoopbackAuthority('localhost', 50045);
    for (const [networkMode, method, expected] of [
      ['offline-no-socket', 'GET', 'forbids network fetch'],
      ['online', 'DELETE', 'method DELETE is not allowed'],
    ] as const) {
      let effects = 0;
      await expect(
        fetchKalPolyLoopback(authority, '/health', { method }, {
          networkMode,
          environment: {},
          fetcher: async () => {
            effects++;
            return new Response();
          },
        })
      ).rejects.toThrow(expected);
      expect(effects).toBe(0);
    }
  });
});
