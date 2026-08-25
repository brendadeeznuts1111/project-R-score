# Official Bun RSS feed observation

This detail page belongs to the canonical
[`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md). It records an observation of
[`https://bun.com/rss.xml`](https://bun.com/rss.xml) fetched on 2026-08-24 with
Bun 1.4.0. It is evidence about that response, not a promise that Bun's feed
will retain this inventory or shape. The standards contract remains
authoritative when the live feed changes.

## Response evidence

The response was `200 application/xml`, decoded to 87,662 bytes, and had SHA-256
`8da10864a77c9778832d4619e187899e32bbd7c02c0780dc38008ca9171c2820`. It parsed
with `Bun.XML.parse()` into one RSS 2.0 root, one channel, and 177 items. Its
weak HTTP validator was `W/"c7d1afe68350d8254065ad132dd2a9d6"`; that transport
validator is not a content digest.

The observed channel shape was:

```ts
{
  title: 'bun.com',
  link: 'https://bun.com',
  description: 'A fast all-in-one JavaScript runtime and toolkit',
  language: 'en-us',
  'atom:link': {
    '@href': 'http://bun.com/rss.xml',
    '@rel': 'self',
    '@type': 'application/rss+xml',
  },
  lastBuildDate: 'Sun, 23 Aug 2026 21:24:30 GMT',
  pubDate: 'Sun, 23 Aug 2026 21:24:30 GMT',
  ttl: '60',
  item: [/* 177 items */],
}
```

Every observed item had exactly five non-empty scalar fields: `title`, `link`,
`guid`, `description`, and `pubDate`. All 177 GUIDs equaled their unique HTTPS
blog links. Dates were valid and reverse chronological, but three timestamps
were each shared by two items. Date alone is neither identity nor a total-order
key. Descriptions are decoded text, not trusted HTML; some contain literal
angle-bracket command placeholders such as `<workspace>` and `<stdin>`.

## Absent and derived data

The feed declared no Media RSS namespace and supplied no `category`,
`enclosure`, channel image, item image, `media:*`, or `content:*` elements. A
consumer may derive cards, categories, images, posters, or video only as a
separate enrichment operation over the linked official page. Derived data must
retain its own source, retrieval time, validator/digest, rights status, and
failure state; it is not an RSS-originated fact.

The newest item was `Bun 1.4` at `https://bun.com/blog/bun-v1.4`. Bun's official
release presentation omits patch zero, so this title and slug identify stable
`1.4.0`. Version matching must normalize a two-component release presentation to
patch zero; it must not report stable 1.4.0 as missing because the RSS title is
not `Bun 1.4.0`.

The observed Atom self link uses HTTP and redirects to HTTPS. Consumers may
record that upstream value as provenance. An application-generated feed must
emit its own exact canonical HTTPS endpoint rather than copying it.
