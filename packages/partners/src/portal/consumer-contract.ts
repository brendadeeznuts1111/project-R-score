import { PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2 } from '../core/types.ts';

export type PartnerDashboardRegistryJsonRef = `/registry/${string}.json`;
export type PartnerDashboardInputRefs = {
  readonly requiredInputRefs: readonly PartnerDashboardRegistryJsonRef[];
  readonly optionalInputRefs: readonly PartnerDashboardRegistryJsonRef[];
};

export const PARTNER_DASHBOARD_ENTRYPOINT = 'public/portal/partners/index.html';
export const PARTNER_DASHBOARD_ARTIFACT_REF =
  '/registry/partners-dashboard.json' as const satisfies PartnerDashboardRegistryJsonRef;

/**
 * Historical multi-artifact inventory (pre-cutover).
 * Retained for bake scripts and documentation — not a board load path.
 */
export const PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS = Object.freeze([
  '/registry/telegram-handshake.json',
  '/registry/seat-capital-desk.json',
  '/registry/telegram-handshake-catalog.json',
  '/registry/scrape-wire-taxonomy.json',
  '/registry/partners-ops.json',
  '/registry/partner-profiles.json',
  '/registry/limit-raises.json',
] as const satisfies readonly PartnerDashboardRegistryJsonRef[]);

export const PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS = Object.freeze([
  '/registry/soft-accounting-export.json',
] as const satisfies readonly PartnerDashboardRegistryJsonRef[]);

/**
 * Retired query-only legacy multi-fetch plan.
 * Board no longer activates `?compare=legacy`; inventory kept for history only.
 */
export const PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN = Object.freeze({
  implementationStatus: 'removed' as const,
  activation: 'none' as const,
  searchParam: 'compare',
  searchValue: 'legacy',
  loadOrder: 'never' as const,
  resultRole: 'removed' as const,
  failurePolicy: 'n/a' as const,
  requiredInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
  optionalInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
});

const FETCH_TRANSPORT = Object.freeze({
  moduleRef: '/portal/fetch-json.js',
  exportName: 'fetchJsonResult',
  defaultTimeoutMs: 5000,
  contentTypeDiagnosticPolicy: 'advisory-debug-gated',
  requiredFailurePolicy: 'throw-path-qualified-error',
  optionalFailurePolicy: 'explicit-catch-to-null',
});

/**
 * Portal consumer contract.
 *
 * Active plane: canonical single-artifact load of partners-dashboard.json
 * (error-never-fallback). Transition policy and legacy comparison are retired.
 */
export const PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT = Object.freeze({
  artifactSchema: PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2,
  entrypointPath: PARTNER_DASHBOARD_ENTRYPOINT,
  /** Historical multi-artifact plane (inventory only). */
  currentCompatibility: Object.freeze({
    implementationStatus: 'current-compatibility',
    inputMode: 'legacy-multi-artifact',
    fetchTransport: FETCH_TRANSPORT,
    requiredInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
    optionalInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
  }),
  /**
   * Retired cutover plane. TOML `transition_implementation_status` must be `retired`
   * when `implementation_status = implemented`.
   */
  transition: Object.freeze({
    implementationStatus: 'retired',
    inputMode: 'canonical-single-artifact',
    canonicalInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
    canonicalFailurePolicy: 'error-never-fallback',
    automaticLegacyFallback: false,
    requiredInputRefs: Object.freeze([
      PARTNER_DASHBOARD_ARTIFACT_REF,
    ]) as readonly PartnerDashboardRegistryJsonRef[],
    optionalInputRefs: Object.freeze([]) as readonly PartnerDashboardRegistryJsonRef[],
    fetchTransport: FETCH_TRANSPORT,
    /** Present only as historical inventory; activation is none. */
    legacyComparison: PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN,
  }),
  /** Active / target plane — single artifact only. */
  target: Object.freeze({
    inputMode: 'canonical-single-artifact',
    canonicalInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
    retirementCondition: 'portal-loads-only-target-artifact',
    transitionPolicyStatus: 'retired',
    legacyComparisonPolicy: 'removed',
  }),
  /** Explicit active consumer (matches TOML implementation_status = implemented). */
  implemented: Object.freeze({
    implementationStatus: 'implemented',
    inputMode: 'canonical-single-artifact',
    canonicalInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
    canonicalFailurePolicy: 'error-never-fallback',
    automaticLegacyFallback: false,
    requiredInputRefs: Object.freeze([
      PARTNER_DASHBOARD_ARTIFACT_REF,
    ]) as readonly PartnerDashboardRegistryJsonRef[],
    optionalInputRefs: Object.freeze([]) as readonly PartnerDashboardRegistryJsonRef[],
    fetchTransport: FETCH_TRANSPORT,
  }),
});

export type PartnerDashboardPortalConsumerContract =
  typeof PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT;

/**
 * Legacy comparison is retired — always false.
 * Hash routes and query params never activate multi-fetch diagnostics.
 */
export function isLegacyPartnerComparisonRequested(_input: string | URL): boolean {
  return false;
}

/** True when value matches the active partners-dashboard artifact schema. */
export function isPartnerDashboardArtifactSchema(value: unknown): boolean {
  return value === PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2;
}
