# lib/markdown

**Bun-local** parser/render presets for lowercase `Bun.markdown` — not for
Workers/Pages edge. Bun currently marks this API unstable, so every adopted
behavior must remain behind a focused runtime contract test.

| Export                                       | Role                                    |
| -------------------------------------------- | --------------------------------------- |
| `MARKDOWN_OPTION_CATALOG`                    | Docs table of all 15 options + defaults |
| `MARKDOWN_OPTIONS_DEFAULTS`                  | Typed defaults (GFM triad on)           |
| `MARKDOWN_PRESET_PORTAL`                     | Portal / skill HTML                     |
| `MARKDOWN_PRESET_README`                     | README / registry desk                  |
| `MARKDOWN_PRESET_SECURE`                     | Untrusted notes (no HTML blocks/spans)  |
| `MARKDOWN_PRESET_DESIGN`                     | Wiki + math + heading ids               |
| `MARKDOWN_PRESETS` / `resolveMarkdownPreset` | Named CLI/configuration boundary        |
| `markdownHtml` / `mergeMarkdownOptions`      | Render helpers                          |

`Bun.markdown` parses and renders Markdown; it does not format source text.
Generate deterministic Markdown first, then use `.render` for structural proof
or `.html` for the HTML projection.

The Bun blog code-block tool consumes these policies directly:

```bash
bun tools/bun-blog-codeblocks.ts saved.html \
  --markdown-format=all \
  --markdown-preset=secure \
  --markdown-columns=100 \
  --markdown-no-colors
```

`markdown` remains the default source artifact. `html` applies the selected
`Bun.markdown.Options` preset; `ansi` accepts only terminal theme flags. Scoped
flags fail when their projection is not selected, so a parser option cannot
silently do nothing.

Canonical docs: [Markdown guide](https://bun.com/docs/runtime/markdown) ·
[upstream API reference](https://bun.com/reference/bun/markdown) · repository
[API reference and contract](../../docs/markdown/API_REFERENCE.md).

Proof: `bun run docs:markdown:check`.
