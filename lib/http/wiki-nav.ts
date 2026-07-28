/**
 * Wiki navigation SSOT — GitHub Pages (wiki.factory-wager.com).
 *
 * Portal chrome imports these helpers; do not hardcode wiki URLs elsewhere.
 *
 * @see wiki-index.md
 * @see config/r2-env.ts factoryWagerWikiUrl
 * @see docs/platform-routing.md
 */

import { factoryWagerWikiUrl } from '../../config/r2-env.ts';

/** Jekyll path for the full navigation hub (sitemap + portal chrome). */
export const WIKI_INDEX_PATH = '/wiki-index.html';

export function factoryWagerWikiIndexUrl(): string {
  return `${factoryWagerWikiUrl()}${WIKI_INDEX_PATH}`;
}

/** Primary portal topbar target — full index, not bare homepage. */
export const PORTAL_WIKI_DROPDOWN_HREF = factoryWagerWikiIndexUrl();

export type WikiNavLink = {
  label: string;
  href: string;
  note?: string;
};

/** Baked into portal-weave.json for ops/monitoring panels. */
export const PORTAL_WEAVE_WIKI: WikiNavLink[] = [
  {
    label: 'Wiki index',
    href: factoryWagerWikiIndexUrl(),
    note: 'portal boards · registry · tenants · proof loop',
  },
  {
    label: 'Wiki home',
    href: factoryWagerWikiUrl(),
    note: 'README · GitHub Pages homepage',
  },
  {
    label: 'Docs index',
    href: `${factoryWagerWikiUrl()}/docs/README.html`,
    note: 'platform SSOT markdown tree',
  },
  {
    label: 'Harness JIT',
    href: `${factoryWagerWikiUrl()}/docs/harness/README.html`,
    note: 'tenant owners · proof commands',
  },
  {
    label: 'Registry index',
    href: `${factoryWagerWikiUrl()}/registry-index.html`,
    note: 'registry bake map · portal consumers',
  },
  {
    label: 'AGENTS',
    href: `${factoryWagerWikiUrl()}/AGENTS.html`,
    note: 'agent entrypoint',
  },
];
