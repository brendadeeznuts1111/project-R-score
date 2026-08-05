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
import {
  PUBLISH_PM_PROOF_CONCEPT_ID,
  PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID,
  publishPlaneColorForConcept,
} from '../verification/publish-plane-color.ts';
import {
  buildPublishPlaneWeaveBlock,
  type PublishPlaneWeaveBlock,
} from '../verification/publish-plane-weave.ts';

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
  /** Artifact ids this surface owns (publish soft-pass → packages). */
  relatedArtifactIds?: string[]; // brand-ok — weave artifact slugs
};

/**
 * Why a registry artifact exists relative to portal surfaces.
 * - `ui` — owned by a surface / related link (expected to be reachable from weave)
 * - `shared` — cross-board state; unlinked by design
 * - `script` — bake/verify/CLI catalogs; not a standalone page
 * - `audit` — compliance / proof rows consumed by scripts
 */
export type PortalWeaveArtifactPurpose = 'shared' | 'script' | 'audit' | 'ui';

/** Non-`ui` purposes are intentional orphans for `verify:weave`. */
export const INTENTIONAL_ORPHAN_PURPOSES: ReadonlySet<PortalWeaveArtifactPurpose> = new Set([
  'shared',
  'script',
  'audit',
]);

export type PortalWeaveArtifact = PortalWeaveLink & {
  purpose?: PortalWeaveArtifactPurpose;
  /** Stable registry slug — equals proof `artifactId` when publish-plane. */
  artifactId?: string; // brand-ok — weave/registry artifact slug
  /** Human title — equals proof `artifactName` when publish-plane. */
  artifactName?: string;
  /** Partner-ops color kernel concept (`publish.*` / `ops.view.*` / …). */
  conceptId?: string; // brand-ok — glossary/color concept key
  /** Closed palette key from PARTNER_OPS_COLORS. */
  colorKey?: string; // brand-ok — PartnerOpsColorKey as wire string
};

export function isIntentionalOrphanPurpose(
  purpose: PortalWeaveArtifactPurpose | string | undefined
): boolean {
  return purpose === 'shared' || purpose === 'script' || purpose === 'audit';
}

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
  /** Publish-plane soft-pass — Tennis HQ @tennis-hq/ssot offline pack. */
  ssotFlowSoft: '/registry/ssot-flow-soft.json';
  /** Publish-plane soft-pass — @factorywager/registry-client probes. */
  pmProof: '/registry/pm-proof.json';
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
  /** Publish soft-pass plane — packages board + color kernel `publish.*`. */
  publishPlane: PublishPlaneWeaveBlock;
  surfaces: PortalWeaveLink[];
  artifacts: PortalWeaveArtifact[];
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
    note: 'graph map · publish soft-pass (ssot-flow-soft · pm-proof) · color kernel publish.* · weave.publishPlane',
    group: 'registry',
    cli: 'bun run ssot:flow:soft && bun run verify:pm:save',
    relatedArtifactIds: ['ssot-flow-soft', 'pm-proof'],
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
    note: 'Bun×brand relationships · domain-value glossary · constructors · project adoption',
    group: 'registry',
    cli: 'bun tools/brand-keymap.ts && bun run bun:brand-map',
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
    id: 'partners',
    label: 'Partners',
    href: '/portal/partners/',
    note: 'package groups · telegram forums · accounting · deposits',
    group: 'ops',
    cli: 'bun run telegram:handshake:catalog',
  },
  {
    id: 'account',
    label: 'Account dossier',
    href: '/portal/account/',
    note: 'single-account identity · tree · telemetry · betlog',
    group: 'ops',
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
  {
    id: 'tennis',
    label: 'Tennis HQ',
    href: '/portal/tennis/',
    note: 'agent-auth KPI · FACTORY_WAGER_TOKEN status · @tennis-hq/ssot R2',
    group: 'ops',
    cli: 'bun run tennis:agent-auth:bake',
  },
  {
    id: 'bookmakers',
    label: 'Bookmakers',
    href: '/portal/bookmakers/',
    note: '@factorywager/bookmakers artifact · canonical bookmaker registry · weave runbook',
    group: 'ops',
    cli: 'bun run bookmakers:bake',
  },
  {
    id: 'factory',
    label: 'Factory',
    href: '/portal/factory/',
    note: 'Factory Telegram ops · package-group wire',
    group: 'ops',
    cli: 'bun run telegram:verify',
  },
  {
    id: 'identity',
    label: 'Identity',
    href: '/portal/identity/',
    note: 'auth board · lockout · anomaly · geo · JIT',
    group: 'ops',
  },
  {
    id: 'limits-lab',
    label: 'Limits lab',
    href: '/portal/limits-lab/',
    note: 'forecast / predict lab · multi-factor backtest',
    group: 'ops',
    cli: 'bun run ops:limits:predict',
  },
  {
    id: 'concepts',
    label: 'Concepts',
    href: '/portal/concepts/',
    note: 'semantic vocabulary · domain summary · usage + provenance',
    group: 'registry',
    cli: 'bun run concepts:bake',
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
export const PORTAL_WEAVE_ARTIFACTS: PortalWeaveArtifact[] = [
  // ── ui (also listed in related) ──
  { label: 'ops-summary', href: '/registry/ops-summary.json', purpose: 'ui' },
  {
    id: 'partner-profiles', // brand-ok — weave artifact slug, not a domain *Id
    label: 'partner-profiles',
    href: '/registry/partner-profiles.json',
    note: 'unified Partner Profile bake · CODE-keyed · docs/design/unified-partner-profile.md',
    purpose: 'ui',
    cli: 'bun run partner-profile:bake',
  },
  {
    id: 'bookmakers-registry', // brand-ok — weave artifact slug, not a domain *Id
    label: 'bookmakers',
    href: '/registry/bookmakers.json',
    note: '@factorywager/bookmakers artifact mirror · canonical bookmaker registry · weave runbook',
    purpose: 'ui',
    cli: 'bun run bookmakers:bake',
  },
  {
    label: 'toc-ops',
    href: '/registry/toc-ops.json',
    note: 'operate-lite bake',
    purpose: 'ui',
  },
  {
    label: 'packages-graph-map',
    href: '/registry/packages-graph-map.json',
    note: 'workspace coupling · multi-surface · env owners · claim packages-graph-map-v13',
    purpose: 'ui',
  },
  {
    id: 'ssot-flow-soft', // brand-ok — weave artifact slug, not a domain *Id
    artifactId: 'ssot-flow-soft',
    artifactName: 'SSOT soft-pass',
    label: 'SSOT soft-pass',
    href: '/registry/ssot-flow-soft.json',
    conceptId: PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID,
    colorKey: publishPlaneColorForConcept(PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID).colorKey,
    note: 'artifactId=ssot-flow-soft · conceptId=publish.ssot_flow_soft · colorKey=tennis · offline pack',
    group: 'registry',
    cli: 'bun run ssot:flow:soft',
    // ui — owned by /portal/packages/ + related.ssotFlowSoft (not Soft accounting)
    purpose: 'ui',
  },
  {
    id: 'pm-proof', // brand-ok — weave artifact slug, not a domain *Id
    artifactId: 'pm-proof',
    artifactName: 'PM publish-plane proof',
    label: 'PM publish-plane proof',
    href: '/registry/pm-proof.json',
    conceptId: PUBLISH_PM_PROOF_CONCEPT_ID,
    colorKey: publishPlaneColorForConcept(PUBLISH_PM_PROOF_CONCEPT_ID).colorKey,
    note: 'artifactId=pm-proof · conceptId=publish.pm_proof · colorKey=kalshi · soft-pass probes',
    group: 'registry',
    cli: 'bun run verify:pm:save',
    // ui — owned by /portal/packages/ + related.pmProof (not Soft accounting)
    purpose: 'ui',
  },
  {
    label: 'monorepo-health',
    href: '/registry/monorepo-health.json',
    note: 'score 0–100 · claim monorepo-health-score · gate check:monorepo-health · TOC harness glance',
    purpose: 'ui',
  },
  {
    label: 'doctor-state',
    href: '/registry/doctor-state.json',
    note: 'portal-cli doctor bake · tone green/yellow/red · bunfig/catalog/linker groups · bake:doctor',
    group: 'harness',
    cli: 'bun run bake:doctor',
    purpose: 'ui',
  },
  {
    label: 'portal-chrome',
    href: '/registry/portal-chrome.json',
    note: 'nav · footer · components SSOT · apply via portal-apply-chrome',
    purpose: 'ui',
  },
  // ── shared / cross-cutting state ──
  {
    label: 'bun-brand-map',
    href: '/registry/bun-brand-map.json',
    note: 'Bun capability × brand cross-map · evidence + undeclared ratchet',
    purpose: 'shared',
    cli: 'bun run bun:brand-map',
  },
  {
    label: 'brand-keymap',
    href: '/registry/brand-keymap.json',
    note: '67-value catalog · tracked project adoption',
    purpose: 'shared',
  },
  {
    label: 'domain-glossary',
    href: '/registry/domain-glossary.json',
    note: 'schema v3 · domain concepts + sections[] hash/domId/conceptId · deep-link projection',
    purpose: 'shared',
  },
  {
    label: 'surfaces-state',
    href: '/registry/surfaces-state.json',
    note: 'schema v2 · apex/subdomain/backendCode · Access domains · surfaces:bake',
    purpose: 'shared',
  },
  {
    label: 'verification-index',
    href: '/registry/verification-index.json',
    note: 'verify-all rollup · release track',
    purpose: 'shared',
  },
  {
    id: 'bun-runtime-nits-proof',
    label: 'bun-runtime-nits-proof',
    href: '/registry/bun-runtime-nits-proof.json',
    note: 'Phase 1 inspect · streams · url · file-io truth probes (18) · verify:bun-runtime-nits:save',
    group: 'harness',
    cli: 'bun run verify:bun-runtime-nits:save',
    purpose: 'audit',
  },
  {
    label: 'doc-index',
    href: '/registry/doc-index.json',
    note: 'CANONICAL_REFS · bun docs catalog coverage',
    purpose: 'shared',
  },
  { label: 'static aggregate', href: '/registry/static.json', purpose: 'shared' },
  { label: 'portal weave', href: '/registry/portal-weave.json', purpose: 'shared' },
  {
    label: 'content-type matrix',
    href: '/registry/content-type-matrix.json',
    note: 'Pages Functions content-type.ts snapshot',
    purpose: 'shared',
  },
  // ── infrastructure & vault (board-backed state, not standalone surfaces) ──
  {
    label: 'install-hygiene-report',
    href: '/registry/install-hygiene-report.json',
    note: 'bunfig/cache/npm-install hygiene bake · bake:install-hygiene · monitoring.installHygiene · board /portal/install-hygiene/',
    group: 'harness',
    cli: 'bun run bake:install-hygiene',
    purpose: 'shared',
  },
  {
    label: 'env-inventory',
    href: '/registry/env-inventory.json',
    note: 'owners · needsInject vs template defaults · packages plane · env:inventory:bake',
    purpose: 'shared',
  },
  {
    label: 'vault-health',
    href: '/registry/vault-health.json',
    note: 'live bake · gate: portal-cli vault health · vault:health:bake',
    purpose: 'shared',
  },
  {
    label: 'vault-map',
    href: '/registry/vault-map.json',
    note: 'display chrome + pass:// paths · no secret values',
    purpose: 'shared',
  },
  {
    label: 'capability-map-subset',
    href: '/registry/capability-map-subset.json',
    note: 'tools hub capability table · full matrix AGENTS.md',
    purpose: 'shared',
  },
  // ── telegram & partners (ops panel backing data) ──
  {
    label: 'telegram-handshake',
    href: '/registry/telegram-handshake.json',
    note: 'package-group readiness · invite gaps',
    purpose: 'shared',
  },
  {
    label: 'telegram-handshake-catalog',
    href: '/registry/telegram-handshake-catalog.json',
    note: 'lanes · CLI · constants SSOT',
    purpose: 'shared',
  },
  {
    label: 'seat-capital-desk',
    href: '/registry/seat-capital-desk.json',
    note: 'FUND status · outs · checklist',
    purpose: 'shared',
  },
  {
    label: 'partners-ops',
    href: '/registry/partners-ops.json',
    note: 'v2 taxonomy · phases · book types · rails · events',
    purpose: 'shared',
  },
  // ── compliance & audit ──
  { label: 'dod-queue', href: '/registry/dod-queue.json', purpose: 'audit' },
  {
    label: 'compliance-board',
    href: '/registry/compliance-board.json',
    note: 'enhancements + shadow + geo · ops-summary.compliance',
    purpose: 'audit',
  },
  {
    label: 'compliance-enhancements',
    href: '/registry/compliance-enhancements.json',
    note: 'deepEquals · escapeHTML proof rows',
    purpose: 'audit',
  },
  {
    label: 'compliance-shadow',
    href: '/registry/compliance-shadow.json',
    note: 'real vs shadow check matrix',
    purpose: 'audit',
  },
  {
    label: 'proof taxonomy',
    href: '/registry/proof-taxonomy-audit.json',
    purpose: 'audit',
  },
  // ── skills / registry ops / script-only ──
  {
    label: 'skills-catalog',
    href: '/registry/skills-catalog.json',
    note: 'Kimi Daimon plane',
    purpose: 'script',
  },
  {
    label: 'harness-skills-catalog',
    href: '/registry/harness-skills-catalog.json',
    note: 'repo .agents/skills · skill-loop-registry',
    purpose: 'script',
  },
  {
    label: 'limit-raises',
    href: '/registry/limit-raises.json',
    note: 'multi-factor raise context bake · agent API snapshot',
    purpose: 'script',
  },
  {
    label: 'package-info',
    href: '/registry/package-info.json',
    note: 'verify:package-info bake',
    purpose: 'script',
  },
  {
    label: 'toc-ops bake proof',
    href: '/registry/toc-ops-bake-proof.json',
    purpose: 'script',
  },
  { label: 'monitoring', href: '/registry/monitoring.json', purpose: 'script' },
  {
    label: 'formdata proof',
    href: '/registry/formdata-proof.json',
    note: 'verify:formdata bake',
    purpose: 'script',
  },
  {
    label: 'tennis agent-auth',
    href: '/registry/tennis/agent-auth.json',
    note: 'cloud agent token status (no secret) · FACTORY_WAGER_TOKEN configured mark',
    group: 'ops',
    cli: 'bun run tennis:agent-auth:bake',
    purpose: 'script',
  },
];

/**
 * Operator scripts linked from ops/monitoring panels.
 * Assign `group` so the ops board can cluster Registry/R2 · Ops · Harness · Secrets.
 */
export const PORTAL_WEAVE_SCRIPTS: PortalWeaveScript[] = [
  // ── Registry / R2 ──
  {
    id: 'ssot-flow-soft',
    label: 'SSOT soft-pass (offline pack)',
    cmd: 'bun run ssot:flow:soft',
    doc: 'docs/harness/tenants/tennis-hq-registry.md',
    group: 'registry',
  },
  {
    id: 'verify-pm-save',
    label: 'PM publish-plane soft-pass save',
    cmd: 'bun run verify:pm:save',
    doc: 'docs/harness/tenants/tennis-hq-registry.md',
    group: 'registry',
  },
  {
    id: 'verify-weave',
    label: 'Pages edge weave verify',
    cmd: 'bun run verify:weave -- --summary',
    doc: 'docs/harness/tenants/cloudflare-pages.md',
    group: 'registry',
  },
  {
    label: 'Tennis HQ SSOT → R2',
    cmd: 'bun run --cwd king-zippy-umbra-acre ssot:publish:r2',
    doc: 'docs/harness/tenants/tennis-hq-registry.md',
    group: 'registry',
  },
  {
    label: 'Factory R2 health',
    cmd: 'bun run factory:health',
    doc: 'docs/guides/REGISTRY_PRODUCTION_READINESS.md',
    group: 'registry',
  },
  {
    label: 'Factory R2 list packages',
    cmd: 'bun run factory:list',
    doc: 'docs/registry-client.md',
    group: 'registry',
  },
  {
    label: 'Sync R2 registry index',
    cmd: 'bun run registry:sync-index-r2',
    group: 'registry',
  },
  {
    label: 'Pages edge verify',
    cmd: 'bun run verify:pages-edge --taxonomy',
    group: 'registry',
  },
  {
    label: 'Domain glossary bake',
    cmd: 'bun run glossary:portal',
    doc: 'docs/portal-foundation.md',
    group: 'registry',
  },
  // ── Ops ──
  {
    label: 'Ops snapshot (includes compliance)',
    cmd: 'bun run ops:snapshot',
    doc: 'docs/harness/tenants/ops-snapshot.md',
    group: 'ops',
  },
  {
    label: 'Demo snapshot',
    cmd: 'bun run ops:snapshot:demo',
    doc: 'docs/harness/tenants/ops-snapshot.md',
    group: 'ops',
  },
  {
    label: 'Prediction seed',
    cmd: 'bun run ops:seed:prediction',
    group: 'ops',
  },
  {
    label: 'TOC Ops seed',
    cmd: 'bun run ops:seed:toc',
    doc: 'docs/harness/tenants/toc-ops.md',
    group: 'ops',
  },
  {
    label: 'Telegram handshake gap',
    cmd: 'bun run telegram:handshake:invite-gap',
    doc: 'docs/harness/tenants/partner-package-group-handshake.md',
    group: 'ops',
  },
  {
    label: 'Seat capital desk refresh',
    cmd: 'bun run seat:desk:refresh',
    doc: 'docs/harness/tenants/seat-capital-desk.md',
    group: 'ops',
  },
  {
    label: 'Partners-ops registry bake',
    cmd: 'bun run partners:build',
    doc: 'docs/harness/tenants/seat-capital-desk.md',
    group: 'ops',
  },
  {
    label: 'Compliance board bake',
    cmd: 'bun run compliance:bake',
    doc: 'docs/harness/tenants/compliance-portal.md',
    group: 'ops',
  },
  {
    label: 'Compliance verify (bake + tests)',
    cmd: 'bun run compliance:verify',
    doc: 'docs/harness/tenants/compliance-portal.md',
    group: 'ops',
  },
  {
    label: 'Limit raises multi-factor demo',
    cmd: 'bun run ops:limits:demo',
    doc: 'docs/harness/tenants/partner-limits.md',
    group: 'ops',
  },
  {
    label: 'Capture raise context',
    cmd: 'bun run ops:limits:capture',
    doc: 'docs/harness/tenants/partner-limits.md',
    group: 'ops',
  },
  {
    label: 'Limit raise predict',
    cmd: 'bun run ops:limits:predict',
    doc: 'docs/harness/tenants/partner-limits.md',
    group: 'ops',
  },
  {
    label: 'Limit raises multi check',
    cmd: 'bun run ops:limits:check:multi',
    doc: 'docs/harness/tenants/partner-limits.md',
    group: 'ops',
  },
  {
    label: 'Limit raise analyze',
    cmd: 'bun run ops:limits:analyze',
    doc: 'docs/harness/tenants/partner-limits.md',
    group: 'ops',
  },
  {
    label: 'Limit pattern seed + bake',
    cmd: 'bun run ops:limits:seed-patterns',
    doc: 'docs/harness/tenants/partner-limits.md',
    group: 'ops',
  },
  {
    label: 'Limit raise alerts',
    cmd: 'bun run ops:limits:alerts',
    doc: 'docs/harness/tenants/partner-limits.md',
    group: 'ops',
  },
  {
    label: 'Portal dev server (hot)',
    cmd: 'bun run dev:portal',
    doc: 'docs/portal-foundation.md',
    group: 'ops',
  },
  // ── Harness ──
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
    label: 'Reference discovery',
    cmd: 'bun run reference:discover:check',
    doc: 'docs/harness/tenants/reference-discovery.md',
    group: 'harness',
  },
  {
    label: 'Public plane discovery',
    cmd: 'bun run public:discover:check',
    doc: 'docs/harness/tenants/public-plane.md',
    group: 'harness',
  },
  {
    label: 'Public audit bundle',
    cmd: 'bun run public:audit:verify',
    doc: 'docs/harness/tenants/public-plane.md',
    group: 'harness',
  },
  {
    label: 'Discovery compose',
    cmd: 'bun run discover:compose:check',
    doc: 'docs/harness/tenants/reference-discovery.md',
    group: 'harness',
  },
  {
    label: 'Doc map check',
    cmd: 'bun run docs:map:check',
    doc: 'docs/README.md',
    group: 'harness',
  },
  {
    label: 'Doc index bake',
    cmd: 'bun run build:doc-index',
    doc: 'lib/docs/doc-index.ts',
    group: 'harness',
  },
  {
    label: 'Lane status (primary/worktrees/bakes)',
    cmd: 'bun run lane:status',
    doc: 'AGENTS.md',
    group: 'harness',
  },
  {
    label: 'Native Markdown docs check',
    cmd: 'bun run docs:native:check',
    doc: 'docs/BUN_NATIVE_CAPABILITIES.md',
    group: 'harness',
  },
  {
    id: 'verify-bun-runtime-nits',
    label: 'Bun runtime nits (Phase 1)',
    cmd: 'bun run verify:bun-runtime-nits',
    doc: 'docs/bun-runtime-nits.md',
    group: 'harness',
  },
  {
    id: 'verify-bun-runtime-nits-save',
    label: 'Bun runtime nits save proof',
    cmd: 'bun run verify:bun-runtime-nits:save',
    doc: 'docs/bun-runtime-nits.md',
    group: 'harness',
  },
  // ── Secrets ──
  {
    label: 'Compliance bake (Proton vault)',
    cmd: 'bun run compliance:bake:vault',
    doc: 'docs/harness/tenants/proton-integration.md',
    group: 'secrets',
  },
  {
    label: 'Vault health gate (snapshots)',
    cmd: 'bun run vault:health',
    doc: 'docs/harness/tenants/proton-integration.md',
    group: 'secrets',
  },
  {
    label: 'Vault health live bake',
    cmd: 'bun run vault:health:bake',
    doc: 'docs/harness/tenants/proton-integration.md',
    group: 'secrets',
  },
  {
    label: 'Vault map resolve (list)',
    cmd: 'bun run vault:resolve',
    doc: 'docs/harness/tenants/proton-integration.md',
    group: 'secrets',
  },
];

function withLinkIds<T extends PortalWeaveLink>(links: T[], prefix: string): T[] {
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

  const publishPlane = buildPublishPlaneWeaveBlock({ artifacts, scripts });

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
      ssotFlowSoft: '/registry/ssot-flow-soft.json',
      pmProof: '/registry/pm-proof.json',
      opsSummary: '/registry/ops-summary.json',
      tocOps: '/registry/toc-ops.json',
    },
    publishPlane,
    surfaces,
    artifacts,
    components,
    wiki,
    scripts,
  };
}
