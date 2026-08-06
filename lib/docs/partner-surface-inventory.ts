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

/**
 * Layer-2 bag on brand rows — checkable against brand-manifest.
 *
 * Linking metadata (`domain` · `registryRef` · `isActive` · `category`) joins
 * brands to brand-catalog domains, registry artifacts, and live-code readiness
 * without changing mint/pattern Layer A checks.
 *
 * Optional lifecycle fields (`deprecatedAt` · `deprecationReason` · `replacedBy`)
 * document sunset; Layer A warns when inactive/deprecated brands are still
 * referenced by wire-field / portal-board / registry consumers.
 */
export type PartnerSurfaceBrandBag = {
  readonly pattern?: string;
  readonly mintAuthority: string;
  readonly module: string;
  readonly interiorOnly: boolean;
  readonly replaces?: readonly string[];
  /**
   * Brand-catalog domain (`operations`, …), inventory taxonomy
   * conceptDomain/chromeDomain token, or sentinel `cross-domain`.
   */
  readonly domain: string;
  /** Inventory `registry` row token that holds instances; omit when none. */
  readonly registryRef?: string;
  /** false = deprecated/legacy — still documented, not live-code SSOT. */
  readonly isActive: boolean;
  /** Doc grouping: identity · profile · template · external · node */
  readonly category: string;
  /** ISO date (`YYYY-MM-DD` or full ISO-8601) when deprecation started. */
  readonly deprecatedAt?: string;
  /** Why the brand is deprecated / inactive. */
  readonly deprecationReason?: string;
  /** Successor brand token (`typeOrExport` / inventory brand token). */
  readonly replacedBy?: string;
};

export type PartnerSurfaceMoneyPolicy = 'integerMinorUnits' | 'forbidden' | 'unset';

/**
 * Layer-3 bag on registry rows — file + schema + omit policy.
 *
 * `conceptIds` are glossary / relatedConcept refs (may include `*`); they are
 * **not** JSON paths. Use `requiredTopKeys` for artifact shape presence.
 * `schemaIdField: 'none'` means schemaId is documentation-only (artifacts that
 * only expose a numeric `schemaVersion`).
 */
export type PartnerSurfaceRegistryBag = {
  readonly schemaId: string; // brand-ok — registry schema label, not a domain SchemaId
  /** Which artifact field must equal `schemaId`. Default: auto (schema|kind|schemaVersion). */
  readonly schemaIdField?: 'schema' | 'kind' | 'schemaVersion' | 'none';
  readonly artifactPath: string;
  /** Glossary / relatedConcept ids — not path-checked against the artifact. */
  readonly conceptIds?: readonly string[];
  /** Object keys that must be absent anywhere in the artifact (key-name walk). */
  readonly omits: readonly string[];
  readonly moneyPolicy: PartnerSurfaceMoneyPolicy;
  /** Top-level keys that must exist on the baked JSON object. */
  readonly requiredTopKeys?: readonly string[];
};

/**
 * Wire-field semantics — inventory-driven naked brand traps (Layer C).
 *
 * `pattern` / `patterns` name the TypeScript identifier(s) to match.
 * `brandedType` is the type to use after the boundary (defaults to `resolvesTo`).
 * `boundaryPathGlobs` allowlists adapter files where naked annotations are OK.
 * Consumed by `bun run partner-surface-inventory:lint-wires`.
 *
 * @see docs/design/wire-lint.md
 */
export type PartnerSurfaceWireFieldBag = {
  readonly wireName: string;
  readonly sourceSystemId: string; // brand-ok — adapter source label (kalshi|sports|…), not SourceSystemId
  /**
   * Target brand / ref family. ExternalPartnerRef rows are allowlists for raw
   * wire strings — they are not skipped by the linter.
   */
  readonly resolvesTo: string;
  /** Display / error branded type (defaults to resolvesTo). */
  readonly brandedType?: string;
  /** Single identifier to match (defaults: simple wireName or token). */
  readonly pattern?: string;
  /** Extra identifiers (e.g. partnerId + partner_id). */
  readonly patterns?: readonly string[];
  /** Annotation RHS to match — default `string` (money may use `number`). */
  readonly nakedType?: 'string' | 'number';
  readonly quarantineOnFail: boolean;
  /** Path prefixes/globs where naked annotations are allowed. */
  readonly boundaryPathGlobs?: readonly string[];
  /**
   * When true (default), allowlisted hits are silent.
   * When false, allowlisted naked annotations warn (migration aid).
   */
  readonly strict?: boolean;
  /** When true, `// wire-ok` on matching files must include a reason. */
  readonly requireReason?: boolean;
};

/** Live chrome / board nav contract. */
export type PartnerSurfaceChromeNavBag = {
  readonly domain: string;
  readonly group: string;
  readonly tier: string;
  readonly registryArtifact?: string;
  readonly cli?: string;
};

/** Taxonomy homonym marker. */
export type PartnerSurfaceTaxonomyBag = {
  readonly homonymDistinct: boolean;
  readonly conceptDomain?: string;
};

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
  readonly brand?: PartnerSurfaceBrandBag;
  readonly registry?: PartnerSurfaceRegistryBag;
  readonly wireField?: PartnerSurfaceWireFieldBag;
  readonly chromeNav?: PartnerSurfaceChromeNavBag;
  readonly taxonomy?: PartnerSurfaceTaxonomyBag;
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
  if (partial.brand !== undefined)
    (out as { brand?: PartnerSurfaceBrandBag }).brand = partial.brand;
  if (partial.registry !== undefined)
    (out as { registry?: PartnerSurfaceRegistryBag }).registry = partial.registry;
  if (partial.wireField !== undefined)
    (out as { wireField?: PartnerSurfaceWireFieldBag }).wireField = partial.wireField;
  if (partial.chromeNav !== undefined)
    (out as { chromeNav?: PartnerSurfaceChromeNavBag }).chromeNav = partial.chromeNav;
  if (partial.taxonomy !== undefined)
    (out as { taxonomy?: PartnerSurfaceTaxonomyBag }).taxonomy = partial.taxonomy;
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
    href: '/portal/lanes/',
    properties: ['SESSION_LANES', 'archive <lane>', 'display: partner'],
    owner: 'organization / naming-grammar',
    notes: 'Filename token in <t>-<lane>-<slug>; not chrome Domain or ConceptDomain',
    taxonomy: { homonymDistinct: true, conceptDomain: 'partners' },
  }),
  row({
    id: 'taxonomy.chromeDomain.partner',
    aspect: 'taxonomy',
    machine: 'chromeDomain',
    token: 'partner',
    typeOrExport: 'PortalChromeDomainLane',
    repo: 'project-R-score',
    path: 'lib/portal/chrome-catalog.ts',
    href: '/portal/partners/',
    properties: ['PORTAL_DOMAIN_LANE_META', 'label: Partner desk', 'ISSUE-ROUTING Domain'],
    owner: 'portal chrome / ISSUE-ROUTING',
    notes: 'Homonym of session lane partner; boards use data-domain=partner',
    taxonomy: { homonymDistinct: true, conceptDomain: 'partners' },
  }),
  row({
    id: 'taxonomy.conceptDomain.partners',
    aspect: 'taxonomy',
    machine: 'conceptDomain',
    token: 'partners',
    typeOrExport: 'ConceptDomain',
    repo: 'project-R-score',
    path: 'lib/portal/concept-domains.ts',
    href: '/portal/concepts/#domain=partners',
    properties: ['CONCEPT_DOMAINS', 'prefix partner.', 'prefix out.'],
    owner: 'concepts / DOMAIN_CONCEPT_SHAPE',
    notes: 'Plural token — not chrome partner and not PartnerCode',
    taxonomy: { homonymDistinct: true, conceptDomain: 'partners' },
  }),
  row({
    id: 'taxonomy.commitScope.partner',
    aspect: 'taxonomy',
    machine: 'commitScope',
    token: 'partner',
    typeOrExport: 'commitScopeHint',
    repo: 'project-R-score',
    path: 'lib/docs/workspace-taxonomy.ts',
    href: '/portal/lanes/',
    properties: ['commitScopeHints', 'type(partner):', 'open set'],
    owner: 'workspace taxonomy correlations',
    notes: 'Guidance only — not a frozen enum',
    taxonomy: { homonymDistinct: true, conceptDomain: 'partners' },
  }),
  row({
    id: 'taxonomy.commitScope.partners',
    aspect: 'taxonomy',
    machine: 'commitScope',
    token: 'partners',
    typeOrExport: 'commitScopeHint',
    repo: 'project-R-score',
    path: 'lib/docs/workspace-taxonomy.ts',
    href: '/portal/lanes/',
    properties: ['commitScopeHints', 'type(partners):', 'open set'],
    owner: 'workspace taxonomy correlations',
    taxonomy: { homonymDistinct: true, conceptDomain: 'partners' },
  }),
  row({
    id: 'taxonomy.commitScope.ops',
    aspect: 'taxonomy',
    machine: 'commitScope',
    token: 'ops',
    typeOrExport: 'commitScopeHint',
    repo: 'project-R-score',
    path: 'lib/docs/workspace-taxonomy.ts',
    href: '/portal/lanes/',
    properties: ['commitScopeHints', 'type(ops):', 'open set'],
    owner: 'workspace taxonomy correlations',
    notes: 'Common commit scope for partner-desk work; not a Domain lane',
    taxonomy: { homonymDistinct: true, conceptDomain: 'partners' },
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
    chromeNav: {
      domain: 'knowledge',
      group: 'registry',
      tier: 'overflow',
      registryArtifact: 'workspace-lane-map',
      cli: 'bun run workspace-taxonomy:bake',
    },
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
    href: '/portal/brands/#domain=operations&q=PartnerCode',
    properties: ['^[A-Z]{3,6}$', 'canonical business join key', 'parsePartnerCode'],
    owner: 'partners core / branded operations',
    notes: 'Only unqualified partner key — see partner-type-reference-map',
    brand: {
      pattern: '^[A-Z]{3,6}$',
      mintAuthority: 'parsePartnerCode',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: false,
      replaces: ['partnerId', 'partner_id'],
      domain: 'operations',
      registryRef: 'partners-ops',
      isActive: true,
      category: 'identity',
    },
  }),
  row({
    id: 'brand.PartnerCallSignCode',
    aspect: 'brand',
    machine: 'identity',
    token: 'PartnerCallSignCode',
    typeOrExport: 'PartnerCallSignCode',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    href: '/portal/brands/#domain=operations&q=PartnerCallSignCode',
    properties: ['CODE-NNN', 'derived from PartnerCode'],
    owner: 'partners core',
    brand: {
      pattern: '^[A-Z]{3,6}-[0-9]{3}$',
      mintAuthority: 'parsePartnerCallSignCode',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: false,
      domain: 'operations',
      isActive: true,
      category: 'identity',
    },
  }),
  row({
    id: 'brand.PartnerProfileKey',
    aspect: 'brand',
    machine: 'identity',
    token: 'PartnerProfileKey',
    typeOrExport: 'PartnerProfileKey',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    href: '/portal/brands/#domain=operations&q=PartnerProfileKey',
    properties: ['pp-${treeNodeId}', 'compatibility binding'],
    owner: 'operations',
    notes: 'Not dashboard or partner business identity',
    brand: {
      mintAuthority: 'asPartnerProfileKey',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: true,
      domain: 'operations',
      registryRef: 'partner-profiles',
      isActive: true,
      category: 'profile',
    },
  }),
  row({
    id: 'brand.PartnerTemplateId',
    aspect: 'brand',
    machine: 'identity',
    token: 'PartnerTemplateId',
    typeOrExport: 'PartnerTemplateId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    href: '/portal/brands/#domain=operations&q=PartnerTemplateId',
    properties: ['onboarding template slug'],
    owner: 'operations / config',
    brand: {
      mintAuthority: 'asPartnerTemplateId',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: true,
      domain: 'operations',
      registryRef: 'partner-contracts',
      isActive: true,
      category: 'template',
    },
  }),
  row({
    id: 'brand.OutId',
    aspect: 'brand',
    machine: 'identity',
    token: 'OutId',
    typeOrExport: 'OutId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    href: '/portal/brands/#domain=operations&q=OutId',
    properties: ['out-{PartnerCode}-{n}', 'bookmaker account identity'],
    owner: 'partners core',
    brand: {
      pattern: '^out-[A-Z]{3,6}-[1-9][0-9]*$',
      mintAuthority: 'parseOutId',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: false,
      replaces: ['accountId', 'SPEN-1 legacy'],
      domain: 'operations',
      registryRef: 'partners-ops',
      isActive: true,
      category: 'identity',
    },
  }),
  row({
    id: 'brand.ExternalPartnerId',
    aspect: 'brand',
    machine: 'identity',
    token: 'ExternalPartnerId',
    typeOrExport: 'ExternalPartnerId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    href: '/portal/brands/#domain=operations&q=ExternalPartnerId',
    properties: ['source-owned non-canonical', 'never bare partnerId in core'],
    owner: 'adapter boundary',
    brand: {
      mintAuthority: 'asExternalPartnerId',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: false,
      replaces: ['partnerId'],
      domain: 'cross-domain',
      isActive: true,
      category: 'external',
    },
  }),
  row({
    id: 'brand.TreeNodeId',
    aspect: 'brand',
    machine: 'identity',
    token: 'TreeNodeId',
    typeOrExport: 'TreeNodeId',
    repo: 'project-R-score',
    path: 'lib/types/branded/operations.ts',
    href: '/portal/brands/#domain=operations&q=TreeNodeId',
    properties: ['ops tree node PK', 'partner|agent|sub_agent'],
    owner: 'operations',
    brand: {
      mintAuthority: 'asTreeNodeId',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: true,
      domain: 'operations',
      registryRef: 'workspace-lane-map',
      isActive: true,
      category: 'node',
    },
  }),
  row({
    id: 'brand.parsers.partners-package',
    aspect: 'brand',
    machine: 'identity',
    token: 'parsePartnerCode',
    typeOrExport: 'PartnerCode',
    repo: 'project-R-score',
    path: 'packages/partners/src/core/identifiers.ts',
    href: '/portal/brands/#domain=operations&q=PartnerCode',
    properties: ['parsePartnerCode', 'parsePartnerCallSign', 'parseCanonicalOutIdentity'],
    owner: '@factorywager/partners',
    notes: 'Package re-export parsers — brand name remains PartnerCode in manifest',
    brand: {
      pattern: '^[A-Z]{3,6}$',
      mintAuthority: 'packages/partners parsePartnerCode',
      module: 'packages/partners/src/core/identifiers.ts',
      interiorOnly: false,
      replaces: ['partnerId'],
      domain: 'operations',
      registryRef: 'partners-ops',
      isActive: true,
      category: 'identity',
    },
  }),

  // ── Package ──
  row({
    id: 'package.factorywager-partners',
    aspect: 'package',
    token: '@factorywager/partners',
    typeOrExport: '@factorywager/partners',
    repo: 'project-R-score',
    path: 'packages/partners/',
    href: '/portal/partners/',
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
    href: '/portal/partner/',
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
    href: '/portal/concepts/#domain=partners',
    properties: ['Factory overlay concepts', 'deposit.method.*', 'telegram.topic.*'],
    owner: 'partner-domain-map',
  }),
  row({
    id: 'lib.partner-ops-color-kernel',
    aspect: 'lib-module',
    token: 'PARTNER_OPS_COLORS',
    repo: 'project-R-score',
    path: 'lib/telegram/partner-ops-color-kernel.ts',
    href: '/portal/partners/',
    properties: ['9-key palette', 'PARTNER_OPS_CONCEPT_COLORS'],
    owner: 'partner-ops color kernel',
  }),
  row({
    id: 'lib.partner-ops-events',
    aspect: 'lib-module',
    token: 'PARTNER_OPS_EVENT_CODES',
    repo: 'project-R-score',
    path: 'lib/telegram/partner-ops-events.ts',
    href: '/portal/partners/',
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
    registry: {
      schemaId: 'factorywager.partners-ops.v2',
      schemaIdField: 'schema',
      artifactPath: 'public/registry/partners-ops.json',
      conceptIds: ['partner.phase.*', 'out.status.*', 'ops.view.per_account'],
      // credentials.username is a public board label; vault secrets must stay out
      omits: ['vaultKey', 'password', 'softBalance', 'apiKey', 'api_key'],
      moneyPolicy: 'integerMinorUnits',
      requiredTopKeys: ['schema', 'partners', 'summary'],
    },
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
    registry: {
      schemaId: '1',
      schemaIdField: 'schemaVersion',
      artifactPath: 'public/registry/partner-health.json',
      omits: ['vaultKey', 'credentials', 'softBalance', 'password'],
      moneyPolicy: 'forbidden',
      requiredTopKeys: ['schemaVersion', 'health'],
    },
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
    registry: {
      schemaId: '1',
      schemaIdField: 'schemaVersion',
      artifactPath: 'public/registry/partner-profiles.json',
      omits: ['vaultKey', 'credentials', 'password'],
      moneyPolicy: 'unset',
      requiredTopKeys: ['schemaVersion', 'profiles'],
    },
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
    registry: {
      schemaId: 'factorywager.partner-profile-coverage.v1',
      schemaIdField: 'schema',
      artifactPath: 'public/registry/partner-profile-coverage.json',
      omits: ['vaultKey', 'credentials', 'softBalance', 'password'],
      moneyPolicy: 'forbidden',
      requiredTopKeys: ['schema', 'evidenceByPartnerCode'],
    },
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
    registry: {
      schemaId: 'tennis-partner-contracts',
      schemaIdField: 'kind',
      artifactPath: 'public/registry/tennis/partner-contracts.json',
      omits: ['vaultKey', 'credentials', 'password', 'softBalance'],
      moneyPolicy: 'integerMinorUnits',
      requiredTopKeys: ['kind', 'partners', 'summary'],
    },
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
    registry: {
      schemaId: 'workspace-lane-map',
      schemaIdField: 'kind',
      artifactPath: 'public/registry/workspace-lane-map.json',
      omits: ['softBalance', 'credentials', 'password', 'vaultKey'],
      moneyPolicy: 'forbidden',
      requiredTopKeys: ['kind', 'sessionLanes', 'chromeDomains', 'correlations'],
    },
  }),
  row({
    id: 'registry.partner-surface-inventory',
    aspect: 'registry',
    machine: 'artifact',
    token: 'partner-surface-inventory',
    repo: 'project-R-score',
    path: 'public/registry/partner-surface-inventory.json',
    href: '/registry/partner-surface-inventory.json',
    properties: ['claim partner-surface-inventory', 'structured bags'],
    owner: 'partner surface inventory',
    registry: {
      schemaId: 'partner-surface-inventory',
      schemaIdField: 'kind',
      artifactPath: 'public/registry/partner-surface-inventory.json',
      // omit lists appear as string *values* in this bake; key-name walk must not
      // treat those as present keys. Soft/money fields must not be object keys.
      omits: ['softBalance', 'password', 'vaultKey', 'apiKey'],
      moneyPolicy: 'forbidden',
      requiredTopKeys: ['kind', 'rows', 'principle'],
    },
  }),

  // ── Wire-field traps ──
  row({
    id: 'wire.partnerId.unqualified',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'partnerId',
    typeOrExport: 'ExternalPartnerRef',
    repo: 'project-R-score',
    path: 'docs/design/partner-type-reference-map.md',
    properties: ['unqualified', 'ambiguous', 'never core PK'],
    owner: 'partner-type-reference-map',
    notes: 'Means CODE / tree node / Kalshi row / remote id — isolate as ExternalPartnerRef',
    wireField: {
      wireName: 'partnerId',
      sourceSystemId: 'unqualified',
      resolvesTo: 'ExternalPartnerRef',
      brandedType: 'ExternalPartnerRef',
      pattern: 'partnerId',
      patterns: ['partnerId', 'partner_id'],
      quarantineOnFail: true,
      // Trap row — no globs; use // wire-ok or a source-specific wire-field row.
    },
  }),
  row({
    id: 'wire.partner_id.sports',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'partner_id',
    typeOrExport: 'ExternalPartnerRef',
    repo: 'sports-terminal',
    path: 'projects/active/sports-terminal-os',
    properties: ['snake_case wire', 'blocked connector'],
    owner: 'sports-terminal adapter (planned)',
    wireField: {
      wireName: 'partner_id',
      sourceSystemId: 'sports-terminal',
      resolvesTo: 'ExternalPartnerRef',
      brandedType: 'ExternalPartnerRef',
      pattern: 'partner_id',
      patterns: ['partner_id', 'partnerId'],
      quarantineOnFail: true,
      boundaryPathGlobs: ['projects/active/sports-terminal-os/**'],
    },
  }),
  row({
    id: 'wire.kalshi.partners.id',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'partners[].id',
    typeOrExport: 'ExternalPartnerRef',
    repo: 'Kalshi-bot',
    path: 'Kalshi-bot',
    properties: ['e.g. partner-spen', 'join via partners[].code → PartnerCode'],
    owner: 'execution adapter',
    notes: 'Complex wireName — contributes Kalshi-bot/** allowlist to ExternalPartnerRef family',
    wireField: {
      wireName: 'partners[].id',
      sourceSystemId: 'kalshi',
      resolvesTo: 'ExternalPartnerRef',
      brandedType: 'ExternalPartnerRef',
      // no simple pattern — globs allow partnerId/partner_id from sibling rows
      quarantineOnFail: true,
      boundaryPathGlobs: ['Kalshi-bot/**'],
    },
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
    wireField: {
      wireName: 'partnerId',
      sourceSystemId: 'pandora',
      resolvesTo: 'ExternalPartnerRef',
      brandedType: 'ExternalPartnerRef',
      pattern: 'partnerId',
      quarantineOnFail: true,
      // Adapter not landed — empty globs warn until paths are registered.
      boundaryPathGlobs: [],
    },
  }),
  row({
    id: 'wire.outId',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'outId',
    typeOrExport: 'OutId',
    repo: 'project-R-score',
    path: 'lib/telegram',
    properties: ['seat desk / intake wire', 'parse to OutId'],
    owner: 'seat capital desk',
    wireField: {
      wireName: 'outId',
      sourceSystemId: 'seat-desk',
      resolvesTo: 'OutId',
      brandedType: 'OutId',
      pattern: 'outId',
      patterns: ['outId', 'out_id'],
      quarantineOnFail: true,
      boundaryPathGlobs: ['lib/telegram/seat-*.ts', 'lib/telegram/seat-desk-*.ts'],
    },
  }),
  row({
    id: 'wire.externalRef',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'externalRef',
    typeOrExport: 'ExternalPartnerId',
    repo: 'project-R-score',
    path: 'docs/design/partner-type-reference-map.md',
    properties: ['source-owned non-canonical', 'trap until adapter globs land'],
    owner: 'partner-type-reference-map',
    wireField: {
      wireName: 'externalRef',
      sourceSystemId: 'unqualified',
      resolvesTo: 'ExternalPartnerId',
      brandedType: 'ExternalPartnerId',
      pattern: 'externalRef',
      quarantineOnFail: true,
      // Trap — register boundaryPathGlobs when an adapter lands.
    },
  }),

  // ── Doc tenants / design ──
  row({
    id: 'doc.partner-domain-map',
    aspect: 'doc-tenant',
    token: 'partner-domain-map',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/partner-domain-map.md',
    href: '/portal/concepts/#domain=partners',
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
    href: '/portal/factory/',
    properties: ['Telegram package groups', 'handshake catalog'],
    owner: 'Factory Telegram',
  }),
  row({
    id: 'doc.partner-onboarding-package',
    aspect: 'doc-tenant',
    token: 'partner-onboarding-package',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/partner-onboarding-package.md',
    href: '/portal/partner/',
    properties: ['onboarding package'],
    owner: 'partner onboarding',
  }),
  row({
    id: 'doc.ops-partner-bridge',
    aspect: 'doc-tenant',
    token: 'ops-partner-bridge',
    repo: 'project-R-score',
    path: 'docs/harness/tenants/ops-partner-bridge.md',
    href: '/portal/partners/',
    properties: ['ops ↔ partner bridge'],
    owner: 'ops-partner-bridge',
  }),
  row({
    id: 'doc.partner-type-reference-map',
    aspect: 'doc-tenant',
    token: 'partner-type-reference-map',
    repo: 'project-R-score',
    path: 'docs/design/partner-type-reference-map.md',
    href: '/portal/brands/#domain=operations&q=PartnerCode',
    properties: ['identity graph', 'fitness scores', 'translation matrix'],
    owner: 'partners design',
  }),
  row({
    id: 'doc.partner-dashboard-mvp',
    aspect: 'doc-tenant',
    token: 'partner-dashboard-mvp',
    repo: 'project-R-score',
    path: 'docs/design/partner-dashboard-mvp.md',
    href: '/portal/partners/',
    properties: ['MVP contract', 'partner-dashboard-mvp.toml'],
    owner: 'partners design',
  }),
  row({
    id: 'doc.partner-code-consolidation',
    aspect: 'doc-tenant',
    token: 'partner-code-consolidation',
    repo: 'project-R-score',
    path: 'docs/design/partner-code-consolidation.md',
    href: '/portal/brands/#domain=operations&q=PartnerCode',
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
    href: '/portal/lanes/',
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
    href: '/portal/concepts/#domain=partners',
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
    href: '/portal/toc/',
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

/** Portal deep-links for a canonical PartnerCode (desk hash contract). */
export function partnerDeskHrefs(code: string): {
  readonly partnersHref: string;
  readonly accountingHref: string;
  readonly accountHref: string;
  readonly historyHref: string;
} {
  const normalized = code.trim().toUpperCase();
  return {
    partnersHref: `/portal/partners/#partner/${normalized}`,
    accountingHref: `/portal/partners/#partner/${normalized}/accounting`,
    accountHref: `/portal/account/?account=${encodeURIComponent(normalized)}`,
    historyHref: `/portal/partner-history/?account=${encodeURIComponent(normalized)}`,
  };
}

/** Live chrome nav items with Domain lane partner. */
export function listPartnerChromeNavItems(): readonly PortalChromeNavItem[] {
  return [...PORTAL_PRIORITY_NAV, ...PORTAL_OVERFLOW_NAV].filter(n => n.domain === 'partner');
}

function registryTokenFromHref(registryArtifact: string | undefined): string | undefined {
  if (!registryArtifact) return undefined;
  const base = registryArtifact.replace(/^\/registry\//, '').replace(/\.json$/, '');
  // tennis/partner-contracts → partner-contracts token in inventory
  return base.includes('/') ? base.split('/').pop() : base;
}

function chromeNavBag(item: PortalChromeNavItem): PartnerSurfaceChromeNavBag {
  const bag: PartnerSurfaceChromeNavBag = {
    domain: item.domain,
    group: item.group,
    tier: item.tier,
  };
  const regToken = registryTokenFromHref(item.registryArtifact);
  if (regToken) (bag as { registryArtifact?: string }).registryArtifact = regToken;
  if (item.cli) (bag as { cli?: string }).cli = item.cli;
  return bag;
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
      chromeNav: chromeNavBag(item),
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
      chromeNav: chromeNavBag(item),
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
  /** v2 adds structured brand/registry/wireField/chromeNav/taxonomy bags */
  readonly schemaVersion: 2;
  readonly claim: 'partner-surface-inventory';
  readonly bakedAt: string;
  readonly principle: 'map-before-rename';
  readonly chromeDomain: {
    readonly id: string; // brand-ok — chrome Domain lane token (partner)
    readonly label: string;
    readonly description: string;
    readonly doc: string;
  };
  readonly conceptDomain: {
    readonly id: string; // brand-ok — ConceptDomain token (partners)
    readonly label: string;
    readonly description: string;
  };
  readonly sessionLane: {
    readonly id: string; // brand-ok — SessionLaneId token mirrored as string for bake JSON
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
    schemaVersion: 2,
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
