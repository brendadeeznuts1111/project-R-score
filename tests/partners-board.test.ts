// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import * as board from '../public/portal/partners/partners-board.js';
import {
  bakeLabel,
  coverageBarStyle,
  filterPartnerOuts,
  flattenDashboardOuts,
  normalizePartnerCode,
  partnerReadinessGate,
  summarizeDashboardDesk,
} from '../public/portal/partners/partners-board.js';

const sampleDashboard = {
  schema: 'factorywager.partners-dashboard.v2',
  summary: {
    partnerCount: 2,
    canonicalProfileCount: 2,
    registeredOutCount: 3,
    activeOutCount: 2,
    operatorReadyPartnerCount: 1,
    attentionPartnerCount: 0,
  },
  partners: [
    {
      partnerCode: 'ASH',
      callSign: 'ASH-001',
      operationalPhase: 'operator_ready',
      communication: { chatLinked: true, handshakeStatus: 'operator_ready' },
      outs: [
        {
          outId: 'out-ASH-1',
          sportsbookId: 'hard-rock-florida',
          operationalStatus: 'ready',
          fundingStatus: 'funded',
          limitCoverageRatio: 1,
          externalAccountRefs: [{ sourceSystemId: 'tennis-hq', externalId: 'x' }],
        },
        {
          outId: 'out-ASH-2',
          sportsbookId: 'hard-rock-florida',
          operationalStatus: 'deferred',
          fundingStatus: 'funded',
          limitCoverageRatio: 0,
          externalAccountRefs: [],
        },
      ],
      attention: [],
      limits: { tracked: 1, missing: 1, coverageRatio: 0.5 },
    },
    {
      partnerCode: 'BIL',
      callSign: 'BIL-001',
      operationalPhase: 'onboarding',
      communication: { chatLinked: false, handshakeStatus: 'designated' },
      outs: [
        {
          outId: 'out-BIL-1',
          sportsbookId: 'partner-book-tbd',
          operationalStatus: 'ready',
          fundingStatus: 'partial',
        },
      ],
      attention: [],
      limits: { tracked: 0, missing: 0, coverageRatio: 0 },
    },
  ],
};

describe('partners-board domain helpers', () => {
  test('normalizePartnerCode uppercases codes', () => {
    expect(normalizePartnerCode(' ash ')).toBe('ASH');
    expect(normalizePartnerCode(null)).toBe('');
  });

  test('filterPartnerOuts filters dashboard flatten rows', () => {
    const all = flattenDashboardOuts(sampleDashboard);
    expect(all).toHaveLength(3);
    expect(filterPartnerOuts(all, { status: 'ready' })).toHaveLength(2);
    expect(filterPartnerOuts(all, { partnerCode: 'ASH', incompleteOnly: true })).toHaveLength(1);
    expect(filterPartnerOuts(all, { missingLimitEvidenceOnly: true }).every(o => o.missingLimitEvidence)).toBe(
      true
    );
    expect(filterPartnerOuts(all, { noExternalRefOnly: true }).every(o => o.missingExternalRef)).toBe(true);
  });

  test('summarizeDashboardDesk aggregates dashboard metrics', () => {
    const desk = summarizeDashboardDesk(sampleDashboard);
    expect(desk.partners).toBe(2);
    expect(desk.outs).toBe(3);
    expect(desk.readyOuts).toBe(2);
    expect(desk.operatorReady).toBe(1);
  });

  test('coverageBarStyle and readiness gate', () => {
    expect(coverageBarStyle(90).tone).toBe('ok');
    expect(coverageBarStyle(50).tone).toBe('warn');
    expect(coverageBarStyle(10).tone).toBe('bad');
    expect(coverageBarStyle(150).pct).toBe(100);
    expect(
      partnerReadinessGate({
        partnerCount: 4,
        canonicalProfileCount: 0,
        incompleteOuts: 0,
        inviteGaps: 0,
      })
    ).toMatchObject({
      tone: 'warn',
      ok: false,
      profilesReady: false,
    });
    expect(
      partnerReadinessGate({
        partnerCount: 4,
        canonicalProfileCount: 4,
        incompleteOuts: 0,
        inviteGaps: 0,
      }).tone
    ).toBe('pass');
    expect(partnerReadinessGate({ partnerCount: 0 }).tone).toBe('fail');
  });

  test('ops-shaped inventory helpers are removed from the board module', () => {
    expect(board.indexOpsByPartner).toBeUndefined();
    expect(board.flattenPartnerOuts).toBeUndefined();
    expect(board.summarizePartnerDesk).toBeUndefined();
    expect(board.listPartnerPhases).toBeUndefined();
    expect(board.canonicalProfileCoverage).toBeUndefined();
    expect(board.projectDashboardToOpsShape).toBeUndefined();
    expect(bakeLabel(null).text).toBe('—');
  });
});
