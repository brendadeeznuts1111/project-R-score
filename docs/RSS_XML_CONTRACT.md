# RSS + Media RSS contract over Bun.XML

This is the canonical standards and application entrypoint for RSS feeds parsed
or emitted with Bun 1.4. It keeps three authorities separate:

1. `Bun.XML` owns XML parsing, serialization, and JavaScript shapes.
2. RSS 2.0 and Media RSS own interoperable feed semantics.
3. This application owns channel selection, schema versions, branding policy,
   identifiers, rights, storage, enrichment, hostile-fetch rules, and HTTP
   behavior.

## External authority

| Contract             | Authority                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Native XML behavior  | [Bun XML guide](https://bun.com/docs/runtime/xml) · [repository Bun contract](./BUN_XML.md) |
| RSS 2.0              | [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)                         |
| RSS interoperability | [RSS Best Practices Profile](https://www.rssboard.org/rss-profile)                          |
| Rich media           | [Media RSS 1.5.1](https://www.rssboard.org/media-rss)                                       |
| Atom link semantics  | [RFC 4287](https://www.rfc-editor.org/rfc/rfc4287)                                          |
| Native HTTP client   | [Bun fetch](https://bun.com/docs/runtime/networking/fetch)                                  |
| Native DNS behavior  | [Bun DNS](https://bun.com/docs/runtime/networking/dns)                                      |

The absence of a copyright declaration never makes feed content or media public
domain. Rights and attribution remain explicit application data.

## Contract map

- [`RSS_XML_BUN_FEED_OBSERVATION.md`](./RSS_XML_BUN_FEED_OBSERVATION.md) records
  the dated live-feed observation and its limits as evidence.
- [`RSS_XML_CHANNELS.md`](./RSS_XML_CHANNELS.md) owns one-channel documents,
  application fan-out, versioning, identity, ordering, and HTTP validators.
- [`RSS_XML_MEDIA.md`](./RSS_XML_MEDIA.md) owns item fields, enclosures, Media
  RSS semantics, branding, image facts, provenance, and rights.
- [`RSS_XML_MEDIA_RIGHTS.md`](./RSS_XML_MEDIA_RIGHTS.md) owns Media RSS
  cardinality, credits, licenses, hashes, restrictions, and vendoring decisions.
- [`RSS_XML_HOSTILE_FETCH.md`](./RSS_XML_HOSTILE_FETCH.md) owns URL, redirect,
  DNS, deadline, byte, media-validation, DTD, namespace, and failure policy.
- [`RSS_XML_BUN_MAPPING.md`](./RSS_XML_BUN_MAPPING.md) owns compact-shape
  normalization and deterministic `Bun.XML.stringify()` emission.

These pages are parts of this canonical contract, not competing authorities.
Application examples remain subordinate to the external specifications above.

## Required implementation boundaries

Before multi-channel feed implementation is accepted:

1. Fetch XML/media through the hostile-fetch boundary with URL, redirect, DNS,
   deadline, idle, compressed/decoded-byte, and concurrency limits.
2. Parse XML once with `Bun.XML.parse()` and fail closed.
3. Normalize singleton/array and attributed-text shapes once.
4. Validate RSS 2.0 required fields separately from XML well-formedness.
5. Reject live-feed DOCTYPEs and validate bounded tree size plus namespace URI
   bindings before interpreting extensions.
6. Validate media URLs before fetching; block local, private-network,
   credential-bearing, and unsupported schemes.
7. Keep one core enclosure per item; model alternatives through Media RSS.
8. Keep channel routing and feed-schema versions out of RSS's `version` value.
9. Serialize with `Bun.XML.stringify()` and prepend the declaration explicitly.
10. Keep rights-pending media external and preserve attribution/source links.
11. Test each endpoint as a complete one-channel RSS document.
12. Make ordering, dates, serialization, ETags, and `Last-Modified`
    deterministic for identical normalized inputs.
13. Preserve text/link-only items when optional enrichment fails.
