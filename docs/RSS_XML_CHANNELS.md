# RSS channels, versions, identity, and determinism

This detail page belongs to the canonical
[`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md). RSS rules come from the external
standards linked there; channel keys and schema versions are application-owned.
Release-state and pruning rules are defined in
[`BUN_1_4_CHANNEL_LIFECYCLE.md`](./BUN_1_4_CHANNEL_LIFECYCLE.md).

## One document, one channel

An RSS 2.0 document has exactly one `<rss version="2.0">` root and one
`<channel>`. “Multi-channel RSS” therefore means several valid documents at
separate stable endpoints, plus an optional aggregate document. It never means
several `<channel>` elements under one RSS root.

Every channel requires exactly one each of `<title>` (display name), `<link>`
(corresponding HTML site), and `<description>` (human-readable summary). Core
channel metadata should precede items. Core RSS channel fields other than
`<category>` are singleton. A channel with no items is valid.

Model application channels independently from XML:

```ts
type FeedChannelKey = 'all' | 'runtime' | 'packages' | 'testing' | 'media';

interface FeedChannelContract {
  key: FeedChannelKey;
  schemaVersion: 1;
  endpoint: URL;
  title: string;
  site: URL;
  description: string;
  image?: ChannelImageContract;
}
```

This union is illustrative. Implementations must use repository-approved branded
identifiers rather than copying it as a domain type.

## Project, repository, and channel ownership

A project, repository, channel, and publisher are separate identities:

- `ProjectId` names the product or workspace that owns the feed's meaning.
- `GitHubRepositoryRef` names implementation and release authority.
- `FeedId` names one logical RSS channel.
- The content publisher owns source material and attribution rights.
- The serving repository operates an endpoint without acquiring third-party
  content ownership.

A channel exists only through an explicit registration binding those identities
to a source manifest, canonical endpoint, schema version, and archive policy.
Project inventory, package metadata, workspace membership, and Git remotes do
not register feeds and must not be used to invent feed URLs.

Every `FeedId` has exactly one canonical endpoint. It owns the Atom `rel="self"`
URL, document bytes, validators, and schema version. A declared project endpoint
is a permanent transport alias: it redirects GET and HEAD to the canonical
endpoint and does not emit another XML copy or mint another identity.

An unregistered project has no RSS endpoint. Lookup returns not found and must
not fall back to the root, Bun, package, or repository feed. Deliberately
retired registrations may use `410 Gone`; that is distinct from never
registered.

The committed project-channel registry is an external wire boundary, even when
the same repository generated it. Consumers must parse it fail-closed before
using ownership, routes, or archive metadata. Validation rejects unknown keys,
unbranded IDs, non-canonical repository coordinates, path traversal, duplicate
IDs or endpoints, project/path mismatches, and any channel not present in the
reviewed Bun 1.4 contract. `public/_redirects` may contain only the registered
project aliases, and `public/feeds/v1/projects/` must not contain copied XML.

## Independent versions

| Version       | Meaning                      | Example                      |
| ------------- | ---------------------------- | ---------------------------- |
| Bun runtime   | Parser/serializer behavior   | `1.4.0`                      |
| RSS format    | Standards conformance        | `<rss version="2.0">`        |
| Feed schema   | Application payload contract | `/feeds/v1/runtime.xml`      |
| Item revision | Source/content revision      | application metadata or ETag |

Never place an application version in RSS's `version` attribute. Put breaking
payload versions in the endpoint and internal manifest. Preserve a GUID across
cosmetic edits, channel presentation changes, or regenerated XML; mint a new
GUID only when the logical item changes.

Identify the current document with an Atom self link at its exact endpoint:

```xml
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <atom:link href="https://example.test/feeds/v1/runtime.xml"
      rel="self" type="application/rss+xml" />
  </channel>
</rss>
```

Private extensions require an owned namespace. Do not invent unqualified channel
elements such as `<schemaVersion>`.

## Deterministic fan-out

Normalize source records before endpoint selection. The same logical item may
appear in an aggregate and several topic feeds, retaining its GUID, canonical
link, publication time, and normalized content. Membership is presentation, not
identity.

```text
bounded source bytes
  -> Bun.XML.parse wire shape
  -> RSS structural validation
  -> normalized logical items
  -> separately proven media enrichment
  -> channel membership selection
  -> deterministic item ordering
  -> Bun.XML.stringify
  -> exact response bytes + HTTP validators
```

Channel renderers must not reparse wire values, infer identity, or rediscover
media. Equal normalized records and schema version must produce byte-identical
XML. Order by publication time descending, then stable GUID ascending. Timestamp
collisions are valid, so array position, fetch completion order, concurrent
object insertion, and semantic-version comparison are invalid tie-breakers.

For generated feeds:

- item `pubDate` remains the original publication time;
- an application-owned update timestamp may advance for a material logical
  change, but must be namespaced with documented RFC 3339 semantics;
- channel `lastBuildDate` is the latest material revision represented in that
  endpoint, not the request wall clock;
- no-op regeneration leaves bytes and validators unchanged;
- `Last-Modified` corresponds to that deterministic endpoint revision;
- a strong ETag is computed from exact emitted response bytes;
- conditional requests compare validators for that endpoint and version;
- upstream weak ETags remain fetch validators and never become generated-feed
  identity;
- RSS `ttl` is an aggregator polling hint in minutes, not HTTP `Cache-Control`.

## Identity and retrieval state

| Value                   | Meaning                                             |
| ----------------------- | --------------------------------------------------- |
| Stable item GUID        | Logical event identity across channels and versions |
| Source URL              | Upstream representation location                    |
| Upstream ETag/date      | Conditional validator for that upstream resource    |
| SHA-256                 | Digest of exact retrieved or vendored bytes         |
| Generated endpoint ETag | Validator of exact emitted feed bytes               |
| Feed schema version     | Application interpretation and serialization rules  |

A changed source ETag with unchanged decoded content need not mint an asset
identity. Changed bytes update the digest and enrichment revision, but do not by
themselves mint a new item GUID.

## Bun 1.4 media endpoints

The committed Bun 1.4 manifest deterministically fans out to four feed-schema v1
documents:

| Endpoint               | Membership                          |
| ---------------------- | ----------------------------------- |
| `/feeds/v1/all.xml`    | All 26 manifest records             |
| `/feeds/v1/images.xml` | 21 images, including release art    |
| `/feeds/v1/videos.xml` | Four MP4s with poster relationships |
| `/feeds/v1/embeds.xml` | One interaction-gated player        |

Each document has one channel, an exact Atom self link, a bounded core channel
image, a schema version held outside RSS XML, a strong SHA-256 ETag over emitted
bytes, and the official Bun RSS publication time as its source publication and
initial material revision. The aggregate and specific feeds retain the same
opaque item GUID. Equal manifest data produces byte-identical XML.

Rights-pending records use absolute Bun-hosted source URLs. An approved manifest
may resolve approved local URLs against the Pages origin without changing item
identity. A changed representation changes the exact-byte ETag; it does not
rewrite the original publication date.

Capability membership is a separate normalized relation in
[`bun-1.4-capabilities.json`](../public/registry/bun-1.4-capabilities.json).
Related feed items emit stable standard categories such as
`bun:capability:bun-spawn-cgroup`; no private RSS element or capability-specific
endpoint is invented. Channel membership remains derived from the referenced
asset's canonical kind, so the capability graph cannot duplicate or override
media facts.
