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

/** Logical nav groups (overflow ordering + data-group for UI filters). */
export type PortalChromeNavGroup = 'ops' | 'harness' | 'registry' | 'secrets' | 'plane' | 'other';

export type PortalChromeNavItem = {
  id: string; // brand-ok — chrome nav slot key (home|ops|…), not a domain *Id
  label: string;
  href: string;
  /** Priority bar vs overflow menu */
  tier: 'priority' | 'overflow';
  external?: boolean;
  note?: string;
  /** Logical group for overflow order / data-group */
  group?: PortalChromeNavGroup;
  /** Grounded portal-cli / bun command (title tooltip when set) */
  cli?: string;
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

/** Priority topbar (left → right) — keep lean; deep links live in overflow. */
export const PORTAL_PRIORITY_NAV: PortalChromeNavItem[] = [
  { id: 'home', label: 'Home', href: '/', tier: 'priority', group: 'other' },
  {
    id: 'ops',
    label: 'Ops',
    href: '/portal/ops/',
    tier: 'priority',
    group: 'ops',
    note: 'ops-summary rollup',
    cli: 'bun run ops:snapshot',
  },
  { id: 'registry', label: 'Registry', href: '/portal/', tier: 'priority', group: 'registry' },
  {
    id: 'health',
    label: 'Health',
    href: '/portal/health/',
    tier: 'priority',
    group: 'harness',
    note: 'system health · monorepo score',
    cli: 'bun run monorepo:health:bake',
  },
  {
    id: 'dod',
    label: 'DOD',
    href: '/portal/dod/',
    tier: 'priority',
    group: 'plane',
    note: 'visual proof review',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    href: '/portal/compliance/',
    tier: 'priority',
    group: 'ops',
    note: 'MA/NJ board',
    cli: 'bun run compliance:bake',
  },
];

/**
 * Overflow (⋯) menu — unique ids, logical groups, grounded CLI notes.
 * Hrefs are real portal surfaces only (no phantom /portal/pm/ pages).
 */
export const PORTAL_OVERFLOW_NAV: PortalChromeNavItem[] = [
  // ── Registry & packages ──
  {
    id: 'catalog',
    label: 'Catalog',
    href: '/portal/catalog/',
    tier: 'overflow',
    group: 'registry',
    note: 'account catalog · scrape-wire sports/states registry',
    cli: 'bun run bake:scrape-wire-taxonomy',
  },
  {
    id: 'packages',
    label: 'Packages',
    href: '/portal/packages/',
    tier: 'overflow',
    group: 'registry',
    note: 'graph map · portal-cli pm graph',
    cli: 'bun run portal-cli pm graph  # offline packages-graph-map table',
  },
  {
    id: 'brands',
    label: 'Brands',
    href: '/portal/brands/',
    tier: 'overflow',
    group: 'registry',
    note: 'domain-value glossary · constructor tiers · project adoption',
    cli: 'bun run brand:keymap',
  },
  {
    id: 'glossary',
    label: 'Glossary',
    href: '/portal/glossary/',
    tier: 'overflow',
    group: 'registry',
    note: 'market · model · trading · warehouse · pipeline concepts',
    cli: 'bun run glossary:portal',
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    href: '/portal/surfaces/',
    tier: 'overflow',
    group: 'registry',
    note: 'edge host inventory · Access domains · backend shortcodes · schema v2',
    cli: 'bun run surfaces:bake  # → /registry/surfaces-state.json',
  },
  {
    id: 'skills',
    label: 'Skills',
    href: '/portal/skills/',
    tier: 'overflow',
    group: 'registry',
  },
  // ── Secrets & env ──
  {
    id: 'vault',
    label: 'Vault',
    href: '/portal/vault/',
    tier: 'overflow',
    group: 'secrets',
    note: 'Proton Pass health bake · gate: portal-cli vault health',
    cli: 'bun run portal-cli vault health  # offline SSOT · --update to refresh snaps',
  },
  {
    id: 'env',
    label: 'Env',
    href: '/portal/env/',
    tier: 'overflow',
    group: 'secrets',
    note: 'vault-map inject · secret autofill mapping',
    cli: 'bun run portal-cli secret map  # no secret values printed',
  },
  // ── Harness ──
  {
    id: 'tools',
    label: 'CLI Tools',
    href: '/portal/tools/',
    tier: 'overflow',
    group: 'harness',
    note: 'portal-cli surface map · badges · capability subset',
    cli: 'bun run portal-cli dashboard --view=tools',
  },
  {
    id: 'failures',
    label: 'Failures',
    href: '/portal/failures/',
    tier: 'overflow',
    group: 'harness',
    note: 'test failures bake · junit · nav badge = count',
    cli: 'bun run failures:bake  # → /registry/failures.json',
  },
  {
    id: 'bunfig',
    label: 'Bunfig',
    href: '/portal/bunfig/',
    tier: 'overflow',
    group: 'harness',
    note: 'bunfig install config provenance · portal-cli bunfig status',
    cli: 'bun run bunfig:bake  # → /registry/bunfig-state.json',
  },
  {
    id: 'console-format',
    label: 'Console Format',
    href: '/portal/console-format/',
    tier: 'overflow',
    group: 'harness',
    note: 'structured output gate · logTable/logDepth/jsonOut ratchet',
    cli: 'bun run console-format:bake  # → /registry/console-format-state.json',
  },
  {
    id: 'doctor',
    label: 'Doctor',
    href: '/portal/doctor/',
    tier: 'overflow',
    group: 'harness',
    note: 'unified health gate · bunfig · catalog · linker',
    cli: 'bun run portal:doctor --verbose',
  },
  {
    id: 'install-hygiene',
    label: 'Install hygiene',
    href: '/portal/install-hygiene/',
    tier: 'overflow',
    group: 'harness',
    note: 'cache prune · npm-install policy · install:verify bake',
    cli: 'bun run bake:install-hygiene  # → /registry/install-hygiene-report.json',
  },
  // ── Ops boards ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/portal/dashboard/',
    tier: 'overflow',
    group: 'ops',
  },
  {
    id: 'toc',
    label: 'TOC',
    href: '/portal/toc/',
    tier: 'overflow',
    group: 'ops',
    note: 'Drum/Buffer/Rope',
    cli: 'bun run ops:seed:toc',
  },
  {
    id: 'limits',
    label: 'Limits',
    href: '/portal/limits/',
    tier: 'overflow',
    group: 'ops',
    cli: 'bun run ops:limits:demo',
  },
  {
    id: 'partners',
    label: 'Partners',
    href: '/portal/partners/',
    tier: 'overflow',
    group: 'ops',
    note: 'package groups · telegram forums · accounting · deposits',
    cli: 'bun run telegram:handshake:catalog',
  },
  {
    id: 'account',
    label: 'Account',
    href: '/portal/account/',
    tier: 'overflow',
    group: 'ops',
    note: 'single-account dossier · tree · telemetry · betlog',
  },
  {
    id: 'partner-history',
    label: 'Partner history',
    href: '/portal/partner-history/',
    tier: 'overflow',
    group: 'ops',
    note: 'per-partner limit history board',
    cli: 'bun run ops:limits:demo',
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/monitoring/',
    tier: 'overflow',
    group: 'ops',
  },
  {
    id: 'prediction-report',
    label: 'Prediction',
    href: '/registry/prediction/report/',
    tier: 'overflow',
    group: 'ops',
    note: 'latest prediction report · snapshot scope',
    cli: 'bun run portal-cli snapshot last --scope prediction',
  },
  // ── External ──
  {
    id: 'wiki',
    label: 'Wiki',
    href: PORTAL_WIKI_DROPDOWN_HREF,
    tier: 'overflow',
    group: 'other',
    external: true,
    note: 'GitHub Pages hub',
  },
];

export const PORTAL_FOOTER_LINKS: PortalChromeCatalog['footerLinks'] = [
  { label: 'Dashboard', href: 'https://factory-wager.com', external: true },
  { label: 'Ops', href: '/portal/ops/' },
  { label: 'TOC', href: '/portal/toc/' },
  { label: 'Partners', href: '/portal/partners/' },
  { label: 'Packages', href: '/portal/packages/' },
  { label: 'Brands', href: '/portal/brands/' },
  { label: 'Glossary', href: '/portal/glossary/' },
  { label: 'Surfaces', href: '/portal/surfaces/' },
  { label: 'Health', href: '/portal/health/' },
  { label: 'Portal proof', href: '/registry/portal-weave.json' },
  { label: 'CLI Tools', href: '/portal/tools/' },
  { label: 'Compliance', href: '/portal/compliance/' },
  { label: 'Limits', href: '/portal/limits/' },
  { label: 'DOD', href: '/portal/dod/' },
  { label: 'Env', href: '/portal/env/' },
  { label: 'Vault', href: '/portal/vault/' },
  { label: 'Failures', href: '/portal/failures/' },
  { label: 'Install hygiene', href: '/portal/install-hygiene/' },
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
    id: 'nav-badges',
    path: '/portal/nav-badges.js',
    role: 'live counts from baked registry JSON on nav links',
    kind: 'module',
  },
  {
    id: 'topbar',
    path: '/portal/topbar.js',
    role: 'health dot · nav current · sidebar bootstrap · nav badges',
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
    id: 'brand-assets',
    path: '/site.webmanifest',
    role: 'FactoryWager mark · install metadata · theme colors',
    kind: 'shell',
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

function navAttrs(item: PortalChromeNavItem, activeId?: string): string {
  // brand-ok — chrome nav slot key, not domain ActiveId
  const active = activeId === item.id ? ' active' : '';
  const aria = activeId === item.id ? ' aria-current="page"' : '';
  const ext = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
  const tip = [item.note, item.cli].filter(Boolean).join(' · ');
  const title = tip ? ` title="${tip.replace(/"/g, '&quot;')}"` : '';
  const group = item.group ? ` data-group="${item.group}"` : '';
  const cli = item.cli ? ` data-cli="${item.cli.replace(/"/g, '&quot;')}"` : '';
  return `class="nav-link${active}"${aria}${ext}${title}${group}${cli}`;
}

export function renderPriorityNavHtml(activeId?: string): string {
  // brand-ok — nav slot key, not domain ActiveId
  const links = PORTAL_PRIORITY_NAV.map(
    item => `<a href="${item.href}" ${navAttrs(item, activeId)}>${item.label}</a>`
  ).join('\n        ');
  return `<nav class="topbar-nav" aria-label="Primary">
        ${links}
        <div class="nav-overflow">
          <button type="button" class="nav-more" aria-label="More navigation" aria-expanded="false" aria-haspopup="true">⋯</button>
          <div class="nav-dropdown" role="menu">
            ${PORTAL_OVERFLOW_NAV.map(
              item =>
                `<a href="${item.href}" ${navAttrs(item, activeId)} role="menuitem">${item.label}</a>`
            ).join('\n            ')}
          </div>
        </div>
      </nav>`;
}

/** Assert unique nav ids (overflow + priority) — used by tests. */
export function assertUniqueChromeNavIds(): void {
  const ids = [...PORTAL_PRIORITY_NAV, ...PORTAL_OVERFLOW_NAV].map(n => n.id);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`duplicate chrome nav id: ${id}`);
    seen.add(id);
  }
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
