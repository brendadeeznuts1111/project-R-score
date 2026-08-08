import { describe, expect, test } from 'bun:test';
import {
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS,
  assemblePartnerDashboardArtifact,
  buildPartnerDashboardRecords,
  evaluateConnectorFreshness,
  parseLegacyPartnersOpsProjection,
  parsePartnerProfileCoverageArtifact,
  parseTelegramHandshakeArtifact,
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
        ...(key === 'sportsTerminal'
          ? {}
          : {
              current: {
                observedAt: asOf,
                inputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
              },
            }),
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
