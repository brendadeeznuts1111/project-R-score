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
  'bun-1.4',
  'bookmakers',
  'bunfig',
  'compliance',
  'console-format',
  'concepts',
  'doctor',
  'factory',
  'failures',
  'glossary',
  'identity',
  'issues',
  'install-hygiene',
  'lanes',
  'limits',
  'limits-lab',
  'packages',
  'account',
  'agent-odds',
  'desk',
  'partner',
  'partner-history',
  'partners',
  'science',
  'surfaces',
  'tennis',
  'toc',
  'tools',
  'vault',
] as const;
