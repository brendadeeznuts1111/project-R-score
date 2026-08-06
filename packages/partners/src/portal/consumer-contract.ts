import { PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1 } from '../core/types.ts';

export const PARTNER_DASHBOARD_ENTRYPOINT = 'public/portal/partners/index.html';
export const PARTNER_DASHBOARD_PRIMARY_INPUT = '/registry/partners-dashboard.json';

export const PARTNER_DASHBOARD_CURRENT_REQUIRED_INPUTS = Object.freeze([
  '/registry/telegram-handshake.json',
  '/registry/seat-capital-desk.json',
  '/registry/telegram-handshake-catalog.json',
  '/registry/scrape-wire-taxonomy.json',
  '/registry/partners-ops.json',
  '/registry/partner-profiles.json',
  '/registry/limit-raises.json',
] as const);

export const PARTNER_DASHBOARD_CURRENT_OPTIONAL_INPUTS = Object.freeze([
  '/registry/soft-accounting-export.json',
] as const);

export const PARTNER_DASHBOARD_LEGACY_COMPARE = Object.freeze({
  queryKey: 'compare',
  queryValue: 'legacy',
  failurePolicy: 'warn-never-fallback',
  requiredInputRefs: PARTNER_DASHBOARD_CURRENT_REQUIRED_INPUTS,
  optionalInputRefs: PARTNER_DASHBOARD_CURRENT_OPTIONAL_INPUTS,
});

export const PARTNER_DASHBOARD_CONSUMER_CONTRACT = Object.freeze({
  schema: PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1,
  entrypointPath: PARTNER_DASHBOARD_ENTRYPOINT,
  current: Object.freeze({
    implementationStatus: 'current-compatibility',
    inputMode: 'legacy-multi-artifact',
    requiredInputRefs: PARTNER_DASHBOARD_CURRENT_REQUIRED_INPUTS,
    optionalInputRefs: PARTNER_DASHBOARD_CURRENT_OPTIONAL_INPUTS,
  }),
  transition: Object.freeze({
    implementationStatus: 'planned',
    inputMode: 'canonical-single-artifact-with-explicit-legacy-compare',
    primaryInputRef: PARTNER_DASHBOARD_PRIMARY_INPUT,
    canonicalFailurePolicy: 'error-never-fallback',
    automaticLegacyFallback: false,
    legacyCompare: PARTNER_DASHBOARD_LEGACY_COMPARE,
  }),
  target: Object.freeze({
    inputMode: 'canonical-single-artifact',
    primaryInputRef: PARTNER_DASHBOARD_PRIMARY_INPUT,
    retirementCondition: 'portal-loads-only-target-artifact',
  }),
});

/** Query-only opt-in; partner hash routes never activate legacy comparison. */
export function isLegacyPartnerComparisonRequested(input: string | URL): boolean {
  const url = input instanceof URL ? input : new URL(input, 'https://partners.invalid');
  return (
    url.searchParams.get(PARTNER_DASHBOARD_LEGACY_COMPARE.queryKey) ===
    PARTNER_DASHBOARD_LEGACY_COMPARE.queryValue
  );
}
