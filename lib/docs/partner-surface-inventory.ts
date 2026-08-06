/**
 * Partner surface inventory — joins taxonomy machines, portal hrefs, brands,
 * packages, wire traps, and docs. Does not rename tokens; maps what "partner" is.
 *
 * @see docs/design/partner-surface-inventory.md
 * @see docs/design/partner-type-reference-map.md
 * @see docs/harness/tenants/partner-domain-map.md
 * @see lib/docs/workspace-taxonomy.ts
 */
import {
  PORTAL_DOMAIN_LANE_META,
  PORTAL_OVERFLOW_NAV,
  PORTAL_PRIORITY_NAV,
  type PortalChromeNavItem,
} from '../portal/chrome-catalog.ts';
import { CONCEPT_DOMAINS, DOMAIN_METADATA } from '../portal/concept-domains.ts';
import { SESSION_LANES, WORKSPACE_TAXONOMY_CORRELATIONS } from './workspace-taxonomy.ts';

export const PARTNER_SURFACE_ASPECTS = [
  'taxonomy',
  'chrome-nav',
  'portal-board',
  'registry',
  'brand',
  'package',
  'lib-module',
  'wire-field',
  'doc-tenant',
  'cross-repo',
] as const;

export type PartnerSurfaceAspect = (typeof PARTNER_SURFACE_ASPECTS)[number];

export const PARTNER_SURFACE_MACHINES = [
  'sessionLane',
  'chromeDomain',
  'conceptDomain',
  'commitScope',
  'identity',
  'artifact',
  'nav',
] as const;

export type PartnerSurfaceMachine = (typeof PARTNER_SURFACE_MACHINES)[number];

export type PartnerSurfaceRepo = 'project-R-score' | 'Kalshi-bot' | 'toc-ops' | 'sports-terminal';

export type PartnerSurfaceRow = {
  /** Inventory row key (not a domain entity id). */
  readonly id: string; // brand-ok — opaque inventory row key
  readonly aspect: PartnerSurfaceAspect;
  readonly machine?: PartnerSurfaceMachine;
  /** English / token as agents see it */
  readonly token: string;
  readonly typeOrExport?: string;
  readonly repo: PartnerSurfaceRepo;
  readonly path: string;
  readonly href?: string;
  readonly properties: readonly string[];
  readonly owner: string;
  readonly notes?: string;
};

function row(partial: PartnerSurfaceRow): PartnerSurfaceRow {
  // Omit undefined optionals so JSON bake/check deep-equals is stable.
  const out: PartnerSurfaceRow = {
    id: partial.id,
    aspect: partial.aspect,
    token: partial.token,
    repo: partial.repo,
    path: partial.path,
    properties: partial.properties,
    owner: partial.owner,
  };
  if (partial.machine !== undefined)
    (out as { machine?: PartnerSurfaceMachine }).machine = partial.machine;
  if (partial.typeOrExport !== undefined)
    (out as { typeOrExport?: string }).typeOrExport = partial.typeOrExport;
  if (partial.href !== undefined) (out as { href?: string }).href = partial.href;
  if (partial.notes !== undefined) (out as { notes?: string }).notes = partial.notes;
  return out;
}

/** Static rows (chrome-nav derived live — see partnerChromeNavSurfaceRows). */
export const PARTNER_SURFACE_STATIC_ROWS: readonly PartnerSurfaceRow[] = [
  // ── Taxonomy machines ──
  row({
    id: 'taxonomy.sessionLane.partner',
    aspect: 'taxonomy',
    machine: 'sessionLane',
    token: 'partner',
    typeOrExport: 'SessionLaneId',
    repo: 'project-R-score',
    path: 'lib/docs/workspace-taxonomy.ts',
    properties: ['SESSION_LANES', 'archive <lane>', 'display: partner'],
    owner: 'organization / naming-grammar',
    notes: 'Filename token in <t>-<lane>-<slug>; not chrome Domain or ConceptDomain',
  }),
  row({
    id: 'taxonomy.chromeDomain.partner',
    aspect: 'taxonomy',
    machine: 'chromeDomain',
    token: 'partner',
    typeOrExport: 'PortalChromeDomainLane',
    repo: 'project-R-score',
    path: 'lib/portal/chrome-catalog.ts',
    href: undefined,
    properties: ['PORTAL_DOMAIN_LANE_META', 'label: Partner desk', 'ISSUE-ROUTING Domain'],
    owner: 'portal chrome / ISSUE-ROUTING',
    notes: 'Homonym of session lane partner; boards use data-domain=partner',
  }),
  row({
    id: 'taxonomy.conceptDomain.partners',
    aspect: 'taxonomy',
    machine: 'conceptDomain',
    token: 'partners',
    typeOrExport: 'ConceptDomain',
    repo: 'project-R-score',
    path: 'lib/portal/concept-domains.ts',
    properties: ['CONCEPT_DOMAINS', 'prefix partner.', 'prefix out.'],
    owner: 'concepts / DOMAIN_CONCEPT_SHAPE',
    notes: 'Plural token — not chrome partner and not PartnerCode',
  }),
  row({
    id: 'taxonomy.commitScope.partner',
    aspect: 'taxonomy',
    machine: 'commitScope',
    token: 'partner',
    typeOrExport: 'commitScopeHint',
    repo: 'project-R-score',
    path: 'lib/docs/workspace-taxonomy.ts',
    properties: ['commitScopeHints', 'type(partner):', 'open set'],
    owner: 'workspace taxonomy correlations',
    notes: 'Guidance only — not a frozen enum',
  }),
  row({
    id: 'taxonomy.commitScope.partners',
    aspect: 'taxonomy',
    machine: 'commitScope',
    token: 'partners',
    typeOrExport: 'commitScopeHint',
    repo: 'project-R-score',
    path: 'lib/docs/workspace-taxonomy.ts',
    properties: ['commitScopeHints', 'type(partners):', 'open set'],
    owner: 'workspace taxonomy correlations',
  }),
  row({
    id: 'taxonomy.commitScope.ops',
    aspect: 'taxonomy',
    machine: 'commitScope',
    token: 'ops',
    typeOrExport: 'commitScopeHint',
    repo: 'project-R-score',
    path: 'lib/docs/workspace-taxonomy.ts',
    properties: ['commitScopeHints', 'type(ops):', 'open set'],
    owner: 'workspace taxonomy correlations',
    notes: 'Common commit scope for partner-desk work; not a Domain lane',
  }),
  row({
    id: 'portal-board.lanes',
    aspect: 'portal-board',
    machine: 'nav',
    token: 'lanes',
    typeOrExport: 'page.lanes',
    repo: 'project-R-score',
    path: 'public/portal/lanes/',
    href: '/portal/lanes/',
    properties: ['chrome domain: knowledge', 'registry: workspace-lane-map.json'],
    owner: 'workspace-lane-cross-map',
    notes: 'Explains partner homonym across machines — not a partner desk board',
  }),

  // ── Brands / identity ──
  row({
    id: 'brand.PartnerCode',
    aspect: 'brand',
    machine: 'identity',
    token: 'PartnerCode',
    typeOrExport: 'PartnerCode',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    properties: ['^[A-Z]{3,6}$', 'canonical business join key', 'parsePartnerCode'],
    owner: 'partners core / branded operations',
    notes: 'Only unqualified partner key — see partner-type-reference-map',
  }),
  row({
    id: 'brand.PartnerCallSignCode',
    aspect: 'brand',
    machine: 'identity',
    token: 'PartnerCallSignCode',
    typeOrExport: 'PartnerCallSignCode',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    properties: ['CODE-NNN', 'derived from PartnerCode'],
    owner: 'partners core',
  }),
  row({
    id: 'brand.PartnerProfileKey',
    aspect: 'brand',
    machine: 'identity',
    token: 'PartnerProfileKey',
    typeOrExport: 'PartnerProfileKey',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    properties: ['pp-${treeNodeId}', 'compatibility binding'],
    owner: 'operations',
    notes: 'Not dashboard or partner business identity',
  }),
  row({
    id: 'brand.PartnerTemplateId',
    aspect: 'brand',
    machine: 'identity',
    token: 'PartnerTemplateId',
    typeOrExport: 'PartnerTemplateId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    properties: ['onboarding template slug'],
    owner: 'operations / config',
  }),
  row({
    id: 'brand.OutId',
    aspect: 'brand',
    machine: 'identity',
    token: 'OutId',
    typeOrExport: 'OutId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    properties: ['out-{PartnerCode}-{n}', 'bookmaker account identity'],
    owner: 'partners core',
  }),
  row({
    id: 'brand.ExternalPartnerId',
    aspect: 'brand',
    machine: 'identity',
    token: 'ExternalPartnerId',
    typeOrExport: 'ExternalPartnerId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    properties: ['source-owned non-canonical', 'never bare partnerId in core'],
    owner: 'adapter boundary',
  }),
  row({
    id: 'brand.TreeNodeId',
    aspect: 'brand',
    machine: 'identity',
    token: 'TreeNodeId',
    typeOrExport: 'TreeNodeId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    properties: ['ops tree node PK', 'partner|agent|sub_agent'],
    owner: 'operations',
  }),
  row({
    id: 'brand.parsers.partners-package',
    aspect: 'brand',
    machine: 'identity',
    token: 'parsePartnerCode',
    typeOrExport: 'packages/partners identifiers',
    repo: 'project-R-score',
    path: 'packages/partners/src/core/identifiers.ts',
    properties: ['parsePartnerCode', 'parsePartnerCallSign', 'parseCanonicalOutIdentity'],
    owner: '@factorywager/partners',
  }),

  // ── Package ──
  row({
    id: 'package.factorywager-partners',
    aspect: 'package',
    token: '@factorywager/partners',
    typeOrExport: '@factorywager/partners',
    repo: 'project-R-score',
    path: 'packages/partners/',
    properties: [
      './core',
      './boundary',
      './compatibility',
      './portal',
      './adapters',
      './dashboard-plan',
    ],
    owner: 'partners package',
    notes: 'Artifact contracts, ingress compatibility, dashboard assembler',
  }),

  // ── Lib modules ──
  row({
    id: 'lib.partner-profile',
    aspect: 'lib-module',
    token: 'partner-profile',
    typeOrExport: 'PartnerProfile',
    repo: 'project-R-score',
    path: 'lib/partner-profile/',
    properties: ['schema.ts', 'partner-health', 'ledger', 'onboard'],
    owner: 'partner profile / seat desk',
  }),
  row({
    id: 'lib.partner-ops-registry',
    aspect: 'lib-module',
    token: 'partners-ops',
    typeOrExport: 'partner-ops-registry',
    repo: 'project-R-score',
    path: 'lib/telegram/partner-ops-registry.ts',
    href: '/registry/partners-ops.json',
    properties: ['factorywager.partners-ops.v2', 'bake partners-ops.json'],
    owner: 'Factory Telegram / partners-ops',
  }),
  row({
    id: 'lib.partner-ops-glossary',
    aspect: 'lib-module',
    token: 'partner-ops-glossary',
    repo: 'project-R-score',
    path: 'lib/telegram/partner-ops-glossary.ts',
    properties: ['Factory overlay concepts', 'deposit.method.*', 'telegram.topic.*'],
    owner: 'partner-domain-map',
  }),
  row({
    id: 'lib.partner-ops-color-kernel',
    aspect: 'lib-module',
    token: 'PARTNER_OPS_COLORS',
    repo: 'project-R-score',
    path: 'lib/telegram/partner-ops-color-kernel.ts',
    properties: ['9-key palette', 'PARTNER_OPS_CONCEPT_COLORS'],
    owner: 'partner-ops color kernel',
  }),
  row({
    id: 'lib.partner-ops-events',
    aspect: 'lib-module',
    token: 'PARTNER_OPS_EVENT_CODES',
    repo: 'project-R-score',
    path: 'lib/telegram/partner-ops-events.ts',
    properties: ['11 event codes', 'PARTNER_OPS_EVENT_GLOSSARY'],
    owner: 'partner-ops events',
  }),

  // ── Registry artifacts ──
  row({
    id: 'registry.partners-ops',
    aspect: 'registry',
    machine: 'artifact',
    token: 'partners-ops',
    repo: 'project-R-score',
    path: 'public/registry/partners-ops.json',
    href: '/registry/partners-ops.json',
    properties: ['schema factorywager.partners-ops.v2', 'boards: partners, account'],
    owner: 'partner-ops-registry',
  }),
  row({
    id: 'registry.partner-health',
    aspect: 'registry',
    machine: 'artifact',
    token: 'partner-health',
    repo: 'project-R-score',
    path: 'public/registry/partner-health.json',
    href: '/registry/partner-health.json',
    properties: ['partner:health:bake', 'board: /portal/partner/'],
    owner: 'lib/partner-profile/partner-health',
  }),
  row({
    id: 'registry.partner-profiles',
    aspect: 'registry',
    machine: 'artifact',
    token: 'partner-profiles',
    repo: 'project-R-score',
    path: 'public/registry/partner-profiles.json',
    href: '/registry/partner-profiles.json',
    properties: ['legacy full-profile compatibility'],
    owner: 'partner-profile bake',
    notes: 'Compatibility input — not new canonical authority',
  }),
  row({
    id: 'registry.partner-profile-coverage',
    aspect: 'registry',
    machine: 'artifact',
    token: 'partner-profile-coverage',
    repo: 'project-R-score',
    path: 'public/registry/partner-profile-coverage.json',
    href: '/registry/partner-profile-coverage.json',
    properties: ['CODE', 'call sign', 'document revision'],
    owner: 'packages/partners profile-coverage adapter',
  }),
  row({
    id: 'registry.tennis.partner-contracts',
    aspect: 'registry',
    machine: 'artifact',
    token: 'partner-contracts',
    repo: 'project-R-score',
    path: 'public/registry/tennis/partner-contracts.json',
    href: '/registry/tennis/partner-contracts.json',
    properties: ['Tennis HQ cross-surface'],
    owner: 'tennis-hq-registry',
    notes: 'Trading chrome Domain; partner-adjacent contracts',
  }),
  row({
    id: 'registry.workspace-lane-map',
    aspect: 'registry',
    machine: 'artifact',
    token: 'workspace-lane-map',
    repo: 'project-R-score',
    path: 'public/registry/workspace-lane-map.json',
    href: '/registry/workspace-lane-map.json',
    properties: ['claim workspace-lane-cross-map', 'partner correlation row'],
    owner: 'workspace taxonomy',
  }),

  // ── Wire-field traps ──
  row({
    id: 'wire.partnerId.unqualified',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'partnerId',
    typeOrExport: 'ExternalPartnerRef (target)',
    repo: 'project-R-score',
    path: 'docs/design/partner-type-reference-map.md',
    properties: ['unqualified', 'ambiguous', 'never core PK'],
    owner: 'partner-type-reference-map',
    notes: 'Means CODE / tree node / Kalshi row / remote id — isolate as ExternalPartnerRef',
  }),
  row({
    id: 'wire.partner_id.sports',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'partner_id',
    typeOrExport: 'ExternalPartnerRef',
    repo: 'sports-terminal',
    path: 'Sports Terminal API /partners',
    properties: ['snake_case wire', 'blocked connector'],
    owner: 'sports-terminal adapter (planned)',
  }),
  row({
    id: 'wire.kalshi.partners.id',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'partners[].id',
    typeOrExport: 'ExternalPartnerRef',
    repo: 'Kalshi-bot',
    path: 'Kalshi partner registry',
    properties: ['e.g. partner-spen', 'join via partners[].code → PartnerCode'],
    owner: 'execution adapter',
  }),
  row({
    id: 'wire.pandora.partnerId',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'partnerId',
    typeOrExport: 'ExternalPartnerRef',
    repo: 'project-R-score',
    path: 'Pandora remote wire',
    properties: ['numeric remote id', 'never infer PartnerCode'],
    owner: 'adapter boundary',
  }),

  // ── Doc tenants / design ──
  row({
    id: 'doc.partner-domain-map',
    aspect: 'doc-tenant',
    token: 'partner-domain-map',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/partner-domain-map.md',
    properties: ['glossary cores + Factory overlay', 'seat capital desk'],
    owner: 'partner-ops domain',
  }),
  row({
    id: 'doc.partner-limits',
    aspect: 'doc-tenant',
    token: 'partner-limits',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/partner-limits.md',
    href: '/portal/limits/',
    properties: ['limit raises', 'ops:limits:demo'],
    owner: 'partner limits',
  }),
  row({
    id: 'doc.partner-package-group-handshake',
    aspect: 'doc-tenant',
    token: 'partner-package-group-handshake',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/partner-package-group-handshake.md',
    properties: ['Telegram package groups', 'handshake catalog'],
    owner: 'Factory Telegram',
  }),
  row({
    id: 'doc.partner-onboarding-package',
    aspect: 'doc-tenant',
    token: 'partner-onboarding-package',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/partner-onboarding-package.md',
    properties: ['onboarding package'],
    owner: 'partner onboarding',
  }),
  row({
    id: 'doc.ops-partner-bridge',
    aspect: 'doc-tenant',
    token: 'ops-partner-bridge',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/ops-partner-bridge.md',
    properties: ['ops ↔ partner bridge'],
    owner: 'ops-partner-bridge',
  }),
  row({
    id: 'doc.partner-type-reference-map',
    aspect: 'doc-tenant',
    token: 'partner-type-reference-map',
    repo: 'project-R-score',
    path: 'docs/design/partner-type-reference-map.md',
    properties: ['identity graph', 'fitness scores', 'translation matrix'],
    owner: 'partners design',
  }),
  row({
    id: 'doc.partner-dashboard-mvp',
    aspect: 'doc-tenant',
    token: 'partner-dashboard-mvp',
    repo: 'project-R-score',
    path: 'docs/design/partner-dashboard-mvp.md',
    properties: ['MVP contract', 'partner-dashboard-mvp.toml'],
    owner: 'partners design',
  }),
  row({
    id: 'doc.partner-code-consolidation',
    aspect: 'doc-tenant',
    token: 'partner-code-consolidation',
    repo: 'project-R-score',
    path: 'docs/design/partner-code-consolidation.md',
    properties: ['consolidation review'],
    owner: 'partners design',
  }),
  row({
    id: 'doc.workspace-lane-cross-map',
    aspect: 'doc-tenant',
    token: 'workspace-lane-cross-map',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/workspace-lane-cross-map.md',
    href: '/portal/lanes/',
    properties: ['claim workspace-lane-cross-map', 'correlations not containment'],
    owner: 'harness docs',
  }),
  row({
    id: 'doc.naming-grammar',
    aspect: 'doc-tenant',
    token: 'naming-grammar',
    repo: 'project-R-score',
    path: 'docs/organization/naming-grammar.md',
    properties: ['<t>-<lane>-<slug>', 'session lane partner'],
    owner: 'organization',
  }),

  // ── Cross-repo ──
  row({
    id: 'cross.kalshi.partner-phase',
    aspect: 'cross-repo',
    token: 'partner.phase.*',
    typeOrExport: 'glossary concept',
    repo: 'Kalshi-bot',
    path: 'Kalshi-bot/src/institutions/glossary.ts',
    properties: ['shared cores', 'partner.phase.onboarding|operator_ready|…'],
    owner: 'Kalshi glossary / partner-domain-map',
    notes: 'Factory must not re-declare Kalshi cores',
  }),
  row({
    id: 'cross.toc-ops.soft-balance',
    aspect: 'cross-repo',
    token: 'Soft Balance',
    repo: 'toc-ops',
    path: 'toc-ops (ct)',
    properties: ['Soft Balance', 'MessageLog', 'phones'],
    owner: 'toc-ops',
    notes: 'Not a FactoryWager partner board — Soft stays in toc-ops',
  }),
  row({
    id: 'cross.sports-terminal.partners',
    aspect: 'cross-repo',
    token: 'partners',
    repo: 'sports-terminal',
    path: 'Sports Terminal React /partners',
    href: '/partners',
    properties: ['unmounted API', 'unqualified partnerId', 'blocked connector'],
    owner: 'sports-terminal (cutover TODO)',
    notes: 'IA reference only — do not copy schema',
  }),
] as const;

/** Live chrome nav items with Domain lane partner. */
export function listPartnerChromeNavItems(): readonly PortalChromeNavItem[] {
  return [...PORTAL_PRIORITY_NAV, ...PORTAL_OVERFLOW_NAV].filter(n => n.domain === 'partner');
}

export function partnerChromeNavSurfaceRows(): readonly PartnerSurfaceRow[] {
  return listPartnerChromeNavItems().map(item =>
    row({
      id: `chrome-nav.${item.id}`,
      aspect: 'chrome-nav',
      machine: 'nav',
      token: item.id,
      typeOrExport: 'PortalChromeNavItem',
      repo: 'project-R-score',
      path: 'lib/portal/chrome-catalog.ts',
      href: item.href,
      properties: [
        `domain: ${item.domain}`,
        `group: ${item.group}`,
        `tier: ${item.tier}`,
        ...(item.registryArtifact ? [`registry: ${item.registryArtifact}`] : []),
        ...(item.cli ? [`cli: ${item.cli}`] : []),
      ],
      owner: 'portal chrome Partner desk',
      notes: item.note,
    })
  );
}

/** Board rows mirror chrome-nav hrefs under public/portal (one row per board path). */
export function partnerPortalBoardSurfaceRows(): readonly PartnerSurfaceRow[] {
  return listPartnerChromeNavItems().map(item => {
    const slug = item.href.replace(/^\/portal\//, '').replace(/\/$/, '');
    return row({
      id: `portal-board.${slug}`,
      aspect: 'portal-board',
      machine: 'nav',
      token: slug,
      typeOrExport: `page.${slug === 'partner' ? 'partnerHealth' : slug}`,
      repo: 'project-R-score',
      path: `public/portal/${slug}/`,
      href: item.href,
      properties: [
        `chrome-nav: ${item.id}`,
        'data-domain: partner',
        ...(item.registryArtifact ? [item.registryArtifact] : []),
      ],
      owner: 'portal Partner desk boards',
      notes: item.note,
    });
  });
}

export function allPartnerSurfaceRows(): readonly PartnerSurfaceRow[] {
  return [
    ...PARTNER_SURFACE_STATIC_ROWS,
    ...partnerChromeNavSurfaceRows(),
    ...partnerPortalBoardSurfaceRows(),
  ];
}

export type PartnerSurfaceInventory = {
  readonly kind: 'partner-surface-inventory';
  readonly schemaVersion: 1;
  readonly claim: 'partner-surface-inventory';
  readonly bakedAt: string;
  readonly principle: 'map-before-rename';
  readonly chromeDomain: {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly doc: string;
  };
  readonly conceptDomain: {
    readonly id: string;
    readonly label: string;
    readonly description: string;
  };
  readonly sessionLane: {
    readonly id: string;
    readonly display: string;
    readonly description: string;
  };
  readonly commitScopeHints: readonly string[];
  readonly rows: readonly PartnerSurfaceRow[];
  readonly docs: {
    readonly inventory: string;
    readonly typeReference: string;
    readonly domainMap: string;
    readonly laneCrossMap: string;
    readonly lib: string;
  };
};

export function buildPartnerSurfaceInventory(
  bakedAt: string = new Date().toISOString()
): PartnerSurfaceInventory {
  const chrome = PORTAL_DOMAIN_LANE_META.find(m => m.id === 'partner');
  if (!chrome) throw new Error('missing chrome Domain partner');
  if (!CONCEPT_DOMAINS.includes('partners')) throw new Error('missing ConceptDomain partners');
  const session = SESSION_LANES.find(l => l.id === 'partner');
  if (!session) throw new Error('missing session lane partner');
  const partnerCorr = WORKSPACE_TAXONOMY_CORRELATIONS.find(r => r.sessionLane === 'partner');

  return {
    kind: 'partner-surface-inventory',
    schemaVersion: 1,
    claim: 'partner-surface-inventory',
    bakedAt,
    principle: 'map-before-rename',
    chromeDomain: {
      id: chrome.id,
      label: chrome.label,
      description: chrome.description,
      doc: chrome.doc,
    },
    conceptDomain: {
      id: 'partners',
      label: DOMAIN_METADATA.partners.label,
      description: DOMAIN_METADATA.partners.description,
    },
    sessionLane: {
      id: session.id,
      display: session.display,
      description: session.description,
    },
    commitScopeHints: partnerCorr?.commitScopeHints ?? [],
    rows: allPartnerSurfaceRows(),
    docs: {
      inventory: 'docs/design/partner-surface-inventory.md',
      typeReference: 'docs/design/partner-type-reference-map.md',
      domainMap: 'docs/harness/tenants/partner-domain-map.md',
      laneCrossMap: 'docs/harness/tenants/workspace-lane-cross-map.md',
      lib: 'lib/docs/partner-surface-inventory.ts',
    },
  };
}

/** Markdown table for TTY / docs regenerate. */
export function formatPartnerSurfaceMarkdown(): string {
  const inv = buildPartnerSurfaceInventory('—');
  const lines = [
    '# Partner surface inventory',
    '',
    `Principle: **${inv.principle}** — map before rename.`,
    '',
    '| Machine | Token |',
    '| ------- | ----- |',
    `| sessionLane | \`${inv.sessionLane.id}\` |`,
    `| chromeDomain | \`${inv.chromeDomain.id}\` (${inv.chromeDomain.label}) |`,
    `| conceptDomain | \`${inv.conceptDomain.id}\` |`,
    `| commitScopeHints | ${inv.commitScopeHints.map(h => `\`${h}\``).join(', ') || '—'} |`,
    '',
    '| Aspect | Token | Path | Href | Type | Properties |',
    '| ------ | ----- | ---- | ---- | ---- | ---------- |',
  ];
  for (const r of inv.rows) {
    lines.push(
      `| ${r.aspect}${r.machine ? ` / ${r.machine}` : ''} | \`${r.token}\` | \`${r.path}\` | ${r.href ? `\`${r.href}\`` : '—'} | ${r.typeOrExport ? `\`${r.typeOrExport}\`` : '—'} | ${r.properties.map(p => `\`${p}\``).join(', ')} |`
    );
  }
  return `${lines.join('\n')}\n`;
}
