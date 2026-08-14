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
  --markdown-options=wikiLinks=true,headings=ids,autolinks=url+email \
  --markdown-columns=0 \
  --markdown-no-colors
```

Print its consolidated upstream map without reading or fetching an input file:

```bash
bun tools/bun-blog-codeblocks.ts --references
```

The table pairs every Markdown surface and supporting pipeline API with its
runtime guide, exact member reference, and officially evidenced introduction
version. Bun's canonical task-guide landing is <https://bun.com/guides>; the old
`/docs/guides.md` path is obsolete.

`markdown` remains the default source artifact. `html` applies the selected
`Bun.markdown.Options` preset and exact `--markdown-options` overrides; `ansi`
accepts only terminal theme flags. Columns `0` is Bun's native no-wrapping mode.
Light/dark palettes are mutually exclusive, and Kitty graphics remain opt-in.
Palette flags also fail with `--markdown-no-colors`, where they have no effect.
Boolean parser fields use `true|false`; headings use `ids|linked|none`, while
autolinks accept combinations such as `url+www+email`. Unknown, duplicate, and
projection-incompatible options fail closed instead of silently doing nothing.

Canonical docs: [Markdown guide](https://bun.com/docs/runtime/markdown) ·
[upstream API reference](https://bun.com/reference/bun/markdown) · repository
[API reference and contract](../../docs/markdown/API_REFERENCE.md).

Proof: `bun run docs:markdown:check`.
