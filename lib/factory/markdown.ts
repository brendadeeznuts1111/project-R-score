// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/markdown#heading-ids — headings / headings.ids
// @see https://bun.com/docs/runtime/markdown#options — wikiLinks · latexMath · autolinks
/**
 * Factory markdown helpers — Bun runtime only (CLI / local tools).
 *
 * Do **not** import this from Cloudflare Pages Functions / Workers: there is no
 * `Bun` global on the edge. Portal HTML rendering stays client-side or static.
 *
 * Options use current `Bun.markdown.Options` (`headings`, not blog-era `headingIds`).
 */

/** GFM HTML for READMEs (headings, autolinks, tag filter). Bun-local only. */
export function renderReadmeHTML(markdown: string): string {
  return Bun.markdown.html(markdown, {
    headings: true, // ids + autolink headings
    autolinks: { url: true, www: true },
    tagFilter: true,
  } satisfies Bun.markdown.Options);
}

/** ANSI terminal README (prefer over hand-rolled render callbacks when enough). */
export function renderReadmeAnsi(markdown: string, columns = 80): string {
  return Bun.markdown.ansi(markdown, { columns, hyperlinks: true });
}
