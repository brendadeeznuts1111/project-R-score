import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy';
import { fetchPredictionProvider } from '../../src/utils/outbound-endpoints';

describe('prediction provider outbound endpoints', () => {
  test('rejects provider-origin drift before invoking fetch', async () => {
    let fetchCalls = 0;
    const fetcher = (() => {
      fetchCalls++;
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as OutboundFetch;

    expect(() =>
      fetchPredictionProvider(
        'kalshi',
        'https://api.elections.kalshi.com.evil.test/markets',
        {},
        fetcher
      )
    ).toThrow('origin');
    expect(() =>
      fetchPredictionProvider(
        'betfair',
        'https://api.betfair.com:8443/rpc',
        { method: 'POST' },
        fetcher
      )
    ).toThrow('origin');
    expect(fetchCalls).toBe(0);
  });

  test('binds scoped provider auth to exact origins and blocks redirects', async () => {
    let observedUrl = '';
    let observedInit: RequestInit | undefined;
    const fetcher = ((input: string | URL, init?: RequestInit) => {
      observedUrl = input.toString();
      observedInit = init;
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as OutboundFetch;

    const response = await fetchPredictionProvider(
      'kalshi',
      'https://api.elections.kalshi.com/trade-api/v2/markets',
      { headers: { Authorization: 'Bearer hidden' } },
      fetcher
    );
    expect(response.status).toBe(200);
    expect(observedUrl).toContain('/trade-api/v2/markets');
    expect(observedInit?.redirect).toBe('error');
    expect(observedInit?.credentials).toBe('omit');
    expect(observedInit?.signal).toBeInstanceOf(AbortSignal);

    expect(() =>
      fetchPredictionProvider(
        'betfair',
        'https://api.betfair.com/exchange/betting/json-rpc/v1',
        { method: 'POST', headers: { Authorization: 'Bearer hidden' } },
        fetcher
      )
    ).toThrow('credentials are forbidden');
  });

  test('forbids credentials on public provider reads and unsafe methods', async () => {
    expect(() =>
      fetchPredictionProvider('polymarket', 'https://clob.polymarket.com/markets', {
        headers: { Authorization: 'Bearer hidden' },
      })
    ).toThrow('credentials are forbidden');
    expect(() =>
      fetchPredictionProvider('predictit', 'https://www.predictit.org/api/marketdata/all', {
        method: 'POST',
      })
    ).toThrow('POST');
  });
});
