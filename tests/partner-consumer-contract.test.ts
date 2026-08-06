import { describe, expect, test } from 'bun:test';
import {
  PARTNER_DASHBOARD_CONSUMER_CONTRACT,
  PARTNER_DASHBOARD_CURRENT_OPTIONAL_INPUTS,
  PARTNER_DASHBOARD_CURRENT_REQUIRED_INPUTS,
  PARTNER_DASHBOARD_PRIMARY_INPUT,
  isLegacyPartnerComparisonRequested,
} from '../packages/partners/src/index.ts';

describe('partner dashboard consumer contract', () => {
  test('owns the current compatibility and future canonical input planes', () => {
    expect(PARTNER_DASHBOARD_CURRENT_REQUIRED_INPUTS).toHaveLength(7);
    expect(PARTNER_DASHBOARD_CURRENT_OPTIONAL_INPUTS).toEqual([
      '/registry/soft-accounting-export.json',
    ]);
    expect(PARTNER_DASHBOARD_CONSUMER_CONTRACT.transition).toMatchObject({
      implementationStatus: 'planned',
      inputMode: 'canonical-single-artifact-with-explicit-legacy-compare',
      primaryInputRef: PARTNER_DASHBOARD_PRIMARY_INPUT,
      canonicalFailurePolicy: 'error-never-fallback',
      automaticLegacyFallback: false,
    });
    expect(PARTNER_DASHBOARD_CONSUMER_CONTRACT.target).toEqual({
      inputMode: 'canonical-single-artifact',
      primaryInputRef: '/registry/partners-dashboard.json',
      retirementCondition: 'portal-loads-only-target-artifact',
    });
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
    expect(isLegacyPartnerComparisonRequested('/portal/partners/')).toBe(false);
  });
});
