// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 * Factory markdown helpers — Bun runtime only (CLI / local tools).
 *
 * Do **not** import this from Cloudflare Pages Functions / Workers: there is no
 * `Bun` global on the edge. Portal HTML rendering stays client-side or static.
 */

/** GFM HTML for READMEs (headings, autolinks, tag filter). Bun-local only. */
export function renderReadmeHTML(markdown: string): string {
  return Bun.markdown.html(markdown, {
    headings: true,
    autolinks: { url: true, www: true },
    tagFilter: true,
  });
}

/** ANSI terminal README (prefer over hand-rolled render callbacks when enough). */
export function renderReadmeAnsi(markdown: string, columns = 80): string {
  return Bun.markdown.ansi(markdown, { columns, hyperlinks: true });
}
