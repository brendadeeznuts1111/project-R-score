// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  bakeLabel,
  canonicalProfileCoverage,
  coverageBarStyle,
  filterPartnerOuts,
  flattenPartnerOuts,
  indexOpsByPartner,
  isLegacyPartnerComparisonRequested,
  listPartnerPhases,
  normalizePartnerCode,
  partnerReadinessGate,
  projectDashboardToOpsShape,
  summarizePartnerDesk,
} from '../public/portal/partners/partners-board.js';

const sampleOps = {
  schema: 'factorywager.partners-ops.v2',
  summary: {
    partners: 2,
    accounts: 3,
    trackedLimits: 2,
    communicationReady: 2,
    incompleteOuts: 1,
    readyAccounts: 1,
  },
  partners: [
    {
      code: 'ASH',
      callSign: 'ASH-001',
      phase: 'operator_ready',
      phaseConceptId: 'partner.phase.operator_ready',
      outs: [
        {
          id: 'out-ASH-1',
          status: 'ready',
          incomplete: false,
          maxBet: '500',
          book: { name: 'Hard Rock', type: 'legal' },
          funding: { method: 'venmo' },
          credentials: { username: 'ash1' },
        },
        {
          id: 'out-ASH-2',
          status: 'deferred',
          incomplete: true,
          maxBet: '—',
          book: { name: 'Hard Rock', type: 'legal' },
          funding: { method: 'venmo' },
          credentials: { username: '—' },
        },
      ],
    },
    {
      code: 'bil',
      callSign: 'BIL-001',
      phase: 'onboarding',
      phaseConceptId: 'partner.phase.onboarding',
      outs: [
        {
          id: 'out-BIL-1',
          status: 'ready',
          incomplete: false,
          maxBet: '250',
          book: { name: 'Caesars', type: 'legal' },
          funding: { method: 'wire' },
          credentials: { username: 'bil1' },
        },
      ],
    },
  ],
};

describe('partners-board domain helpers', () => {
  test('normalizePartnerCode uppercases codes', () => {
    expect(normalizePartnerCode(' ash ')).toBe('ASH');
    expect(normalizePartnerCode(null)).toBe('');
  });

  test('indexOpsByPartner maps codes', () => {
    const map = indexOpsByPartner(sampleOps);
    expect(map.size).toBe(2);
    expect(map.get('ASH')?.callSign).toBe('ASH-001');
    expect(map.get('BIL')?.phase).toBe('onboarding');
  });

  test('flatten and filter outs', () => {
    const all = flattenPartnerOuts(sampleOps);
    expect(all).toHaveLength(3);
    expect(filterPartnerOuts(all, { status: 'ready' })).toHaveLength(2);
    expect(filterPartnerOuts(all, { partnerCode: 'ASH', incompleteOnly: true })).toHaveLength(1);
    expect(filterPartnerOuts(all, { partnerCode: 'BIL' })[0]?.out.id).toBe('out-BIL-1');
  });

  test('summarizePartnerDesk aggregates domain metrics', () => {
    const desk = summarizePartnerDesk(sampleOps, {
      operatorReady: 1,
      inviteGaps: 2,
      rows: [{}, {}],
    });
    expect(desk.partners).toBe(2);
    expect(desk.outs).toBe(3);
    expect(desk.readyOuts).toBe(2);
    expect(desk.deferredOuts).toBe(1);
    expect(desk.incompleteOuts).toBe(1);
    expect(desk.inviteGaps).toBe(2);
    expect(desk.limitCoveragePct).toBe(67);
    expect(desk.phases.operator_ready).toBe(1);
    expect(desk.phases.onboarding).toBe(1);
  });

  test('listPartnerPhases and coverageBarStyle', () => {
    const phases = listPartnerPhases(sampleOps);
    expect(phases.map(p => p.phase).sort()).toEqual(['onboarding', 'operator_ready']);
    expect(coverageBarStyle(90).tone).toBe('ok');
    expect(coverageBarStyle(50).tone).toBe('warn');
    expect(coverageBarStyle(10).tone).toBe('bad');
    expect(coverageBarStyle(150).pct).toBe(100);
  });

  test('readiness distinguishes legacy visibility from canonical profile coverage', () => {
    expect(
      canonicalProfileCoverage(
        { partners: [{ code: 'ASH' }, { code: 'BIL' }] },
        null,
        { profiles: { ASH: {}, NOV: {}, SPEN: {} }, summary: { count: 3 } }
      )
    ).toEqual({
      partnerCodes: ['ASH', 'BIL'],
      coveredCodes: ['ASH'],
      missingCodes: ['BIL'],
    });
    expect(
      partnerReadinessGate({
        partnerCount: 4,
        canonicalProfileCount: 0,
        incompleteOuts: 0,
        inviteGaps: 0,
      })
    ).toEqual({
      tone: 'warn',
      label: 'legacy ready · profiles 0/4',
      ok: false,
      profilesReady: false,
      gaps: 0,
    });
    expect(
      partnerReadinessGate({
        partnerCount: 4,
        canonicalProfileCount: 4,
        incompleteOuts: 0,
        inviteGaps: 0,
      }).tone
    ).toBe('pass');
    expect(
      partnerReadinessGate({
        partnerCount: 4,
        canonicalProfileCount: 0,
        incompleteOuts: 1,
      }).label
    ).toBe('legacy gaps · profiles 0/4');
    expect(partnerReadinessGate({ partnerCount: 0 }).tone).toBe('fail');
  });

  test('dashboard projection and query-only legacy compare helpers', () => {
    const ops = projectDashboardToOpsShape({
      schema: 'factorywager.partners-dashboard.v1',
      summary: { partnerCount: 1, registeredOutCount: 1, operatorReadyPartnerCount: 1 },
      partners: [
        {
          partnerCode: 'ASH',
          callSign: 'ASH-001',
          operationalPhase: 'operator_ready',
          communication: { chatLinked: true },
          outs: [
            {
              outId: 'out-ASH-1',
              sportsbookId: 'hard-rock-florida',
              operationalStatus: 'ready',
              fundingStatus: 'unknown',
            },
          ],
        },
      ],
    });
    expect(ops.partners[0]?.code).toBe('ASH');
    expect(flattenPartnerOuts(ops)).toHaveLength(1);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=legacy')).toBe(false);
    expect(bakeLabel(null).text).toBe('—');
  });
});
