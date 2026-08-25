# RSS hostile-fetch and validation boundary

This detail page belongs to the canonical
[`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md). These are deliberately narrow
application rules layered over Bun's broader fetch and XML capabilities.

## URL, redirect, and DNS policy

Bun `fetch()` supports `file:`, `data:`, `blob:`, and `s3:` as well as web URLs.
Never pass an untrusted source string to `fetch()` before policy validation.
Parse first and allow only explicitly configured HTTPS origins. Reject
credentials, unsupported ports, malformed hosts, and unexpectedly different
canonical URL serialization.

Redirects are new requests, not inherited trust. Handle them manually, cap hops,
resolve and validate every destination, and reject loopback, private,
link-local, multicast, unspecified, and other prohibited IPv4/IPv6 targets.
Revalidate after every redirect and DNS resolution; one public answer does not
defeat rebinding. Prefer a client boundary that can verify or pin the connected
address when the deployment runtime exposes it.

Use one `AbortSignal.timeout()` for the complete redirect chain rather than
starting a new timeout at every hop. Cancel each redirect response body before
following its `Location`; otherwise a rejected representation can continue
consuming connection and memory budget after trust has moved to the next URL.

## Independent limits

- Whole-request deadline through `AbortSignal.timeout()`.
- Bun socket-idle timeout as a separate stalled-I/O control.
- Maximum redirects, compressed transfer bytes, and decoded body bytes.
- Native XML nesting/entity limits plus application body limits.
- Media-specific bytes, pixels, width, height, and duration.
- Bounded global concurrency and per-origin request budgets.

Bun fetch decompresses gzip, deflate, Brotli, and Zstandard by default, so
compressed `Content-Length` is not a decoded-body ceiling. Stream and count
decoded chunks, cancel at the limit, and only then join fixed bytes for
`Bun.XML.parse()` or `Bun.Image`. With `decompress: false`, the application owns
decoding and both compressed and expanded limits. Missing, incorrect, or
oversized `Content-Length` fails policy rather than weakening the stream limit.

## Verify response claims

1. Require an allowed final URL and successful status.
2. Check `Content-Type` against a narrow expected allowlist.
3. Enforce the byte ceiling while reading.
4. Compute SHA-256 over exact retained bytes.
5. For images, let `Bun.Image.metadata()` sniff bytes and compare format and
   dimensions with declared metadata.
6. For video, verify MP4 structure, duration/dimensions, poster relationship,
   and byte-range behavior in the video pipeline. `Bun.Image` does not validate
   MP4.
7. Record source and final URLs, retrieval time, HTTP validators, declared MIME,
   sniffed format, byte size, digest, and rights status independently.

One enrichment failure must not invalidate the RSS item or unrelated channels.
Retain a text/link-only card and record a typed, observable enrichment failure.
Never silently replace a verified local asset when upstream bytes or media facts
drift; require manifest regeneration and review.

## XML policy beyond native parsing

`Bun.XML` never reads external entities, but it processes an internal DTD
subset, expands bounded internal entities, and applies default attributes. The
observed Bun feed has no DOCTYPE, and this application needs no DTD-derived feed
semantics. Reject `DOCTYPE` in decoded live-feed input before parsing. This is
application policy, not a Bun parser limitation.

`Bun.XML.parse()` exposes no application knobs for maximum nodes, text, depth,
or entity policy. Byte limits must precede parsing. The normalized tree still
needs bounded item, node, attribute, text, and depth checks. Parse admitted
hostile public feeds in a terminable execution boundary. Native `SyntaxError`,
native `RangeError`, deadline expiry, or an application-limit violation rejects
the complete candidate snapshot. Never recover items with regex or an HTML
parser.

Compact mode preserves keys such as `media:content`, but a prefix is not proof
of namespace identity. Verify the in-scope declaration is the exact expected URI
before interpreting an extension. `media:content` bound to an attacker namespace
is unknown extension data, not Media RSS.

## Initial review profile

The first production limits should be conservative and independently
configurable. A starting profile is:

- 2 MiB compressed and 8 MiB decoded feed bytes;
- five redirects;
- 128 element depth, 100,000 nodes, and 10,000 items;
- 32 media references per item;
- 25 MiB and 16,777,216 pixels per raster image;
- bounded global and per-origin concurrency.

These are application defaults for review and load testing, not Bun, RSS, or
Media RSS limits.
