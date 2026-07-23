/**
 * Portal markdown path → slug mapping.
 * e.g. /portal/ops.md → ops, /portal/health.md → health
 */

const SLUG_RE = /^\/portal\/([a-z0-9-]+)\.md$/i;

/** Parse /portal/{slug}.md → slug, or null. */
export function parsePortalMdPath(pathname: string): string | null {
  const m = pathname.match(SLUG_RE);
  return m?.[1]?.toLowerCase() ?? null;
}
