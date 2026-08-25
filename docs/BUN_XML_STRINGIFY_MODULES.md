# Bun.XML serialization and XML modules

This detail page is part of the canonical [`BUN_XML.md`](./BUN_XML.md) contract.
Bun's official references linked there remain the native authority.

## Stringify contract

`Bun.XML.stringify()` accepts a compact document or `NodeInput` tree. It emits
element markup only, so prepend a declaration when a complete file needs one:

```ts
const body = Bun.XML.stringify({
  rss: {
    '@version': '2.0',
    channel: {
      title: 'Factory & Bun',
      item: [{ title: 'Bun <XML>', guid: 'v1:item:1' }],
    },
  },
});
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
```

The serializer escapes text and attributes. It rejects invalid XML names or
characters, invalid comments or processing instructions, nested or root arrays,
circular structures, and other values that cannot form well-formed XML.
Hand-built XML interpolation is not the canonical path.

- Strings, numbers, booleans, and bigints become `String(value)` text.
- `Date` becomes its ISO string.
- `null` becomes an empty element and omits an attribute.
- `undefined`, functions, and symbols are skipped.
- Symbol-keyed, non-enumerable, and inherited properties are skipped.
- Compact arrays emit one same-name element per item.
- The reserved second argument must be `null` or `undefined`.
- `space` uses at most ten spaces or the first ten characters of a string.
- Elements containing text stay on one line so pretty printing does not alter
  character data.
- A top-level skipped value returns `undefined`, not XML.

For values produced by `parse()`, parsing the result of `stringify()`
deep-equals the original parsed value. This does not preserve an authored
singleton child array: reparsing uses a scalar/object for one child and an array
for repeated children. Normalize one-or-many values after parsing.

## XML runtime and bundler contract

Bun 1.4 treats XML as a module format:

- `import doc from './feed.xml'` returns the compact document;
- the root element is also a named export;
- `require('./feed.xml')` exposes that root binding;
- `with { type: 'xml' }` parses another extension, such as `.rss`, as XML;
- dynamic import is supported;
- `bun --hot` watches XML dependencies;
- `bun build` parses XML at build time and inlines JavaScript objects.

This is a Bun 1.4 compatibility change: `.xml` imports return the parsed
document instead of a file path. Malformed XML throws during runtime loading and
fails a build. Code that needs the path must opt into file-loader behavior with
`--loader .xml:file`; it must not depend on the pre-1.4 implicit path result.

An imported XML module is a build/runtime dependency, not a remote fetch. Live
RSS ingestion must fetch bytes and call `Bun.XML.parse()` explicitly so HTTP
freshness, size, timeout, and error policy remain observable.
