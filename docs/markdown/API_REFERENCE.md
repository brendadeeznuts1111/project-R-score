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

| Function              | Signature result   | Configuration                                       | Use                                           |
| --------------------- | ------------------ | --------------------------------------------------- | --------------------------------------------- |
| `Bun.markdown.html`   | `string`           | second argument: `Options`                          | Default HTML projection                       |
| `Bun.markdown.render` | `string`           | second: `RenderCallbacks`; third: `Options`         | Structural traversal and custom string output |
| `Bun.markdown.react`  | `unknown` Fragment | second: `ComponentOverrides`; third: `ReactOptions` | React-compatible elements                     |
| `Bun.markdown.ansi`   | `string`           | second: `AnsiTheme`                                 | Styled terminal projection                    |

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
