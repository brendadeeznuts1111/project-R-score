/**
 * Public read-plane paths shared by the authenticated local portal server.
 *
 * These resources are public on Cloudflare Pages and must remain reachable
 * without a bearer token locally so the portal renders with Pages parity.
 */

export const PUBLIC_READ_PATH_PREFIXES = [
  '/api/monitoring',
  '/api/registry',
  '/api/dod',
  '/api/compliance',
  '/api/channels',
  '/api/operations/summary',
  '/api/limits/summary',
  '/api/limits/analyze',
  '/api/limits/predictions',
  '/api/catalog',
  '/api/skills',
  '/api/portal/',
  // agent-odds desk (GET plane; mutations stay mock-local)
  '/api/odds',
  '/api/partners/health',
  '/api/events',
  '/api/edges',
  '/api/alerts/',
  '/api/bets',
  '/api/pool',
  '/api/prefetch',
  '/api/platform',
  '/api/agent-odds',
  '/skills/',
  '/portal/',
  '/registry/',
  '/registry/storage/',
  '/icons/',
  '/avatars/',
  '/avatar/',
  '/api/avatar/',
  '/@',
] as const;

export const PUBLIC_READ_EXACT_PATHS = ['/site.webmanifest'] as const;

export function isPublicReadPath(path: string): boolean {
  return (
    PUBLIC_READ_EXACT_PATHS.some(candidate => path === candidate) ||
    PUBLIC_READ_PATH_PREFIXES.some(prefix => path.startsWith(prefix))
  );
}
