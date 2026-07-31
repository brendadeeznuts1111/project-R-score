/**
 * Portal page + redirect SSOT — keep _redirects, verify-portal, and tests aligned.
 *
 * @see docs/portal-foundation.md
 * @see public/_redirects
 */

/** Portal HTML surfaces (directory indexes under public/portal/ or public/monitoring/). */
export const PORTAL_HTML_ROUTES = [
  '/portal/',
  '/portal/ops/',
  '/portal/toc/',
  '/portal/health/',
  '/portal/env/',
  '/portal/vault/',
  '/portal/tools/',
  '/portal/failures/',
  '/portal/catalog/',
  '/portal/dod/',
  '/portal/compliance/',
  '/portal/limits/',
  '/portal/partner-history/',
  '/portal/dashboard/',
  '/portal/skills/',
  '/portal/packages/',
  '/portal/brands/',
  '/portal/glossary/',
  '/monitoring/',
] as const;

/** Paths that need 301 → trailing-slash in public/_redirects (no .html suffix). */
export const PORTAL_TRAILING_SLASH_SOURCES = [
  '/portal/ops',
  '/portal/toc',
  '/portal',
  '/portal/health',
  '/portal/env',
  '/portal/vault',
  '/portal/tools',
  '/portal/failures',
  '/portal/catalog',
  '/portal/dod',
  '/portal/compliance',
  '/portal/limits',
  '/portal/partner-history',
  '/portal/dashboard',
  '/portal/skills',
  '/portal/packages',
  '/portal/brands',
  '/portal/glossary',
  '/monitoring',
  // /health is Functions JSON (not a trailing-slash HTML surface)
] as const;

/** Markdown stubs (static file + lib/http/portal-markdown.ts slug). */
export const PORTAL_MARKDOWN_SLUGS = [
  'index',
  'ops',
  'toc',
  'catalog',
  'dod',
  'compliance',
  'limits',
  'health',
  'env',
  'skills',
  'packages',
  'brands',
  'glossary',
  'monitoring',
  'dashboard',
] as const;

export type PortalMarkdownSlug = (typeof PORTAL_MARKDOWN_SLUGS)[number];

/** Live nav probe order for verify-portal (trailing slash where applicable). */
export const PORTAL_NAV_PROBE_PATHS = ['/', ...PORTAL_HTML_ROUTES] as const;
