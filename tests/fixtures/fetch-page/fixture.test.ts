/**
 * Offline proofs that fetchPage enforces the shared client contract.
 *
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/runtime/networking/fetch#custom-headers
 * @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout
 * @see https://bun.com/docs/runtime/networking/fetch#error-handling
 * @see https://bun.com/docs/runtime/networking/fetch#debugging
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { fetchPage, stripUrlFragment } from '../../../lib/docs/fetch-page.ts';
import { bunBlog } from '../../../lib/docs/bun-site-url.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetch-page-boundaries', () => {
  test('throws on non-OK status', async () => {
    globalThis.fetch = (async () =>
      new Response('Not Found', { status: 404 })) as typeof fetch;

    await expect(fetchPage('https://example.com')).rejects.toThrow(/fetchPage 404/);
  });

  test('rejects non-https URLs', async () => {
    await expect(fetchPage('http://example.com')).rejects.toThrow(/requires https/);
  });

  test('strips URL fragment before fetch', async () => {
    let fetchedUrl = '';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetchedUrl = String(input);
      return new Response('<html></html>', { status: 200 });
    }) as typeof fetch;

    await fetchPage('https://example.com/page#section');
    expect(fetchedUrl).not.toContain('#');
    expect(fetchedUrl).toBe('https://example.com/page');

    const withHash = bunBlog('bun-v1.3.14', 'comments');
    expect(stripUrlFragment(withHash)).toBe(bunBlog('bun-v1.3.14'));
  });

  test('sets Accept and User-Agent headers', async () => {
    let captured: Headers | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured = new Headers(init?.headers);
      return new Response('<html></html>', { status: 200 });
    }) as typeof fetch;

    await fetchPage('https://example.com');
    expect(captured?.get('Accept')).toBe('text/html');
    expect(captured?.get('User-Agent')).toContain('BunHarness');
  });

  test('caller headers merge without clobbering defaults', async () => {
    let captured: Headers | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured = new Headers(init?.headers);
      return new Response('<html></html>', { status: 200 });
    }) as typeof fetch;

    await fetchPage('https://example.com', {
      headers: { 'Accept-Language': 'en' },
    });
    expect(captured?.get('Accept')).toBe('text/html');
    expect(captured?.get('User-Agent')).toContain('BunHarness');
    expect(captured?.get('Accept-Language')).toBe('en');
  });

  test('success path leaves body readable', async () => {
    globalThis.fetch = (async () =>
      new Response('<html><body>ok</body></html>', { status: 200 })) as typeof fetch;

    const res = await fetchPage('https://example.com/ok');
    expect(res.ok).toBe(true);
    expect(await res.text()).toContain('ok');
  });

  test('timeoutMs + caller signal compose via AbortSignal.any', async () => {
    let seenSignal: AbortSignal | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenSignal = init?.signal ?? undefined;
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    const controller = new AbortController();
    await fetchPage('https://example.com/', {
      signal: controller.signal,
      timeoutMs: 1234,
    });
    expect(seenSignal).toBeDefined();
    expect(seenSignal?.aborted).toBe(false);
  });

  test('verbose option does not throw', async () => {
    globalThis.fetch = (async () =>
      new Response('<html></html>', { status: 200 })) as typeof fetch;

    await expect(fetchPage('https://example.com', { verbose: true })).resolves.toBeInstanceOf(
      Response
    );
  });
});
