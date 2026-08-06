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
  type PortalChromeDomainLane,
  type PortalChromeNavItem,
} from '../portal/chrome-catalog.ts';
import { CONCEPT_DOMAINS, DOMAIN_METADATA, type ConceptDomain } from '../portal/concept-domains.ts';
import { SESSION_LANES, WORKSPACE_TAXONOMY_CORRELATIONS } from './workspace-taxonomy.ts';

export const PARTNER_SURFACE_ASPECTS = [
  'taxonomy',
  'chrome-nav',
  'portal-board',
  'registry',
  'brand',
  'partner-code',
  'out-id',
  'package',
  'lib-module',
  'wire-field',
  'doc-tenant',
  'cross-repo',
] as const;

/** Fitness 1 (unsafe/ambiguous) … 5 (ready to reuse) — see partner-type-reference-map. */
export type PartnerSurfaceFitnessScore = 1 | 2 | 3 | 4 | 5;

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
 *
 * Optional fitness (`fitnessScore` · `hasTestCoverage`) scores provenance /
 * reuse readiness (type-reference-map 1–5) for the generated health matrix.
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
  /** 1–5 reuse fitness (partner-type-reference-map). */
  readonly fitnessScore?: PartnerSurfaceFitnessScore;
  /** Whether mint/parse constructors have focused tests. */
  readonly hasTestCoverage?: boolean;
};

/**
 * Live PartnerCode instance — desk code linked to the PartnerCode brand +
 * registry that holds instances (usually partners-ops).
 */
export type PartnerSurfacePartnerCodeBag = {
  /** Inventory brand token / typeOrExport (must resolve to an active brand). */
  readonly brandRef: string;
  /** Inventory registry token that lists this code. */
  readonly registryRef: string;
  /** Operator phase when known (e.g. operator_ready). */
  readonly phase?: string;
  /** Desk call sign when known (e.g. ASH-001). */
  readonly callSign?: string;
};

/**
 * Live OutId seat — bookmaker account linked to the OutId brand + owning
 * PartnerCode in partners-ops.
 */
export type PartnerSurfaceOutIdBag = {
  /** Inventory brand token (OutId). */
  readonly brandRef: string;
  /** Inventory registry token that lists this out. */
  readonly registryRef: string;
  /** Owning PartnerCode. */
  readonly partnerCode: string;
  /** outs[].status when present. */
  readonly status?: string;
};

/** OutId wire shape — mirrors brand.OutId pattern. */
export const PARTNER_SURFACE_OUT_ID_PATTERN = /^out-[A-Z]{3,6}-[1-9][0-9]*$/;

/** PartnerCallSignCode shape used for partners-ops callSign checks. */
export const PARTNER_SURFACE_CALL_SIGN_PATTERN = /^[A-Z]{3,6}-[0-9]{3}$/;

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

export type PartnerDocumentationAuthority =
  'ssot' | 'contract' | 'runbook' | 'implementation' | 'plan' | 'derived';

/**
 * Documentation linkage is deliberately multi-domain. A partner document may
 * be mounted in Partner desk chrome while describing accounting, Telegram, or
 * compliance concepts. The first value is the primary classification.
 */
export type PartnerSurfaceDocumentationBag = {
  readonly refId: string; // brand-ok — document-local REF:ID v2 fragment
  readonly conceptDomains: readonly [ConceptDomain, ...ConceptDomain[]];
  readonly chromeDomains: readonly [PortalChromeDomainLane, ...PortalChromeDomainLane[]];
  readonly primaryPortalHref: string;
  readonly authority: PartnerDocumentationAuthority;
  readonly machineRefs?: readonly string[];
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
  readonly partnerCode?: PartnerSurfacePartnerCodeBag;
  readonly outId?: PartnerSurfaceOutIdBag;
  readonly registry?: PartnerSurfaceRegistryBag;
  readonly wireField?: PartnerSurfaceWireFieldBag;
  readonly chromeNav?: PartnerSurfaceChromeNavBag;
  readonly taxonomy?: PartnerSurfaceTaxonomyBag;
  readonly documentation?: PartnerSurfaceDocumentationBag;
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
  if (partial.partnerCode !== undefined)
    (out as { partnerCode?: PartnerSurfacePartnerCodeBag }).partnerCode = partial.partnerCode;
  if (partial.outId !== undefined)
    (out as { outId?: PartnerSurfaceOutIdBag }).outId = partial.outId;
  if (partial.registry !== undefined)
    (out as { registry?: PartnerSurfaceRegistryBag }).registry = partial.registry;
  if (partial.wireField !== undefined)
    (out as { wireField?: PartnerSurfaceWireFieldBag }).wireField = partial.wireField;
  if (partial.chromeNav !== undefined)
    (out as { chromeNav?: PartnerSurfaceChromeNavBag }).chromeNav = partial.chromeNav;
  if (partial.taxonomy !== undefined)
    (out as { taxonomy?: PartnerSurfaceTaxonomyBag }).taxonomy = partial.taxonomy;
  if (partial.documentation !== undefined)
    (out as { documentation?: PartnerSurfaceDocumentationBag }).documentation =
      partial.documentation;
  return out;
}

export type PartnerDocumentationRef = {
  readonly id: `doc.${string}`;
  readonly token: string;
  readonly path: string;
  readonly refId: string; // brand-ok — document-local REF:ID v2 fragment
  readonly conceptDomains: readonly [ConceptDomain, ...ConceptDomain[]];
  readonly chromeDomains: readonly [PortalChromeDomainLane, ...PortalChromeDomainLane[]];
  readonly primaryPortalHref: string;
  readonly authority: PartnerDocumentationAuthority;
  readonly owner: string;
  readonly properties: readonly string[];
  readonly machineRefs?: readonly string[];
};

/** Canonical partner-documentation register. REF:ID checks consume this list. */
export const PARTNER_DOCUMENTATION_REFS = [
  {
    id: 'doc.partner-surface-inventory',
    token: 'partner-surface-inventory',
    path: 'docs/design/partner-surface-inventory.md',
    refId: '0.1.partner-surface-inventory',
    conceptDomains: ['partners', 'portal', 'registry', 'operations'],
    chromeDomains: ['partner', 'knowledge'],
    primaryPortalHref: '/portal/partners/',
    authority: 'ssot',
    owner: 'partner surface inventory',
    properties: ['documentation register', 'surface/type/wire join'],
    machineRefs: [
      'lib/docs/partner-surface-inventory.ts',
      'public/registry/partner-surface-inventory.json',
    ],
  },
  {
    id: 'doc.partner-type-reference-map',
    token: 'partner-type-reference-map',
    path: 'docs/design/partner-type-reference-map.md',
    refId: '0.1.partner-type-reference-map',
    conceptDomains: ['partners', 'operations'],
    chromeDomains: ['knowledge', 'partner'],
    primaryPortalHref: '/portal/brands/#domain=operations&q=PartnerCode',
    authority: 'contract',
    owner: 'partners design',
    properties: ['identity graph', 'fitness scores', 'translation matrix'],
    machineRefs: ['lib/types/branded/operations.ts', 'packages/partners/src/core/identifiers.ts'],
  },
  {
    id: 'doc.partner-dashboard-mvp',
    token: 'partner-dashboard-mvp',
    path: 'docs/design/partner-dashboard-mvp.md',
    refId: '0.1.partner-dashboard-mvp',
    conceptDomains: [
      'partners',
      'accounting',
      'telegram',
      'compliance',
      'trading',
      'portal',
      'operations',
    ],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/',
    authority: 'contract',
    owner: '@factorywager/partners',
    properties: ['MVP composition and cutover contract'],
    machineRefs: [
      'docs/design/partner-dashboard-mvp.toml',
      'packages/partners/src/dashboard-plan.ts',
    ],
  },
  {
    id: 'doc.partner-dashboard-semantic-map',
    token: 'partner-dashboard-semantic-map',
    path: 'docs/design/partner-dashboard-semantic-map.md',
    refId: '0.1.partner-dashboard-semantic-map',
    conceptDomains: ['partners', 'accounting', 'telegram', 'compliance', 'trading', 'portal'],
    chromeDomains: ['partner', 'knowledge'],
    primaryPortalHref: '/portal/partners/',
    authority: 'contract',
    owner: 'partners nomenclature',
    properties: ['domain → concept → shape → surface → theme'],
    machineRefs: ['docs/design/partner-dashboard-mvp.toml', 'lib/portal/concept-domains.ts'],
  },
  {
    id: 'doc.partner-dashboard-field-lineage',
    token: 'partner-dashboard-field-lineage',
    path: 'docs/design/partner-dashboard-field-lineage.md',
    refId: '0.1.partner-dashboard-field-lineage',
    conceptDomains: ['partners', 'accounting', 'telegram', 'compliance', 'trading', 'data'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/',
    authority: 'contract',
    owner: 'partners reconciliation',
    properties: ['field provenance', 'source precedence', 'risk audit'],
    machineRefs: [
      'packages/partners/src/boundary/dashboard-artifact.ts',
      'packages/partners/src/dashboard-plan.ts',
    ],
  },
  {
    id: 'doc.partner-code-consolidation',
    token: 'partner-code-consolidation',
    path: 'docs/design/partner-code-consolidation.md',
    refId: '0.1.partner-code-consolidation',
    conceptDomains: ['partners', 'operations', 'portal'],
    chromeDomains: ['partner', 'knowledge'],
    primaryPortalHref: '/portal/partners/',
    authority: 'plan',
    owner: 'partners extraction',
    properties: ['source review', 'best/worst reuse decisions'],
    machineRefs: ['packages/partners/', 'docs/design/partner-dashboard-mvp.toml'],
  },
  {
    id: 'doc.unified-partner-profile',
    token: 'unified-partner-profile',
    path: 'docs/design/unified-partner-profile.md',
    refId: '0.1.unified-partner-profile',
    conceptDomains: ['partners', 'accounting', 'compliance', 'operations'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partner/',
    authority: 'contract',
    owner: 'partner profile',
    properties: ['canonical profile shape', 'CODE join'],
    machineRefs: ['lib/partner-profile/schema.ts', 'config/partner-profiles/'],
  },
  {
    id: 'doc.partner-money-integer-migration',
    token: 'partner-money-integer-migration',
    path: 'docs/design/partner-money-integer-migration.md',
    refId: '0.1.partner-money-integer-migration',
    conceptDomains: ['accounting', 'partners', 'operations'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/#section:accounting',
    authority: 'runbook',
    owner: 'partner accounting',
    properties: ['integer minor units', 'dual-write/backfill/finalize'],
    machineRefs: ['scripts/migrate-money-to-integers.ts', 'lib/partner-profile/ledger.ts'],
  },
  {
    id: 'doc.partner-domain-map',
    token: 'partner-domain-map',
    path: 'docs/harness/tenants/partner-domain-map.md',
    refId: '0.1.partner-domain-map',
    conceptDomains: ['partners', 'accounting', 'telegram', 'operations'],
    chromeDomains: ['knowledge', 'partner'],
    primaryPortalHref: '/portal/concepts/#domain=partners',
    authority: 'ssot',
    owner: 'partner-ops domain',
    properties: ['glossary cores + Factory overlay', 'seat capital desk'],
    machineRefs: ['lib/telegram/partner-ops-glossary.ts', 'lib/portal/concept-domains.ts'],
  },
  {
    id: 'doc.workspace-lane-cross-map',
    token: 'workspace-lane-cross-map',
    path: 'docs/harness/tenants/workspace-lane-cross-map.md',
    refId: '0.1.workspace-lane-cross-map',
    conceptDomains: ['operations', 'portal', 'partners'],
    chromeDomains: ['knowledge', 'partner'],
    primaryPortalHref: '/portal/lanes/',
    authority: 'ssot',
    owner: 'workspace taxonomy',
    properties: ['session/chrome/concept correlations', 'no containment'],
    machineRefs: ['lib/docs/workspace-taxonomy.ts', 'public/registry/workspace-lane-map.json'],
  },
  {
    id: 'doc.naming-grammar',
    token: 'naming-grammar',
    path: 'docs/organization/naming-grammar.md',
    refId: '0.1.naming-grammar',
    conceptDomains: ['operations', 'partners'],
    chromeDomains: ['knowledge'],
    primaryPortalHref: '/portal/lanes/',
    authority: 'contract',
    owner: 'organization',
    properties: ['<t>-<lane>-<slug>', 'session lane partner'],
    machineRefs: ['lib/docs/workspace-taxonomy.ts'],
  },
  {
    id: 'doc.partner-profile-readme',
    token: 'partner-profile README',
    path: 'lib/partner-profile/README.md',
    refId: '0.1.partner-profile-readme',
    conceptDomains: ['partners', 'accounting', 'operations'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partner/',
    authority: 'implementation',
    owner: 'partner profile',
    properties: ['profile runtime and operator commands'],
    machineRefs: ['lib/partner-profile/schema.ts', 'lib/partner-profile/onboard.ts'],
  },
  {
    id: 'doc.bookmakers-registry',
    token: 'bookmakers-registry',
    path: 'docs/harness/tenants/bookmakers-registry.md',
    refId: '0.1.bookmakers-registry',
    conceptDomains: ['trading', 'registry', 'partners'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/bookmakers/',
    authority: 'ssot',
    owner: '@factorywager/bookmakers',
    properties: ['sportsbook identity', 'skin and host catalog'],
    machineRefs: [
      'public/registry/bookmakers.json',
      'packages/partners/src/adapters/bookmakers.ts',
    ],
  },
  {
    id: 'doc.bookmakers-open-issues',
    token: 'bookmakers-open-issues',
    path: 'docs/harness/tenants/bookmakers-open-issues.md',
    refId: '0.1.bookmakers-open-issues',
    conceptDomains: ['trading', 'partners', 'operations'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/bookmakers/',
    authority: 'plan',
    owner: '@factorywager/bookmakers',
    properties: ['catalog gaps', 'operator review queue'],
    machineRefs: ['public/registry/bookmakers-open-issues.json'],
  },
  {
    id: 'doc.bookmakers-readme',
    token: 'bookmakers README',
    path: 'lib/bookmakers/README.md',
    refId: '0.1.bookmakers-readme',
    conceptDomains: ['trading', 'registry', 'partners'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/bookmakers/',
    authority: 'implementation',
    owner: '@factorywager/bookmakers',
    properties: ['registry merge and resolution behavior'],
    machineRefs: ['lib/bookmakers/merged-registry.ts', 'lib/bookmakers/resolve.ts'],
  },
  {
    id: 'doc.bookmakers-portal-source',
    token: 'bookmakers portal source',
    path: 'public/portal/bookmakers.md',
    refId: '0.1.bookmakers-portal-source',
    conceptDomains: ['portal', 'trading', 'partners'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/bookmakers/',
    authority: 'implementation',
    owner: 'portal Partner desk',
    properties: ['bookmaker catalog board guide'],
    machineRefs: ['public/portal/bookmakers/index.html', 'public/registry/bookmakers.json'],
  },
  {
    id: 'doc.partner-limits',
    token: 'partner-limits',
    path: 'docs/harness/tenants/partner-limits.md',
    refId: '0.1.partner-limits',
    conceptDomains: ['compliance', 'partners', 'trading'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/limits/',
    authority: 'contract',
    owner: 'partner limits',
    properties: ['limit raises', 'ops:limits:demo'],
    machineRefs: [
      'public/registry/limit-raises.json',
      'packages/partners/src/adapters/limit-changes.ts',
    ],
  },
  {
    id: 'doc.partner-package-group-handshake',
    token: 'partner-package-group-handshake',
    path: 'docs/harness/tenants/partner-package-group-handshake.md',
    refId: '0.1.partner-package-group-handshake',
    conceptDomains: ['telegram', 'partners', 'operations'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/factory/',
    authority: 'contract',
    owner: 'Factory Telegram',
    properties: ['Telegram package groups', 'handshake catalog'],
    machineRefs: [
      'lib/telegram/package-group-registry.ts',
      'packages/partners/src/adapters/telegram-handshake.ts',
    ],
  },
  {
    id: 'doc.partner-onboarding-package',
    token: 'partner-onboarding-package',
    path: 'docs/harness/tenants/partner-onboarding-package.md',
    refId: '0.1.partner-onboarding-package',
    conceptDomains: ['partners', 'telegram', 'operations'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partner/',
    authority: 'contract',
    owner: 'partner onboarding',
    properties: ['identity chain', 'onboarding package'],
    machineRefs: ['lib/operations/partner-onboard-package.ts'],
  },
  {
    id: 'doc.ops-partner-bridge',
    token: 'ops-partner-bridge',
    path: 'docs/harness/tenants/ops-partner-bridge.md',
    refId: '0.1.ops-partner-bridge',
    conceptDomains: ['operations', 'partners'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/',
    authority: 'contract',
    owner: 'ops-partner bridge',
    properties: ['ops tree identity', 'profile adapter boundary'],
    machineRefs: ['lib/operations/partner-profile-bridge.ts'],
  },
  {
    id: 'doc.partner-soft-settlement-track',
    token: 'partner-soft-settlement-track',
    path: 'docs/plans/partner-soft-settlement-track.md',
    refId: '0.1.partner-soft-settlement-track',
    conceptDomains: ['accounting', 'partners', 'operations'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/#section:accounting',
    authority: 'plan',
    owner: 'partner settlement',
    properties: ['settlement delivery track', 'Soft read-only weave'],
    machineRefs: ['lib/partner-profile/settlement-runner.ts', 'lib/partner-profile/ledger.ts'],
  },
  {
    id: 'doc.partners-package-readme',
    token: '@factorywager/partners README',
    path: 'packages/partners/README.md',
    refId: '0.1.partners-package-readme',
    conceptDomains: ['partners', 'operations', 'portal'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/',
    authority: 'implementation',
    owner: '@factorywager/partners',
    properties: ['package boundary', 'implemented/planned truth'],
    machineRefs: ['packages/partners/package.json', 'packages/partners/src/index.ts'],
  },
  {
    id: 'doc.partners-portal-source',
    token: 'partners portal source',
    path: 'public/portal/partners.md',
    refId: '0.1.partners-portal-source',
    conceptDomains: ['portal', 'partners', 'accounting', 'telegram'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/',
    authority: 'implementation',
    owner: 'portal Partner desk',
    properties: ['human board guide', 'registry/CLI routing'],
    machineRefs: ['public/portal/partners/index.html', 'lib/portal/page-concepts.ts'],
  },
  {
    id: 'doc.partner-consolidation-status-artifact',
    token: 'partner-consolidation-status artifact',
    path: 'docs/artifacts/partner-consolidation-status/README.md',
    refId: '0.1.partner-consolidation-status',
    conceptDomains: ['analytics', 'partners', 'portal'],
    chromeDomains: ['partner'],
    primaryPortalHref: '/portal/partners/',
    authority: 'derived',
    owner: 'partner MVP proposal artifact',
    properties: ['review snapshot', 'not partner-domain SSOT'],
    machineRefs: [
      'docs/artifacts/partner-consolidation-status/artifact.json',
      'docs/artifacts/partner-consolidation-status/index.html',
    ],
  },
] as const satisfies readonly PartnerDocumentationRef[];

export function partnerDocumentationSurfaceRows(): readonly PartnerSurfaceRow[] {
  return PARTNER_DOCUMENTATION_REFS.map(doc =>
    row({
      id: doc.id,
      aspect: 'doc-tenant',
      token: doc.token,
      repo: 'project-R-score',
      path: doc.path,
      href: doc.primaryPortalHref,
      properties: doc.properties,
      owner: doc.owner,
      documentation: {
        refId: doc.refId,
        conceptDomains: doc.conceptDomains,
        chromeDomains: doc.chromeDomains,
        primaryPortalHref: doc.primaryPortalHref,
        authority: doc.authority,
        ...(doc.machineRefs ? { machineRefs: doc.machineRefs } : {}),
      },
    })
  );
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
      fitnessScore: 4,
      hasTestCoverage: true,
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
      mintAuthority: 'parsePartnerCallSignCode parsePartnerCallSign',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: false,
      domain: 'operations',
      isActive: true,
      category: 'identity',
      fitnessScore: 4,
      hasTestCoverage: true,
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
      fitnessScore: 4,
      hasTestCoverage: true,
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
      fitnessScore: 5,
      hasTestCoverage: true,
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
      mintAuthority: 'parseOutId asOutId',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: false,
      replaces: ['accountId', 'SPEN-1 legacy'],
      domain: 'operations',
      registryRef: 'partners-ops',
      isActive: true,
      category: 'identity',
      fitnessScore: 2,
      hasTestCoverage: true,
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
      fitnessScore: 1,
      hasTestCoverage: true,
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
      fitnessScore: 5,
      hasTestCoverage: true,
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
      fitnessScore: 4,
      hasTestCoverage: true,
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
    id: 'wire.kalshi.outId',
    aspect: 'wire-field',
    machine: 'identity',
    token: 'outId',
    typeOrExport: 'OutId',
    repo: 'Kalshi-bot',
    path: 'Kalshi-bot/src/partner',
    properties: ['execution/provider wire', 'legacy raw string before extraction boundary'],
    owner: 'execution adapter',
    notes:
      'Explicit compatibility boundary for the pinned Kalshi partner submodule; new package-core code must parse to OutId',
    wireField: {
      wireName: 'outId',
      sourceSystemId: 'kalshi',
      resolvesTo: 'OutId',
      brandedType: 'OutId',
      pattern: 'outId',
      patterns: ['outId', 'out_id'],
      quarantineOnFail: true,
      boundaryPathGlobs: [
        'Kalshi-bot/src/partner/**',
        'Kalshi-bot/tools/partner-*.ts',
        'Kalshi-bot/tools/provision-fantasy402-vault.ts',
      ],
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
  ...partnerDocumentationSurfaceRows(),

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

type PartnerChromeNavItem = PortalChromeNavItem & {
  domain: 'partner';
  group: NonNullable<PortalChromeNavItem['group']>;
};

/** Live chrome nav items with Domain lane partner. */
export function listPartnerChromeNavItems(): readonly PartnerChromeNavItem[] {
  return [...PORTAL_PRIORITY_NAV, ...PORTAL_OVERFLOW_NAV].filter(
    (item): item is PartnerChromeNavItem => item.domain === 'partner' && item.group !== undefined
  );
}

function registryTokenFromHref(registryArtifact: string | undefined): string | undefined {
  if (!registryArtifact) return undefined;
  const base = registryArtifact.replace(/^\/registry\//, '').replace(/\.json$/, '');
  // tennis/partner-contracts → partner-contracts token in inventory
  return base.includes('/') ? base.split('/').pop() : base;
}

function chromeNavBag(item: PartnerChromeNavItem): PartnerSurfaceChromeNavBag {
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

/** Live desk PartnerCode row sourced from partners-ops (or a test fixture). */
export type PartnerSurfaceLiveCode = {
  readonly code: string;
  readonly phase?: string;
  readonly callSign?: string;
};

/** Live OutId seat sourced from partners-ops outs[] (or a test fixture). */
export type PartnerSurfaceLiveOut = {
  /** Wire/fixture seat id before pattern filter + inventory tokenization. */
  readonly outId: string; // brand-ok — partners-ops outs[] wire/fixture; not yet OutId brand
  readonly partnerCode: string;
  readonly status?: string;
};

/**
 * Derive partner-code aspect rows from live partners-ops codes (chrome-nav style).
 * Empty input → no partner-code rows (bake/validate should pass live codes).
 */
export function partnerCodeSurfaceRows(
  liveCodes: readonly PartnerSurfaceLiveCode[] = []
): readonly PartnerSurfaceRow[] {
  return [...liveCodes]
    .map(c => ({
      code: c.code.trim().toUpperCase(),
      phase: c.phase?.trim() || undefined,
      callSign: c.callSign?.trim().toUpperCase() || undefined,
    }))
    .filter(c => /^[A-Z]{3,6}$/.test(c.code))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(c => {
      const hrefs = partnerDeskHrefs(c.code);
      return row({
        id: `partner-code.${c.code}`,
        aspect: 'partner-code',
        machine: 'identity',
        token: c.code,
        typeOrExport: 'PartnerCode',
        repo: 'project-R-score',
        path: 'public/registry/partners-ops.json',
        href: hrefs.partnersHref,
        properties: [
          'live desk code',
          'derived-from-partners-ops',
          'brandRef=PartnerCode',
          'registryRef=partners-ops',
          ...(c.callSign ? [`callSign=${c.callSign}`] : []),
        ],
        owner: 'partners-ops',
        partnerCode: {
          brandRef: 'PartnerCode',
          registryRef: 'partners-ops',
          ...(c.phase ? { phase: c.phase } : {}),
          ...(c.callSign ? { callSign: c.callSign } : {}),
        },
      });
    });
}

/**
 * Derive out-id aspect rows from live partners-ops outs (partner-code style).
 * Empty input → no out-id rows.
 */
export function outIdSurfaceRows(
  liveOuts: readonly PartnerSurfaceLiveOut[] = []
): readonly PartnerSurfaceRow[] {
  return [...liveOuts]
    .map(o => ({
      outId: o.outId.trim(),
      partnerCode: o.partnerCode.trim().toUpperCase(),
      status: o.status?.trim() || undefined,
    }))
    .filter(o => PARTNER_SURFACE_OUT_ID_PATTERN.test(o.outId) && /^[A-Z]{3,6}$/.test(o.partnerCode))
    .sort((a, b) => a.outId.localeCompare(b.outId))
    .map(o => {
      const hrefs = partnerDeskHrefs(o.partnerCode);
      return row({
        id: `out-id.${o.outId}`,
        aspect: 'out-id',
        machine: 'identity',
        token: o.outId,
        typeOrExport: 'OutId',
        repo: 'project-R-score',
        path: 'public/registry/partners-ops.json',
        href: hrefs.partnersHref,
        properties: [
          'live out seat',
          'derived-from-partners-ops',
          'brandRef=OutId',
          'registryRef=partners-ops',
          `partnerCode=${o.partnerCode}`,
          ...(o.status ? [`status=${o.status}`] : []),
        ],
        owner: 'partners-ops',
        outId: {
          brandRef: 'OutId',
          registryRef: 'partners-ops',
          partnerCode: o.partnerCode,
          ...(o.status ? { status: o.status } : {}),
        },
      });
    });
}

export type PartnerSurfaceBuildOptions = {
  /** When set, partner-code rows are derived from these codes (partners-ops bake). */
  readonly livePartnerCodes?: readonly PartnerSurfaceLiveCode[];
  /** When set, out-id rows are derived from these outs (partners-ops bake). */
  readonly liveOutIds?: readonly PartnerSurfaceLiveOut[];
};

export function allPartnerSurfaceRows(
  options: PartnerSurfaceBuildOptions = {}
): readonly PartnerSurfaceRow[] {
  return [
    ...PARTNER_SURFACE_STATIC_ROWS,
    ...partnerChromeNavSurfaceRows(),
    ...partnerPortalBoardSurfaceRows(),
    ...partnerCodeSurfaceRows(options.livePartnerCodes ?? []),
    ...outIdSurfaceRows(options.liveOutIds ?? []),
  ];
}

export type PartnerSurfaceInventory = {
  readonly kind: 'partner-surface-inventory';
  /** v3 adds the documentation linkage bag and canonical REF:ID register. */
  readonly schemaVersion: 3;
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
  bakedAt: string = new Date().toISOString(),
  options: PartnerSurfaceBuildOptions = {}
): PartnerSurfaceInventory {
  const chrome = PORTAL_DOMAIN_LANE_META.find(m => m.id === 'partner');
  if (!chrome) throw new Error('missing chrome Domain partner');
  if (!CONCEPT_DOMAINS.includes('partners')) throw new Error('missing ConceptDomain partners');
  const session = SESSION_LANES.find(l => l.id === 'partner');
  if (!session) throw new Error('missing session lane partner');
  const partnerCorr = WORKSPACE_TAXONOMY_CORRELATIONS.find(r => r.sessionLane === 'partner');

  return {
    kind: 'partner-surface-inventory',
    schemaVersion: 3,
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
    rows: allPartnerSurfaceRows(options),
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
