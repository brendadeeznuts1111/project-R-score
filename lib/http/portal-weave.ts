/**
 * Portal weave — cross-surface links and operator runbooks baked into registry.
 *
 * @see public/registry/portal-weave.json
 * @see docs/portal-foundation.md
 */

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
  scripts: PortalWeaveScript[];
};

/** HTML portal surfaces (trailing slash). */
export const PORTAL_WEAVE_SURFACES: PortalWeaveLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Registry', href: '/portal/' },
  { label: 'Ops', href: '/portal/ops/', note: 'C4 experiments · C5 prediction' },
  { label: 'TOC Ops', href: '/portal/toc/', note: 'Drum/Buffer/Rope · operate-lite' },
  { label: 'Monitoring', href: '/monitoring/', note: 'routing · env · proof tiles' },
  { label: 'DOD queue', href: '/portal/dod/', note: 'visual proof review' },
  { label: 'Skills', href: '/portal/skills/', note: 'catalog · .skill packages' },
  { label: 'Dashboard', href: '/portal/dashboard/', note: 'executive proof summary' },
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
  { label: 'toc-ops', href: '/registry/toc-ops.json', note: 'operate-lite bake' },
  { label: 'toc-ops bake proof', href: '/registry/toc-ops-bake-proof.json' },
  { label: 'monitoring', href: '/registry/monitoring.json' },
  { label: 'skills-catalog', href: '/registry/skills-catalog.json', note: 'Kimi Daimon plane' },
  {
    label: 'harness-skills-catalog',
    href: '/registry/harness-skills-catalog.json',
    note: 'repo .agents/skills · skill-loop-registry',
  },
  { label: 'dod-queue', href: '/registry/dod-queue.json' },
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
];

export function buildPortalWeavePayload(generated?: string): PortalWeavePayload {
  return {
    generated: generated ?? new Date().toISOString(),
    surfaces: PORTAL_WEAVE_SURFACES,
    artifacts: PORTAL_WEAVE_ARTIFACTS,
    scripts: PORTAL_WEAVE_SCRIPTS,
  };
}
