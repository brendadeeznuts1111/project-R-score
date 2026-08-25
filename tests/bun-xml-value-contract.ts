import { describe, expect, test } from 'bun:test';

describe('Bun.XML 1.4 value contract', () => {
  test('uses compact @attribute, #text, namespace, and one-or-many shapes', () => {
    const parsed = Bun.XML.parse(`
      <rss version="2.0" xmlns:media="urn:media">
        <channel>
          <title>Factory feed</title>
          <item>
            <guid isPermaLink="false">v1:item:1</guid>
            <category>runtime</category>
            <category>images</category>
            <media:content url="https://cdn.example/hero.png" width="1200" />
          </item>
        </channel>
      </rss>
    `);

    expect(parsed).toEqual({
      rss: {
        '@version': '2.0',
        '@xmlns:media': 'urn:media',
        channel: {
          title: 'Factory feed',
          item: {
            guid: { '@isPermaLink': 'false', '#text': 'v1:item:1' },
            category: ['runtime', 'images'],
            'media:content': {
              '@url': 'https://cdn.example/hero.png',
              '@width': '1200',
            },
          },
        },
      },
    });

    const repeated = Bun.XML.parse('<root><item>one</item><item>two</item></root>');
    const singleton = Bun.XML.parse('<root><item>one</item></root>');
    expect(repeated).toEqual({ root: { item: ['one', 'two'] } });
    expect(singleton).toEqual({ root: { item: 'one' } });
  });

  test('stringifies safely, omits the declaration, and round-trips parsed values', () => {
    const document = {
      rss: {
        '@version': '2.0',
        channel: {
          title: 'Factory & Bun',
          item: [{ title: 'Bun <XML>', guid: 'v1:item:1' }],
        },
      },
    };
    const xml = Bun.XML.stringify(document);

    expect(xml).toBe(
      '<rss version="2.0"><channel><title>Factory &amp; Bun</title><item><title>Bun &lt;XML&gt;</title><guid>v1:item:1</guid></item></channel></rss>'
    );
    expect(xml).not.toStartWith('<?xml');

    const parsed = Bun.XML.parse(xml);
    expect(Bun.XML.parse(Bun.XML.stringify(parsed))).toEqual(parsed);
  });

  test('preserves mixed content, comments, and processing instructions in tree mode', () => {
    const parsed = Bun.XML.parse(
      '<p class="lead">Hello <b>world</b>!<!-- draft --><?review later?></p>',
      { compact: false }
    );

    expect(parsed).toEqual({
      name: 'p',
      attributes: { class: 'lead' },
      children: [
        'Hello ',
        { name: 'b', attributes: {}, children: ['world'] },
        '!',
        { comment: ' draft ' },
        { target: 'review', data: 'later' },
      ],
    });
    expect(Bun.XML.parse(Bun.XML.stringify(parsed), { compact: false })).toEqual(parsed);
  });

  test('applies internal DTD data but never resolves external entities', () => {
    expect(
      Bun.XML.parse('<!DOCTYPE x [<!ATTLIST x mode CDATA "rss"><!ENTITY name "Bun">]><x>&name;</x>')
    ).toEqual({ x: { '@mode': 'rss', '#text': 'Bun' } });

    expect(
      Bun.XML.parse('<!DOCTYPE x SYSTEM "file:///definitely-not-read"><x>&outside;</x>')
    ).toEqual({ x: '&outside;' });
  });

  test('decodes supported byte inputs and treats strings as already decoded', () => {
    const utf16Le = new Uint8Array([
      0xff, 0xfe, 0x3c, 0x00, 0x78, 0x00, 0x3e, 0x00, 0xe9, 0x00, 0x3c, 0x00, 0x2f, 0x00, 0x78,
      0x00, 0x3e, 0x00,
    ]);

    expect(Bun.XML.parse(utf16Le)).toEqual({ x: 'é' });
    expect(Bun.XML.parse(new DataView(utf16Le.buffer))).toEqual({ x: 'é' });
    expect(Bun.XML.parse(new Blob(['<x>blob</x>']))).toEqual({ x: 'blob' });
    expect(Bun.XML.parse('<?xml version="1.0" encoding="UTF-16"?><x>decoded</x>')).toEqual({
      x: 'decoded',
    });

    const unsupported = new TextEncoder().encode(
      '<?xml version="1.0" encoding="windows-1252"?><x>no</x>'
    );
    expect(() => Bun.XML.parse(unsupported)).toThrow(SyntaxError);
  });

  test('uses the documented scalar, skip, pretty-print, and validation rules', () => {
    expect(
      Bun.XML.stringify({
        root: {
          number: 42,
          boolean: true,
          bigint: 2n,
          date: new Date('2020-01-02T03:04:05.000Z'),
          empty: null,
          skipped: undefined,
        },
      })
    ).toBe(
      '<root><number>42</number><boolean>true</boolean><bigint>2</bigint><date>2020-01-02T03:04:05.000Z</date><empty/></root>'
    );
    expect(Bun.XML.stringify({ root: { first: '1', second: '2' } }, null, 2)).toBe(
      '<root>\n  <first>1</first>\n  <second>2</second>\n</root>'
    );
    expect(Bun.XML.stringify(undefined)).toBeUndefined();
    expect(() => Bun.XML.stringify({ 'first name': 'x' })).toThrow();
    expect(() => Bun.XML.stringify({ x: String.fromCharCode(0) })).toThrow();
    expect(() => Bun.XML.stringify({ x: [[1]] })).toThrow();
  });
});
