/**
 * Portal page + redirect SSOT — keep _redirects, verify-portal, and tests aligned.
 *
 * @see docs/portal-foundation.md
 * @see public/_redirects
 */

import { PORTAL_BOARD_SLUGS } from './portal-board-slugs.ts';

/** Portal HTML surfaces (directory indexes under public/portal/ or public/monitoring/). */
export const PORTAL_HTML_ROUTES = [
  '/portal/',
  ...PORTAL_BOARD_SLUGS.map(slug => `/portal/${slug}/`),
  '/monitoring/',
] as const;

/** Paths that need 301 → trailing-slash in public/_redirects (no .html suffix). */
export const PORTAL_TRAILING_SLASH_SOURCES = PORTAL_HTML_ROUTES.map(route => route.slice(0, -1));

/** Markdown stubs (static file + lib/http/portal-markdown.ts slug). */
export const PORTAL_MARKDOWN_SLUGS = [
  'index',
  'ops',
  'toc',
  'catalog',
  'dod',
  'compliance',
  'limits',
  'desk',
  'partners',
  'factory',
  'telegram',
  'bookmakers',
  'routing',
  'health',
  'env',
  'skills',
  'packages',
  'brands',
  'glossary',
  'issues',
  'monitoring',
  'dashboard',
] as const;

export type PortalMarkdownSlug = (typeof PORTAL_MARKDOWN_SLUGS)[number];

/** Live nav probe order for verify-portal (trailing slash where applicable). */
export const PORTAL_NAV_PROBE_PATHS = ['/', ...PORTAL_HTML_ROUTES] as const;
