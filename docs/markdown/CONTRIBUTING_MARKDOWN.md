# Markdown Contributor Guide

This guide is the day-loop companion to the numbered
[Bun Markdown API Reference and Repository Contract](API_REFERENCE.md).

## Write and validate

Use CommonMark/GFM source that both GitHub and the repository Bun pipeline can
read. Before opening a pull request, run:

```bash
bun run check:docs
bun run check
```

`check:docs` parses governed Markdown through `Bun.markdown`, checks empty link
destinations, malformed tables, duplicate explicit anchors, missing local files,
and missing fragments, then applies the no-growth legacy ratchet.
`bun run check` adds the focused Bun runtime/type contract. The full local merge
authority is `bun run bun:ci`.

The governed default scope is tracked root Markdown plus `.github/`, `docs/`,
and `lib/`. Retired `docs/archives/` and delivered `public/` artifacts are
excluded. Passing explicit `.md` paths validates those paths, which is how the
pre-commit hook checks every staged Markdown file regardless of its directory.

## Headings and anchors

- Put one space after the heading marker: `## Heading`.
- Use descriptive, unique headings.
- Link with the generated lowercase fragment: `[Setup](#setup)`.
- Prefer normal headings over hand-authored `<a id="...">` anchors.
- If a stable machine anchor is required, keep its explicit ID unique.

Valid:

```markdown
## Local proof

Run the [documentation check](#local-proof).
```

Invalid:

```markdown
##No separator

[Missing fragment](#does-not-exist)
```

## Links and autolinks

Use meaningful labels and non-empty destinations:

```markdown
[Bun Markdown documentation](https://bun.com/docs/runtime/markdown)
<https://bun.com/docs/runtime/markdown>
```

Do not write an empty destination:

<!-- prettier-ignore -->
```markdown
[unfinished]( )
[unfinished]:
```

Bare URL conversion is a render option, not portable source behavior. Prefer an
explicit link or angle-bracket autolink in contributor-authored `.md` files.

## Tables

Keep the header and delimiter row at the same column count. Use at least three
hyphens in every delimiter cell and escape literal pipes in prose.

Valid:

```markdown
| Command              | Purpose           |
| -------------------- | ----------------- |
| `bun run check:docs` | Validate Markdown |
```

Invalid:

<!-- prettier-ignore -->
```markdown
| Command | Purpose |
| ------- |
| `bun run check:docs` | Validate Markdown |
```

Run Prettier on a table after editing it when the surrounding document is
Prettier-owned.

## Render Markdown in scripts

Use the repository presets for HTML:

```ts
import {
  MARKDOWN_PRESET_README,
  markdownHtml,
} from '../../lib/markdown/options.ts';

const html = markdownHtml(source, MARKDOWN_PRESET_README);
```

Use `render` when the output is a custom string format:

```ts
const summary = Bun.markdown.render(source, {
  heading: children => `${children}\n`,
  paragraph: children => `${children}\n`,
  link: (children, { href }) => `${children} (${href})`,
});
```

Use `Bun.markdown.ansi` for a terminal document. Decide TTY policy at the call
site; its `colors` field is an on/off switch, not a colour-depth selector.

## Add a Markdown file

1. Choose the owning documentation plane. Contributor material belongs under
   `docs/`; runtime-module notes may live beside their module in `lib/`.
2. Link the new document from its nearest index.
3. If it is a canonical authority, register it in `lib/docs/repo-docs.ts` and
   the relevant root/docs map.
4. Run `bun run check:docs` and `bun run docs:map:check`.
5. Add focused tests when the document defines executable behavior.

Do not place contributor API references in `src/` or `public/`. `public/` is a
delivered artifact plane; it is not the source-of-truth documentation plane.

## Fix a validation failure

Diagnostics use `file:line [kind] detail`. Fix the source finding. If the
failure says `stale-baseline`, remove the matching row from
`scripts/markdown-contract-baseline.json`; that means a legacy issue was fixed.
Do not regenerate the baseline to accept a new finding.
