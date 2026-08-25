// @see https://bun.com/docs/runtime/xml — compact shape and byte encodings
// @see https://www.rssboard.org/rss-specification — RSS 2.0 cardinality and GUIDs
// @see https://www.rssboard.org/media-rss — Media RSS 1.5.1 namespace and media facts

import { describe, expect, test } from 'bun:test';
import { generateRSS, parseRSSFeed, type RSSFeed } from '../lib/rss/rss-xml.ts';

const CHANNEL = '<title>Updates</title><link>https://example.com/</link><description>News</description>';

function rss(content = '', rootAttributes = ''): string {
  return `<rss version="2.0"${rootAttributes}><channel>${CHANNEL}${content}</channel></rss>`;
}

function item(content: string): string {
  return `<item>${content}<link>https://example.com/item</link></item>`;
}

function utf16(input: string, littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(2 + input.length * 2);
  bytes[0] = littleEndian ? 0xff : 0xfe;
  bytes[1] = littleEndian ? 0xfe : 0xff;
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    bytes[2 + index * 2 + (littleEndian ? 0 : 1)] = code & 0xff;
    bytes[2 + index * 2 + (littleEndian ? 1 : 0)] = code >> 8;
  }
  return bytes;
}

describe('RSS XML wire shape contract', () => {
  test('accepts Bun.XML byte inputs without imposing UTF-8', () => {
    const plain = rss(item('<title>Café</title>'));
    expect(parseRSSFeed(new TextEncoder().encode(plain)).items[0]?.title).toBe('Café');
    expect(parseRSSFeed(new DataView(utf16(plain, true).buffer)).items[0]?.title).toBe('Café');
    expect(parseRSSFeed(utf16(plain, false).buffer).items[0]?.title).toBe('Café');

    const latin = `<?xml version="1.0" encoding="ISO-8859-1"?>${plain}`;
    const latinBytes = Uint8Array.from(latin, character => character.charCodeAt(0));
    expect(parseRSSFeed(latinBytes).items[0]?.title).toBe('Café');
    expect(parseRSSFeed(new Blob([new TextEncoder().encode(plain)])).title).toBe('Updates');
  });

  test('rejects a DOCTYPE in UTF-8 and UTF-16 before native parsing', () => {
    const hostile = `<!DOCTYPE rss>${rss()}`;
    expect(() => parseRSSFeed(new TextEncoder().encode(hostile))).toThrow('DOCTYPE');
    expect(() => parseRSSFeed(utf16(hostile, true))).toThrow('DOCTYPE');
    expect(() => parseRSSFeed(utf16(hostile, false))).toThrow('DOCTYPE');
  });

  test('enforces channel and item singleton cardinality but allows categories', () => {
    expect(() =>
      parseRSSFeed(
        '<rss version="2.0"><channel><title>A</title><title>B</title>' +
          '<link>https://example.com/</link><description>News</description></channel></rss>'
      )
    ).toThrow('<title> must not repeat');
    expect(() => parseRSSFeed(rss(item('<title>A</title><title>B</title>')))).toThrow(
      '<title> must not repeat'
    );
    const parsed = parseRSSFeed(
      rss(item('<title>A</title><category>one</category><category domain="x">two</category>'))
    );
    expect(parsed.items[0]?.category).toEqual(['one', 'two']);
  });

  test('accepts title-only and description-only items with strong string output fields', () => {
    const parsed: RSSFeed = parseRSSFeed(
      rss(item('<title>Named</title>') + item('<description>Explained</description>'))
    );
    expect(parsed.items.map(({ title, description }) => [title, description])).toEqual([
      ['Named', ''],
      ['', 'Explained'],
    ]);
    expect(() => parseRSSFeed(rss(item('')))).toThrow('requires <title> or <description>');

    const withoutLink = parseRSSFeed(rss('<item><description>Self-contained</description></item>'));
    expect(withoutLink.items[0]).toEqual(
      expect.objectContaining({ link: '', guid: '', description: 'Self-contained' })
    );
    const emitted = generateRSS(withoutLink);
    expect(emitted).not.toContain('<link></link>');
    expect(emitted).not.toContain('<guid');
  });

  test('requires absolute HTTP(S) links and media URLs', () => {
    expect(() =>
      parseRSSFeed(
        '<rss version="2.0"><channel><title>A</title><link>/relative</link>' +
          '<description>News</description></channel></rss>'
      )
    ).toThrow('absolute HTTP(S) URL');
    expect(() => parseRSSFeed(rss(item('<title>A</title>').replace('https://example.com/item', '/x'))))
      .toThrow('absolute HTTP(S) URL');
    expect(() =>
      parseRSSFeed(
        rss(
          item('<title>A</title><enclosure url="/image.png" length="1" type="image/png"/>')
        )
      )
    ).toThrow('enclosure@url');
  });

  test('validates RSS dates and numeric wire strings', () => {
    expect(() => parseRSSFeed(rss('<ttl>1.5</ttl>'))).toThrow('<ttl> must be an integer');
    expect(() => parseRSSFeed(rss(item('<title>A</title><pubDate>2026-08-24</pubDate>')))).toThrow(
      'RFC 822 date'
    );
    expect(() =>
      parseRSSFeed(
        rss(
          item('<title>A</title><enclosure url="https://cdn.example/a" length="lots" type="image/png"/>')
        )
      )
    ).toThrow('enclosure@length');
    expect(() =>
      parseRSSFeed(
        rss(
          item('<title>A</title><media:thumbnail url="https://cdn.example/a" width="0"/>'),
          ' xmlns:media="http://search.yahoo.com/mrss/"'
        )
      )
    ).toThrow('integer >= 1');
  });

  test('applies GUID isPermaLink defaults and deterministic emission', () => {
    expect(() => parseRSSFeed(rss(item('<title>A</title><guid>opaque</guid>')))).toThrow(
      'permalink GUID'
    );
    expect(parseRSSFeed(rss(item('<title>A</title><guid isPermaLink="false">opaque</guid>'))).items[0]?.guid)
      .toBe('opaque');
    expect(() =>
      parseRSSFeed(rss(item('<title>A</title><guid isPermaLink="maybe">https://example.com/g</guid>')))
    ).toThrow('must be true or false');

    const feed = parseRSSFeed(rss(item('<title>A</title>')));
    feed.items.push({
      title: 'Opaque', link: 'https://example.com/opaque', description: '', pubDate: '', guid: 'opaque',
    });
    const xml = generateRSS(feed);
    expect(xml).toContain('<guid>https://example.com/item</guid>');
    expect(xml).toContain('<guid isPermaLink="false">opaque</guid>');
  });

  test('resolves the nearest Media RSS namespace, including item scope', () => {
    const scoped = item(
      '<title>A</title><media:thumbnail url="https://cdn.example/a.png"/>'
    ).replace('<item>', '<item xmlns:media="http://search.yahoo.com/mrss/">');
    expect(parseRSSFeed(rss(scoped)).items[0]?.imageUrl).toBe('https://cdn.example/a.png');

    const overridden = item('<title>A</title><media:thumbnail url="https://cdn.example/a.png"/>')
      .replace('<item>', '<item xmlns:media="https://attacker.example/media">');
    expect(() =>
      parseRSSFeed(rss(overridden, ' xmlns:media="http://search.yahoo.com/mrss/"'))
    ).toThrow('require the Media RSS');
  });

  test('enforces enclosure and Media RSS group cardinality', () => {
    const enclosure = '<enclosure url="https://cdn.example/a.png" length="1" type="image/png"/>';
    expect(() => parseRSSFeed(rss(item(`<title>A</title>${enclosure}${enclosure}`)))).toThrow(
      '<enclosure> must not repeat'
    );
    expect(() =>
      parseRSSFeed(
        rss(item('<title>A</title><enclosure url="https://cdn.example/a.png" type="image/png"/>'))
      )
    ).toThrow('requires <@length>');
    const group = '<media:group>' +
      '<media:content url="https://cdn.example/a.png" medium="image" isDefault="true"/>' +
      '<media:content url="https://cdn.example/b.png" medium="image" isDefault="true"/>' +
      '</media:group>';
    expect(() =>
      parseRSSFeed(rss(item(`<title>A</title>${group}`), ' xmlns:media="http://search.yahoo.com/mrss/"'))
    ).toThrow('multiple default contents');
  });

  test('serializes channel branding, Atom self identity, and Media RSS', () => {
    const feed = parseRSSFeed(rss(item('<title>A</title>')));
    feed.selfUrl = 'https://example.com/feeds/v1/images.xml';
    feed.image = {
      url: 'https://example.com/logo.png',
      title: 'Updates',
      link: 'https://example.com/',
      width: 144,
      height: 40,
    };
    feed.items[0]!.enclosure = {
      url: 'https://cdn.example/a.png',
      length: 100,
      type: 'image/png',
    };
    feed.items[0]!.media = {
      url: 'https://cdn.example/a.png',
      fileSize: 100,
      type: 'image/png',
      medium: 'image',
      expression: 'full',
      width: 10,
      height: 20,
      credits: [{ value: 'Publisher', role: 'publisher' }],
    };
    const xml = generateRSS(feed);
    const parsed = parseRSSFeed(xml);
    expect(parsed.image?.width).toBe(144);
    expect(parsed.selfUrl).toBe('https://example.com/feeds/v1/images.xml');
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('xmlns:media="http://search.yahoo.com/mrss/"');
    expect(xml).toContain('<atom:link href="https://example.com/feeds/v1/images.xml"');
    expect(xml).toContain('<media:credit role="publisher">Publisher</media:credit>');

    expect(() =>
      parseRSSFeed(
        rss('<image><url>https://example.com/logo.png</url><title>Logo</title>' +
          '<link>https://example.com/</link><width>145</width></image>')
      )
    ).toThrow('must be <= 144');

    expect(() =>
      parseRSSFeed(
        rss(
          '<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml"/>',
          ' xmlns:atom="https://attacker.example/atom"'
        )
      )
    ).toThrow('require the Atom namespace');

    expect(() =>
      parseRSSFeed(
        rss(
          item('<title>A</title><media:player url="https://video.example/player"/>'),
          ' xmlns:media="https://attacker.example/media"'
        )
      )
    ).toThrow('require the Media RSS');
    expect(() =>
      parseRSSFeed(
        rss(
          item('<title>A</title><media:content url="https://cdn.example/a" medium="archive"/>'),
          ' xmlns:media="http://search.yahoo.com/mrss/"'
        )
      )
    ).toThrow('@medium is invalid');
  });
});
