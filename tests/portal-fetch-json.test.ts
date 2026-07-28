import { afterEach, describe, expect, test } from 'bun:test';

import {
  DEFAULT_JSON_TIMEOUT_MS,
  fetchJson,
  fetchJsonResult,
  jsonFetchTimeout,
} from '../public/portal/fetch-json.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('portal JSON fetch', () => {
  test('uses an overridable positive timeout without forwarding timeoutMs to fetch', async () => {
    let requestInit: RequestInit | undefined;
    globalThis.fetch = (async (_url, init) => {
      requestInit = init;
      return Response.json({ ok: true });
    }) as typeof fetch;

    expect(jsonFetchTimeout()).toBe(DEFAULT_JSON_TIMEOUT_MS);
    expect(jsonFetchTimeout({ timeoutMs: 2500 })).toBe(2500);
    expect(jsonFetchTimeout({ timeoutMs: 0 })).toBe(DEFAULT_JSON_TIMEOUT_MS);
    await fetchJsonResult('/registry/example.json', { timeoutMs: 2500 });

    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
    expect(requestInit).not.toHaveProperty('timeoutMs');
  });

  test('preserves a caller signal and returns parsed JSON on success', async () => {
    const controller = new AbortController();
    let requestInit: RequestInit | undefined;
    globalThis.fetch = (async (_url, init) => {
      requestInit = init;
      return Response.json({ value: 42 });
    }) as typeof fetch;

    await expect(
      fetchJson('/registry/example.json', { signal: controller.signal, timeoutMs: 1 })
    ).resolves.toEqual({ value: 42 });
    expect(requestInit?.signal).toBe(controller.signal);
  });

  test('falls back to the HTTP status when statusText is blank', async () => {
    globalThis.fetch = (async () => new Response('', { status: 503, statusText: '' })) as typeof fetch;

    await expect(fetchJsonResult('/registry/example.json')).resolves.toEqual({
      ok: false,
      data: null,
      status: 503,
      error: 'HTTP 503',
    });
  });

  test('preserves a nonblank statusText', async () => {
    globalThis.fetch = (async () =>
      new Response('', { status: 429, statusText: 'Too Many Requests' })) as typeof fetch;

    await expect(fetchJsonResult('/registry/example.json')).resolves.toEqual({
      ok: false,
      data: null,
      status: 429,
      error: 'Too Many Requests',
    });
  });
});
