# Bun.XML parse, shape, and security

This detail page is part of the canonical [`BUN_XML.md`](./BUN_XML.md) contract.
Bun's official references linked there remain the native authority.

## Compact parse contract

`Bun.XML.parse(input)` defaults to the compact data shape. XML must be
well-formed; malformed input throws `SyntaxError`, and Bun has no lenient mode.

- The document has exactly one root-element key.
- An attribute named `name` becomes `"@name"`.
- An element with attributes or children is an object; its own character data is
  stored in `"#text"`.
- A leaf without attributes or children is a string.
- Repeated same-name children become an array; a single child does not.
- Namespace prefixes stay in keys such as `"media:content"`; declarations are
  attributes such as `"@xmlns:media"`.
- Parsed values are strings; numbers and booleans are not coerced.
- Character references, CDATA, and internal entities are expanded. Attribute
  values are normalized and internal-DTD defaults are applied.
- Declarations, DOCTYPEs, comments, processing instructions, and content outside
  the root are absent from compact output.
- Character-data runs are concatenated. Whitespace-only runs between child
  elements are omitted as layout; other whitespace is preserved.

```ts
const document = Bun.XML.parse(`
  <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
    <channel><item>
      <guid isPermaLink="false">v1:item:1</guid>
      <category>runtime</category><category>images</category>
      <media:content url="https://cdn.example/hero.png" width="1200" />
    </item></channel>
  </rss>
`);
```

The relevant compact value is:

```ts
{
  rss: {
    "@version": "2.0",
    "@xmlns:media": "http://search.yahoo.com/mrss/",
    channel: { item: {
      guid: { "@isPermaLink": "false", "#text": "v1:item:1" },
      category: ["runtime", "images"],
      "media:content": {
        "@url": "https://cdn.example/hero.png", "@width": "1200",
      },
    } },
  },
}
```

Normalize one-or-many values at the parse boundary:

```ts
function asList<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
```

## Ordered tree shape

Use `{ compact: false }` when order across differently named siblings, comments,
processing instructions, or mixed text/element placement matters. It returns the
root element itself:

```ts
Bun.XML.parse(
  '<p class="lead">Hello <b>world</b>!<!-- draft --><?review later?></p>',
  { compact: false }
);
// { name: "p", attributes: { class: "lead" }, children: [
//   "Hello ", { name: "b", attributes: {}, children: ["world"] }, "!",
//   { comment: " draft " }, { target: "review", data: "later" },
// ] }
```

Every element has `name`, `attributes`, and `children`, even when the latter two
are empty. Text is a string; child elements have `name`; comments have
`comment`; processing instructions have `target` and `data`. Adjacent text is
merged without discarding whitespace. Neither shape represents the declaration,
DOCTYPE, or nodes outside the root.

## Inputs and encodings

`parse()` accepts strings, `Buffer`, typed arrays and other fixed byte views,
`DataView`, `ArrayBuffer`, and `Blob`. Parsing remains synchronous for `Blob`. A
string is already decoded, so a syntactically valid encoding declaration is
ignored. Bytes use their BOM or XML declaration and support UTF-8, either UTF-16
byte order, and ISO-8859-1. Declaring another encoding throws.

Callers must enforce fetch and body byte ceilings before parsing; XML
conformance does not define an application's acceptable feed size.

## Conformance and native security

Bun describes the parser as an XML 1.0 Fifth Edition conforming, non-validating
processor:

- malformed XML or malformed internal DTD subsets throw `SyntaxError`;
- pathologically deep nesting throws `RangeError`;
- internal entities expand under a built-in expansion limit;
- external DTDs and entities are never fetched or read, removing an XML
  external-entity file/network read surface;
- a potentially externally declared unresolved entity may remain literal, such
  as `"&name;"`, under XML's non-validating rules;
- namespace prefixes remain literal and are not resolved to namespace URIs.

These guarantees do not replace HTTP controls. Feed ingestion still requires
timeouts, redirect policy, response-size limits, media allowlists, and separate
media byte ceilings.
