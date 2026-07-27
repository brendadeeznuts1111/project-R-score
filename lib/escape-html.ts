// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
/**
 * Bun.escapeHTML wrapper — high-throughput HTML entity escaping.
 *
 * Escapes: `"` → `&quot;` · `&` → `&amp;` · `'` → `&#x27;` · `<` → `&lt;` · `>` → `&gt;`
 * Non-string inputs are stringified first (same as native).
 *
 * Prefer this over hand-rolled replace chains for portal/report HTML.
 *
 * @see https://bun.com/docs/runtime/utils#bun-escapehtml
 */
export const BUN_ESCAPE_HTML_DOCS = 'https://bun.com/docs/runtime/utils#bun-escapehtml';

/** Escape a value for safe inclusion in HTML text/attribute content. */
export function escapeHtml(value: string | object | number | boolean): string {
  return Bun.escapeHTML(value);
}

/**
 * Escape each own enumerable string-keyed field of a plain object.
 * Useful for table cells before HTML assembly.
 */
export function escapeHtmlRecord(
  row: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = escapeHtml(v == null ? '' : v);
  }
  return out;
}
