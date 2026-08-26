import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy';
import {
  fetchInternalProxy,
  INTERNAL_PROXY_ROUTES,
  selectInternalProxyAuthHeaders,
} from '../../src/utils/internal-proxy-client';

describe('internal proxy client', () => {
  test('binds registered routes, credentials, redirects, and deadlines to the configured origin', async () => {
    let observedUrl = '';
    let observedInit: RequestInit | undefined;
    const fetcher = ((input: string | URL, init?: RequestInit) => {
      observedUrl = input.toString();
      observedInit = init;
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as OutboundFetch;
    const query = new URLSearchParams({ sessionId: 'session with spaces' });

    await fetchInternalProxy(
      INTERNAL_PROXY_ROUTES.accountInfo,
      { headers: { Authorization: 'Bearer hidden' } },
      { baseUrl: 'https://proxy.example.com', query, fetcher }
    );

    expect(observedUrl).toBe(
      'https://proxy.example.com/api/proxy/accountInfo?sessionId=session+with+spaces'
    );
    expect(observedInit?.redirect).toBe('error');
    expect(observedInit?.credentials).toBe('omit');
    expect(observedInit?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(observedInit?.headers).get('authorization')).toBe('Bearer hidden');
  });

  test('rejects authority-bearing base URLs, unknown routes, and unsafe methods before fetch', () => {
    let calls = 0;
    const fetcher = (() => {
      calls++;
      return Promise.resolve(new Response());
    }) as OutboundFetch;

    expect(() =>
      fetchInternalProxy(INTERNAL_PROXY_ROUTES.players, {}, {
        baseUrl: 'https://user:pass@proxy.example.com',
        fetcher,
      })
    ).toThrow('credentials');
    expect(() =>
      fetchInternalProxy('/api/proxy/../../admin' as never, {}, {
        baseUrl: 'https://proxy.example.com',
        fetcher,
      })
    ).toThrow('not registered');
    expect(() =>
      fetchInternalProxy(INTERNAL_PROXY_ROUTES.players, { method: 'DELETE' }, {
        baseUrl: 'https://proxy.example.com',
        fetcher,
      })
    ).toThrow('DELETE');
    expect(calls).toBe(0);
  });

  test('forwards only the explicit session authentication header set', () => {
    const selected = selectInternalProxyAuthHeaders(
      new Headers({
        Authorization: 'Bearer hidden',
        Cookie: 'session=hidden',
        Host: 'attacker.example',
        Forwarded: 'for=192.0.2.1',
        'CF-Connecting-IP': '192.0.2.1',
        'X-Session-Id': 'session-1',
      })
    );

    expect(Object.fromEntries(selected.entries())).toEqual({
      authorization: 'Bearer hidden',
      cookie: 'session=hidden',
      'x-session-id': 'session-1',
    });
  });
});
