// @see ../lib/rss/feed-image.ts
// @see ../lib/rss/rss-manager.ts

import { describe, expect, spyOn, test } from 'bun:test';
import { FeedImageEnricher } from '../lib/rss/feed-image.ts';
import { parseRSSFeed, RSSManager } from '../lib/rss/rss-manager.ts';

const BLUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAANElEQVR4nO3XoREAAAgDMfbqdgyNhTEwEfV/ca307OdKAAECBAgQIECAAAECBAgQIJDne34n9MiXfL2OIwAAAABJRU5ErkJggg==',
  'base64'
);

function testFetcher(
  handler: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => Promise<Response>
): typeof fetch {
  return Object.assign(handler, { preconnect: (_url: string): void => {} }) as typeof fetch;
}

const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Image feed</title>
    <link>https://example.com/</link>
    <description><![CDATA[Updates & details]]></description>
    <ttl>15</ttl>
    <item>
      <title><![CDATA[Primary image]]></title>
      <link>https://example.com/primary</link>
      <description>Uses media content first</description>
      <guid isPermaLink="false">primary</guid>
      <media:content url="https://cdn.example.com/hero.png?x=1&amp;y=2" type="image/png" />
      <enclosure url="https://cdn.example.com/fallback.png" type="image/png" length="100" />
    </item>
    <item>
      <title>Enclosure image</title>
      <link>https://example.com/enclosure</link>
      <enclosure url="https://cdn.example.com/enclosure.png" type="image/png" length="100" />
    </item>
    <item>
      <title>Thumbnail image</title>
      <link>https://example.com/thumbnail</link>
      <media:thumbnail url="https://cdn.example.com/thumb.png" />
    </item>
    <item>
      <title>Video enclosure</title>
      <link>https://example.com/video</link>
      <enclosure url="https://cdn.example.com/demo.mp4" type="video/mp4" length="100" />
    </item>
  </channel>
</rss>`;

describe('RSS image candidate parsing', () => {
  test('uses media content, image enclosure, then media thumbnail', () => {
    const feed = parseRSSFeed(FEED_XML);
    expect(feed.title).toBe('Image feed');
    expect(feed.description).toBe('Updates & details');
    expect(feed.ttl).toBe(15);
    expect(feed.items).toHaveLength(4);
    expect(feed.items[0]?.imageSource).toBe('media:content');
    expect(feed.items[0]?.imageUrl).toBe('https://cdn.example.com/hero.png?x=1&y=2');
    expect(feed.items[1]?.imageSource).toBe('enclosure');
    expect(feed.items[2]?.imageSource).toBe('media:thumbnail');
    expect(feed.items[3]?.imageUrl).toBeUndefined();
  });
});

describe('FeedImageEnricher', () => {
  test('creates metadata, a WebP thumbnail, a color, and conditionally revalidates', async () => {
    const png = BLUE_PNG;
    const requests: Headers[] = [];
    let calls = 0;
    const fetcher = testFetcher(async (_input, init) => {
      calls++;
      const headers = new Headers(init?.headers);
      requests.push(headers);
      if (calls === 2) return new Response(null, { status: 304 });
      return new Response(Uint8Array.from(png).buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': String(png.byteLength),
          ETag: '"fixture-v1"',
          'Last-Modified': 'Mon, 24 Aug 2026 12:00:00 GMT',
        },
      });
    });
    const enricher = new FeedImageEnricher({ fetcher, thumbnailWidth: 16, thumbnailHeight: 16 });
    const candidate = {
      url: 'https://cdn.example.com/fixture.png',
      source: 'enclosure' as const,
    };

    const first = await enricher.enrich(candidate);
    const second = await enricher.enrich(candidate);

    expect(first).toEqual(second);
    expect(first.width).toBe(32);
    expect(first.height).toBe(32);
    expect(first.format).toBe('png');
    expect(first.mimeType).toBe('image/png');
    expect(first.sha256).toHaveLength(64);
    expect(first.dominantColor).toBe('#3b82f6');
    expect(first.thumbnail.mimeType).toBe('image/webp');
    expect(first.thumbnail.dataUrl).toStartWith('data:image/webp;base64,');
    expect(first.thumbnail.width).toBe(16);
    expect(first.thumbnail.height).toBe(16);
    expect(requests[1]?.get('if-none-match')).toBe('"fixture-v1"');
    expect(requests[1]?.get('if-modified-since')).toBe('Mon, 24 Aug 2026 12:00:00 GMT');
  });

  test('rejects non-image and oversized responses', async () => {
    const textFetcher = testFetcher(async () =>
      new Response('not an image', { headers: { 'Content-Type': 'text/plain' } })
    );
    await expect(
      new FeedImageEnricher({ fetcher: textFetcher }).enrich({
        url: 'https://example.com/not-image',
        source: 'enclosure',
      })
    ).rejects.toThrow('not an image');

    const largeFetcher = testFetcher(async () =>
      new Response(new Uint8Array(5), {
        headers: { 'Content-Type': 'image/png', 'Content-Length': '50' },
      })
    );
    await expect(
      new FeedImageEnricher({ fetcher: largeFetcher, maxBytes: 10 }).enrich({
        url: 'https://example.com/large.png',
        source: 'enclosure',
      })
    ).rejects.toThrow('exceeds 10 bytes');
  });
});

describe('RSSManager integration', () => {
  test('keeps the feed available when image enrichment fails', async () => {
    const warning = spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = testFetcher(async input => {
      const url = String(input);
      if (url === 'https://example.com/feed.xml') {
        return new Response(FEED_XML, { headers: { 'Content-Type': 'application/rss+xml' } });
      }
      return new Response('gone', { status: 404 });
    });
    const manager = new RSSManager(undefined, {
      fetcher,
      maxImagesPerFeed: 1,
      imageConcurrency: 1,
    });

    try {
      const feed = await manager.fetchFeed('https://example.com/feed.xml');
      expect(feed.items).toHaveLength(4);
      expect(feed.items[0]?.imageUrl).toContain('hero.png');
      expect(feed.items[0]?.image).toBeUndefined();
      expect(warning).toHaveBeenCalledTimes(1);
    } finally {
      warning.mockRestore();
    }
  });
});

describe('integrated dashboard contract', () => {
  test('serves the fixed feed API and renders image metadata with safe DOM methods', async () => {
    const source = await Bun.file('tools/cli/integrated-cli.ts').text();
    expect(source).toContain("url.pathname === '/api/feed'");
    expect(source).toContain("Bun.env.RSS_FEED_URL || 'https://bun.com/rss.xml'");
    expect(source).toContain("document.createElement('img')");
    expect(source).toContain('item.image.width');
    expect(source).toContain('item.image?.dominantColor');
    expect(source).not.toContain('feedContainer.innerHTML +=');
  });
});
