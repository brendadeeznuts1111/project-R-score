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

export type PortalWeaveLink = {
  label: string;
  href: string;
  note?: string;
};

export type PortalWeaveScript = {
  label: string;
  cmd: string;
  doc?: string;
};

export type PortalWeavePayload = {
  generated: string;
  surfaces: PortalWeaveLink[];
  artifacts: PortalWeaveLink[];
  /** GitHub Pages wiki (external to score.factory-wager.com). */
  wiki: PortalWeaveLink[];
  scripts: PortalWeaveScript[];
};

/** HTML portal surfaces (trailing slash). */
export const PORTAL_WEAVE_SURFACES: PortalWeaveLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Registry', href: '/portal/' },
  {
    label: 'Ops',
    href: '/portal/ops/',
    note: 'C4/C5 · TOC · loop · compliance panel',
  },
  { label: 'TOC Ops', href: '/portal/toc/', note: 'Drum/Buffer/Rope · MA/NJ board glance' },
  {
    label: 'Monitoring',
    href: '/monitoring/',
    note: 'routing · env · compliance tile · limitRaises / limits board',
  },
  { label: 'DOD queue', href: '/portal/dod/', note: 'visual proof review' },
  {
    label: 'Compliance',
    href: '/portal/compliance/',
    note: 'MA/NJ enhancements · shadow · geo · HMAC',
  },
  {
    label: 'Limits',
    href: '/portal/limits/',
    note: 'account raises · multi-factor score · drivers',
  },
  {
    label: 'Partner history',
    href: '/portal/partner-history/',
    note: 'per-partner limit history board',
  },
  { label: 'Skills', href: '/portal/skills/', note: 'catalog · .skill packages' },
  {
    label: 'Packages',
    href: '/portal/packages/',
    note: 'metafile map · coupling · archive probes',
  },
  {
    label: 'Dashboard',
    href: '/portal/dashboard/',
    note: 'executive KPIs · TOC · compliance plane',
  },
  { label: 'Catalog', href: '/portal/catalog/' },
  { label: 'Health', href: '/portal/health/' },
  { label: 'Env', href: '/portal/env/' },
  { label: 'Prediction report', href: '/registry/prediction/report/' },
];

/** Static registry artifacts the portal surfaces depend on. */
export const PORTAL_WEAVE_ARTIFACTS: PortalWeaveLink[] = [
  { label: 'ops-summary', href: '/registry/ops-summary.json' },
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
    note: 'workspace coupling · env owners · template defaults · claim packages-graph-map-v12',
  },
  {
    label: 'monorepo-health',
    href: '/registry/monorepo-health.json',
    note: 'score 0–100 · claim monorepo-health-score · gate check:monorepo-health · TOC harness glance',
  },
  {
    label: 'env-inventory',
    href: '/registry/env-inventory.json',
    note: 'owners · needsInject vs template defaults · packages plane · env:inventory:bake',
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

export function buildPortalWeavePayload(generated?: string): PortalWeavePayload {
  return {
    generated: generated ?? new Date().toISOString(),
    surfaces: PORTAL_WEAVE_SURFACES,
    artifacts: PORTAL_WEAVE_ARTIFACTS,
    wiki: PORTAL_WEAVE_WIKI,
    scripts: PORTAL_WEAVE_SCRIPTS,
  };
}
