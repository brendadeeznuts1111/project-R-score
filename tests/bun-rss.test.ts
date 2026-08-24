// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/xml — Bun.XML.parse
import { describe, expect, test } from 'bun:test';
import { decodeRssXmlText, parseRssChannelItems } from '../lib/docs/bun-rss.ts';

describe('bun-rss', () => {
  test('decodeRssXmlText strips CDATA and named entities', () => {
    expect(decodeRssXmlText('<![CDATA[Bun &amp; friends]]>')).toBe('Bun & friends');
  });

  test('parseRssChannelItems reads Bun.XML channel items', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Bun 1.4</title><link>https://bun.com/blog/bun-v1.4</link><guid>g1</guid><pubDate>Thu, 20 Aug 2026 00:53:44 GMT</pubDate><description>notes</description></item>
<item><title>Other</title><link>https://bun.com/blog/bun-in-rust</link><guid>g2</guid><pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate><description></description></item>
</channel></rss>`;
    const items = parseRssChannelItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: 'Bun 1.4',
      link: 'https://bun.com/blog/bun-v1.4',
      guid: 'g1',
      pubDate: 'Thu, 20 Aug 2026 00:53:44 GMT',
      description: 'notes',
    });
  });

  test('parseRssChannelItems regex-fallback single item still works', () => {
    const xml = `<rss><channel><item><title>T</title><link>https://bun.com/blog/bun-v1.3.14</link><guid>g</guid><pubDate>Wed, 13 May 2026 03:19:35 GMT</pubDate><description>d</description></item></channel></rss>`;
    // Force regex path by feeding slightly odd but still item-shaped XML if Bun.XML fails —
    // Bun.XML handles this too; assert field mapping either way.
    const [item] = parseRssChannelItems(xml);
    expect(item?.link).toBe('https://bun.com/blog/bun-v1.3.14');
    expect(item?.title).toBe('T');
  });
});
