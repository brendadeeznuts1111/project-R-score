// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
  PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT,
} from '../packages/partners/src/index.ts';
import * as board from '../public/portal/partners/partners-board.js';
import {
  PARTNERS_DASHBOARD_ARTIFACT_REF,
  bakeLabel,
  dashboardAccountingDealsRows,
  dashboardBookCards,
  dashboardLedgerEventRows,
  dashboardRosterRows,
  flattenDashboardOuts,
  formatUsdMajor,
  formatUsdMinor,
  humanizeBookSlug,
  indexDashboardByPartner,
  isPartnersDashboardSchema,
  statusToneClass,
  summarizeConnectorSnapshots,
  summarizeDashboardDesk,
} from '../public/portal/partners/partners-board.js';

const BOARD = 'public/portal/partners/index.html';

const sampleDashboard = {
  schema: 'factorywager.partners-dashboard.v2',
  generatedAt: '2026-08-08T18:00:00.000Z',
  connectorSnapshots: {
    profiles: { dataStatus: 'ok' },
    accounting: { dataStatus: 'unavailable' },
    telegram: { dataStatus: 'ok' },
    limits: { dataStatus: 'stale' },
    bookmakers: { dataStatus: 'unavailable' },
    tennis: { dataStatus: 'unavailable' },
    sportsTerminal: { dataStatus: 'unavailable' },
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
    expect(outs[0]?.bookName).toBe('Hard Rock Florida');
    expect(outs[0]?.bookSlug).toBe('hard-rock-florida');
    expect(outs[1]?.incomplete).toBe(true);
    expect(humanizeBookSlug('parlay21-com')).toBe('Parlay21');
    expect(formatUsdMinor(50000)).toBe('$500.00');
    expect(formatUsdMajor(1200)).toMatch(/\$1,200/);
    expect(statusToneClass('ready')).toBe('tone-ok');
    expect(statusToneClass('deferred')).toBe('tone-warn');
    // Sample fixture lacks bake evidence fields — defaults are explicit
    expect(outs[0]?.missingExternalRef).toBe(true);
    expect(outs[0]?.externalRefCount).toBe(0);

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

    const connectors = summarizeConnectorSnapshots(sampleDashboard);
    expect(connectors.total).toBe(7);
    expect(connectors.ok).toBe(2);
    expect(connectors.stale).toBe(1);
    expect(connectors.unavailable).toBe(4);

    expect(isPartnersDashboardSchema('factorywager.partners-dashboard.v1')).toBe(true);
    expect(isPartnersDashboardSchema('factorywager.partners-ops.v2')).toBe(false);
    expect(bakeLabel('2026-08-08T18:00:00.000Z').tone).toMatch(/ok|warn/);
  });

  test('legacy comparison and ops/handshake projections are removed from board module', () => {
    expect(board.isLegacyPartnerComparisonRequested).toBeUndefined();
    expect(board.projectDashboardToOpsShape).toBeUndefined();
    expect(board.projectDashboardToHandshakeShape).toBeUndefined();
    expect(PARTNERS_DASHBOARD_ARTIFACT_REF).toBe(PARTNER_DASHBOARD_ARTIFACT_REF);
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.implemented.implementationStatus).toBe(
      'implemented'
    );
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.transition.implementationStatus).toBe(
      'retired'
    );
    expect(PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.target.legacyComparisonPolicy).toBe(
      'removed'
    );
  });

  test('flattenDashboardOuts surfaces limit coverage and external refs from baked artifact', async () => {
    const dashboard = await Bun.file('public/registry/partners-dashboard.json').json();
    const { filterPartnerOuts } = await import('../public/portal/partners/partners-board.js');
    const outs = flattenDashboardOuts(dashboard);
    expect(outs.length).toBeGreaterThan(0);
    expect(outs.some(o => o.limitCoverageRatio === 1)).toBe(true);
    // Desk placeholders omit limitCoverageRatio (not scored); catalog holes use ratio 0.
    expect(
      outs.some(o => o.limitCoverageRatio === undefined || o.limitCoverageRatio === null)
    ).toBe(true);
    expect(outs.some(o => o.externalRefCount > 0)).toBe(true);
    const missing = filterPartnerOuts(outs, { missingLimitEvidenceOnly: true });
    expect(missing.every(o => o.missingLimitEvidence)).toBe(true);
    // missingLimitEvidence is only ratio === 0, not unscored placeholders
    expect(missing.every(o => o.limitCoverageRatio === 0)).toBe(true);
    const noRef = filterPartnerOuts(outs, { noExternalRefOnly: true });
    expect(noRef.every(o => o.missingExternalRef)).toBe(true);
  });

  test('board primary load is partners-dashboard only; native tables, no ops or legacy compare', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain("loadJson('/registry/partners-dashboard.json')");
    expect(html).not.toContain('isLegacyPartnerComparisonRequested');
    expect(html).not.toContain('runLegacyComparisonDiagnostic');
    expect(html).not.toContain('?compare=legacy');
    expect(html).toContain('flattenDashboardOuts');
    expect(html).toContain('dashboardRosterRows');
    expect(html).toContain('outs-missing-limit-only');
    expect(html).toContain('outs-no-external-ref-only');
    expect(html).toContain('Limit cov.');
    expect(html).toContain('Ext. ref');

    expect(html).toContain('summarizeDashboardDesk');
    expect(html).toContain('indexDashboardByPartner');
    expect(html).not.toContain('projectDashboardToOpsShape');
    expect(html).not.toContain('projectDashboardToHandshakeShape');
    expect(html).toContain('error-never-fallback');
    expect(html).toContain('No silent partners-ops fallback');
    expect(html).toContain('bun run partner:dashboard:bake');
    expect(html).toContain('data-registry="/registry/partners-dashboard.json"');
    // Primary path must not multi-fetch legacy refs via loadJson
    for (const ref of PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS) {
      expect(html).not.toContain(`loadJson('${ref}')`);
    }
    for (const ref of PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS) {
      expect(html).not.toContain(`loadJson('${ref}')`);
    }
    expect(html).not.toContain('PARTNERS_LEGACY_COMPARISON_REQUIRED_REFS');
    expect(html).not.toContain('PARTNERS_LEGACY_COMPARISON_OPTIONAL_REFS');
    // Hash route controller preserved
    expect(html).toContain('applyPartnerRoute');
    expect(html).toContain('parsePartnerHash');
    // Extracted bakeLabel helper used from partners-board.js
    expect(html).toMatch(/import\s*\{[^}]*bakeLabel[^}]*\}\s*from\s*'\/portal\/partners\/partners-board\.js'/);
  });
});
