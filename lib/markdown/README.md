# lib/markdown

**Bun-local** HTML option presets for `Bun.markdown.html` — not for Workers/Pages edge.

| Export | Role |
| ------ | ---- |
| `MARKDOWN_OPTION_CATALOG` | Docs table of all 15 options + defaults |
| `MARKDOWN_OPTIONS_DEFAULTS` | Typed defaults (GFM triad on) |
| `MARKDOWN_PRESET_PORTAL` | Portal / skill HTML |
| `MARKDOWN_PRESET_README` | README / registry desk |
| `MARKDOWN_PRESET_SECURE` | Untrusted notes (no HTML blocks/spans) |
| `MARKDOWN_PRESET_DESIGN` | Wiki + math + heading ids |
| `markdownHtml` / `mergeMarkdownOptions` | Render helpers |

Canonical docs: [runtime/markdown#options](https://bun.com/docs/runtime/markdown#options).

Proof: `bun test tests/markdown-options.test.ts`.
