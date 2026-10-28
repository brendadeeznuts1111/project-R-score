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

| Entry                                                      | Responsibility                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`rss-xml.ts`](./rss-xml.ts)                               | Stable strict Bun.XML parse/normalize API and RSS type exports.                                                      |
| [`rss-xml-validation.ts`](./rss-xml-validation.ts)         | Core compact-shape, URL, integer, singleton, and date validation.                                                    |
| [`rss-media-validation.ts`](./rss-media-validation.ts)     | Media RSS namespace, group, content, player, credit, thumbnail, and enclosure validation.                            |
| [`rss-xml-serialize.ts`](./rss-xml-serialize.ts)           | Deterministic Bun.XML emission for core RSS, Atom self links, channel images, enclosures, and Media RSS.             |
| [`rss-fanout.ts`](./rss-fanout.ts)                         | Versioned one-channel documents, stable GUID membership, deterministic dates, and exact-byte strong ETags.           |
| [`rss-response.ts`](./rss-response.ts)                     | GET/HEAD plus conditional ETag and Last-Modified response semantics.                                                 |
| [`rss-manager.ts`](./rss-manager.ts)                       | Cache, enrich, generate, and publish normalized RSS feeds.                                                           |
| [`feed-image.ts`](./feed-image.ts)                         | Validate/enrich images, persist rights-gated original/thumbnail `ContentRef`s, and perform strict offline CAS reads. |
| [`feed-snapshot-manifest.ts`](./feed-snapshot-manifest.ts) | Strict versioned source-to-CAS feed manifests, channel membership, freshness policy, and cache-only verified loads.  |
| [`feed-snapshot-archive.ts`](./feed-snapshot-archive.ts)   | Exact source-alias resolution into strictly parsed manifests and digest-verified offline bytes, with no fetch seam. |
| [`remote-fetch.ts`](./remote-fetch.ts)                     | Shared HTTPS, origin, redirect, deadline, identity-encoding, and streaming-byte policy.                              |
| [`fetch-feed-xml.ts`](./fetch-feed-xml.ts)                 | Bounded XML retrieval and MIME validation before parsing.                                                            |
| [`fetch-image-bytes.ts`](./fetch-image-bytes.ts)           | Image-specific adapter over the shared remote-fetch boundary.                                                        |
| [`image-color.ts`](./image-color.ts)                       | Downsample images and decode Bun's one-pixel PNG terminal for average colors.                                        |
| `project-channel-registry*.ts`                             | Project/repository ownership, strict registry parsing, channel registration, and alias routes.                       |

`RSSManager.fetchFeed()` recognizes image candidates in this order:
`media:content`, image `enclosure`, then `media:thumbnail`. Enrichment is
bounded to 12 items with three workers by default. A failed image never fails
the feed; the original `imageUrl` remains available as fallback metadata.

Remote URLs are HTTPS-only, manually redirected, bounded while streaming, and
reject credentials plus literal local/private targets. The native transport
resolves each redirect destination, rejects the complete answer set if any
address is nonpublic, and connects only to validated numeric IPs. Failed
connections fall back immediately within the captured answer set; pending
connections start the next attempt after 50 ms. The first HTTP response wins
regardless of status, and losing attempts are aborted with late bodies
cancelled. No fallback performs another DNS lookup or extends the deadline. HTTP
Host and TLS certificate identity remain the original hostname; ambient proxies
and connection reuse are disabled. This avoids a second hostname resolution
between validation and connection. DNS lookup and body reads share the request
deadline.

Explicit custom fetchers are trusted transport overrides: their owner must
enforce DNS and egress policy. Origin allowlists remain an additional
restriction; they are not a substitute for address checks. Cross-origin
redirects discard authorization, cookies, proxy credentials, explicit Host, and
cache validators. Image status/MIME failures and cached responses release bodies
without awaiting potentially stalled cancellation hooks.

The integrated documentation server exposes the fixed `RSS_FEED_URL` (default
`https://bun.com/rss.xml`) at `/api/feed`. It does not accept arbitrary feed
URLs from HTTP requests.

Package names are not feed locators. `getPackageFeeds()` fetches only explicit
caller-supplied URLs; it does not invent npm RSS paths or assume a package name
is a GitHub `owner/repository`. Generated package feeds omit dates when their
source model has no revision timestamp and sort records before serialization, so
equal inputs produce equal XML.

`RSSManager` no longer accepts or returns free-form R2 JSON as an offline
fallback. An optional `FeedSnapshotArchive` must return an exact source-bound,
versioned manifest plus a `ContentStore`; every referenced byte is rehashed and
the XML is reparsed in the terminable worker before use. Publishing uses the
separate typed `RSSPublishStorage` surface and cannot read storage credentials.
[`FeedSnapshotWriter`](./feed-snapshot-writer.ts) separately authorizes current
store/derive rights, writes and re-verifies immutable XML/image bytes, then
publishes an exact-revision source alias through the supplied
[memory](./memory-feed-snapshot-archive.ts) or
[R2](./r2-feed-snapshot-archive.ts) binding adapter. Failed, partial, or raced
writes cannot expose an alias. No adapter reads ambient credentials, uses Bun's
package global store, or supplies a network fallback.

`Bun.Image.metadata()` supplies width, height, and format only. Byte size,
SHA-256, dominant color, branding, channel assignment, and payload versioning
are application-derived contracts and must be labeled separately.

The Bun 1.4 asset pipeline renders its versioned feed projection through
[`../../tools/bun-blog-assets/feed.ts`](../../tools/bun-blog-assets/feed.ts).
Endpoint membership, aliases, counts, and media-rights delivery remain owned by
[`../../docs/BUN_1_4_CHANNEL_LIFECYCLE.md`](../../docs/BUN_1_4_CHANNEL_LIFECYCLE.md)
and [`../../docs/BUN_1_4_MEDIA_RIGHTS.md`](../../docs/BUN_1_4_MEDIA_RIGHTS.md);
verify the generated bytes with `bun run channels:bun-1.4:check`.

Project and repository ownership is mapped by
[`project-channel-registry.ts`](./project-channel-registry.ts) and baked to
`/registry/project-rss-channels.json`. The root project has four permanent,
project-addressable aliases; active projects with no reviewed feed authority are
listed as `unregistered` and receive no guessed route or fallback feed. Parse
the baked registry through `parseProjectRSSChannelRegistry()` before consuming
it; aliases redirect to canonical documents and never materialize copied XML.
