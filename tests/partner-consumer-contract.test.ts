import { describe, expect, test } from 'bun:test';
import {
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
  PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN,
  PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT,
  isLegacyPartnerComparisonRequested,
  isPartnerDashboardArtifactSchema,
} from '../packages/partners/src/index.ts';

describe('partner dashboard consumer contract', () => {
  test('owns implemented single-artifact load; legacy comparison retired', () => {
    expect(PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS).toHaveLength(7);
    expect(PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS).toEqual([
      '/registry/soft-accounting-export.json',
    ]);
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.currentCompatibility).toEqual({
      implementationStatus: 'current-compatibility',
      inputMode: 'legacy-multi-artifact',
      fetchTransport: {
        moduleRef: '/portal/fetch-json.js',
        exportName: 'fetchJsonResult',
        defaultTimeoutMs: 5000,
        contentTypeDiagnosticPolicy: 'advisory-debug-gated',
        requiredFailurePolicy: 'throw-path-qualified-error',
        optionalFailurePolicy: 'explicit-catch-to-null',
      },
      requiredInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
      optionalInputRefs: PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
    });
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.implemented).toMatchObject({
      implementationStatus: 'implemented',
      inputMode: 'canonical-single-artifact',
      canonicalInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
      canonicalFailurePolicy: 'error-never-fallback',
      automaticLegacyFallback: false,
      requiredInputRefs: [PARTNER_DASHBOARD_ARTIFACT_REF],
      optionalInputRefs: [],
    });
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.transition).toMatchObject({
      implementationStatus: 'retired',
      inputMode: 'canonical-single-artifact',
      canonicalInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
    });
    expect(PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.implementationStatus).toBe('removed');
    expect(PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.activation).toBe('none');
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.target).toEqual({
      inputMode: 'canonical-single-artifact',
      canonicalInputRef: '/registry/partners-dashboard.json',
      retirementCondition: 'portal-loads-only-target-artifact',
      transitionPolicyStatus: 'retired',
      legacyComparisonPolicy: 'removed',
    });
    const legacyRefs = [
      ...PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
      ...PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
    ];
    expect(new Set(legacyRefs).size).toBe(8);
    expect(legacyRefs.every(ref => /^\/registry\/[^/].*\.json$/.test(ref))).toBe(true);
    expect(legacyRefs).not.toContain(PARTNER_DASHBOARD_ARTIFACT_REF);
    expect(Object.isFrozen(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT)).toBe(true);
    expect(Object.isFrozen(PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN)).toBe(true);
    expect(isPartnerDashboardArtifactSchema('factorywager.partners-dashboard.v2')).toBe(true);
    expect(isPartnerDashboardArtifactSchema('factorywager.partners-ops.v2')).toBe(false);
  });

  test('never activates legacy comparison (retired)', () => {
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=legacy')).toBe(false);
    expect(
      isLegacyPartnerComparisonRequested(
        new URL('https://example.test/portal/partners/?compare=legacy#partner/ASH')
      )
    ).toBe(false);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/#compare=legacy')).toBe(false);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=true')).toBe(false);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/')).toBe(false);
  });
});
