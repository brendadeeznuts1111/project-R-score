/**
 * Portal board directory slugs under `public/portal/<slug>/index.html`.
 * Used by serve-public `portalBoardRoutes` (exact Bun.serve routes).
 *
 * Excludes chrome-only dirs: components · dist · icons.
 */

export const PORTAL_BOARD_SLUGS = [
  'ops',
  'health',
  'env',
  'dod',
  'dashboard',
  'catalog',
  'skills',
  'brands',
  'bunfig',
  'compliance',
  'doctor',
  'factory',
  'failures',
  'identity',
  'install-hygiene',
  'limits',
  'packages',
  'account',
  'partner-history',
  'science',
  'surfaces',
  'tennis',
  'toc',
  'tools',
  'vault',
] as const;

export type PortalBoardSlug = (typeof PORTAL_BOARD_SLUGS)[number];

/** Exact route paths (no trailing slash + trailing slash) for a board slug. */
export function portalBoardRoutePaths(slug: PortalBoardSlug | string): [string, string] {
  return [`/portal/${slug}`, `/portal/${slug}/`];
}
