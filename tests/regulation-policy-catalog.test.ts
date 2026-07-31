// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  auditRegulationPolicyCatalog,
  generateRegulationPolicyCode,
  JURISDICTION_CATALOG,
  REGULATION_POLICY_CATALOG,
  resolveRegulationPolicy,
  type RegulationPolicyDefinition,
} from '../lib/operations/regulation-policy-catalog.ts';

describe('governed regulation policy catalog', () => {
  test('passes the policy audit with deterministic codes', () => {
    const audit = auditRegulationPolicyCatalog(
      REGULATION_POLICY_CATALOG,
      JURISDICTION_CATALOG,
      new Date('2026-07-31T12:00:00.000Z')
    );
    expect(audit).toMatchObject({
      ok: true,
      policies: 4,
      active: 4,
      errors: 0,
      warnings: 0,
    });

    const policy = resolveRegulationPolicy(REGULATION_POLICY_CATALOG[1]);
    expect(policy).toMatchObject({
      authority: 'state',
      playerAgeMin: 21,
      identityRequired: false,
      dailyLimit: 50_000,
      policyCode: 'FW-LIMIT-MA-BASKETBALL-OVER-UNDER-JURISDICTION',
    });
    expect(generateRegulationPolicyCode(policy)).toBe(policy.policyCode);
  });

  test('detects conflicting active policies and missing block alerts', () => {
    const base = REGULATION_POLICY_CATALOG[0];
    const conflicting = {
      ...base,
      key: 'policy.MA.soccer.match_winner_override',
      maxBet: base.maxBet + 1,
      alertRuleKey: undefined,
    } satisfies RegulationPolicyDefinition;
    const audit = auditRegulationPolicyCatalog(
      [...REGULATION_POLICY_CATALOG, conflicting],
      JURISDICTION_CATALOG,
      new Date('2026-07-31T12:00:00.000Z')
    );

    expect(audit.ok).toBe(false);
    expect(audit.issues.map(issue => issue.code)).toEqual(
      expect.arrayContaining([
        'conflicting-active-policy',
        'missing-alert-rule',
      ])
    );
  });

  test('warns when a catalog policy has expired', () => {
    const expired = {
      ...REGULATION_POLICY_CATALOG[0],
      status: 'revoked',
      expirationDate: '2026-07-30',
    } satisfies RegulationPolicyDefinition;
    const audit = auditRegulationPolicyCatalog(
      [expired],
      JURISDICTION_CATALOG,
      new Date('2026-07-31T12:00:00.000Z')
    );
    expect(audit).toMatchObject({ ok: true, active: 0, warnings: 1 });
    expect(audit.issues[0]?.code).toBe('expired-policy');
  });
});
