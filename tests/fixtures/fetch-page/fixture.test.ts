/**
 * fetch-page-boundaries — shared HTTP client for docs/blog page fetches.
 *
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/runtime/networking/fetch#custom-headers
 * @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout
 * @see https://bun.com/docs/runtime/networking/fetch#error-handling
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { fetchPage, stripUrlFragment } from '../../../lib/docs/fetch-page.ts';
import { bunBlog } from '../../../lib/docs/bun-site-url.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetch-page-boundaries', () => {
  test('stripUrlFragment drops # before request', () => {
    expect(stripUrlFragment('https://example.com/post#comments')).toBe(
      'https://example.com/post'
    );
    const withHash = bunBlog('bun-v1.3.14', 'comments');
    expect(stripUrlFragment(withHash)).toBe(bunBlog('bun-v1.3.14'));
    expect(stripUrlFragment(withHash)).not.toContain('#');
  });

  test('request URL has no fragment; Accept and User-Agent are set', async () => {
    let seenUrl = '';
    let seenHeaders: Headers | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seenUrl = String(input);
      seenHeaders = new Headers(init?.headers);
      return new Response('<html></html>', { status: 200 });
    }) as typeof fetch;

    await fetchPage('https://example.com/page#frag');
    expect(seenUrl).toBe('https://example.com/page');
    expect(seenUrl).not.toContain('#');
    expect(seenHeaders?.get('Accept')).toBe('text/html');
    expect(seenHeaders?.get('User-Agent')).toBe('factorywager-docs-fetch/1.0');
  });

  test('merges caller headers without clobbering Accept/UA defaults', async () => {
    let seenHeaders: Headers | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenHeaders = new Headers(init?.headers);
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    await fetchPage('https://example.com/', {
      headers: { 'Accept-Language': 'en' },
    });
    expect(seenHeaders?.get('Accept')).toBe('text/html');
    expect(seenHeaders?.get('User-Agent')).toBe('factorywager-docs-fetch/1.0');
    expect(seenHeaders?.get('Accept-Language')).toBe('en');
  });

  test('non-OK rejects after reading error body', async () => {
    globalThis.fetch = (async () =>
      new Response('not found detail', { status: 404, statusText: 'Not Found' })) as typeof fetch;

    await expect(fetchPage('https://example.com/missing')).rejects.toThrow(
      /404.*not found detail/
    );
  });

  test('success path leaves body readable', async () => {
    globalThis.fetch = (async () =>
      new Response('<html><body>ok</body></html>', { status: 200 })) as typeof fetch;

    const res = await fetchPage('https://example.com/ok');
    expect(res.ok).toBe(true);
    expect(await res.text()).toContain('ok');
  });

  test('respects pre-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    await expect(
      fetchPage('https://example.com/x', { signal: controller.signal })
    ).rejects.toThrow();
  });

  test('timeoutMs installs an AbortSignal when signal omitted', async () => {
    let seenSignal: AbortSignal | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenSignal = init?.signal ?? undefined;
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    await fetchPage('https://example.com/', { timeoutMs: 1234 });
    expect(seenSignal).toBeDefined();
    expect(seenSignal?.aborted).toBe(false);
  });

  test('custom userAgent overrides default', async () => {
    let ua = '';
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      ua = new Headers(init?.headers).get('User-Agent') ?? '';
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    await fetchPage('https://example.com/', { userAgent: 'bun-docs-mcp/1.2' });
    expect(ua).toBe('bun-docs-mcp/1.2');
  });
});
