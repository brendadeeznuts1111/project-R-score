# rss

RSS managers.

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API
surface.

Native XML authority: [`../../docs/BUN_XML.md`](../../docs/BUN_XML.md). The
canonical target uses strict `Bun.XML.parse()` plus `Bun.XML.stringify()` and
normalizes compact one-or-many values once at the wire boundary. Regex parsing
and hand-built XML serialization are not accepted fallbacks.

RSS 2.0, Media RSS, multi-channel endpoint, enclosure, versioning, and branding
semantics are owned by
[`../../docs/RSS_XML_CONTRACT.md`](../../docs/RSS_XML_CONTRACT.md).

| Entry                                                  | Responsibility                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [`rss-xml.ts`](./rss-xml.ts)                           | Stable strict Bun.XML parse/normalize API and RSS type exports.                                                      |
| [`rss-xml-validation.ts`](./rss-xml-validation.ts)     | Core compact-shape, URL, integer, singleton, and date validation.                                                    |
| [`rss-media-validation.ts`](./rss-media-validation.ts) | Media RSS namespace, group, content, player, credit, thumbnail, and enclosure validation.                            |
| [`rss-xml-serialize.ts`](./rss-xml-serialize.ts)       | Deterministic Bun.XML emission for core RSS, Atom self links, channel images, enclosures, and Media RSS.             |
| [`rss-fanout.ts`](./rss-fanout.ts)                     | Versioned one-channel documents, stable GUID membership, deterministic dates, and exact-byte strong ETags.           |
| [`rss-response.ts`](./rss-response.ts)                 | GET/HEAD plus conditional ETag and Last-Modified response semantics.                                                 |
| [`rss-manager.ts`](./rss-manager.ts)                   | Cache, enrich, generate, and publish normalized RSS feeds.                                                           |
| [`remote-fetch.ts`](./remote-fetch.ts)                 | Shared HTTPS, origin, redirect, deadline, identity-encoding, and streaming-byte policy.                              |
| [`fetch-feed-xml.ts`](./fetch-feed-xml.ts)             | Bounded XML retrieval and MIME validation before parsing.                                                            |
| [`feed-image.ts`](./feed-image.ts)                     | Validate image enclosures, read Bun.Image metadata, create WebP thumbnails and colors, and conditionally revalidate. |
| [`fetch-image-bytes.ts`](./fetch-image-bytes.ts)       | Image-specific adapter over the shared remote-fetch boundary.                                                        |
| [`image-color.ts`](./image-color.ts)                   | Downsample images and decode Bun's one-pixel PNG terminal for average colors.                                        |

`RSSManager.fetchFeed()` recognizes image candidates in this order:
`media:content`, image `enclosure`, then `media:thumbnail`. Enrichment is
bounded to 12 items with three workers by default. A failed image never fails
the feed; the original `imageUrl` remains available as fallback metadata.

Remote URLs are HTTPS-only, manually redirected, bounded while streaming, and
reject credentials plus literal local/private targets. Production ingestion
still requires an SSRF-aware egress layer or trusted-origin allowlist because
Bun fetch does not expose a connection-bound DNS pinning contract.

The integrated documentation server exposes the fixed `RSS_FEED_URL` (default
`https://bun.com/rss.xml`) at `/api/feed`. It does not accept arbitrary feed
URLs from HTTP requests.

Package names are not feed locators. `getPackageFeeds()` fetches only explicit
caller-supplied URLs; it does not invent npm RSS paths or assume a package name
is a GitHub `owner/repository`. Generated package feeds omit dates when their
source model has no revision timestamp and sort records before serialization, so
equal inputs produce equal XML.

`Bun.Image.metadata()` supplies width, height, and format only. Byte size,
SHA-256, dominant color, branding, channel assignment, and payload versioning
are application-derived contracts and must be labeled separately.

The Bun 1.4 asset manifest is rendered into `/feeds/v1/all.xml`, `images.xml`,
`videos.xml`, and `embeds.xml` by
[`../../tools/bun-blog-assets/feed.ts`](../../tools/bun-blog-assets/feed.ts).
The asset check compares those committed files byte-for-byte with a fresh
manifest-derived render.

Project and repository ownership is mapped by
[`project-channel-registry.ts`](./project-channel-registry.ts) and baked to
`/registry/project-rss-channels.json`. The root project has four permanent,
project-addressable aliases; active projects with no reviewed feed authority are
listed as `unregistered` and receive no guessed route or fallback feed. Parse
the baked registry through `parseProjectRSSChannelRegistry()` before consuming
it; aliases redirect to canonical documents and never materialize copied XML.
