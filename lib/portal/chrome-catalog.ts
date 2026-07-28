// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Portal chrome SSOT — topbar priority/overflow nav, footer links, component registry.
 * Baked to public/registry/portal-chrome.json · applied via tools/portal-apply-chrome.ts.
 *
 * @see docs/portal-foundation.md
 * @see public/portal/components/
 */
import { PORTAL_WIKI_DROPDOWN_HREF } from '../http/wiki-nav.ts';

export const PORTAL_CHROME_REGISTRY_REL = 'public/registry/portal-chrome.json';
export const PORTAL_CHROME_REGISTRY_PATH = '/registry/portal-chrome.json' as const;

export type PortalChromeNavItem = {
  id: string; // brand-ok — chrome nav slot key (home|ops|…), not a domain *Id
  label: string;
  href: string;
  /** Priority bar vs overflow menu */
  tier: 'priority' | 'overflow';
  external?: boolean;
  note?: string;
};

export type PortalChromeComponent = {
  id: string; // brand-ok — chrome component key (topbar|footer|…), not a domain *Id
  path: string;
  role: string;
  kind: 'module' | 'shell' | 'style' | 'template';
};

export type PortalChromeCatalog = {
  schemaVersion: 1;
  kind: 'portal-chrome';
  generated: string;
  path: typeof PORTAL_CHROME_REGISTRY_PATH;
  summary: {
    priorityNav: number;
    overflowNav: number;
    footerLinks: number;
    components: number;
    scripts: number;
  };
  related: {
    weave: '/registry/portal-weave.json';
    monorepoHealth: '/registry/monorepo-health.json';
    packagesGraph: '/registry/packages-graph-map.json';
    opsSummary: '/registry/ops-summary.json';
  };
  priorityNav: PortalChromeNavItem[];
  overflowNav: PortalChromeNavItem[];
  footerLinks: Array<{ label: string; href: string; external?: boolean }>;
  components: PortalChromeComponent[];
  scripts: Array<{ label: string; cmd: string; doc?: string }>;
};

/** Priority topbar (left → right). */
export const PORTAL_PRIORITY_NAV: PortalChromeNavItem[] = [
  { id: 'home', label: 'Home', href: '/', tier: 'priority' },
  { id: 'ops', label: 'Ops', href: '/portal/ops/', tier: 'priority', note: 'ops-summary rollup' },
  { id: 'registry', label: 'Registry', href: '/portal/', tier: 'priority' },
  { id: 'health', label: 'Health', href: '/portal/health/', tier: 'priority' },
  { id: 'dod', label: 'DOD', href: '/portal/dod/', tier: 'priority' },
  {
    id: 'compliance',
    label: 'Compliance',
    href: '/portal/compliance/',
    tier: 'priority',
    note: 'MA/NJ board',
  },
];

/** Overflow (⋯) menu. */
export const PORTAL_OVERFLOW_NAV: PortalChromeNavItem[] = [
  { id: 'catalog', label: 'Catalog', href: '/portal/catalog/', tier: 'overflow' },
  { id: 'skills', label: 'Skills', href: '/portal/skills/', tier: 'overflow' },
  { id: 'env', label: 'Env', href: '/portal/env/', tier: 'overflow' },
  {
    id: 'packages',
    label: 'Packages',
    href: '/portal/packages/',
    tier: 'overflow',
    note: 'graph map',
  },
  { id: 'dashboard', label: 'Dashboard', href: '/portal/dashboard/', tier: 'overflow' },
  { id: 'toc', label: 'TOC', href: '/portal/toc/', tier: 'overflow', note: 'Drum/Buffer/Rope' },
  { id: 'limits', label: 'Limits', href: '/portal/limits/', tier: 'overflow' },
  { id: 'monitoring', label: 'Monitoring', href: '/monitoring/', tier: 'overflow' },
  {
    id: 'wiki',
    label: 'Wiki',
    href: PORTAL_WIKI_DROPDOWN_HREF,
    tier: 'overflow',
    external: true,
    note: 'GitHub Pages hub',
  },
];

export const PORTAL_FOOTER_LINKS: PortalChromeCatalog['footerLinks'] = [
  { label: 'Dashboard', href: 'https://factory-wager.com', external: true },
  { label: 'Ops', href: '/portal/ops/' },
  { label: 'TOC', href: '/portal/toc/' },
  { label: 'Packages', href: '/portal/packages/' },
  { label: 'Health', href: '/portal/health/' },
  { label: 'Compliance', href: '/portal/compliance/' },
  { label: 'Limits', href: '/portal/limits/' },
  { label: 'DOD', href: '/portal/dod/' },
  { label: 'Env', href: '/portal/env/' },
  { label: 'Monorepo health', href: '/registry/monorepo-health.json' },
  {
    label: 'GitHub',
    href: 'https://github.com/brendadeeznuts1111/project-R-score',
    external: true,
  },
];

/** Static modules every shell should load (or document as optional). */
export const PORTAL_CHROME_COMPONENTS: PortalChromeComponent[] = [
  {
    id: 'data',
    path: '/portal/data.js',
    role: 'SWR health service · portal:data',
    kind: 'module',
  },
  {
    id: 'topbar',
    path: '/portal/topbar.js',
    role: 'health dot · nav current · sidebar bootstrap',
    kind: 'module',
  },
  {
    id: 'navigation',
    path: '/portal/navigation.js',
    role: 'markCurrentNavigation path SSOT',
    kind: 'module',
  },
  {
    id: 'sidebar',
    path: '/portal/components/sidebar.js',
    role: 'tenant switcher',
    kind: 'module',
  },
  {
    id: 'notification',
    path: '/portal/components/notification.js',
    role: 'notification-center toasts',
    kind: 'module',
  },
  {
    id: 'footer',
    path: '/portal/components/footer.js',
    role: 'shared footer from portal-chrome registry',
    kind: 'module',
  },
  {
    id: 'limit-changes-card',
    path: '/portal/components/limit-changes-card.js',
    role: 'reusable limit-raises card',
    kind: 'module',
  },
  {
    id: 'style',
    path: '/portal/style.css',
    role: 'design tokens · chrome layout',
    kind: 'style',
  },
  {
    id: 'page-template',
    path: '/portal/_page-template.html',
    role: 'new page shell SSOT',
    kind: 'template',
  },
  {
    id: 'operations-dashboard',
    path: '/portal/operations-dashboard.js',
    role: 'ops custom element · monorepoHealth panel',
    kind: 'module',
  },
  {
    id: 'toc-dashboard',
    path: '/portal/toc/toc-dashboard.js',
    role: 'TOC Drum/Buffer/Rope · harness glance',
    kind: 'module',
  },
];

export function buildPortalChromeCatalog(
  generated = new Date().toISOString()
): PortalChromeCatalog {
  const scripts = [
    {
      label: 'apply chrome',
      cmd: 'bun tools/portal-apply-chrome.ts',
      doc: 'docs/portal-foundation.md',
    },
    { label: 'bake chrome registry', cmd: 'bun run portal:chrome:bake' },
    { label: 'verify portal static', cmd: 'bun run verify:portal:static' },
    { label: 'monorepo health bake', cmd: 'bun run monorepo:health:bake' },
    { label: 'ops snapshot', cmd: 'bun run ops:snapshot --no-routing' },
  ];
  return {
    schemaVersion: 1,
    kind: 'portal-chrome',
    generated,
    path: PORTAL_CHROME_REGISTRY_PATH,
    summary: {
      priorityNav: PORTAL_PRIORITY_NAV.length,
      overflowNav: PORTAL_OVERFLOW_NAV.length,
      footerLinks: PORTAL_FOOTER_LINKS.length,
      components: PORTAL_CHROME_COMPONENTS.length,
      scripts: scripts.length,
    },
    related: {
      weave: '/registry/portal-weave.json',
      monorepoHealth: '/registry/monorepo-health.json',
      packagesGraph: '/registry/packages-graph-map.json',
      opsSummary: '/registry/ops-summary.json',
    },
    priorityNav: PORTAL_PRIORITY_NAV,
    overflowNav: PORTAL_OVERFLOW_NAV,
    footerLinks: PORTAL_FOOTER_LINKS,
    components: PORTAL_CHROME_COMPONENTS,
    scripts,
  };
}

export function renderPriorityNavHtml(activeId?: string): string {
  // brand-ok — nav slot key, not domain ActiveId
  const links = PORTAL_PRIORITY_NAV.map(item => {
    const active = activeId === item.id ? ' active' : '';
    const aria = activeId === item.id ? ' aria-current="page"' : '';
    return `<a href="${item.href}" class="nav-link${active}"${aria}>${item.label}</a>`;
  }).join('\n        ');
  return `<nav class="topbar-nav" aria-label="Primary">
        ${links}
        <div class="nav-overflow">
          <button type="button" class="nav-more" aria-label="More navigation" aria-expanded="false" aria-haspopup="true">⋯</button>
          <div class="nav-dropdown" role="menu">
            ${PORTAL_OVERFLOW_NAV.map(item => {
              const active = activeId === item.id ? ' active' : '';
              const ext = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
              const title = item.note ? ` title="${item.note}"` : '';
              return `<a href="${item.href}" class="nav-link${active}" role="menuitem"${ext}${title}>${item.label}</a>`;
            }).join('\n            ')}
          </div>
        </div>
      </nav>`;
}

export function renderFooterHtml(): string {
  const links = PORTAL_FOOTER_LINKS.map(l => {
    const ext = l.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${l.href}"${ext}>${l.label}</a>`;
  }).join(' ·\n      ');
  return `<footer class="footer" data-portal-chrome="footer">
    <p>
      <strong>FactoryWager</strong> ·
      ${links}
    </p>
    <p class="footer-meta">
      project-R-score · chrome <a href="${PORTAL_CHROME_REGISTRY_PATH}"><code>portal-chrome.json</code></a>
      · <span data-footer-ts>…</span>
    </p>
  </footer>`;
}
