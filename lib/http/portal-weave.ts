// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Portal weave — cross-surface links and operator runbooks baked into registry.
 *
 * @see public/registry/portal-weave.json
 * @see docs/portal-foundation.md
 * @see lib/http/wiki-nav.ts
 */

import { PORTAL_WEAVE_WIKI } from './wiki-nav.ts';
import { PORTAL_CHROME_COMPONENTS } from '../portal/chrome-catalog.ts';

export type PortalWeaveGroup =
  | 'ops'
  | 'harness'
  | 'registry'
  | 'secrets'
  | 'wiki'
  | 'plane'
  | 'other';

export type PortalWeaveLink = {
  /** Stable slug for UI chips / filters */
  id?: string; // brand-ok — weave link key, not a domain *Id
  label: string;
  href: string;
  note?: string;
  group?: PortalWeaveGroup;
  /** Grounded portal-cli / bun command */
  cli?: string;
};

export type PortalWeaveScript = {
  id?: string; // brand-ok — script slot key
  label: string;
  cmd: string;
  doc?: string;
  group?: PortalWeaveGroup;
};

export type PortalWeaveComponent = {
  id: string; // brand-ok — chrome component key, not a domain *Id
  path: string;
  role: string;
  kind?: string;
};

export type PortalWeaveSummary = {
  surfaces: number;
  artifacts: number;
  components: number;
  wiki: number;
  scripts: number;
};

export type PortalWeaveRelated = {
  chrome: '/registry/portal-chrome.json';
  monorepoHealth: '/registry/monorepo-health.json';
  doctorState: '/registry/doctor-state.json';
  packagesGraph: '/registry/packages-graph-map.json';
  opsSummary: '/registry/ops-summary.json';
  tocOps: '/registry/toc-ops.json';
};

export type PortalWeavePayload = {
  schemaVersion: 2;
  kind: 'portal-weave';
  path: '/registry/portal-weave.json';
  generated: string;
  summary: PortalWeaveSummary;
  related: PortalWeaveRelated;
  surfaces: PortalWeaveLink[];
  artifacts: PortalWeaveLink[];
  /** Shared chrome modules (topbar, footer, sidebar, …). */
  components: PortalWeaveComponent[];
  /** GitHub Pages wiki (external to score.factory-wager.com). */
  wiki: PortalWeaveLink[];
  scripts: PortalWeaveScript[];
};

export const PORTAL_WEAVE_REGISTRY_PATH = '/registry/portal-weave.json' as const;

/**
 * HTML portal surfaces (trailing slash). Unique ids · logical groups · real hrefs only.
 * CLI notes map to portal-cli / package scripts (see /portal/tools/ hub).
 */
export const PORTAL_WEAVE_SURFACES: PortalWeaveLink[] = [
  // ── Registry & packages ──
  { id: 'home', label: 'Home', href: '/', group: 'other' },
  { id: 'registry', label: 'Registry', href: '/portal/', group: 'registry' },
  { id: 'catalog', label: 'Catalog', href: '/portal/catalog/', group: 'registry' },
  {
    id: 'packages',
    label: 'Packages',
    href: '/portal/packages/',
    note: 'graph map · coupling · portal-cli pm graph',
    group: 'registry',
    cli: 'bun run portal-cli pm graph',
  },
  {
    id: 'skills',
    label: 'Skills',
    href: '/portal/skills/',
    note: 'catalog · .skill packages',
    group: 'registry',
  },
  {
    id: 'brands',
    label: 'Brands',
    href: '/portal/brands/',
    note: 'domain-value glossary · constructors · project adoption',
    group: 'registry',
    cli: 'bun tools/brand-keymap.ts',
  },
  {
    id: 'glossary',
    label: 'Glossary',
    href: '/portal/glossary/',
    note: 'market · model · trading · warehouse · pipeline concepts',
    group: 'registry',
    cli: 'bun run glossary:portal',
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    href: '/portal/surfaces/',
    note: 'edge inventory · HostId/SubdomainId · Access domains · schema v2 bake',
    group: 'registry',
    cli: 'bun run surfaces:bake',
  },
  // ── Secrets & env ──
  {
    id: 'vault',
    label: 'Vault',
    href: '/portal/vault/',
    note: 'Proton Pass health bake · inventory gate',
    group: 'secrets',
    cli: 'bun run portal-cli vault health',
  },
  {
    id: 'env',
    label: 'Env',
    href: '/portal/env/',
    note: 'vault-map · inject mapping (no secret values)',
    group: 'secrets',
    cli: 'bun run portal-cli secret map',
  },
  // ── Harness ──
  {
    id: 'health',
    label: 'Health',
    href: '/portal/health/',
    note: 'system health · monorepo score',
    group: 'harness',
    cli: 'bun run monorepo:health:bake',
  },
  {
    id: 'doctor',
    label: 'Doctor',
    href: '/portal/doctor/',
    note: 'unified portal doctor · bunfig · catalog · linker · doctor-state bake',
    group: 'harness',
    cli: 'bun run portal:doctor --verbose',
  },
  {
    id: 'install-hygiene',
    label: 'Install hygiene',
    href: '/portal/install-hygiene/',
    note: 'install cache · npm policy · install:verify · install-hygiene-report bake',
    group: 'harness',
    cli: 'bun run bake:install-hygiene',
  },
  {
    id: 'tools',
    label: 'CLI Tools',
    href: '/portal/tools/',
    note: 'portal-cli surface map · pm · snapshot · secret · vault',
    group: 'harness',
    cli: 'bun run portal-cli dashboard --view=tools',
  },
  {
    id: 'failures',
    label: 'Failures',
    href: '/portal/failures/',
    note: 'test failures bake · junit',
    group: 'harness',
    cli: 'bun run failures:bake',
  },
  // ── Ops ──
  {
    id: 'ops',
    label: 'Ops',
    href: '/portal/ops/',
    note: 'C4/C5 · TOC · loop · compliance · monorepo-health panel',
    group: 'ops',
    cli: 'bun run ops:snapshot',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/portal/dashboard/',
    note: 'executive KPIs · TOC · compliance plane',
    group: 'ops',
  },
  {
    id: 'toc',
    label: 'TOC Ops',
    href: '/portal/toc/',
    note: 'Drum/Buffer/Rope · harness glance · MA/NJ',
    group: 'ops',
    cli: 'bun run ops:seed:toc',
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/monitoring/',
    note: 'routing · env · compliance tile · limitRaises',
    group: 'ops',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    href: '/portal/compliance/',
    note: 'MA/NJ enhancements · shadow · geo · HMAC',
    group: 'ops',
    cli: 'bun run compliance:bake',
  },
  {
    id: 'limits',
    label: 'Limits',
    href: '/portal/limits/',
    note: 'account raises · multi-factor score · drivers',
    group: 'ops',
    cli: 'bun run ops:limits:demo',
  },
  {
    id: 'partner-history',
    label: 'Partner history',
    href: '/portal/partner-history/',
    note: 'per-partner limit history board',
    group: 'ops',
  },
  {
    id: 'prediction-report',
    label: 'Prediction report',
    href: '/registry/prediction/report/',
    note: 'latest prediction report HTML',
    group: 'ops',
    cli: 'bun run portal-cli snapshot last --scope prediction',
  },
  // ── Plane ──
  {
    id: 'dod',
    label: 'DOD queue',
    href: '/portal/dod/',
    note: 'visual proof review',
    group: 'plane',
  },
];

/** Static registry artifacts the portal surfaces depend on. */
export const PORTAL_WEAVE_ARTIFACTS: PortalWeaveLink[] = [
  { label: 'ops-summary', href: '/registry/ops-summary.json' },
  {
    label: 'brand-keymap',
    href: '/registry/brand-keymap.json',
    note: '57-value catalog · tracked project adoption',
  },
  {
    label: 'domain-glossary',
    href: '/registry/domain-glossary.json',
    note: 'canonical semantic concepts · category colors · deep-link projection',
  },
  {
    label: 'surfaces-state',
    href: '/registry/surfaces-state.json',
    note: 'schema v2 · apex/subdomain/backendCode · Access domains · surfaces:bake',
  },
  {
    label: 'telegram-handshake',
    href: '/registry/telegram-handshake.json',
    note: 'package-group readiness · invite gaps',
  },
  {
    label: 'telegram-handshake-catalog',
    href: '/registry/telegram-handshake-catalog.json',
    note: 'lanes · CLI · constants SSOT',
  },
  { label: 'toc-ops', href: '/registry/toc-ops.json', note: 'operate-lite bake' },
  { label: 'toc-ops bake proof', href: '/registry/toc-ops-bake-proof.json' },
  { label: 'monitoring', href: '/registry/monitoring.json' },
  { label: 'skills-catalog', href: '/registry/skills-catalog.json', note: 'Kimi Daimon plane' },
  {
    label: 'harness-skills-catalog',
    href: '/registry/harness-skills-catalog.json',
    note: 'repo .agents/skills · skill-loop-registry',
  },
  {
    label: 'packages-graph-map',
    href: '/registry/packages-graph-map.json',
    note: 'workspace coupling · multi-surface · env owners · claim packages-graph-map-v13',
  },
  {
    label: 'install-hygiene-report',
    href: '/registry/install-hygiene-report.json',
    note: 'bunfig/cache/npm-install hygiene bake · bake:install-hygiene · monitoring.installHygiene · board /portal/install-hygiene/',
    group: 'harness',
    cli: 'bun run bake:install-hygiene',
  },
  {
    label: 'monorepo-health',
    href: '/registry/monorepo-health.json',
    note: 'score 0–100 · claim monorepo-health-score · gate check:monorepo-health · TOC harness glance',
  },
  {
    label: 'doctor-state',
    href: '/registry/doctor-state.json',
    note: 'portal-cli doctor bake · tone green/yellow/red · bunfig/catalog/linker groups · bake:doctor',
    group: 'harness',
    cli: 'bun run bake:doctor',
  },
  {
    label: 'portal-chrome',
    href: '/registry/portal-chrome.json',
    note: 'nav · footer · components SSOT · apply via portal-apply-chrome',
  },
  {
    label: 'env-inventory',
    href: '/registry/env-inventory.json',
    note: 'owners · needsInject vs template defaults · packages plane · env:inventory:bake',
  },
  {
    label: 'vault-health',
    href: '/registry/vault-health.json',
    note: 'live bake · gate: portal-cli vault health · vault:health:bake',
  },
  {
    label: 'vault-map',
    href: '/registry/vault-map.json',
    note: 'display chrome + pass:// paths · no secret values',
  },
  {
    label: 'capability-map-subset',
    href: '/registry/capability-map-subset.json',
    note: 'tools hub capability table · full matrix AGENTS.md',
  },
  { label: 'dod-queue', href: '/registry/dod-queue.json' },
  {
    label: 'compliance-board',
    href: '/registry/compliance-board.json',
    note: 'enhancements + shadow + geo · ops-summary.compliance',
  },
  {
    label: 'compliance-enhancements',
    href: '/registry/compliance-enhancements.json',
    note: 'deepEquals · escapeHTML proof rows',
  },
  {
    label: 'compliance-shadow',
    href: '/registry/compliance-shadow.json',
    note: 'real vs shadow check matrix',
  },
  {
    label: 'limit-raises',
    href: '/registry/limit-raises.json',
    note: 'multi-factor raise context bake · agent API snapshot',
  },
  {
    label: 'verification-index',
    href: '/registry/verification-index.json',
    note: 'verify-all rollup · release track',
  },
  {
    label: 'doc-index',
    href: '/registry/doc-index.json',
    note: 'CANONICAL_REFS · bun docs catalog coverage',
  },
  { label: 'static aggregate', href: '/registry/static.json' },
  { label: 'proof taxonomy', href: '/registry/proof-taxonomy-audit.json' },
  { label: 'portal weave', href: '/registry/portal-weave.json' },
  {
    label: 'content-type matrix',
    href: '/registry/content-type-matrix.json',
    note: 'Pages Functions content-type.ts snapshot',
  },
  {
    label: 'formdata proof',
    href: '/registry/formdata-proof.json',
    note: 'verify:formdata bake',
  },
  {
    label: 'package-info',
    href: '/registry/package-info.json',
    note: 'verify:package-info bake',
  },
  {
    label: 'seat-capital-desk',
    href: '/registry/seat-capital-desk.json',
    note: 'FUND status · outs · checklist',
  },
];

/** Operator scripts linked from ops/monitoring panels. */
export const PORTAL_WEAVE_SCRIPTS: PortalWeaveScript[] = [
  {
    label: 'Domain glossary bake',
    cmd: 'bun run glossary:portal',
    doc: 'docs/portal-foundation.md',
  },
  {
    label: 'Demo snapshot',
    cmd: 'bun run ops:snapshot:demo',
    doc: 'docs/harness/tenants/ops-snapshot.md',
  },
  { label: 'Prediction seed', cmd: 'bun run ops:seed:prediction' },
  {
    label: 'TOC Ops seed',
    cmd: 'bun run ops:seed:toc',
    doc: 'docs/harness/tenants/toc-ops.md',
  },
  {
    label: 'Telegram handshake gap',
    cmd: 'bun run telegram:handshake:invite-gap',
    doc: 'docs/harness/tenants/partner-package-group-handshake.md',
  },
  {
    label: 'Seat capital desk refresh',
    cmd: 'bun run seat:desk:refresh',
    doc: 'docs/harness/tenants/seat-capital-desk.md',
  },
  {
    label: 'Compliance board bake',
    cmd: 'bun run compliance:bake',
    doc: 'docs/harness/tenants/compliance-portal.md',
  },
  {
    label: 'Compliance verify (bake + tests)',
    cmd: 'bun run compliance:verify',
    doc: 'docs/harness/tenants/compliance-portal.md',
  },
  {
    label: 'Ops snapshot (includes compliance)',
    cmd: 'bun run ops:snapshot',
    doc: 'docs/harness/tenants/ops-snapshot.md',
  },
  {
    label: 'Compliance bake (Proton vault)',
    cmd: 'bun run compliance:bake:vault',
    doc: 'docs/harness/tenants/proton-integration.md',
  },
  {
    label: 'Vault health gate (snapshots)',
    cmd: 'bun run vault:health',
    doc: 'docs/harness/tenants/proton-integration.md',
  },
  {
    label: 'Portal doctor (all groups)',
    cmd: 'bun run portal:doctor --verbose',
    doc: 'docs/harness/tenants/portal-doctor.md',
    group: 'harness',
  },
  {
    label: 'Portal doctor (bunfig only)',
    cmd: 'bun run portal:doctor --group bunfig --verbose',
    doc: 'docs/UNIFIED.md',
    group: 'harness',
  },
  {
    label: 'Bake doctor-state',
    cmd: 'bun run bake:doctor',
    doc: 'docs/harness/tenants/portal-doctor.md',
    group: 'harness',
  },
  {
    label: 'Vault health live bake',
    cmd: 'bun run vault:health:bake',
    doc: 'docs/harness/tenants/proton-integration.md',
  },
  {
    label: 'Vault map resolve (list)',
    cmd: 'bun run vault:resolve',
    doc: 'docs/harness/tenants/proton-integration.md',
  },
  {
    label: 'Limit raises multi-factor demo',
    cmd: 'bun run ops:limits:demo',
    doc: 'docs/harness/tenants/partner-limits.md',
  },
  {
    label: 'Capture raise context',
    cmd: 'bun run ops:limits:capture',
    doc: 'docs/harness/tenants/partner-limits.md',
  },
  {
    label: 'Limit raise predict',
    cmd: 'bun run ops:limits:predict',
    doc: 'docs/harness/tenants/partner-limits.md',
  },
  {
    label: 'Limit raises multi check',
    cmd: 'bun run ops:limits:check:multi',
    doc: 'docs/harness/tenants/partner-limits.md',
  },
  {
    label: 'Limit raise analyze',
    cmd: 'bun run ops:limits:analyze',
    doc: 'docs/harness/tenants/partner-limits.md',
  },
  {
    label: 'Limit pattern seed + bake',
    cmd: 'bun run ops:limits:seed-patterns',
    doc: 'docs/harness/tenants/partner-limits.md',
  },
  {
    label: 'Limit raise alerts',
    cmd: 'bun run ops:limits:alerts',
    doc: 'docs/harness/tenants/partner-limits.md',
  },
  {
    label: 'Reference discovery',
    cmd: 'bun run reference:discover:check',
    doc: 'docs/harness/tenants/reference-discovery.md',
  },
  {
    label: 'Public plane discovery',
    cmd: 'bun run public:discover:check',
    doc: 'docs/harness/tenants/public-plane.md',
  },
  {
    label: 'Public audit bundle',
    cmd: 'bun run public:audit:verify',
    doc: 'docs/harness/tenants/public-plane.md',
  },
  {
    label: 'Discovery compose',
    cmd: 'bun run discover:compose:check',
    doc: 'docs/harness/tenants/reference-discovery.md',
  },
  { label: 'Sync R2 registry index', cmd: 'bun run registry:sync-index-r2' },
  { label: 'Pages edge verify', cmd: 'bun run verify:pages-edge --taxonomy' },
  {
    label: 'Doc map check',
    cmd: 'bun run docs:map:check',
    doc: 'docs/README.md',
  },
  {
    label: 'Doc index bake',
    cmd: 'bun run build:doc-index',
    doc: 'lib/docs/doc-index.ts',
  },
];

function withLinkIds(links: PortalWeaveLink[], prefix: string): PortalWeaveLink[] {
  return links.map((l, i) => ({
    ...l,
    id: l.id ?? `${prefix}-${i}-${slugFromLabel(l.label)}`,
  }));
}

function slugFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function buildPortalWeavePayload(generated?: string): PortalWeavePayload {
  const surfaces = withLinkIds(PORTAL_WEAVE_SURFACES, 'surface');
  const artifacts = withLinkIds(PORTAL_WEAVE_ARTIFACTS, 'artifact');
  const wiki = withLinkIds(
    PORTAL_WEAVE_WIKI.map(w => ({ ...w, group: 'wiki' as const })),
    'wiki'
  );
  const scripts: PortalWeaveScript[] = [
    ...PORTAL_WEAVE_SCRIPTS,
    {
      id: 'portal-chrome-bake-apply',
      label: 'Portal chrome bake + apply',
      cmd: 'bun run portal:chrome:bake && bun tools/portal-apply-chrome.ts',
      doc: 'docs/portal-foundation.md',
      group: 'harness',
    },
    {
      id: 'monorepo-health-bake',
      label: 'Monorepo health bake',
      cmd: 'bun run monorepo:health:bake',
      doc: 'docs/harness/tenants/monorepo-health.md',
      group: 'harness',
    },
  ].map((s, i) => ({
    ...s,
    id: s.id ?? `script-${i}-${slugFromLabel(s.label)}`,
  }));

  const components = PORTAL_CHROME_COMPONENTS.map(c => ({
    id: c.id,
    path: c.path,
    role: c.role,
    kind: c.kind,
  }));

  return {
    schemaVersion: 2,
    kind: 'portal-weave',
    path: PORTAL_WEAVE_REGISTRY_PATH,
    generated: generated ?? new Date().toISOString(),
    summary: {
      surfaces: surfaces.length,
      artifacts: artifacts.length,
      components: components.length,
      wiki: wiki.length,
      scripts: scripts.length,
    },
    related: {
      chrome: '/registry/portal-chrome.json',
      monorepoHealth: '/registry/monorepo-health.json',
      doctorState: '/registry/doctor-state.json',
      packagesGraph: '/registry/packages-graph-map.json',
      opsSummary: '/registry/ops-summary.json',
      tocOps: '/registry/toc-ops.json',
    },
    surfaces,
    artifacts,
    components,
    wiki,
    scripts,
  };
}
