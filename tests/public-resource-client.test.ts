import { describe, expect, test } from 'bun:test';
import { fetchPublicResource as fetchDocumentationResource } from '../lib/docs/public-resource-client.ts';
import {
  fetchPublicResource,
  parsePublicResourceUrl,
} from '../lib/http/public-resource-client.ts';
import type { OutboundFetch } from '../lib/http/outbound-policy.ts';

describe('public resource client', () => {
  test('documentation bridge preserves the canonical hardened client', () => {
    expect(fetchDocumentationResource).toBe(fetchPublicResource);
  });

  test('rejects credentials, non-HTTPS, redirects, private DNS, and override extensions before fetch', async () => {
    let calls = 0;
    const fetcher: OutboundFetch = async () => {
      calls++;
      return new Response('ok');
    };
    for (const url of ['http://example.com/feed', 'https://user:secret@example.com/feed']) {
      expect(() => parsePublicResourceUrl(url)).toThrow();
    }
    expect(() =>
      fetchPublicResource(
        'https://example.com/feed',
        { headers: { Authorization: 'secret' } },
        { fetcher, environment: {} }
      )
    ).toThrow('credentials are forbidden');
    expect(() =>
      fetchPublicResource(
        'https://example.com/feed',
        { redirect: 'follow' },
        { fetcher, environment: {} }
      )
    ).toThrow('redirect mode');
    for (const init of [
      { proxy: 'https://proxy.example' },
      { protocol: 'http2' },
      { verbose: true },
      { tls: { rejectUnauthorized: false } },
    ] as BunFetchRequestInit[]) {
      expect(() =>
        fetchPublicResource('https://example.com/feed', init, { fetcher, environment: {} })
      ).toThrow();
    }
    await expect(
      fetchPublicResource('https://example.com/feed', {}, {
        fetcher,
        environment: {},
        resolver: async () => [
          { address: '127.0.0.1', family: 4, ttl: 30, source: 'bun' },
        ],
      })
    ).rejects.toThrow();
    expect(() =>
      fetchPublicResource('https://example.com/feed', {}, {
        fetcher,
        environment: {},
        networkMode: 'offline-no-socket',
        resolver: async () => {
          throw new Error('resolver must not run offline');
        },
      })
    ).toThrow('forbids network fetch');
    expect(calls).toBe(0);
  });

  test('bounds streamed responses and supports an explicit hermetic resolver/fetcher seam', async () => {
    const response = await fetchPublicResource('https://example.com/feed', {}, {
      environment: {},
      responseByteLimit: 3,
      resolver: async () => [{ address: '1.1.1.1', family: 4, ttl: 30, source: 'bun' }],
      fetcher: async () => new Response('large'),
    });
    await expect(response.text()).rejects.toThrow('exceeds 3 bytes');
  });
});
