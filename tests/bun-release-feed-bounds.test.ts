import { describe, expect, test } from 'bun:test';
import { fetchReleaseFeed } from '../packages/bun-release-contracts/src/feed.ts';

const xml =
  '<rss version="2.0"><channel><title>Bun</title><link>https://bun.com</link><description>Releases</description><item><title>Bun v1.4.3</title><link>https://bun.com/blog/bun-v1.4.3</link><guid>1.4.3</guid><pubDate>Mon, 12 Oct 2026 12:00:00 GMT</pubDate><description>Release</description></item></channel></rss>';
const url = 'https://bun.com/rss.xml';
function fetcher(
  handler: (input: Parameters<typeof fetch>[0], init?: RequestInit) => Promise<Response>
): typeof fetch {
  return Object.assign(handler, { preconnect: (_url: string): void => {} }) as typeof fetch;
}
function fixture(headers: HeadersInit = {}, status = 200, chunks: Uint8Array[] = []) {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  });
  const response = new Response(body, {
    status,
    headers: { 'content-type': 'application/rss+xml', ...headers },
  });
  return { response, cancelled: () => cancelled };
}

describe('release feed network boundaries', () => {
  for (const host of ['localhost.', 'feeds.localhost.', 'printer.local.']) {
    test(`rejects initial local DNS hostname ${host} before fetching`, async () => {
      const requests: string[] = [];
      await expect(
        fetchReleaseFeed({
          url: `https://${host}/feed`,
          fetchImpl: fetcher(async input => {
            requests.push(String(input));
            return new Response(xml, { headers: { 'content-type': 'text/xml' } });
          }),
        })
      ).rejects.toThrow('prohibited host');
      expect(requests).toEqual([]);
    });

    test(`rejects redirect to local DNS hostname ${host} before fetching it`, async () => {
      const stream = fixture({ location: `https://${host}/feed` }, 302);
      const requests: string[] = [];
      await expect(
        fetchReleaseFeed({
          url,
          fetchImpl: fetcher(async input => {
            requests.push(String(input));
            return stream.response;
          }),
        })
      ).rejects.toThrow('prohibited host');
      expect(requests).toEqual([url]);
      expect(stream.cancelled()).toBe(true);
    });
  }

  test('allows public DNS trailing dots on initial and redirected URLs', async () => {
    const requests: string[] = [];
    const entries = await fetchReleaseFeed({
      url: 'https://bun.com./rss.xml',
      fetchImpl: fetcher(async input => {
        requests.push(String(input));
        return requests.length === 1
          ? new Response(null, { status: 302, headers: { location: 'https://example.com./feed' } })
          : new Response(xml, { headers: { 'content-type': 'text/xml' } });
      }),
    });
    expect(entries[0]?.version).toBe('1.4.3');
    expect(requests).toEqual(['https://bun.com./rss.xml', 'https://example.com./feed']);
  });

  for (const cancellation of ['pending', 'rejected'] as const) {
    test(`continues approved redirects when body cancellation is ${cancellation}`, async () => {
      let cancelled = false;
      const redirect = new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            cancelled = true;
            return cancellation === 'pending'
              ? new Promise<void>(() => {})
              : Promise.reject(new Error('custom cancellation failure'));
          },
        }),
        { status: 302, headers: { location: '/release.xml' } }
      );
      const requests: string[] = [];
      const entries = await fetchReleaseFeed({
        url,
        timeoutMs: 100,
        fetchImpl: fetcher(async input => {
          requests.push(String(input));
          return requests.length === 1
            ? redirect
            : new Response(xml, { headers: { 'content-type': 'text/xml' } });
        }),
      });
      expect(entries[0]?.version).toBe('1.4.3');
      expect(requests).toEqual([url, 'https://bun.com/release.xml']);
      expect(cancelled).toBe(true);
    }, 1000);
  }

  test('keeps the shared deadline when redirect cancellation never settles', async () => {
    const signals: Array<AbortSignal | null | undefined> = [];
    const redirect = new Response(
      new ReadableStream<Uint8Array>({ cancel: () => new Promise<void>(() => {}) }),
      { status: 302, headers: { location: '/release.xml' } }
    );
    const stalled = fixture();
    await expect(
      fetchReleaseFeed({
        url,
        timeoutMs: 10,
        fetchImpl: fetcher(async (_input, init) => {
          signals.push(init?.signal);
          return signals.length === 1 ? redirect : stalled.response;
        }),
      })
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(signals).toHaveLength(2);
    expect(signals[0]).toBe(signals[1]);
    expect(stalled.cancelled()).toBe(true);
    expect(stalled.response.body?.locked).toBe(false);
  }, 1000);

  test('preserves custom fetch, request headers, XML MIME parameters and parsed releases', async () => {
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const entries = await fetchReleaseFeed({
      url,
      fetchImpl: fetcher(async (input, init) => {
        requests.push({ input: String(input), init });
        return new Response(xml, {
          headers: { 'content-type': 'Application/RSS+XML; charset=utf-8' },
        });
      }),
    });
    expect(entries[0]?.version).toBe('1.4.3');
    expect(requests[0]?.input).toBe(url);
    expect(requests[0]?.init?.redirect).toBe('manual');
    const headers = new Headers(requests[0]?.init?.headers);
    expect(headers.get('user-agent')).toBe('factorywager-bun-release-inventory/0.2');
    expect(headers.get('accept')).toBe('application/rss+xml, application/xml, text/xml');
    expect(headers.get('accept-encoding')).toBe('identity');
    expect(requests[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  for (const declared of [undefined, '1']) {
    test(`counts actual bytes with ${declared === undefined ? 'missing' : 'misleading'} Content-Length`, async () => {
      const headers = declared === undefined ? {} : { 'content-length': declared };
      const stream = fixture(headers, 200, [new Uint8Array(9), new Uint8Array(9)]);
      await expect(
        fetchReleaseFeed({ url, maxBytes: 16, fetchImpl: fetcher(async () => stream.response) })
      ).rejects.toThrow('exceeds 16 bytes');
      expect(stream.cancelled()).toBe(true);
      expect(stream.response.body?.locked).toBe(false);
    });
  }

  for (const headers of [
    { 'content-length': '17' },
    { 'content-length': 'garbage' },
    { 'content-encoding': 'gzip' },
    { 'content-type': 'text/html' },
    { 'content-type': 'application/rss+xml-lookalike' },
  ]) {
    test(`cancels rejected response headers ${JSON.stringify(headers)}`, async () => {
      const stream = fixture(headers);
      await expect(
        fetchReleaseFeed({ url, maxBytes: 16, fetchImpl: fetcher(async () => stream.response) })
      ).rejects.toThrow();
      expect(stream.cancelled()).toBe(true);
      expect(stream.response.body?.locked).toBe(false);
    });
  }

  test('cancels an unsuccessful HTTP response', async () => {
    const stream = fixture({}, 503);
    await expect(
      fetchReleaseFeed({ url, fetchImpl: fetcher(async () => stream.response) })
    ).rejects.toThrow('HTTP 503');
    expect(stream.cancelled()).toBe(true);
  });

  test('rejects a private redirect and cancels its body before another request', async () => {
    const stream = fixture({ location: 'https://127.0.0.1/feed' }, 302);
    let calls = 0;
    await expect(
      fetchReleaseFeed({
        url,
        fetchImpl: fetcher(async () => {
          calls++;
          return stream.response;
        }),
      })
    ).rejects.toThrow('prohibited host');
    expect(calls).toBe(1);
    expect(stream.cancelled()).toBe(true);
  });

  test('follows an approved HTTPS redirect with the same deadline', async () => {
    const stream = fixture({ location: '/release.xml' }, 302);
    const signals: Array<AbortSignal | null | undefined> = [];
    const urls: string[] = [];
    const entries = await fetchReleaseFeed({
      url,
      fetchImpl: fetcher(async (input, init) => {
        urls.push(String(input));
        signals.push(init?.signal);
        return urls.length === 1
          ? stream.response
          : new Response(xml, { headers: { 'content-type': 'application/xml' } });
      }),
    });
    expect(entries).toHaveLength(1);
    expect(urls).toEqual([url, 'https://bun.com/release.xml']);
    expect(signals[0]).toBe(signals[1]);
    expect(stream.cancelled()).toBe(true);
  });

  test('times out a stalled custom response stream and releases its reader', async () => {
    const stream = fixture();
    await expect(
      fetchReleaseFeed({ url, timeoutMs: 10, fetchImpl: fetcher(async () => stream.response) })
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(stream.cancelled()).toBe(true);
    expect(stream.response.body?.locked).toBe(false);
  });

  test('propagates a stream error and releases its reader', async () => {
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          controller.error(new Error('broken stream'));
        },
      }),
      { headers: { 'content-type': 'text/xml' } }
    );
    await expect(
      fetchReleaseFeed({ url, fetchImpl: fetcher(async () => response) })
    ).rejects.toThrow('broken stream');
    expect(response.body?.locked).toBe(false);
  });

  test('enforces the default 8 MiB cap without a caller override', async () => {
    const stream = fixture({}, 200, [new Uint8Array(8 * 1024 * 1024 + 1)]);
    await expect(
      fetchReleaseFeed({ url, fetchImpl: fetcher(async () => stream.response) })
    ).rejects.toThrow('exceeds 8388608 bytes');
    expect(stream.cancelled()).toBe(true);
  });

  test('does not wait indefinitely for a custom stream cancellation hook', async () => {
    let cancelled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          cancelled = true;
          return new Promise<void>(() => {});
        },
      }),
      { headers: { 'content-type': 'text/xml' } }
    );
    await expect(
      fetchReleaseFeed({ url, timeoutMs: 10, fetchImpl: fetcher(async () => response) })
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(cancelled).toBe(true);
    expect(response.body?.locked).toBe(false);
  });

  test('accepts an exact byte cap and still rejects malformed XML at the existing parser', async () => {
    const bytes = new TextEncoder().encode(xml);
    expect(
      await fetchReleaseFeed({
        url,
        maxBytes: bytes.length,
        fetchImpl: fetcher(
          async () => new Response(bytes, { headers: { 'content-type': 'text/xml' } })
        ),
      })
    ).toHaveLength(1);
    await expect(
      fetchReleaseFeed({
        url,
        fetchImpl: fetcher(
          async () => new Response('<rss>', { headers: { 'content-type': 'text/xml' } })
        ),
      })
    ).rejects.toThrow();
  });
});
