import { describe, expect, test } from 'bun:test';
import {
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
  PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN,
  PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT,
  isLegacyPartnerComparisonRequested,
} from '../packages/partners/src/index.ts';

describe('partner dashboard consumer contract', () => {
  test('owns the current compatibility and future canonical input planes', () => {
    expect(PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS).toHaveLength(7);
    expect(PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS).toEqual([
      '/registry/soft-accounting-export.json',
    ]);
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.transition).toMatchObject({
      implementationStatus: 'planned',
      inputMode: 'canonical-single-artifact-with-explicit-legacy-comparison',
      canonicalPrimaryInputRef: PARTNER_DASHBOARD_ARTIFACT_REF,
      canonicalFailurePolicy: 'error-never-fallback',
      automaticLegacyFallback: false,
    });
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.target).toEqual({
      inputMode: 'canonical-single-artifact',
      primaryInputRef: '/registry/partners-dashboard.json',
      retirementCondition: 'portal-loads-only-target-artifact',
    });
    const legacyRefs = [
      ...PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
      ...PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
    ];
    expect(new Set(legacyRefs).size).toBe(8);
    expect(legacyRefs.every(ref => /^\/registry\/[^/].*\.json$/.test(ref))).toBe(true);
    expect(legacyRefs).not.toContain(PARTNER_DASHBOARD_ARTIFACT_REF);
    expect(PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.requiredInputRefs).toBe(
      PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS
    );
    expect(PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.optionalInputRefs).toBe(
      PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS
    );
    expect(Object.isFrozen(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT)).toBe(true);
    expect(Object.isFrozen(PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN)).toBe(true);
  });

  test('activates legacy comparison only through the exact query opt-in', () => {
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=legacy')).toBe(true);
    expect(
      isLegacyPartnerComparisonRequested(
        new URL('https://example.test/portal/partners/?compare=legacy#partner/ASH')
      )
    ).toBe(true);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/#compare=legacy')).toBe(false);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=true')).toBe(false);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=Legacy')).toBe(false);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=')).toBe(false);
    expect(
      isLegacyPartnerComparisonRequested('/portal/partners/?compare=legacy&compare=other')
    ).toBe(false);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/')).toBe(false);
  });
});
