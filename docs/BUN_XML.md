# Bun.XML native contract (Bun 1.4)

This is the canonical Bun-native XML entrypoint for this repository. It records
only behavior documented by Bun and verified directly on Bun 1.4.0. RSS channel
policy, branding, feed versioning, storage, and HTTP caching are application or
standards contracts; they are not `Bun.XML` behavior.

## Official authority

| Contract            | Official source                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bun 1.4 release     | [`Bun.XML` parser and serializer](https://bun.com/blog/bun-v1.4#bunxml)                                                                                                                        |
| Runtime guide       | [`Bun.XML`](https://bun.com/docs/runtime/xml)                                                                                                                                                  |
| Bundler loader      | [XML loader](https://bun.com/docs/bundler/loaders#xml)                                                                                                                                         |
| Parse reference     | [`Bun.XML.parse`](https://bun.com/reference/bun/XML/parse)                                                                                                                                     |
| Stringify reference | [`Bun.XML.stringify`](https://bun.com/reference/bun/XML/stringify)                                                                                                                             |
| Compact types       | [`Document`](https://bun.com/reference/bun/XML/Document) · [`Element`](https://bun.com/reference/bun/XML/Element) · [`Value`](https://bun.com/reference/bun/XML/Value)                         |
| Parse selection     | [`ParseOptions`](https://bun.com/reference/bun/XML/ParseOptions)                                                                                                                               |
| Ordered tree types  | [`Node`](https://bun.com/reference/bun/XML/Node) · [`Comment`](https://bun.com/reference/bun/XML/Comment) · [`ProcessingInstruction`](https://bun.com/reference/bun/XML/ProcessingInstruction) |
| Serializer input    | [`NodeInput`](https://bun.com/reference/bun/XML/NodeInput) · [`Scalar`](https://bun.com/reference/bun/XML/Scalar)                                                                              |
| Live release feed   | [`https://bun.com/rss.xml`](https://bun.com/rss.xml)                                                                                                                                           |

`Bun.XML` shipped in Bun 1.4.0. Both `parse()` and `stringify()` are native, and
the release post describes XML imports as supported by the runtime and bundler.

## Contract map

- [`BUN_XML_PARSE.md`](./BUN_XML_PARSE.md) owns compact and ordered parse
  shapes, accepted inputs and encodings, conformance, and native security
  guarantees.
- [`BUN_XML_STRINGIFY_MODULES.md`](./BUN_XML_STRINGIFY_MODULES.md) owns
  serialization rules and the Bun 1.4 runtime/bundler XML-module contract.
- [`BUN_XML_BOUNDARIES.md`](./BUN_XML_BOUNDARIES.md) owns the boundary between
  native XML behavior, RSS application policy, and Bun image processing.
- [`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md) is the canonical standards and
  application contract for RSS 2.0, Media RSS, channels, branding, hostile
  fetching, and application versioning.

## Repository adoption rule

Before RSS implementation work proceeds:

1. Parse incoming XML with `Bun.XML.parse()` at one boundary.
2. Normalize compact one-or-many values once after parsing.
3. Emit XML with `Bun.XML.stringify()`.
4. Fail closed on malformed XML; a regex parser is not the Bun-native contract.
5. Use compact parsing for feed data and ordered parsing only when mixed content
   or node order is required.
6. Bound response bytes before parsing even though Bun bounds entity expansion.
7. Label RSS, branding, channel, and versioning decisions as application or
   standards-layer behavior.
8. Keep Bun.Image-derived metadata separate from application-derived evidence.
