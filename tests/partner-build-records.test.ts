import { describe, expect, test } from 'bun:test';
import {
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS,
  adaptAccountingFromLedgerSnapshot,
  assemblePartnerDashboardArtifact,
  buildPartnerDashboardRecords,
  evaluateConnectorFreshness,
  parseLegacyPartnersOpsProjection,
  parsePartnerProfileCoverageArtifact,
  parseTelegramHandshakeArtifact,
  parseTennisCapacityArtifact,
  reconcilePartnerDashboardFacts,
  type ConnectorSnapshot,
} from '../packages/partners/src/index.ts';

const ROOT = new URL('../', import.meta.url);

async function loadJson(path: string): Promise<unknown> {
  return Bun.file(new URL(path, ROOT)).json();
}

function connectorSnapshots(asOf: string): Record<string, ConnectorSnapshot> {
  return Object.fromEntries(
    PARTNER_CONNECTOR_SNAPSHOT_KEYS.map(key => {
      const decision = evaluateConnectorFreshness({
        asOf,
        expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
        required: key === 'profiles',
        current: {
          observedAt: asOf,
          inputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
        },
      });
      if (decision.disposition === 'fail_bake') throw new Error(decision.reasonCode);
      return [key, decision.snapshot];
    })
  ) as Record<string, ConnectorSnapshot>;
}

describe('buildPartnerDashboardRecords', () => {
  test('joins coverage, lifecycle, telegram, and legacy outs into assemblable records', async () => {
    const [profiles, coverageRaw, legacyRaw, telegramRaw] = await Promise.all([
      loadJson('public/registry/partner-profiles.json'),
      loadJson('public/registry/partner-profile-coverage.json'),
      loadJson('public/registry/partners-ops.json'),
      loadJson('public/registry/telegram-handshake.json'),
    ]);
    const coverage = parsePartnerProfileCoverageArtifact(coverageRaw);
    const legacyOps = parseLegacyPartnersOpsProjection(legacyRaw);
    const telegram = parseTelegramHandshakeArtifact(telegramRaw);
    const generatedAt =
      typeof (profiles as { generatedAt?: string }).generatedAt === 'string'
        ? (profiles as { generatedAt: string }).generatedAt
        : '2026-08-08T18:00:00.000Z';

    const built = buildPartnerDashboardRecords({
      generatedAt,
      partnerProfiles: profiles,
      profileCoverage: coverage,
      legacyOps,
      telegram,
    });

    expect(built.partners.map(p => p.partnerCode)).toEqual(['ASH', 'BIL', 'NOV', 'SPEN']);
    expect(built.canonicalProfileCodes).toEqual(['ASH', 'BIL', 'NOV', 'SPEN']);
    expect(built.activeOutIds).toEqual([]);

    const ash = built.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.lifecycle.state).toBe('active');
    expect(ash.lifecycle.provenance.originalValue).toBe('active');
    expect(ash.lifecycle.provenance.sourceSystemId).toBe('factorywager-partner-profile');
    expect(ash.communication.chatLinked).toBe(true);
    expect(ash.communication.handshakeStatus).toBe('operator_ready');
    expect(ash.outs.length).toBeGreaterThan(0);
    expect(ash.outs[0]?.sportsbookId).toBe('hard-rock-florida');
    expect(ash.accounting.balancePositions).toEqual([]);
    expect(built.accounting).toEqual([]);
    expect(ash.attention.some(a => a.reasonCode === 'partner.profile.migration_required')).toBe(
      false
    );

    // Full artifact assembles without throw
    const artifact = assemblePartnerDashboardArtifact({
      generatedAt,
      connectorSnapshots: connectorSnapshots(generatedAt) as never,
      canonicalProfileCodes: built.canonicalProfileCodes,
      activeOutIds: built.activeOutIds,
      partners: built.partners,
    });
    expect(artifact.summary.partnerCount).toBe(4);
    expect(artifact.summary.canonicalProfileCount).toBe(4);
    expect(artifact.partners).toHaveLength(4);
  });

  test('joins accounting-ledger observations into balances and out funding', async () => {
    const [profiles, coverageRaw, legacyRaw, ledgerSnap] = await Promise.all([
      loadJson('public/registry/partner-profiles.json'),
      loadJson('public/registry/partner-profile-coverage.json'),
      loadJson('public/registry/partners-ops.json'),
      loadJson('tests/fixtures/partner-accounting/ledger-rows.json'),
    ]);
    const coverage = parsePartnerProfileCoverageArtifact(coverageRaw);
    const legacyOps = parseLegacyPartnersOpsProjection(legacyRaw);
    const accounting = adaptAccountingFromLedgerSnapshot(ledgerSnap, {
      observedAt: '2026-08-08T18:00:00.000Z',
      bookKeyToOutId: {
        'ASH:parlay21-com': 'out-ASH-1',
        'parlay21-com': 'out-ASH-1',
      },
    });

    const built = buildPartnerDashboardRecords({
      generatedAt: '2026-08-08T18:00:00.000Z',
      partnerProfiles: profiles,
      profileCoverage: coverage,
      legacyOps,
      accounting,
    });

    const ash = built.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.accounting.balancePositions.length).toBeGreaterThan(0);
    expect(ash.accounting.recentEntries.length).toBeGreaterThan(0);
    expect(ash.accounting.balancePositions.some(p => p.accountScope.kind === 'partner')).toBe(true);
    // book:parlay21-com mapped → out-ASH-1 funding from out-scoped balance
    const ash1 = ash.outs.find(o => o.outId === 'out-ASH-1');
    expect(ash1?.fundingStatus).toBe('funded');
    expect(built.accounting.map(a => a.partnerCode)).toEqual(['ASH', 'BIL', 'SPEN']);

    const bil = built.partners.find(p => p.partnerCode === 'BIL')!;
    expect(bil.accounting.balancePositions).toHaveLength(1);
    expect(bil.accounting.balancePositions[0]?.amount.minorUnits).toBe(75000);

    // NOV has no ledger rows → empty accounting
    const nov = built.partners.find(p => p.partnerCode === 'NOV')!;
    expect(nov.accounting.balancePositions).toEqual([]);

    const artifact = assemblePartnerDashboardArtifact({
      generatedAt: '2026-08-08T18:00:00.000Z',
      connectorSnapshots: connectorSnapshots('2026-08-08T18:00:00.000Z') as never,
      canonicalProfileCodes: built.canonicalProfileCodes,
      activeOutIds: built.activeOutIds,
      partners: built.partners,
    });
    expect(artifact.summary.balancePositions.length).toBeGreaterThan(0);
  });

  test('reconcile after build promotes tennis activeOutIds', async () => {
    const [profiles, coverageRaw, legacyRaw, tennisRaw] = await Promise.all([
      loadJson('public/registry/partner-profiles.json'),
      loadJson('public/registry/partner-profile-coverage.json'),
      loadJson('public/registry/partners-ops.json'),
      loadJson('public/registry/tennis/partner-contracts.json'),
    ]);
    const built = buildPartnerDashboardRecords({
      generatedAt: '2026-08-08T18:00:00.000Z',
      partnerProfiles: profiles,
      profileCoverage: parsePartnerProfileCoverageArtifact(coverageRaw),
      legacyOps: parseLegacyPartnersOpsProjection(legacyRaw),
    });
    expect(built.activeOutIds).toEqual([]);

    const tennis = parseTennisCapacityArtifact(tennisRaw);
    const reconciled = reconcilePartnerDashboardFacts({ partners: built.partners, tennis });
    expect(reconciled.activeOutIds).toEqual([
      'out-ASH-1',
      'out-BIL-1',
      'out-NOV-1',
      'out-SPEN-1',
      'out-SPEN-2',
    ]);
    expect(reconciled.partners.find(p => p.partnerCode === 'ASH')?.integrations.tennis?.dataStatus).toBe(
      'ok'
    );

    const artifact = assemblePartnerDashboardArtifact({
      generatedAt: '2026-08-08T18:00:00.000Z',
      connectorSnapshots: connectorSnapshots('2026-08-08T18:00:00.000Z') as never,
      canonicalProfileCodes: built.canonicalProfileCodes,
      activeOutIds: reconciled.activeOutIds,
      partners: reconciled.partners,
      conflicts: reconciled.conflicts,
    });
    expect(artifact.summary.activeOutCount).toBe(5);
  });

  test('flags missing coverage with migration attention', async () => {
    const profiles = await loadJson('public/registry/partner-profiles.json');
    const emptyCoverage = parsePartnerProfileCoverageArtifact({
      schema: 'factorywager.partner-profile-coverage.v1',
      generatedAt: '2026-08-08T18:00:00.000Z',
      evidenceByPartnerCode: {},
    });
    // Builder requires lifecycle for every visible code — only profile keys are used
    // when no legacy/telegram supplied, so empty coverage alone yields no partners.
    const built = buildPartnerDashboardRecords({
      generatedAt: '2026-08-08T18:00:00.000Z',
      partnerProfiles: profiles,
      profileCoverage: emptyCoverage,
    });
    // Lifecycle still enumerates profile keys → partners with migration attention
    expect(built.partners.length).toBe(4);
    expect(built.canonicalProfileCodes).toEqual([]);
    for (const partner of built.partners) {
      expect(
        partner.attention.some(a => a.reasonCode === 'partner.profile.migration_required')
      ).toBe(true);
      // Without coverage, identity is non-canonical so assemble does not claim profile authority
      expect(partner.identity.profileSourceSystemId).toBe('legacy-ops');
    }

    // Still assemblable as migration-visible partners
    const artifact = assemblePartnerDashboardArtifact({
      generatedAt: '2026-08-08T18:00:00.000Z',
      connectorSnapshots: connectorSnapshots('2026-08-08T18:00:00.000Z') as never,
      canonicalProfileCodes: built.canonicalProfileCodes,
      activeOutIds: built.activeOutIds,
      partners: built.partners,
    });
    expect(artifact.summary.canonicalProfileCount).toBe(0);
    expect(artifact.summary.partnerCount).toBe(4);
  });
});
