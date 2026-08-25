// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/reference/bun/markdown#bun.markdown.AnsiTheme — Bun.markdown.AnsiTheme
// @see https://bun.com/docs/runtime/markdown#heading-ids — headings / headings.ids
// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options table
// @see https://bun.com/reference/bun/markdown#bun.markdown.Options — Bun.markdown.Options types
/**
 * Factory markdown helpers — Bun runtime only (CLI / local tools).
 *
 * Do **not** import this from Cloudflare Pages Functions / Workers: there is no
 * `Bun` global on the edge. Portal HTML rendering stays client-side or static.
 *
 * Option presets SSOT: {@link ../markdown/options.ts}.
 */
import {
  MARKDOWN_PRESET_README,
  markdownHtml,
  type MarkdownHtmlOptions,
} from '../markdown/options.ts';
import { markdownSafeHtml } from '../markdown/safe-html.ts';

export {
  MARKDOWN_OPTIONS_DEFAULTS,
  MARKDOWN_OPTION_CATALOG,
  MARKDOWN_PRESET_DESIGN,
  MARKDOWN_PRESET_PORTAL,
  MARKDOWN_PRESET_README,
  MARKDOWN_PRESET_SECURE,
  markdownHtml,
  mergeMarkdownOptions,
  type MarkdownHtmlOptions,
} from '../markdown/options.ts';

/** GFM HTML for untrusted READMEs with raw HTML and unsafe URL schemes disabled. */
export function renderReadmeHTML(markdown: string, overrides?: MarkdownHtmlOptions): string {
  return markdownSafeHtml(markdown, { ...MARKDOWN_PRESET_README, ...overrides });
}

/** ANSI terminal README (prefer over hand-rolled render callbacks when enough). */
export function renderReadmeAnsi(markdown: string, columns = 80): string {
  return Bun.markdown.ansi(markdown, { columns, hyperlinks: true });
}
