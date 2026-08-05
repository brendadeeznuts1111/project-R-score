// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/guides/util/version — version / revision
/**
 * Portal chrome SSOT — topbar priority/overflow nav, footer links, component registry.
 * Baked to public/registry/portal-chrome.json · applied via tools/portal-apply-chrome.ts.
 *
 * @see docs/portal-foundation.md
 * @see public/portal/components/
 * @see public/portal/nav-badges.js
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { bunRuntimeProvenance } from '../bun-executable.ts';
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
  /** Optional registry bake that backs live nav badges (see badgeSources). */
  badgeSource?: string;
  /** Primary registry JSON this board consumes (operator map). */
  registryArtifact?: string;
};

/** Overflow menu group order (section headers in ⋯ dropdown). */
export const PORTAL_OVERFLOW_GROUP_ORDER: PortalChromeNavGroup[] = [
  'registry',
  'secrets',
  'ops',
  'plane',
  'harness',
  'other',
];

export const PORTAL_OVERFLOW_GROUP_LABELS: Record<PortalChromeNavGroup, string> = {
  registry: 'Registry',
  secrets: 'Secrets',
  ops: 'Ops',
  plane: 'Plane',
  harness: 'Harness',
  other: 'More',
};

/** How a public board appears relative to chrome nav. */
export type PortalChromeBoardTier = 'priority' | 'overflow' | 'unlisted';

export type PortalChromeBoardEntry = {
  id: string; // brand-ok — board slug / nav id
  href: string;
  tier: PortalChromeBoardTier;
  group?: PortalChromeNavGroup;
  label?: string;
};

export type PortalChromeComponent = {
  id: string; // brand-ok — chrome component key (topbar|footer|…), not a domain *Id
  path: string;
  role: string;
  kind: 'module' | 'shell' | 'style' | 'template';
};

/** Nav-badge wiring — mirrors public/portal/nav-badges.js BADGE_SPECS (machine SSOT for operators). */
export type PortalChromeBadgeSource = {
  href: string;
  source: string;
  /** Human field path / pick semantics */
  pick: string;
};

/** Boards that exist on the public plane but stay out of default nav (direct URL / weave only). */
export type PortalChromeUnlistedSurface = {
  id: string; // brand-ok — board slug, not domain *Id
  href: string;
  reason: string;
};

export type PortalChromeCatalog = {
  schemaVersion: 1;
  kind: 'portal-chrome';
  generated: string;
  path: typeof PORTAL_CHROME_REGISTRY_PATH;
  /** Bake-time Bun fingerprint (footer / audit). Pages has no runtime Bun. */
  runtime: {
    bunVersion: string;
    bunRevision: string;
  };
  summary: {
    priorityNav: number;
    overflowNav: number;
    footerLinks: number;
    components: number;
    scripts: number;
    badgeSources: number;
    unlistedSurfaces: number;
    boardCoverage: number;
    groups: Record<PortalChromeNavGroup, number>;
  };
  related: {
    weave: '/registry/portal-weave.json';
    monorepoHealth: '/registry/monorepo-health.json';
    packagesGraph: '/registry/packages-graph-map.json';
    opsSummary: '/registry/ops-summary.json';
    glossary: '/registry/domain-glossary.json';
    doctor: '/registry/doctor-state.json';
    bookmakers: '/registry/bookmakers.json';
    vaultHealth: '/registry/vault-health.json';
    chrome: typeof PORTAL_CHROME_REGISTRY_PATH;
  };
  priorityNav: PortalChromeNavItem[];
  overflowNav: PortalChromeNavItem[];
  footerLinks: Array<{ label: string; href: string; external?: boolean }>;
  components: PortalChromeComponent[];
  scripts: Array<{ label: string; cmd: string; doc?: string }>;
  /** Live nav badge sources (client hydrates counts/tones from these bakes). */
  badgeSources: PortalChromeBadgeSource[];
  /** Product/control boards intentionally omitted from default chrome nav. */
  unlistedSurfaces: PortalChromeUnlistedSurface[];
  /**
   * Full chrome board index (priority + overflow + unlisted).
   * Use with assertPortalChromeBoardCoverage against public portal board dirs.
   */
  boardCoverage: PortalChromeBoardEntry[];
};

/** Priority topbar (left → right) — keep lean; deep links live in overflow. */
export const PORTAL_PRIORITY_NAV: PortalChromeNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    tier: 'priority',
    group: 'other',
    note: 'public lander · portal entry',
  },
  {
    id: 'ops',
    label: 'Ops',
    href: '/portal/ops/',
    tier: 'priority',
    group: 'ops',
    note: 'ops-summary rollup · C4/C5 loop',
    cli: 'bun run ops:snapshot',
  },
  {
    id: 'registry',
    label: 'Registry',
    href: '/portal/',
    tier: 'priority',
    group: 'registry',
    note: 'portal hub · board index · weave surfaces',
  },
  {
    id: 'health',
    label: 'Health',
    href: '/portal/health/',
    tier: 'priority',
    group: 'harness',
    note: 'system health · monorepo score',
    cli: 'bun run monorepo:health:bake',
    badgeSource: '/registry/monorepo-health.json',
    registryArtifact: '/registry/monorepo-health.json',
  },
  {
    id: 'dod',
    label: 'DOD',
    href: '/portal/dod/',
    tier: 'priority',
    group: 'plane',
    note: 'visual proof review · public-plane gate',
    cli: 'bun run public:audit:verify',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    href: '/portal/compliance/',
    tier: 'priority',
    group: 'ops',
    note: 'MA/NJ board · shadow matrix',
    cli: 'bun run compliance:bake',
    registryArtifact: '/registry/compliance-board.json',
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
    note: 'graph map · publish soft-pass · weave related.ssotFlowSoft/pmProof · color kernel publish.*',
    cli: 'bun run ssot:flow:soft && bun run verify:pm:save',
    badgeSource: '/registry/packages-graph-map.json',
    registryArtifact: '/registry/packages-graph-map.json',
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
    registryArtifact: '/registry/domain-glossary.json',
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    href: '/portal/surfaces/',
    tier: 'overflow',
    group: 'registry',
    note: 'edge host inventory · Access domains · backend shortcodes · schema v2',
    cli: 'bun run surfaces:bake  # → /registry/surfaces-state.json',
    registryArtifact: '/registry/surfaces-state.json',
  },
  {
    id: 'skills',
    label: 'Skills',
    href: '/portal/skills/',
    tier: 'overflow',
    group: 'registry',
    note: 'harness + Kimi skill catalogs · loop registry alignment',
    cli: 'bun run skills:validate',
    registryArtifact: '/registry/harness-skills-catalog.json',
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
    badgeSource: '/registry/vault-health.json',
    registryArtifact: '/registry/vault-health.json',
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
  // ── Registry (concepts) ──
  // Harness overflow slots (tools, failures, bunfig, console-format, doctor,
  // install-hygiene) intentionally omitted from default nav — boards remain
  // reachable via direct URL / weave. See unlistedSurfaces. Health stays on
  // priority (group: harness).
  {
    id: 'concepts',
    label: 'Concepts',
    href: '/portal/concepts/',
    tier: 'overflow',
    group: 'registry',
    note: 'semantic vocabulary · domain summary · usage + provenance',
    cli: 'bun run concepts:bake  # → /registry/concepts-state.json',
  },
  {
    id: 'concepts-graph',
    label: 'Concept graph',
    href: '/portal/concepts/graph/',
    tier: 'overflow',
    group: 'registry',
    note: 'seeAlso · surface · domain hubs · interactive board',
    cli: 'bun run concept:graph:bake  # → /registry/concepts-graph.json',
  },
  // ── Ops boards ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/portal/dashboard/',
    tier: 'overflow',
    group: 'ops',
    note: 'KPIs · TOC · compliance plane · proof-index pins',
  },
  {
    id: 'toc',
    label: 'TOC',
    href: '/portal/toc/',
    tier: 'overflow',
    group: 'ops',
    note: 'Drum/Buffer/Rope fixture board',
    cli: 'bun run ops:seed:toc',
  },
  {
    id: 'limits',
    label: 'Limits',
    href: '/portal/limits/',
    tier: 'overflow',
    group: 'ops',
    note: 'multi-factor partner limit raises · CLV',
    cli: 'bun run ops:limits:demo',
    registryArtifact: '/registry/limit-raises.json',
  },
  {
    id: 'limits-lab',
    label: 'Limits lab',
    href: '/portal/limits-lab/',
    tier: 'overflow',
    group: 'ops',
    note: 'forecast / predict lab · multi-factor backtest',
    cli: 'bun run ops:limits:predict',
    registryArtifact: '/registry/limit-forecast-lab.json',
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
    cli: 'bun run ops:dossier:seed',
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
    id: 'bookmakers',
    label: 'Bookmakers',
    href: '/portal/bookmakers/',
    tier: 'overflow',
    group: 'ops',
    note: '@factorywager/bookmakers artifact · canonical bookmaker registry',
    cli: 'bun run bookmakers:bake',
    registryArtifact: '/registry/bookmakers.json',
  },
  {
    id: 'factory',
    label: 'Factory',
    href: '/portal/factory/',
    tier: 'overflow',
    group: 'ops',
    note: 'Factory Telegram ops · package-group wire',
    cli: 'bun run telegram:verify',
    registryArtifact: '/registry/telegram-handshake.json',
  },
  {
    id: 'tennis',
    label: 'Tennis',
    href: '/portal/tennis/',
    tier: 'overflow',
    group: 'ops',
    note: 'Tennis HQ desk · agent-auth · live matches',
    cli: 'bun run tennis:board:bake',
    registryArtifact: '/registry/tennis/agent-auth.json',
  },
  {
    id: 'identity',
    label: 'Identity',
    href: '/portal/identity/',
    tier: 'overflow',
    group: 'ops',
    note: 'auth board · lockout · anomaly · geo · JIT',
    cli: 'bun test tests/identity-*.test.ts',
    registryArtifact: '/registry/identity-board.json',
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/monitoring/',
    tier: 'overflow',
    group: 'ops',
    note: 'routing · env · compliance tile · proof status',
    cli: 'bun run ops:snapshot --no-seed',
    registryArtifact: '/registry/monitoring.json',
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
    note: 'GitHub Pages hub · wiki-index',
  },
];

/**
 * Harness / niche boards kept off default overflow so the ⋯ menu stays product-first.
 * Still first-class surfaces — link via weave, tools hub, or direct URL.
 */
export const PORTAL_CHROME_UNLISTED: PortalChromeUnlistedSurface[] = [
  {
    id: 'doctor',
    href: '/portal/doctor/',
    reason: 'harness control-plane · portal:doctor · badge source on doctor-state',
  },
  {
    id: 'tools',
    href: '/portal/tools/',
    reason: 'operator tools hub · weave scripts · not a product board',
  },
  {
    id: 'failures',
    href: '/portal/failures/',
    reason: 'JUnit failure board · badge source; keep overflow lean',
  },
  {
    id: 'bunfig',
    href: '/portal/bunfig/',
    reason: 'install policy board · UNIFIED machine/project merge',
  },
  {
    id: 'console-format',
    href: '/portal/console-format/',
    reason: 'console-format ratchet board · developer control-plane',
  },
  {
    id: 'install-hygiene',
    href: '/portal/install-hygiene/',
    reason: 'cache/links hygiene · badge source; not day-loop product nav',
  },
  {
    id: 'science',
    href: '/portal/science/',
    reason: 'experimental science board · niche',
  },
];

/** Mirrors public/portal/nav-badges.js — keep in sync when adding badge hrefs. */
export const PORTAL_CHROME_BADGE_SOURCES: PortalChromeBadgeSource[] = [
  {
    href: '/portal/failures/',
    source: '/registry/failures.json',
    pick: 'totals.failures | failures.length',
  },
  {
    href: '/portal/vault/',
    source: '/registry/vault-health.json',
    pick: 'summary.activeItems | vaults[].active sum',
  },
  {
    href: '/portal/packages/',
    source: '/registry/packages-graph-map.json',
    pick: 'packages.length | map.summary.packageCount',
  },
  {
    href: '/portal/health/',
    source: '/registry/monorepo-health.json',
    pick: 'score | summary.score',
  },
  {
    href: '/portal/doctor/',
    source: '/registry/doctor-state.json',
    pick: 'tone | ok → green/red',
  },
  {
    href: '/portal/install-hygiene/',
    source: '/registry/install-hygiene-report.json',
    pick: 'ok | prune | fail label',
  },
];

/** Business/ops footer links — harness boards omitted (direct URL / weave only). */
export const PORTAL_FOOTER_LINKS: PortalChromeCatalog['footerLinks'] = [
  { label: 'Dashboard', href: 'https://factory-wager.com', external: true },
  { label: 'Ops', href: '/portal/ops/' },
  { label: 'TOC', href: '/portal/toc/' },
  { label: 'Partners', href: '/portal/partners/' },
  { label: 'Tennis', href: '/portal/tennis/' },
  { label: 'Bookmakers', href: '/portal/bookmakers/' },
  { label: 'Packages', href: '/portal/packages/' },
  { label: 'Brands', href: '/portal/brands/' },
  { label: 'Glossary', href: '/portal/glossary/' },
  { label: 'Surfaces', href: '/portal/surfaces/' },
  { label: 'Health', href: '/portal/health/' },
  { label: 'Portal proof', href: '/registry/portal-weave.json' },
  { label: 'Compliance', href: '/portal/compliance/' },
  { label: 'Limits', href: '/portal/limits/' },
  { label: 'DOD', href: '/portal/dod/' },
  { label: 'Env', href: '/portal/env/' },
  { label: 'Vault', href: '/portal/vault/' },
  { label: 'Wiki', href: PORTAL_WIKI_DROPDOWN_HREF, external: true },
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
    id: 'fetch-json',
    path: '/portal/fetch-json.js',
    role: 'shared JSON fetch helper · cache: no-store defaults',
    kind: 'module',
  },
  {
    id: 'registry-cache',
    path: '/portal/registry-cache.js',
    role: 'in-memory registry bake cache for multi-card boards',
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
    id: 'card',
    path: '/portal/card.js',
    role: 'shared card chrome · scope badges · tag filters',
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
    role: 'shared footer from portal-chrome registry · bake-time Bun.version',
    kind: 'module',
  },
  {
    id: 'glossary-ux',
    path: '/portal/components/glossary-ux.js',
    role: 'data-glossary-concept tooltips · #glossary: deep links · domain-glossary.json',
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
    id: 'theme-tokens',
    path: '/portal/theme-tokens.css',
    role: 'CSS custom properties · color kernel theme aliases',
    kind: 'style',
  },
  {
    id: 'theme-jsonc',
    path: '/portal/theme.jsonc',
    role: 'theme SSOT · validate:colors / test:colors',
    kind: 'shell',
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
  {
    id: 'verification-card',
    path: '/portal/verification-card.js',
    role: 'proof-index verification pins · health/dashboard',
    kind: 'module',
  },
];

function countNavGroups(items: PortalChromeNavItem[]): Record<PortalChromeNavGroup, number> {
  const groups: Record<PortalChromeNavGroup, number> = {
    ops: 0,
    harness: 0,
    registry: 0,
    secrets: 0,
    plane: 0,
    other: 0,
  };
  for (const item of items) {
    const g = item.group ?? 'other';
    groups[g] += 1;
  }
  return groups;
}

/** Priority + overflow + unlisted → operator board index (no disk scan). */
export function listChromeBoardCoverage(): PortalChromeBoardEntry[] {
  const out: PortalChromeBoardEntry[] = [];
  for (const item of PORTAL_PRIORITY_NAV) {
    out.push({
      id: item.id,
      href: item.href,
      tier: 'priority',
      group: item.group,
      label: item.label,
    });
  }
  for (const item of PORTAL_OVERFLOW_NAV) {
    out.push({
      id: item.id,
      href: item.href,
      tier: 'overflow',
      group: item.group,
      label: item.label,
    });
  }
  for (const item of PORTAL_CHROME_UNLISTED) {
    out.push({
      id: item.id,
      href: item.href,
      tier: 'unlisted',
    });
  }
  return out;
}

/**
 * Slugs under public/portal board dirs with index.html
 * (excludes components, dist, icons, scripts).
 * Home is `/` and registry hub is `/portal/` — not slug dirs.
 */
export function scanPortalBoardSlugs(portalDir: string): string[] {
  const skip = new Set(['components', 'dist', 'icons', 'scripts']);
  const names = readdirSync(portalDir, { withFileTypes: true });
  const slugs: string[] = [];
  for (const ent of names) {
    if (!ent.isDirectory() || skip.has(ent.name) || ent.name.startsWith('_')) continue;
    if (existsSync(join(portalDir, ent.name, 'index.html'))) slugs.push(ent.name);
  }
  return slugs.sort();
}

export type PortalChromeCoverageReport = {
  diskBoards: string[];
  orphans: string[];
  /** Chrome entries that claim a /portal/<slug>/ path but no index.html on disk */
  missingOnDisk: string[];
  covered: string[];
};

/**
 * Every disk board must be priority, overflow, or unlisted.
 * Chrome /portal/<slug> paths must exist (except concepts-graph which is nested).
 */
export function assertPortalChromeBoardCoverage(portalDir: string): PortalChromeCoverageReport {
  const diskBoards = scanPortalBoardSlugs(portalDir);
  const coverage = listChromeBoardCoverage();
  const coveredSlugs = new Set<string>();
  const missingOnDisk: string[] = [];

  for (const entry of coverage) {
    const m = entry.href.match(/^\/portal\/([a-z0-9-]+)\/?$/i);
    if (!m) continue; // home, monitoring, external, nested graph
    const slug = m[1]!;
    coveredSlugs.add(slug);
    if (slug === 'concepts' && entry.id === 'concepts-graph') continue;
    // nested concepts/graph handled separately
    if (!diskBoards.includes(slug) && entry.id !== 'concepts-graph') {
      // concepts-graph is nested under concepts/
      if (entry.href.includes('/concepts/graph')) continue;
      missingOnDisk.push(entry.id);
    }
  }
  // concepts-graph lives at public/portal/concepts/graph/
  if (coverage.some(c => c.id === 'concepts-graph')) {
    coveredSlugs.add('concepts');
  }

  const orphans = diskBoards.filter(s => !coveredSlugs.has(s));
  if (orphans.length > 0 || missingOnDisk.length > 0) {
    const parts: string[] = [];
    if (orphans.length) parts.push(`orphans (on disk, not in chrome): ${orphans.join(', ')}`);
    if (missingOnDisk.length)
      parts.push(`missing on disk (chrome href): ${missingOnDisk.join(', ')}`);
    throw new Error(`portal chrome board coverage failed — ${parts.join('; ')}`);
  }
  return {
    diskBoards,
    orphans,
    missingOnDisk,
    covered: [...coveredSlugs].sort(),
  };
}

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
    { label: 'portal doctor', cmd: 'bun run portal:doctor' },
  ];
  const allNav = [...PORTAL_PRIORITY_NAV, ...PORTAL_OVERFLOW_NAV];
  const boardCoverage = listChromeBoardCoverage();
  const provenance = bunRuntimeProvenance();
  return {
    schemaVersion: 1,
    kind: 'portal-chrome',
    generated,
    path: PORTAL_CHROME_REGISTRY_PATH,
    runtime: {
      bunVersion: provenance.bunVersion,
      bunRevision: provenance.bunRevision,
    },
    summary: {
      priorityNav: PORTAL_PRIORITY_NAV.length,
      overflowNav: PORTAL_OVERFLOW_NAV.length,
      footerLinks: PORTAL_FOOTER_LINKS.length,
      components: PORTAL_CHROME_COMPONENTS.length,
      scripts: scripts.length,
      badgeSources: PORTAL_CHROME_BADGE_SOURCES.length,
      unlistedSurfaces: PORTAL_CHROME_UNLISTED.length,
      boardCoverage: boardCoverage.length,
      groups: countNavGroups(allNav),
    },
    related: {
      weave: '/registry/portal-weave.json',
      monorepoHealth: '/registry/monorepo-health.json',
      packagesGraph: '/registry/packages-graph-map.json',
      opsSummary: '/registry/ops-summary.json',
      glossary: '/registry/domain-glossary.json',
      doctor: '/registry/doctor-state.json',
      bookmakers: '/registry/bookmakers.json',
      vaultHealth: '/registry/vault-health.json',
      chrome: PORTAL_CHROME_REGISTRY_PATH,
    },
    priorityNav: PORTAL_PRIORITY_NAV,
    overflowNav: PORTAL_OVERFLOW_NAV,
    footerLinks: PORTAL_FOOTER_LINKS,
    components: PORTAL_CHROME_COMPONENTS,
    scripts,
    badgeSources: PORTAL_CHROME_BADGE_SOURCES,
    unlistedSurfaces: PORTAL_CHROME_UNLISTED,
    boardCoverage,
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
  const art = item.registryArtifact
    ? ` data-registry="${item.registryArtifact.replace(/"/g, '&quot;')}"`
    : '';
  return `class="nav-link${active}"${aria}${ext}${title}${group}${cli}${art}`;
}

/** Group overflow items for sectioned ⋯ menu (preserves within-group order). */
export function groupOverflowNav(
  items: PortalChromeNavItem[] = PORTAL_OVERFLOW_NAV
): Array<{ group: PortalChromeNavGroup; label: string; items: PortalChromeNavItem[] }> {
  const buckets = new Map<PortalChromeNavGroup, PortalChromeNavItem[]>();
  for (const item of items) {
    const g = item.group ?? 'other';
    const list = buckets.get(g) ?? [];
    list.push(item);
    buckets.set(g, list);
  }
  return PORTAL_OVERFLOW_GROUP_ORDER.filter(g => (buckets.get(g)?.length ?? 0) > 0).map(g => ({
    group: g,
    label: PORTAL_OVERFLOW_GROUP_LABELS[g],
    items: buckets.get(g)!,
  }));
}

function renderOverflowMenuHtml(activeId?: string): string {
  // brand-ok — nav slot key
  return groupOverflowNav()
    .map(({ group, label, items }) => {
      const links = items
        .map(
          item =>
            `<a href="${item.href}" ${navAttrs(item, activeId)} role="menuitem">${item.label}</a>`
        )
        .join('\n            ');
      return `<div class="nav-group" role="group" aria-label="${label}" data-group="${group}">
            <div class="nav-group-label" aria-hidden="true">${label}</div>
            ${links}
          </div>`;
    })
    .join('\n          ');
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
          ${renderOverflowMenuHtml(activeId)}
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
      · <span data-footer-bun></span>
      · <span data-footer-ts>…</span>
    </p>
  </footer>`;
}
