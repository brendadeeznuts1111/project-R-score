// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN,
  PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT,
} from '../packages/partners/src/index.ts';
import {
  PARTNERS_DASHBOARD_ARTIFACT_REF,
  PARTNERS_LEGACY_COMPARISON_OPTIONAL_REFS,
  PARTNERS_LEGACY_COMPARISON_REQUIRED_REFS,
  bakeLabel,
  dashboardAccountingDealsRows,
  dashboardBookCards,
  dashboardLedgerEventRows,
  dashboardRosterRows,
  flattenDashboardOuts,
  indexDashboardByPartner,
  isLegacyPartnerComparisonRequested,
  isPartnersDashboardSchema,
  projectDashboardToHandshakeShape,
  projectDashboardToOpsShape,
  summarizeConnectorSnapshots,
  summarizeDashboardDesk,
} from '../public/portal/partners/partners-board.js';

const BOARD = 'public/portal/partners/index.html';

const sampleDashboard = {
  schema: 'factorywager.partners-dashboard.v1',
  generatedAt: '2026-08-08T18:00:00.000Z',
  connectorSnapshots: {
    profiles: { dataStatus: 'ok' },
    accounting: { dataStatus: 'unavailable' },
    telegram: { dataStatus: 'ok' },
    limits: { dataStatus: 'stale' },
    bookmakers: { dataStatus: 'unavailable' },
    tennis: { dataStatus: 'unavailable' },
    sportsTerminal: { dataStatus: 'unavailable' },
    legacyOps: { dataStatus: 'ok' },
  },
  summary: {
    partnerCount: 2,
    canonicalProfileCount: 2,
    operatorReadyPartnerCount: 1,
    attentionPartnerCount: 0,
    registeredOutCount: 2,
    activeOutCount: 0,
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
          fundingStatus: 'unknown',
        },
      ],
      attention: [],
      accounting: { recentEntries: [] },
    },
    {
      partnerCode: 'BIL',
      callSign: 'BIL-001',
      operationalPhase: 'onboarding',
      communication: { chatLinked: false, handshakeStatus: 'designated' },
      outs: [
        {
          outId: 'out-BIL-1',
          sportsbookId: 'caesars',
          operationalStatus: 'deferred',
          fundingStatus: 'partial',
        },
      ],
      attention: [],
      accounting: { recentEntries: [] },
    },
  ],
};

describe('partners-dashboard board cutover', () => {
  test('dashboard-native helpers drive roster, outs, and desk stats', () => {
    const byCode = indexDashboardByPartner(sampleDashboard);
    expect([...byCode.keys()]).toEqual(['ASH', 'BIL']);

    const roster = dashboardRosterRows(sampleDashboard);
    expect(roster.map(r => r.partnerCode)).toEqual(['ASH', 'BIL']);
    expect(roster[0]?.handshakeOk).toBe(true);
    expect(roster[0]?.phase).toBe('operator_ready');

    const outs = flattenDashboardOuts(sampleDashboard);
    expect(outs).toHaveLength(2);
    expect(outs[0]?.status).toBe('ready');
    expect(outs[0]?.bookName).toBe('hard-rock-florida');
    expect(outs[1]?.incomplete).toBe(true);

    const desk = summarizeDashboardDesk(sampleDashboard);
    expect(desk.partners).toBe(2);
    expect(desk.readyOuts).toBe(1);
    expect(desk.operatorReady).toBe(1);

    const deals = dashboardAccountingDealsRows(sampleDashboard);
    expect(deals).toHaveLength(2);
    expect(dashboardBookCards(sampleDashboard).map(b => b.id)).toEqual([
      'caesars',
      'hard-rock-florida',
    ]);
    expect(dashboardLedgerEventRows(sampleDashboard)).toEqual([]);

    // Thin projection helpers retained for diagnostic/legacy tests only
    const ops = projectDashboardToOpsShape(sampleDashboard);
    expect(ops.source).toBe('partners-dashboard');
    const handshake = projectDashboardToHandshakeShape(sampleDashboard);
    expect(handshake.rows).toHaveLength(2);

    const connectors = summarizeConnectorSnapshots(sampleDashboard);
    expect(connectors.total).toBe(8);
    expect(connectors.ok).toBe(3);
    expect(connectors.stale).toBe(1);
    expect(connectors.unavailable).toBe(4);

    expect(isPartnersDashboardSchema('factorywager.partners-dashboard.v1')).toBe(true);
    expect(isPartnersDashboardSchema('factorywager.partners-ops.v2')).toBe(false);
    expect(bakeLabel('2026-08-08T18:00:00.000Z').tone).toMatch(/ok|warn/);
  });

  test('legacy comparison is query-only and inventories match the package contract', () => {
    expect(isLegacyPartnerComparisonRequested('/portal/partners/?compare=legacy')).toBe(true);
    expect(isLegacyPartnerComparisonRequested('/portal/partners/#compare=legacy')).toBe(false);
    expect(PARTNERS_DASHBOARD_ARTIFACT_REF).toBe(PARTNER_DASHBOARD_ARTIFACT_REF);
    expect([...PARTNERS_LEGACY_COMPARISON_REQUIRED_REFS]).toEqual([
      ...PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.requiredInputRefs,
    ]);
    expect([...PARTNERS_LEGACY_COMPARISON_OPTIONAL_REFS]).toEqual([
      ...PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.optionalInputRefs,
    ]);
  });

  test('board primary load is partners-dashboard only; native tables, no ops projection', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain("loadJson('/registry/partners-dashboard.json')");
    expect(html).toContain('isLegacyPartnerComparisonRequested');
    expect(html).toContain('runLegacyComparisonDiagnostic');
    expect(html).toContain('flattenDashboardOuts');
    expect(html).toContain('dashboardRosterRows');
    expect(html).toContain('summarizeDashboardDesk');
    expect(html).toContain('indexDashboardByPartner');
    expect(html).not.toContain('projectDashboardToOpsShape');
    expect(html).not.toContain('projectDashboardToHandshakeShape');
    expect(html).toContain('error-never-fallback');
    expect(html).toContain('No silent partners-ops fallback');
    expect(html).toContain('bun run partner:dashboard:bake');
    expect(html).toContain('?compare=legacy');
    expect(html).toContain('data-registry="/registry/partners-dashboard.json"');
    // Primary path must not multi-fetch legacy refs via loadJson
    for (const ref of PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.requiredInputRefs) {
      expect(html).not.toContain(`loadJson('${ref}')`);
    }
    for (const ref of PARTNER_DASHBOARD_LEGACY_COMPARISON_PLAN.optionalInputRefs) {
      expect(html).not.toContain(`loadJson('${ref}')`);
    }
    // Diagnostic inventory still present (fetchJsonResult path, not loadJson)
    expect(html).toContain('PARTNERS_LEGACY_COMPARISON_REQUIRED_REFS');
    expect(html).toContain('PARTNERS_LEGACY_COMPARISON_OPTIONAL_REFS');
    // Hash route controller preserved
    expect(html).toContain('applyPartnerRoute');
    expect(html).toContain('parsePartnerHash');
    // Extracted bakeLabel helper used from partners-board.js
    expect(html).toMatch(/import\s*\{[^}]*bakeLabel[^}]*\}\s*from\s*'\/portal\/partners\/partners-board\.js'/);
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.transition.implementationStatus).toBe(
      'transition'
    );
  });
});
