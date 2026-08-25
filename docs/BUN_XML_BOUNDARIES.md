# Bun.XML application and image boundaries

This detail page is part of the canonical [`BUN_XML.md`](./BUN_XML.md) contract.
It prevents application policy from being mislabeled as native XML behavior.

## RSS, channel, branding, and versioning boundary

`Bun.XML` does not define:

- which RSS or Media RSS elements a feed publishes;
- whether an application exposes one or several feed channels;
- endpoint or payload versioning;
- channel logos, brand colors, thumbnails, or dominant colors;
- storage, refresh schedules, ETags, cache policy, or broadcast behavior.

Those decisions need their own standards and application contracts. A versioned
endpoint such as `/feeds/v1/releases.xml` is an application design, not a
`Bun.XML` feature. The document's `rss version="2.0"` must not be repurposed as
an application schema version. [`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md)
owns the repository's RSS 2.0, Media RSS, multi-channel, branding, and
application-version contract.

## Bun.Image boundary for feed media

[`Bun.Image.metadata()`](https://bun.com/docs/runtime/image#metadata) returns
only `width`, `height`, and `format`. Byte size and cryptographic digest come
from input bytes and a hashing API. Palette, dominant color, alpha, and color
space are not part of the documented Bun 1.4 metadata result.

The native image shape is an instance pipeline:

```ts
const metadata = await new Bun.Image(bytes, {
  maxPixels: 4096 * 4096,
}).metadata();
const thumbnail = await new Bun.Image(bytes)
  .resize(240, 160, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 80 })
  .blob();
const placeholder = await new Bun.Image(bytes).placeholder();
```

There is no documented static `Image.metadata()` or `Image.resize()` API. Fetch
and cap remote enclosure bytes before construction. Never pass an untrusted
string to `new Bun.Image()` because strings are local filesystem paths. Bun
sniffs image formats from bytes rather than trusting extensions or HTTP
`Content-Type`, and `maxPixels` is the native pre-decode decompression-bomb
guard. `placeholder()` returns a native ThumbHash-rendered LQIP data URL, not a
dominant-color result.
