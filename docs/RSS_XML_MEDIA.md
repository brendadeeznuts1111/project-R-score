# RSS items, media, branding, and rights

This detail page belongs to the canonical
[`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md). RSS and Media RSS semantics come
from the external standards linked there; enrichment and rights are application
data.

## Item and identity fields

An item must contain at least `<title>` or `<description>`. For predictable
deduplication, publish both a stable `<guid>` and canonical `<link>` when
available. An opaque application GUID needs `isPermaLink="false"`; RSS otherwise
defaults it to `true`.

`<category>` is the core repeatable item field. Its optional `domain` names the
taxonomy. Route channels from normalized application data, not repeated
inference over arbitrary category strings.

`<source url="…">Channel title</source>` credits the originating feed for
republished or aggregated items. It is provenance, not media rights or creator
credit.

## Core RSS enclosures

`<enclosure>` is an empty item child with three required attributes:

```xml
<enclosure url="https://cdn.example.test/demo.mp4"
  length="12216320" type="video/mp4" />
```

`url` is the direct media URL; `length` is bytes, or `0` when unknown; `type` is
the standard MIME type. The best-practices profile recommends at most one
enclosure per item for broad reader compatibility. Alternatives, posters,
thumbnails, and richer video metadata belong in Media RSS.

## Media RSS

Use the exact namespace URI, including its trailing slash:

```xml
xmlns:media="http://search.yahoo.com/mrss/"
```

`<media:content>` may be directly under an item or in `<media:group>`. A group
contains alternative representations of the same logical content, never
different media objects.

- `url`: direct media URL; otherwise `media:player` is required.
- `fileSize`: bytes.
- `type`: MIME type.
- `medium`: `image`, `audio`, `video`, `document`, or `executable`.
- `isDefault`: at most one default representation per group.
- `expression`: `sample`, `full`, or `nonstop`; default `full`.
- `duration`, `height`, and `width`: numeric facts represented as XML strings
  after parsing.

Representative images use `<media:thumbnail>`:

```xml
<media:thumbnail url="https://cdn.example.test/demo-poster.webp"
  width="1280" height="720" />
```

Its `url` is required; dimensions and time offset are optional. Without time
coding, multiple thumbnails are ordered by importance.

Media metadata inherits shallow to deep, with deeper values winning: `channel` →
`item` → `media:group` → `media:content`. Normalize precedence once at the wire
boundary.

## Branding and image evidence

Core channel branding is `<channel><image>`. It requires `<url>`, `<title>`, and
`<link>` and may contain `<width>`, `<height>`, and `<description>`. RSS limits
width to 144 pixels and height to 400 pixels; defaults are 88×31. Its format is
GIF, JPEG, or PNG.

- Do not put a large social card or WebP in the core channel image.
- Use a small standards-compatible logo for channel identity.
- Use `media:thumbnail` for item posters and richer imagery.
- Use the image title as meaningful alternative text, not a filename.
- Keep colors, theme tokens, and LQIPs in application metadata or an owned
  namespace.
- Keep source URL, creator/credit, copyright, license, and rights status
  independently addressable.

`Bun.Image.metadata()` provides native width, height, and sniffed format only.
Byte size, MIME comparison, SHA-256, palette/dominant color, attribution, and
rights are application-derived or asserted fields. Fetch remote URLs under
network and byte limits, then pass fixed bytes to `Bun.Image`; an untrusted
constructor string denotes a local filesystem path.

Media cardinality, credit, license, hash, restriction, and vendoring rules are
specified in [`RSS_XML_MEDIA_RIGHTS.md`](./RSS_XML_MEDIA_RIGHTS.md).

The Bun 1.4 feeds emit one core enclosure and one `media:content` for each
direct image or MP4. MP4 items add their verified poster as `media:thumbnail`.
The YouTube record has no fake enclosure or direct media URL; it emits
`media:player`. All media records carry a publisher credit for Bun and link the
item to the official Bun 1.4 release page. Pending rights are stated in
descriptions and the source manifest, never promoted into an unverified
copyright or license assertion.
