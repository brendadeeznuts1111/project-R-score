// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/xml — Bun.XML.parse
import { describe, expect, test } from 'bun:test';
import { parseRssChannelItems } from '../lib/docs/bun-rss.ts';

describe('bun-rss', () => {
  test('parseRssChannelItems reads strict Bun.XML channel items', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
<title>bun.com</title><link>https://bun.com</link><description>Bun posts</description>
<item><title><![CDATA[Bun &amp; 1.4]]></title><link>https://bun.com/blog/bun-v1.4</link><guid>g1</guid><pubDate>Thu, 20 Aug 2026 00:53:44 GMT</pubDate><description>notes</description></item>
<item><title>Other</title><link>https://bun.com/blog/bun-in-rust</link><guid>g2</guid><pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate><description>Other post</description></item>
</channel></rss>`;
    const items = parseRssChannelItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: 'Bun &amp; 1.4',
      link: 'https://bun.com/blog/bun-v1.4',
      guid: 'g1',
      pubDate: 'Thu, 20 Aug 2026 00:53:44 GMT',
      description: 'notes',
    });
  });

  test('normalizes a singleton item and permits an empty channel', () => {
    const xml = `<rss version="2.0"><channel><title>Bun</title><link>https://bun.com</link><description>Releases</description><item><title>T</title><link>https://bun.com/blog/bun-v1.3.14</link><guid>g</guid><pubDate>Wed, 13 May 2026 03:19:35 GMT</pubDate><description>d</description></item></channel></rss>`;
    const [item] = parseRssChannelItems(xml);
    expect(item?.link).toBe('https://bun.com/blog/bun-v1.3.14');
    expect(item?.title).toBe('T');
    expect(
      parseRssChannelItems(
        '<rss version="2.0"><channel><title>Bun</title><link>https://bun.com</link><description>Releases</description></channel></rss>'
      )
    ).toEqual([]);
  });

  test('fails closed on malformed XML and invalid RSS roots', () => {
    expect(() => parseRssChannelItems('<rss version="2.0"><channel></rss>')).toThrow(
      SyntaxError
    );
    expect(() => parseRssChannelItems('<feed/>')).toThrow('one <rss> root');
    expect(() => parseRssChannelItems('<rss version="1.0"><channel/></rss>')).toThrow(
      'version must be 2.0'
    );
    expect(() =>
      parseRssChannelItems(
        '<rss version="2.0"><channel/><channel/></rss>'
      )
    ).toThrow('exactly one <channel>');
    expect(() =>
      parseRssChannelItems(
        '<rss version="2.0"><channel><title>Bun</title><link>https://bun.com</link><description>Posts</description><description>Again</description></channel></rss>'
      )
    ).toThrow('<description> must not repeat');
    expect(() =>
      parseRssChannelItems(
        '<!DOCTYPE rss [<!ENTITY x "Bun">]><rss version="2.0"><channel><title>&x;</title><link>https://bun.com</link><description>Posts</description></channel></rss>'
      )
    ).toThrow('must not contain a DOCTYPE');
    expect(() =>
      parseRssChannelItems(
        '<rss version="2.0"><channel><title>Bun</title><link>https://bun.com</link><description>Posts</description><item><title>Missing fields</title></item></channel></rss>'
      )
    ).toThrow('requires a non-empty <link>');
  });
});
