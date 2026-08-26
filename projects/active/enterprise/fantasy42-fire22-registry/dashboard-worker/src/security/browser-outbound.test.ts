import { describe, expect, test } from 'bun:test';
import {
  fetchSameOriginGet,
  fetchSameOriginPost,
  fetchSameOriginPut,
  type BrowserFetch,
} from './browser-outbound.ts';

function hermetic(response = new Response('{}')) {
  const effects: { calls: number; url?: string; init?: RequestInit } = { calls: 0 };
  const fetcher: BrowserFetch = async (input, init) => {
    effects.calls += 1;
    effects.url = input.toString();
    effects.init = init;
    return response;
  };
  return { effects, options: { origin: 'https://dashboard.example', fetcher } };
}

describe('Fantasy42 browser outbound boundary', () => {
  test('binds relative requests to one exact browser origin', async () => {
    const { effects, options } = hermetic();
    await fetchSameOriginGet('/api/health?full=true', {}, options);
    expect(effects.calls).toBe(1);
    expect(effects.url).toBe('https://dashboard.example/api/health?full=true');
    expect(effects.init).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      redirect: 'error',
      mode: 'same-origin',
      referrerPolicy: 'same-origin',
    });
  });

  test('denies cross-origin and embedded URL credentials before fetch', () => {
    const crossOrigin = hermetic();
    expect(() =>
      fetchSameOriginGet('https://attacker.example/data', {}, crossOrigin.options)
    ).toThrow('cross-origin');
    expect(crossOrigin.effects.calls).toBe(0);

    const credentials = hermetic();
    expect(() =>
      fetchSameOriginGet('https://user:secret@dashboard.example/api', {}, credentials.options)
    ).toThrow('credentials');
    expect(credentials.effects.calls).toBe(0);
  });

  test('denies caller credential, redirect, mode, and method drift', () => {
    const { effects, options } = hermetic();
    expect(() =>
      fetchSameOriginPost('/api/write', { headers: { authorization: 'Bearer secret' } }, options)
    ).toThrow('authorization');
    expect(() =>
      fetchSameOriginPost('/api/write', { redirect: 'follow' }, options)
    ).toThrow('redirects are fixed');
    expect(() => fetchSameOriginPost('/api/write', { credentials: 'include' }, options)).toThrow(
      'credentials are fixed'
    );
    expect(() => fetchSameOriginGet('/api/read', { mode: 'cors' }, options)).toThrow(
      'mode is fixed'
    );
    expect(effects.calls).toBe(0);
  });

  test('fixes POST and PUT methods and applies the response bound', async () => {
    const post = hermetic();
    await fetchSameOriginPost('/api/items', { body: '{}' }, post.options);
    expect(post.effects.init?.method).toBe('POST');

    const put = hermetic();
    await fetchSameOriginPut('/api/items/1', { body: '{}' }, put.options);
    expect(put.effects.init?.method).toBe('PUT');

    const oversized = hermetic(new Response('x', { headers: { 'content-length': '101' } }));
    await expect(
      fetchSameOriginGet('/api/export', {}, { ...oversized.options, responseByteLimit: 100 })
    ).rejects.toThrow('exceeds 100 bytes');
  });
});
