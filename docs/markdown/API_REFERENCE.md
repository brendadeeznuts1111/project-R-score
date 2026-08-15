# Bun Markdown API Reference and Repository Contract

Status: canonical repository reference. Runtime proof: Bun 1.3.14. Type proof:
the pinned `bun-types` package. Upstream authority:
[Bun Markdown guide](https://bun.com/docs/runtime/markdown) and
[`Bun.markdown` API reference](https://bun.com/reference/bun/markdown).

`Bun.markdown` is unstable. The installed runtime, pinned types, this reference,
and the focused tests must move together. Blog-era fields such as `headingIds`
and `autolinkHeadings` are not supported options; use `headings`.

This reference has two layers:

1. the application-facing API and parser configuration;
2. the callback, metadata, React-prop, validation, and TypeScript contract.

## 1. Public API layer

### 1.1 Input

All four functions accept the same input family:

```ts
type MarkdownInput =
  string | ArrayBufferLike | NodeJS.TypedArray | DataView<ArrayBufferLike>;
```

Input is synchronous and output is returned synchronously. Decode or read an
external stream before calling the API.

### 1.2 Function matrix

| Function                                                               | Signature result   | Configuration                                       | Use                                           |
| ---------------------------------------------------------------------- | ------------------ | --------------------------------------------------- | --------------------------------------------- |
| [`Bun.markdown.html`](https://bun.com/reference/bun/markdown/html)     | `string`           | second argument: `Options`                          | Default HTML projection                       |
| [`Bun.markdown.render`](https://bun.com/reference/bun/markdown/render) | `string`           | second: `RenderCallbacks`; third: `Options`         | Structural traversal and custom string output |
| [`Bun.markdown.react`](https://bun.com/reference/bun/markdown/react)   | `unknown` Fragment | second: `ComponentOverrides`; third: `ReactOptions` | React-compatible elements                     |
| [`Bun.markdown.ansi`](https://bun.com/reference/bun/markdown/ansi)     | `string`           | second: `AnsiTheme`                                 | Styled terminal projection                    |

The argument positions are deliberately different. Never pass parser options as
the second argument to `render` or `react`.

### 1.3 HTML

```ts
const html = Bun.markdown.html('# Hello **world**', {
  headings: { ids: true },
  tagFilter: true,
});
```

Signature:

```ts
function html(input: MarkdownInput, options?: Bun.markdown.Options): string;
```

Raw HTML is allowed by default. `tagFilter` neutralizes GFM-disallowed tags; it
is not a complete sanitizer. For untrusted content, also set `noHtmlBlocks` and
`noHtmlSpans`, then apply any product-specific output policy.

### 1.4 Custom rendering

```ts
const text = Bun.markdown.render(
  '# Hello [Bun](https://bun.com)',
  {
    heading: (children, { level }) => `${'#'.repeat(level)} ${children}\n`,
    link: (children, { href }) => `${children} (${href})`,
  },
  { autolinks: true, headings: { ids: true } }
);
```

Signature:

```ts
function render(
  input: MarkdownInput,
  callbacks?: Bun.markdown.RenderCallbacks,
  options?: Bun.markdown.Options
): string;
```

Children have already been accumulated when a callback runs. A returned string
replaces the element. Returning `null` or `undefined` omits it. Without a
callback, children pass through unchanged. `render` is a renderer, not an AST
API and not a Markdown source formatter.

### 1.5 React

```tsx
const element = Bun.markdown.react(
  '## [Docs](https://bun.com/docs)',
  {
    a: ({ href, children }) => <a href={href}>{children}</a>,
  },
  { headings: { ids: true }, reactVersion: 19 }
);
```

Signature:

```ts
function react(
  input: MarkdownInput,
  components?: Bun.markdown.ComponentOverrides,
  options?: Bun.markdown.ReactOptions
): unknown;
```

The result is a Fragment-compatible element. `reactVersion` defaults to `19`,
using `Symbol.for('react.transitional.element')`. Set `18` for React 18 or
older, which uses `Symbol.for('react.element')`.

### 1.6 ANSI terminal output

```ts
const output = Bun.markdown.ansi('# Release\n\n**Ready**', {
  colors: process.stdout.isTTY,
  hyperlinks: process.stdout.isTTY,
  columns: process.stdout.columns ?? 80,
});
process.stdout.write(output);
```

Signature:

```ts
function ansi(input: MarkdownInput, theme?: Bun.markdown.AnsiTheme): string;
```

`ansi` enables the GFM extensions plus wiki links, underline, and LaTeX math. It
does not take `Options`. Its theme is:

| Field           | Type      | Default                   | Contract                                                                               |
| --------------- | --------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `colors`        | `boolean` | `true`                    | Emit ANSI styling; `false` uses plain ASCII chrome                                     |
| `hyperlinks`    | `boolean` | `false`                   | Emit OSC 8 links; otherwise render `text (url)`                                        |
| `light`         | `boolean` | inferred from `COLORFGBG` | Select the light-background inline-code palette                                        |
| `columns`       | `number`  | `80`                      | Wrap paragraphs/headings and size rules; `0` disables wrapping                         |
| `kittyGraphics` | `boolean` | `false`                   | Inline local images in Kitty, WezTerm, or Ghostty; remote images fall back to alt text |

`columns` controls Markdown layout width. It does not control Bun console object
inspection depth. Console depth belongs to `bunfig.toml [console].depth` or the
`bun --console-depth=N` runtime flag. ANSI colour depth is also separate:
`Bun.color(value, 'ansi')` auto-selects terminal depth, while `ansi-16`,
`ansi-256`, and `ansi-16m` request fixed colour encodings. `Bun.markdown.ansi`
offers only the `colors` on/off theme switch; it has no 16/256/true-colour flag.

### 1.7 Parser options

`html`, `render`, and `react` use the following parser options. The three GFM
options marked `true` are enabled when omitted; every other parser option is
disabled by default.

| Option                 | Type                         | Default | Behavior                                         |
| ---------------------- | ---------------------------- | ------- | ------------------------------------------------ |
| `tables`               | `boolean`                    | `true`  | GFM tables                                       |
| `strikethrough`        | `boolean`                    | `true`  | `~~text~~`                                       |
| `tasklists`            | `boolean`                    | `true`  | `- [x] item`                                     |
| `autolinks`            | `boolean \| AutolinkOptions` | `false` | Bare URL, `www`, and email links                 |
| `headings`             | `boolean \| HeadingOptions`  | `false` | Generated IDs and heading autolinks              |
| `hardSoftBreaks`       | `boolean`                    | `false` | Treat soft breaks as hard breaks                 |
| `wikiLinks`            | `boolean`                    | `false` | `[[target]]` and `[[target\|label]]`             |
| `underline`            | `boolean`                    | `false` | Render `__text__` as `<u>` instead of `<strong>` |
| `latexMath`            | `boolean`                    | `false` | `$inline$` and `$$display$$` math                |
| `collapseWhitespace`   | `boolean`                    | `false` | Collapse whitespace in text                      |
| `permissiveAtxHeaders` | `boolean`                    | `false` | Accept ATX headings without a space after `#`    |
| `noIndentedCodeBlocks` | `boolean`                    | `false` | Disable indented code blocks                     |
| `noHtmlBlocks`         | `boolean`                    | `false` | Disable raw HTML blocks                          |
| `noHtmlSpans`          | `boolean`                    | `false` | Disable inline raw HTML                          |
| `tagFilter`            | `boolean`                    | `false` | Escape `<` for GFM-disallowed tags               |

Granular objects have optional members in the pinned types:

```ts
type AutolinkOptions = { url?: boolean; www?: boolean; email?: boolean };
type HeadingOptions = { ids?: boolean; autolink?: boolean };
```

`autolinks: true` enables all three kinds. `headings: true` enables both IDs and
heading autolinks. Prefer `{ headings: { ids: true } }` when a nested heading
link is unwanted.

### 1.8 Repository presets

Use the typed presets in `lib/markdown/options.ts` instead of repeating ad hoc
objects:

| Preset                   | Intended boundary                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `MARKDOWN_PRESET_PORTAL` | Portal and skill HTML with GFM, links, heading anchors, wiki/math, and tag filtering |
| `MARKDOWN_PRESET_README` | README and registry HTML with heading anchors, URL/WWW links, and tag filtering      |
| `MARKDOWN_PRESET_SECURE` | Untrusted notes with raw block/span HTML disabled                                    |
| `MARKDOWN_PRESET_DESIGN` | Design notes with wiki links, math, and heading IDs                                  |

### 1.9 Official cross-reference map

Use Bun's [task-oriented guides](https://bun.com/guides) to discover workflows,
the runtime guide for behavior and examples, and the exact member reference for
the callable or type contract. The obsolete `/docs/guides.md` route is not an
authority URL.

| Surface                     | Runtime guide                                                               | Exact API reference                                                 | Official release                                        | Latest recorded update                                          |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `Bun.markdown.html`         | [HTML](https://bun.com/docs/runtime/markdown#bun-markdown-html)             | [html](https://bun.com/reference/bun/markdown/html)                 | [1.3.8 · 2026-01-29](https://bun.com/blog/bun-v1.3.8)   | none                                                            |
| `Bun.markdown.render`       | [render](https://bun.com/docs/runtime/markdown#bun-markdown-render)         | [render](https://bun.com/reference/bun/markdown/render)             | [1.3.8 · 2026-01-29](https://bun.com/blog/bun-v1.3.8)   | [changed 1.3.11 · 2026-03-18](https://bun.com/blog/bun-v1.3.11) |
| `Bun.markdown.react`        | [React](https://bun.com/docs/runtime/markdown#bun-markdown-react)           | [react](https://bun.com/reference/bun/markdown/react)               | [1.3.8 · 2026-01-29](https://bun.com/blog/bun-v1.3.8)   | [changed 1.3.9 · 2026-02-08](https://bun.com/blog/bun-v1.3.9)   |
| `Bun.markdown.ansi`         | [ANSI](https://bun.com/docs/runtime/markdown#ansi-terminal-output)          | [ansi](https://bun.com/reference/bun/markdown/ansi)                 | [1.3.12 · 2026-04-09](https://bun.com/blog/bun-v1.3.12) | [fixed 1.3.14 · 2026-05-13](https://bun.com/blog/bun-v1.3.14)   |
| `Bun.markdown.Options`      | [options](https://bun.com/docs/runtime/markdown#options)                    | [Options](https://bun.com/reference/bun/markdown/Options)           | [1.3.8 · 2026-01-29](https://bun.com/blog/bun-v1.3.8)   | none                                                            |
| `Bun.markdown.ListMeta`     | [nested lists](https://bun.com/docs/runtime/markdown#nested-list-numbering) | [ListMeta](https://bun.com/reference/bun/markdown/ListMeta)         | [1.3.8 · 2026-01-29](https://bun.com/blog/bun-v1.3.8)   | none                                                            |
| `Bun.markdown.ListItemMeta` | [item meta](https://bun.com/docs/runtime/markdown#list-item-meta)           | [ListItemMeta](https://bun.com/reference/bun/markdown/ListItemMeta) | [1.3.8 · 2026-01-29](https://bun.com/blog/bun-v1.3.8)   | none                                                            |
| `Bun.markdown.AnsiTheme`    | [ANSI theme](https://bun.com/docs/runtime/markdown#ansi-terminal-output)    | [AnsiTheme](https://bun.com/reference/bun/markdown/AnsiTheme)       | [1.3.12 · 2026-04-09](https://bun.com/blog/bun-v1.3.12) | none                                                            |

Supporting pipeline APIs are related, not aliases for Markdown behavior:

| Surface             | Repository role                      | Runtime guide                                                                                       | Exact API reference                                          | Official release                                        | Latest recorded update                                          |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------- |
| `Bun.Glob.match`    | Match scoped `CodeBlock*` classes    | [glob](https://bun.com/docs/runtime/glob#quickstart)                                                | [Glob.match](https://bun.com/reference/bun/Glob/match)       | unknown                                                 | [fixed 1.3.14 · 2026-05-13](https://bun.com/blog/bun-v1.3.14)   |
| `Bun.file`          | Read saved HTML lazily               | [file reads](https://bun.com/docs/runtime/file-io#reading-files-bun-file)                           | [file](https://bun.com/reference/bun/file)                   | unknown                                                 | [fixed 1.3.14 · 2026-05-13](https://bun.com/blog/bun-v1.3.14)   |
| `Bun.write`         | Write generated artifacts            | [file writes](https://bun.com/docs/runtime/file-io#writing-files-bun-write)                         | [write](https://bun.com/reference/bun/write)                 | unknown                                                 | [fixed 1.3.12 · 2026-04-09](https://bun.com/blog/bun-v1.3.12)   |
| `Bun.inspect.table` | Print property-scoped status tables  | [table output](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options) | [inspect.table](https://bun.com/reference/bun/inspect/table) | unknown                                                 | [changed 1.2.0 · 2025-01-22](https://bun.com/blog/bun-v1.2)     |
| `Bun.stringWidth`   | Measure terminal-safe preview width  | [string width](https://bun.com/docs/runtime/utils#bun-stringwidth)                                  | [stringWidth](https://bun.com/reference/bun/stringWidth)     | unknown                                                 | [changed 1.3.12 · 2026-04-09](https://bun.com/blog/bun-v1.3.12) |
| `Bun.color`         | Select related terminal colour depth | [colour](https://bun.com/docs/runtime/color)                                                        | [color](https://bun.com/reference/bun/color)                 | [1.1.30 · 2024-10-08](https://bun.com/blog/bun-v1.1.30) | [changed 1.2.0 · 2025-01-22](https://bun.com/blog/bun-v1.2)     |

`unknown` is deliberate: Project R records an introduction version only when an
official dated release post establishes it. It does not substitute the active
runtime version or a verification date. Print the same executable catalog with
`bun tools/bun-blog-codeblocks.ts --references`.

The live guide currently conflicts internally about the GFM triad defaults: its
prose says they are enabled while its options table displays `false`. The pinned
Bun 1.3.14 types and focused runtime tests prove that tables, strikethrough, and
task lists are enabled when omitted, so this repository keeps those
runtime-verified defaults until upstream and runtime agree.

## 2. Callback and contract layer

### 2.1 Callback return contract

Every callback returns `string | null | undefined`. A callback receives rendered
child content first. Metadata is present only where listed; optional metadata
parameters must be handled as optional.

### 2.2 Block callbacks

| Callback     | Metadata                 | Meaning                                          |
| ------------ | ------------------------ | ------------------------------------------------ |
| `heading`    | `HeadingMeta`            | Heading level and optional generated ID          |
| `paragraph`  | none                     | Paragraph                                        |
| `blockquote` | none                     | Block quote                                      |
| `code`       | optional `CodeBlockMeta` | Fenced or indented block; language may be absent |
| `list`       | `ListMeta`               | Ordered/unordered list and depth                 |
| `listItem`   | `ListItemMeta`           | Position, depth, ordering, start, task state     |
| `hr`         | none                     | Horizontal rule                                  |
| `table`      | none                     | Table                                            |
| `thead`      | none                     | Table head                                       |
| `tbody`      | none                     | Table body                                       |
| `tr`         | none                     | Table row                                        |
| `th`         | optional `CellMeta`      | Header cell and alignment                        |
| `td`         | optional `CellMeta`      | Data cell and alignment                          |
| `html`       | none                     | Raw HTML                                         |

### 2.3 Inline callbacks

| Callback        | Metadata    | Meaning                                                    |
| --------------- | ----------- | ---------------------------------------------------------- |
| `strong`        | none        | Strong emphasis                                            |
| `emphasis`      | none        | Emphasis                                                   |
| `link`          | `LinkMeta`  | Link destination and optional title                        |
| `image`         | `ImageMeta` | Image source and optional title; children contain alt text |
| `codespan`      | none        | Inline code                                                |
| `strikethrough` | none        | Deleted text                                               |
| `text`          | none        | Plain text leaf                                            |

### 2.4 Metadata shapes

```ts
interface HeadingMeta {
  level: number; // 1 through 6
  id?: string;
}

interface CodeBlockMeta {
  language?: string;
}

interface ListMeta {
  ordered: boolean;
  start?: number;
  depth: number; // zero-based
}

interface ListItemMeta {
  index: number; // zero-based within parent
  depth: number; // parent list depth
  ordered: boolean;
  start?: number;
  checked?: boolean;
}

interface CellMeta {
  align?: 'left' | 'center' | 'right';
}

interface LinkMeta {
  href: string;
  title?: string;
}

interface ImageMeta {
  src: string;
  title?: string;
}
```

#### 2.4.1 Hierarchical nested-list paths

Bun provides local list metadata: `index`, `depth`, `ordered`, optional `start`,
and optional task `checked` state. It does not provide an ancestor path such as
`1.2.2` directly. The repository helper retains Bun's exact container and item
metadata while deriving that path from the callback tree:

```ts
import { markdownNestedList } from '../../lib/markdown/options.ts';

const outline = markdownNestedList(`1. top
   1. child-one
   2. child-two
      1. grand-one
      2. grand-two`);

outline.flat[4];
// {
//   path: "1.2.2",
//   key: "r1:o1.o2.o2",
//   rootIndex: 0,
//   lineage: [
//     { kind: "ordered", index: 0, number: 1, depth: 0, start: 1 },
//     { kind: "ordered", index: 1, number: 2, depth: 1, start: 1 },
//     { kind: "ordered", index: 1, number: 2, depth: 2, start: 1 },
//   ],
//   marker: "1.2.2",
//   text: "grand-two",
//   listMeta: { ordered: true, start: 1, depth: 2 },
//   meta: { index: 1, depth: 2, ordered: true, start: 1 },
//   children: [],
// }
```

The projection returns nested `items`, parent-first `flat` rows, and formatted
`text`. `key` remains unique across independently restarted root lists and mixed
list kinds (`r1:o1.u1.o2`), while `lineage` makes each flat row self-contained.
`path` is present only when the complete lineage is ordered. Unordered, task,
and ordered-below-unordered items therefore retain `path: null`; their marker is
`-`, `[x]`, `[ ]`, or the local ordered number instead of fabricated ancestry.

Non-1 ordered starts are preserved from Bun metadata. Under CommonMark parsing,
a nested ordered list beginning above `1` needs a blank line before it:

```md
3. parent

   5. nested child
```

For a property-scoped terminal table, use the flat row adapter and its closed
column list:

```ts
import { inspectTable } from '../../lib/console/table.ts';
import {
  MARKDOWN_NESTED_LIST_TABLE_PROPERTIES,
  markdownNestedListRows,
} from '../../lib/markdown/options.ts';

const table = inspectTable(markdownNestedListRows(markdown), [
  ...MARKDOWN_NESTED_LIST_TABLE_PROPERTIES,
]);
```

### 2.5 React component overrides

`ComponentOverrides` accepts a tag name, function component, or class component
for every emitted element:

| Props              | Override keys                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `HeadingProps`     | `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                                                                           |
| `ChildrenProps`    | `p`, `blockquote`, `ul`, `html`, `table`, `thead`, `tbody`, `tr`, `em`, `strong`, `code`, `del`, `math`, `u` |
| `OrderedListProps` | `ol`                                                                                                         |
| `ListItemProps`    | `li`                                                                                                         |
| `CodeBlockProps`   | `pre`                                                                                                        |
| `CellProps`        | `th`, `td`                                                                                                   |
| `LinkProps`        | `a`                                                                                                          |
| `ImageProps`       | `img`                                                                                                        |
| empty object       | `hr`, `br`                                                                                                   |

The prop shapes are:

```ts
interface ChildrenProps {
  children: JSX.Element[];
}
interface HeadingProps extends ChildrenProps {
  id?: string;
}
interface OrderedListProps extends ChildrenProps {
  start: number;
}
interface ListItemProps extends ChildrenProps {
  checked?: boolean;
}
interface CodeBlockProps extends ChildrenProps {
  language?: string;
}
interface CellProps extends ChildrenProps {
  align?: 'left' | 'center' | 'right';
}
interface LinkProps extends ChildrenProps {
  href: string;
  title?: string;
}
interface ImageProps {
  src: string;
  alt?: string;
  title?: string;
}
```

### 2.6 Error and safety contract

The parser is permissive Markdown infrastructure, not a document validator.
Malformed constructs may become plain text instead of throwing. Callers must not
use “did not throw” as proof of a valid repository document.

The repository adds these failures through `bun run check:docs`:

| Finding                                                            | Policy                                           |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| Empty inline or reference destination                              | fail                                             |
| Table delimiter/header mismatch or delimiter not parsed as a table | fail                                             |
| Missing local target file                                          | fail                                             |
| Missing Markdown fragment                                          | fail                                             |
| Duplicate explicit anchor                                          | fail                                             |
| External HTTP availability                                         | not checked; network health has a separate owner |

Pre-contract findings are recorded in `scripts/markdown-contract-baseline.json`.
New findings fail and fixed baseline rows become stale failures, so the ratchet
can only move down.

### 2.7 TypeScript integration

Use the global Bun namespace types and `satisfies` to catch option drift:

```ts
export const DOC_OPTIONS = {
  tables: true,
  headings: { ids: true },
  tagFilter: true,
} as const satisfies Bun.markdown.Options;

export const CALLBACKS = {
  link: (children, { href }) => `${children} (${href})`,
} satisfies Bun.markdown.RenderCallbacks;

export const ANSI_THEME = {
  colors: true,
  columns: 100,
} satisfies Bun.markdown.AnsiTheme;
```

Run `bun run type-check`, `bun run docs:markdown:check`, and
`bun run check:docs` after changing this API, the presets, or the pinned Bun
types.

### 2.8 Change protocol

When Bun changes this unstable API:

1. inspect the installed `bun-types` declaration and official reference;
2. update `lib/markdown/options.ts` and its focused runtime tests;
3. update this numbered reference and contributor guide;
4. run the Markdown contract, doc map, type check, and runtime tests;
5. remove any baseline rows fixed by the change—never rewrite the baseline to
   hide a new issue.
