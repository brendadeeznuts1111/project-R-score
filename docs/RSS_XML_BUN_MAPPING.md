# RSS mapping and emission with Bun.XML

This detail page belongs to the canonical
[`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md). Native XML behavior is owned by
[`BUN_XML.md`](./BUN_XML.md); this page applies it to RSS shapes.

## Compact-shape mapping

| XML                                   | Bun compact value                             |
| ------------------------------------- | --------------------------------------------- |
| `<rss version="2.0">`                 | `rss['@version'] === '2.0'`                   |
| `xmlns:media="…"`                     | `rss['@xmlns:media']`                         |
| one `<channel>`                       | `rss.channel` object                          |
| zero items                            | `channel.item === undefined`                  |
| one item                              | `channel.item` object                         |
| repeated items                        | `channel.item` array                          |
| `<guid isPermaLink="false">id</guid>` | `{ '@isPermaLink': 'false', '#text': 'id' }`  |
| `<enclosure … />`                     | object with `@url`, `@length`, and `@type`    |
| `<media:content … />`                 | object under literal key `'media:content'`    |
| `<media:thumbnail … />`               | object under literal key `'media:thumbnail'`  |
| numeric XML attributes                | strings requiring explicit bounded conversion |

Normalize one-or-many fields and attributed text once. Interior domain code must
not repeatedly branch on wire `string | object | array` shapes.

## Emission shape

Construct a compact document and let `Bun.XML.stringify()` escape values:

```ts
const body = Bun.XML.stringify({
  rss: {
    '@version': '2.0',
    '@xmlns:atom': 'http://www.w3.org/2005/Atom',
    '@xmlns:media': 'http://search.yahoo.com/mrss/',
    channel: {
      title: channel.title,
      link: channel.site.href,
      description: channel.description,
      'atom:link': {
        '@href': channel.endpoint.href,
        '@rel': 'self',
        '@type': 'application/rss+xml',
      },
      item: items.map(toRssItem),
    },
  },
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
```

Never interpolate XML fragments manually. Validate the authored compact model
before serialization: `stringify()` guarantees well-formed XML, not RSS semantic
conformance.
