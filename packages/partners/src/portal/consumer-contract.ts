import { PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1 } from '../core/types.ts';

export type PartnerDashboardRegistryJsonRef = `/registry/${string}.json`;
export type PartnerDashboardInputRefs = {
  readonly requiredInputRefs: readonly PartnerDashboardRegistryJsonRef[];
  readonly optionalInputRefs: readonly PartnerDashboardRegistryJsonRef[];
};

export const PARTNER_DASHBOARD_ENTRYPOINT = 'public/portal/partners/index.html';
export const PARTNER_DASHBOARD_ARTIFACT_REF =
  '/registry/partners-dashboard.json' as const satisfies PartnerDashboardRegistryJsonRef;

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

export const PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN = Object.freeze({
  implementationStatus: 'planned',
  activation: 'explicit-search-param',
  searchParam: 'compare',
  searchValue: 'legacy',
  loadOrder: 'after-canonical-validation',
  resultRole: 'diagnostic-only',
  failurePolicy: 'warn-never-fallback',
  requiredInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
  optionalInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
});

export const PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT = Object.freeze({
  artifactSchema: PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1,
  entrypointPath: PARTNER_DASHBOARD_ENTRYPOINT,
  currentCompatibility: Object.freeze({
    implementationStatus: 'current-compatibility',
    inputMode: 'legacy-multi-artifact',
    requiredInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
    optionalInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
  }),
  transition: Object.freeze({
    implementationStatus: 'planned',
    inputMode: 'canonical-single-artifact-with-explicit-legacy-comparison',
    canonicalInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
    canonicalFailurePolicy: 'error-never-fallback',
    automaticLegacyFallback: false,
    legacyComparison: PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN,
  }),
  target: Object.freeze({
    inputMode: 'canonical-single-artifact',
    canonicalInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
    retirementCondition: 'portal-loads-only-target-artifact',
    transitionPolicyStatus: 'retired',
    legacyComparisonPolicy: 'removed',
  }),
});

export type PartnerDashboardPortalConsumerContract =
  typeof PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT;

/** Query-only opt-in; partner hash routes never activate legacy comparison. */
export function isLegacyPartnerComparisonRequested(input: string | URL): boolean {
  const url = input instanceof URL ? input : new URL(input, 'https://partners.invalid');
  const values = url.searchParams.getAll(PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.searchParam);
  return values.length === 1 && values[0] === PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.searchValue;
}
