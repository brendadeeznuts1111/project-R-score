# Media RSS cardinality, integrity, and rights

This detail page belongs to the canonical
[`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md). The normative format authority
is [Media RSS 1.5.1](https://www.rssboard.org/media-rss); vendoring decisions
are application policy.

## Cardinality and grouping

| Element             | Placement and multiplicity                                  |
| ------------------- | ----------------------------------------------------------- |
| `media:group`       | zero or more per item; each group is one logical media work |
| `media:content`     | zero or more under an item or group                         |
| `media:thumbnail`   | zero or more; document order expresses preference           |
| `media:credit`      | zero or more, one contributor/role per element              |
| `media:hash`        | may repeat only with a different defined algorithm          |
| `media:restriction` | one effective value per restriction type                    |

Use a group only for renditions of the same work: codecs, resolutions, bitrates,
or languages. Distinct screenshots, demos, and videos are distinct groups or
distinct feed items. At most one rendition in a group is the default. A direct
`media:content@url` is preferred; without one, `media:player` is required.

Metadata inherits from channel to item to group to content, with the deepest
value winning. Resolve this once during normalization and retain the scope that
supplied each provenance or rights fact.

## Credits, copyright, and license

These fields are not interchangeable:

| Field               | Meaning                                                      |
| ------------------- | ------------------------------------------------------------ |
| `media:credit`      | Contributor identity and optional lowercase role             |
| `media:copyright`   | Human-readable copyright notice and optional information URL |
| `media:license`     | Optional machine-readable license link                       |
| `media:rights`      | Publisher/user-created status defined by Media RSS           |
| `media:restriction` | Informational country, URI, or sharing constraints           |

Multiple credits are valid when contributors or roles differ. Copyright and
attribution do not grant copying rights. A public URL does not grant copying
rights. An absent license means unknown/pending, never permission.

When the application emits `media:license`, require an absolute HTTPS `href` and
record the license text/version actually reviewed. A rights decision must
evaluate copying, modification, attribution, territory, expiry, and the intended
storage/embedding mode.

`media:restriction@relationship` is `allow` or `deny`. Its usual types are
`country`, `uri`, and `sharing`; duplicate restrictions of one type are rejected
by application policy rather than delegated to consumer ordering. Media RSS
describes restrictions as informational, so legal authorization remains a
separate decision.

## Hash and validator separation

Media RSS 1.5.1 defines `media:hash` only for MD5 and SHA-1. It does not define
SHA-256. Never label SHA-256 as SHA-1 or invent `algo="sha-256"` while claiming
strict Media RSS conformance. Keep SHA-256 in the application manifest or an
owned namespace.

An HTTP ETag is an opaque validator, not a checksum. A weak ETag cannot prove
byte identity or validate a range with `If-Range`. Store separately:

- source and final URLs plus redirect chain;
- upstream ETag and `Last-Modified`;
- exact stored byte size and SHA-256;
- declared MIME and byte-sniffed format/container;
- Media RSS legacy hash, if supplied;
- attribution, license, restriction, and reviewed rights state.

## Rights state and publication

```text
unknown -> pending-review -> external-only
                        \-> approved-vendor
                        \-> denied
                        \-> expired-or-revoked
```

Only `approved-vendor` authorizes copying bytes into the versioned public media
directory. `external-only` permits a source link or externally hosted playback
only when the applicable terms allow it. A technical validation success never
changes rights state.

Rights revocation removes active publication pointers but preserves historical
provenance and audit records. No failed, quarantined, pending, denied, expired,
or revoked bytes enter public storage.
