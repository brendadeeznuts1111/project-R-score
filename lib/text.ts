/**
 * Shared text helpers.
 */

/** Mintlify/GitHub-style heading slug, verified against bun.com anchors:
 *  `Bun.stringWidth()` → bun-stringwidth (dots→hyphens, trailing paren stripped)
 *  `Bun.inspect.table(tabularData, ...)` → bun-inspect-table-tabulardata-properties-options
 *  [`node:tty`](url) → nodetty (link text only, colons dropped) */
export function slugify(heading: string): string {
  return heading
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .toLowerCase()
    .replace(/\(/g, '-')
    .replace(/[)`'":]/g, '')
    .replace(/\./g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
