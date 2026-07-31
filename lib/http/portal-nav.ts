// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern pathname groups
/**
 * Portal markdown path → slug mapping.
 * e.g. /portal/ops.md → ops, /portal/health.md → health
 */

export const PortalMarkdownPattern = new URLPattern({
  pathname: '/portal/:slug([a-zA-Z0-9\\-]+).md',
});

/** Parse /portal/{slug}.md → slug, or null. */
export function parsePortalMdPath(pathname: string): string | null {
  const slug = PortalMarkdownPattern.exec({ pathname })?.pathname.groups.slug;
  return slug?.toLowerCase() ?? null;
}
