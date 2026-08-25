// @see https://bun.com/docs/runtime/networking/fetch — redirect and streaming response

import { describe, expect, test } from 'bun:test';
import { fetchFeedXml } from '../lib/rss/fetch-feed-xml.ts';
import { FeedImageEnricher } from '../lib/rss/feed-image.ts';
import {
  fetchImageResponse,
  readBoundedImageBytes,
  validateRemoteImageUrl,
} from '../lib/rss/fetch-image-bytes.ts';

function testFetcher(
  handler: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => Promise<Response>
): typeof fetch {
  return Object.assign(handler, { preconnect: (_url: string): void => {} }) as typeof fetch;
}

describe('RSS image fetch policy', () => {
  test('rejects Bun-supported non-web schemes and prohibited network targets', () => {
    for (const url of [
      'file:///etc/passwd',
      'data:image/png;base64,AA==',
      's3://bucket/key',
      'http://example.com/image.png',
      'https://user:secret@example.com/image.png',
      'https://127.0.0.1/image.png',
      'https://10.0.0.1/image.png',
      'https://192.0.2.1/image.png',
      'https://198.51.100.1/image.png',
      'https://203.0.113.1/image.png',
      'https://[::1]/image.png',
      'https://[::ffff:7f00:1]/image.png',
      'https://[2001:db8::1]/image.png',
      'https://service.local/image.png',
    ]) {
      expect(() => validateRemoteImageUrl(url)).toThrow();
    }
  });

  test('enforces an origin allowlist', () => {
    const allowed = new Set(['https://cdn.example.com']);
    expect(validateRemoteImageUrl('https://cdn.example.com/a.png', allowed).href).toBe(
      'https://cdn.example.com/a.png'
    );
    expect(() => validateRemoteImageUrl('https://other.example/a.png', allowed)).toThrow(
      'origin is not allowed'
    );
  });

  test('revalidates redirects and strips conditional headers across origins', async () => {
    const requests: Array<{ url: string; headers: Headers; signal: AbortSignal | null }> = [];
    let redirectBodyCancelled = false;
    const fetcher = testFetcher(async (input, init) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers),
        signal: init?.signal ?? null,
      });
      if (requests.length === 1) {
        return new Response(new ReadableStream({ cancel: () => (redirectBodyCancelled = true) }), {
          status: 302,
          headers: { Location: 'https://media.example.net/final.png' },
        });
      }
      return new Response(new Uint8Array([1]));
    });
    const headers = new Headers({ 'If-None-Match': '"old"' });
    const result = await fetchImageResponse(
      new URL('https://cdn.example.com/start.png'),
      headers,
      { fetcher, maxBytes: 10, maxRedirects: 2, timeoutMs: 1_000 }
    );
    expect(result.finalUrl.href).toBe('https://media.example.net/final.png');
    expect(requests[0]?.headers.get('if-none-match')).toBe('"old"');
    expect(requests[1]?.headers.has('if-none-match')).toBe(false);
    expect(requests[0]?.signal).toBe(requests[1]?.signal);
    expect(redirectBodyCancelled).toBe(true);
  });

  test('counts streamed bytes and rejects encoded or oversized bodies', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });
    await expect(readBoundedImageBytes(new Response(body), 3)).rejects.toThrow(
      'exceeds 3 bytes'
    );
    await expect(
      readBoundedImageBytes(
        new Response(new Uint8Array([1]), { headers: { 'Content-Encoding': 'gzip' } }),
        3
      )
    ).rejects.toThrow('content encoding is not allowed');
  });

  test('applies the same bounded HTTPS policy to feed XML', async () => {
    await expect(
      fetchFeedXml(testFetcher(async () => new Response('unused')), 'file:///tmp/feed.xml')
    ).rejects.toThrow('protocol is not allowed');

    const htmlFetcher = testFetcher(async () =>
      new Response('<rss/>', { headers: { 'Content-Type': 'text/html' } })
    );
    await expect(fetchFeedXml(htmlFetcher, 'https://example.com/feed')).rejects.toThrow(
      'not XML'
    );

    const largeFetcher = testFetcher(async () =>
      new Response('12345', { headers: { 'Content-Type': 'application/rss+xml' } })
    );
    await expect(
      fetchFeedXml(largeFetcher, 'https://example.com/feed', { maxBytes: 4 })
    ).rejects.toThrow('exceeds 4 bytes');

    const validFetcher = testFetcher(async () =>
      new Response('<rss version="2.0"/>', {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      })
    );
    expect(await fetchFeedXml(validFetcher, 'https://example.com/feed')).toContain(
      '<rss version="2.0"/>'
    );
  });

  test('rejects a declared image type that disagrees with Bun.Image sniffing', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XweTAAAAAElFTkSuQmCC',
      'base64'
    );
    const fetcher = testFetcher(async () =>
      new Response(Uint8Array.from(png), { headers: { 'Content-Type': 'image/jpeg' } })
    );
    await expect(
      new FeedImageEnricher({ fetcher }).enrich({
        url: 'https://cdn.example.com/image.jpg',
        source: 'enclosure',
      })
    ).rejects.toThrow('MIME mismatch');
  });
});
