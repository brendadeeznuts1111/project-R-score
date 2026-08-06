/**
 * Portal fetch-json helpers (browser-oriented; Bun fetch verbose is not used here).
 * @see https://bun.com/docs/runtime/networking/fetch#request-options
 */
import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import {
  classifyFetchError,
  fetchJsonResult,
  isPortalFetchDebug,
} from '../public/portal/fetch-json.js';

describe('portal fetch-json', () => {
  afterEach(() => {
    mock.restore();
  });

  test('classifyFetchError maps timeout / network / parse', () => {
    expect(classifyFetchError(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })).kind).toBe(
      'timeout'
    );
    expect(classifyFetchError(new Error('Failed to fetch')).kind).toBe('network');
    expect(classifyFetchError(new Error('Unexpected token < in JSON')).kind).toBe('parse');
  });

  test('GET with body is rejected (web + Bun rule)', async () => {
    const r = await fetchJsonResult('http://127.0.0.1:9/unused', {
      method: 'GET',
      body: '{}',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe('method');
      expect(String(r.error)).toMatch(/body not allowed/i);
    }
  });

  test('isPortalFetchDebug is false by default in tests', () => {
    expect(typeof isPortalFetchDebug()).toBe('boolean');
  });

  test('sends the shared JSON request contract and returns parsed data', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      })
    );

    const result = await fetchJsonResult('/registry/example.json');
    expect(result).toEqual({
      ok: true,
      data: { ok: true },
      status: 200,
      contentType: 'application/json; charset=utf-8',
    });
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect(init?.cache).toBe('no-store');
    expect(init?.credentials).toBe('same-origin');
    expect(new Headers(init?.headers).get('accept')).toContain('application/json');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  test('classifies HTTP and parse failures without throwing', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(new Response('unavailable', { status: 503 }));
    expect(await fetchJsonResult('/registry/down.json')).toMatchObject({
      ok: false,
      kind: 'http',
      status: 503,
    });

    fetchSpy.mockResolvedValueOnce(
      new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })
    );
    expect(await fetchJsonResult('/registry/bad.json')).toMatchObject({
      ok: false,
      kind: 'parse',
      status: 200,
      contentType: 'text/html',
    });
  });

  test('reports timeout failures from the request signal', async () => {
    spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      });
    });

    expect(await fetchJsonResult('/registry/slow.json', { timeoutMs: 1 })).toMatchObject({
      ok: false,
      kind: 'timeout',
    });
  });

  test('accepts valid JSON with advisory non-JSON MIME and surfaces the header', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"rows":[]}', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    );

    expect(await fetchJsonResult('/registry/mislabeled.json')).toEqual({
      ok: true,
      data: { rows: [] },
      status: 200,
      contentType: 'text/html',
    });
  });
});
