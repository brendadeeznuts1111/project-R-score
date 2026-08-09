import { describe, expect, test } from 'bun:test';
import {
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS,
  assemblePartnerDashboardArtifact,
  buildPartnerDashboardRecords,
  evaluateConnectorFreshness,
  parseLegacyPartnersOpsProjection,
  parsePartnerProfileCoverageArtifact,
  parseSportsTerminalIntegrationHealth,
  parseTelegramHandshakeArtifact,
  parseTennisCapacityArtifact,
  reconcilePartnerDashboardFacts,
  type ConnectorSnapshot,
  type PartnerDashboardRecord,
  type TennisCapacityProjection,
} from '../packages/partners/src/index.ts';
import {
  parseAdapterId,
  parseCanonicalOutId,
  parsePartnerCallSign,
  parsePartnerCode,
  parseSourceSystemId,
  parseSportsbookId,
} from '../packages/partners/src/core/identifiers.ts';

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

async function loadBuiltPartners(): Promise<{
  partners: PartnerDashboardRecord[];
  canonicalProfileCodes: ReturnType<typeof buildPartnerDashboardRecords>['canonicalProfileCodes'];
  generatedAt: string;
  tennis: TennisCapacityProjection;
}> {
  const [profiles, coverageRaw, legacyRaw, telegramRaw, tennisRaw, bookmakers] = await Promise.all([
    loadJson('public/registry/partner-profiles.json'),
    loadJson('public/registry/partner-profile-coverage.json'),
    loadJson('public/registry/partners-ops.json'),
    loadJson('public/registry/telegram-handshake.json'),
    loadJson('public/registry/tennis/partner-contracts.json'),
    loadJson('public/registry/bookmakers.json'),
  ]);
  const coverage = parsePartnerProfileCoverageArtifact(coverageRaw);
  const legacyOps = parseLegacyPartnersOpsProjection(legacyRaw);
  const telegram = parseTelegramHandshakeArtifact(telegramRaw);
  const registeredIds = Object.keys(
    (bookmakers as { bookmakers?: Record<string, unknown> }).bookmakers ?? {}
  );
  const bookRefMap = Object.fromEntries(registeredIds.map(id => [`book-${id}`, id]));
  const tennis = parseTennisCapacityArtifact(tennisRaw, { bookRefMap });
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
  return {
    partners: built.partners,
    canonicalProfileCodes: built.canonicalProfileCodes,
    generatedAt,
    tennis,
  };
}

describe('reconcilePartnerDashboardFacts', () => {
  test('applies tennis live capacity to registered outs and yields assemblable activeOutIds', async () => {
    const { partners, canonicalProfileCodes, generatedAt, tennis } = await loadBuiltPartners();
    expect(tennis.source).toBe('live');
    expect(tennis.observations.some(o => o.active)).toBe(true);

    const reconciled = reconcilePartnerDashboardFacts({ partners, tennis });

    // activeOutIds ⊆ registered · tennis.active · ready after upgrade
    const registered = new Set(partners.flatMap(p => p.outs.map(o => o.outId)));
    expect(reconciled.activeOutIds.length).toBeGreaterThan(0);
    for (const outId of reconciled.activeOutIds) {
      expect(registered.has(outId)).toBe(true);
      const out = reconciled.partners.flatMap(p => p.outs).find(o => o.outId === outId);
      expect(out?.operationalStatus).toBe('ready');
    }
    // Deterministic sort
    expect(reconciled.activeOutIds).toEqual([...reconciled.activeOutIds].sort());
    // Real registry: five tennis-active outs that are registered
    expect(reconciled.activeOutIds).toEqual([
      'out-ASH-1',
      'out-BIL-1',
      'out-NOV-1',
      'out-SPEN-1',
      'out-SPEN-2',
    ]);

    const ash = reconciled.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.integrations.tennis?.dataStatus).toBe('ok');
    expect(ash.integrations.tennis?.observedAt).toBeTruthy();
    const ash1 = ash.outs.find(o => o.outId === 'out-ASH-1')!;
    expect(ash1.observedMaxStake?.amount).toEqual({ currency: 'USD', minorUnits: 50_000 });
    expect(ash1.observedMaxStake?.provenance.adapterId).toBe('tennis-capacity-v1');
    expect(ash1.providerConnectionStatus).toBe('inactive'); // secretsConfigured: false
    // Finance not authored
    expect(ash.accounting.balancePositions).toEqual([]);
    expect(ash.accounting.recentEntries).toEqual([]);
    expect(ash1.fundingStatus).toBe('unknown');

    // Full artifact assembles with active set
    const artifact = assemblePartnerDashboardArtifact({
      generatedAt,
      connectorSnapshots: connectorSnapshots(generatedAt) as never,
      canonicalProfileCodes,
      activeOutIds: reconciled.activeOutIds,
      conflicts: reconciled.conflicts,
      partners: reconciled.partners,
    });
    expect(artifact.activeOutIds).toEqual(reconciled.activeOutIds);
    expect(artifact.summary.activeOutCount).toBe(5);
    expect(artifact.summary.registeredOutCount).toBeGreaterThan(5);
  });

  test('without tennis leaves activeOutIds empty and does not invent integrations', async () => {
    const { partners } = await loadBuiltPartners();
    const reconciled = reconcilePartnerDashboardFacts({ partners });
    expect(reconciled.activeOutIds).toEqual([]);
    expect(reconciled.conflicts).toEqual([]);
    for (const partner of reconciled.partners) {
      expect(partner.integrations.tennis).toBeUndefined();
      expect(partner.integrations.sportsTerminal).toBeUndefined();
    }
  });

  test('applies Sports Terminal integration health and external partner refs', async () => {
    const { partners, tennis } = await loadBuiltPartners();
    const stRaw = await loadJson(
      'public/registry/sports-terminal/partner-integration-health.json'
    );
    const sportsTerminal = parseSportsTerminalIntegrationHealth(stRaw);
    const reconciled = reconcilePartnerDashboardFacts({ partners, tennis, sportsTerminal });

    const ash = reconciled.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.integrations.sportsTerminal).toMatchObject({
      dataStatus: 'ok',
      observedAt: '2026-08-08T18:00:00.000Z',
    });
    expect(ash.identity.externalPartnerRefs).toEqual([
      {
        sourceSystemId: 'sports-terminal',
        externalId: 'st-partner-ash-001',
      },
    ]);

    const bil = reconciled.partners.find(p => p.partnerCode === 'BIL')!;
    expect(bil.integrations.sportsTerminal?.dataStatus).toBe('stale'); // degraded → stale

    const spen = reconciled.partners.find(p => p.partnerCode === 'SPEN')!;
    expect(spen.integrations.sportsTerminal?.dataStatus).toBe('unavailable'); // unknown
  });

  test('computes limit evidence coverage from tennis max stake and raise sportsbooks', async () => {
    const { partners, tennis } = await loadBuiltPartners();
    const [limitsRaw, bookmakersRaw] = await Promise.all([
      loadJson('public/registry/limit-raises.json'),
      loadJson('public/registry/bookmakers.json'),
    ]);
    const {
      LIMIT_RAISE_SPORTSBOOK_ALIASES,
      parseTreeNodePartnerCodesFromLimitRaises,
      parseBookmakerCatalogArtifact,
      parseLimitChangesArtifact,
      registeredSportsbookIdsFromCatalog,
    } = await import('../packages/partners/src/index.ts');
    const bookmakers = parseBookmakerCatalogArtifact(bookmakersRaw);
    const limits = parseLimitChangesArtifact(limitsRaw, {
      treeNodePartnerCodes: parseTreeNodePartnerCodesFromLimitRaises(limitsRaw),
      registeredSportsbookIds: registeredSportsbookIdsFromCatalog(bookmakers),
      sportsbookAliases: LIMIT_RAISE_SPORTSBOOK_ALIASES,
    });

    const reconciled = reconcilePartnerDashboardFacts({
      partners,
      tennis,
      limits,
      bookmakers,
    });

    for (const partner of reconciled.partners) {
      const { tracked, missing, coverageRatio } = partner.limits;
      // Denominator is catalog-scored outs only (placeholders excluded).
      expect(tracked + missing).toBeLessThanOrEqual(partner.outs.length);
      expect(coverageRatio).toBe(tracked + missing === 0 ? 0 : tracked / (tracked + missing));
      for (const out of partner.outs) {
        if (out.limitCoverageRatio === undefined) continue; // unregistered / placeholder
        expect(out.limitCoverageRatio === 0 || out.limitCoverageRatio === 1).toBe(true);
      }
    }

    // ASH has tennis live max stake on out-ASH-1 → at least one tracked out
    const ash = reconciled.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.limits.tracked).toBeGreaterThan(0);
    const ash1 = ash.outs.find(o => o.outId === 'out-ASH-1')!;
    expect(ash1.observedMaxStake?.amount.minorUnits).toBe(50_000);
    expect(ash1.limitCoverageRatio).toBe(1);
    // Tennis external book ref projects as ExternalAccountRef (not bare partnerId).
    expect(ash1.externalAccountRefs.length).toBeGreaterThan(0);
    expect(ash1.externalAccountRefs[0]).toMatchObject({
      sourceSystemId: 'tennis-hq',
    });

    // Desk placeholders (southfl-pph-desk, orange777) do not inflate coverage_gap.
    const nov = reconciled.partners.find(p => p.partnerCode === 'NOV')!;
    const nov2 = nov.outs.find(o => o.outId === 'out-NOV-2')!;
    expect(nov2.sportsbookId).toBe('southfl-pph-desk');
    expect(nov2.limitCoverageRatio).toBeUndefined();
    expect(nov.limits.coverageRatio).toBe(1);
    expect(nov.attention.some(a => a.reasonCode === 'partner.limits.coverage_gap')).toBe(false);
    expect(
      nov.attention.some(a => a.reasonCode === 'partner.bookmakers.unregistered_sportsbook')
    ).toBe(true);

    const spen = reconciled.partners.find(p => p.partnerCode === 'SPEN')!;
    const spen5 = spen.outs.find(o => o.outId === 'out-SPEN-5')!;
    expect(spen5.sportsbookId).toBe('orange777');
    expect(spen5.limitCoverageRatio).toBeUndefined();
    expect(spen.limits.coverageRatio).toBe(1);
    expect(spen.attention.some(a => a.reasonCode === 'partner.limits.coverage_gap')).toBe(false);
  });

  test('joins limit-change attention and bookmaker catalog validation without inventing ceilings', async () => {
    const { partners, tennis } = await loadBuiltPartners();
    const [limitsRaw, bookmakersRaw] = await Promise.all([
      loadJson('public/registry/limit-raises.json'),
      loadJson('public/registry/bookmakers.json'),
    ]);
    const {
      LIMIT_RAISE_SPORTSBOOK_ALIASES,
      parseTreeNodePartnerCodesFromLimitRaises,
      parseBookmakerCatalogArtifact,
      parseLimitChangesArtifact,
      registeredSportsbookIdsFromCatalog,
    } = await import('../packages/partners/src/index.ts');
    const bookmakers = parseBookmakerCatalogArtifact(bookmakersRaw);
    const limits = parseLimitChangesArtifact(limitsRaw, {
      treeNodePartnerCodes: parseTreeNodePartnerCodesFromLimitRaises(limitsRaw),
      registeredSportsbookIds: registeredSportsbookIdsFromCatalog(bookmakers),
      sportsbookAliases: LIMIT_RAISE_SPORTSBOOK_ALIASES,
    });
    expect(limits.observations.length).toBeGreaterThan(0);
    expect(limits.observations.every(o => o.currentExecutionCeiling === false)).toBe(true);

    const reconciled = reconcilePartnerDashboardFacts({
      partners,
      tennis,
      limits,
      bookmakers,
    });
    const ash = reconciled.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.attention.some(a => a.reasonCode === 'partner.limits.raise_observed')).toBe(true);
    expect(ash.identity.treeNodeId).toBeTruthy();
    // Raise attention must not invent observedMaxStake from limit events.
    for (const out of ash.outs) {
      if (out.observedMaxStake) {
        expect(out.observedMaxStake.provenance.adapterId).not.toBe('limit-changes-v3');
      }
    }
    const bil = reconciled.partners.find(p => p.partnerCode === 'BIL')!;
    expect(
      bil.attention.some(a => a.reasonCode === 'partner.bookmakers.unregistered_sportsbook')
    ).toBe(true);
  });

  test('emits operationalStatus conflict when tennis upgrades a non-ready registered out', async () => {
    const { partners, tennis } = await loadBuiltPartners();
    // Force prior disagreement on a tennis-active registered out
    const mutated = structuredClone(partners) as PartnerDashboardRecord[];
    const ash = mutated.find(p => p.partnerCode === 'ASH')!;
    const ash1 = ash.outs.find(o => o.outId === 'out-ASH-1')!;
    ash1.operationalStatus = 'deferred';

    const reconciled = reconcilePartnerDashboardFacts({ partners: mutated, tennis });
    expect(reconciled.activeOutIds).toContain('out-ASH-1');
    const upgraded = reconciled.partners
      .find(p => p.partnerCode === 'ASH')!
      .outs.find(o => o.outId === 'out-ASH-1')!;
    expect(upgraded.operationalStatus).toBe('ready');

    const statusConflict = reconciled.conflicts.find(
      c =>
        c.partnerCode === 'ASH' &&
        c.fieldPath === 'partners[].outs[].operationalStatus' &&
        c.values.includes('ready') &&
        c.values.includes('deferred')
    );
    expect(statusConflict).toBeDefined();
    expect(statusConflict!.adapterIds).toEqual(['tennis-contract', 'legacy-partners-ops']);
  });

  test('ignores tennis outs that are not registered on partner records', async () => {
    const { partners, tennis } = await loadBuiltPartners();
    // Strip ASH outs so tennis out-ASH-1 is unregistered
    const stripped = structuredClone(partners) as PartnerDashboardRecord[];
    const ash = stripped.find(p => p.partnerCode === 'ASH')!;
    ash.outs = [];

    const reconciled = reconcilePartnerDashboardFacts({ partners: stripped, tennis });
    expect(reconciled.activeOutIds).not.toContain('out-ASH-1');
    expect(reconciled.partners.find(p => p.partnerCode === 'ASH')!.outs).toEqual([]);
    // Other registered tennis-active outs still count
    expect(reconciled.activeOutIds).toEqual([
      'out-BIL-1',
      'out-NOV-1',
      'out-SPEN-1',
      'out-SPEN-2',
    ]);
  });

  test('offline-join tennis does not promote activeOutIds or invent execution max stake', async () => {
    const { partners } = await loadBuiltPartners();
    const offline: TennisCapacityProjection = {
      source: 'offline-join',
      executionEvidence: false,
      observations: [
        {
          partnerCode: partners[0]!.partnerCode,
          callSign: partners[0]!.callSign,
          outId: partners[0]!.outs[0]!.outId,
          externalBookRef: 'book-hard-rock-florida',
          sportsbookId: parseSportsbookId('hard-rock-florida'),
          sportsbookResolution: 'mapped',
          sourceStatus: 'active',
          active: false, // offline never sets active
          credentials: 'unknown',
          observedAt: '2026-08-08T18:00:00.000Z',
          provenance: {
            sourceSystemId: parseSourceSystemId('tennis-hq'),
            adapterId: parseAdapterId('tennis-capacity-v1'),
            adapterVersion: '1',
            observedAt: '2026-08-08T18:00:00.000Z',
            originalValue: 'active',
            mappingMethod: 'identity',
            confidence: 'exact',
          },
        },
      ],
      unresolvedBookRefs: [],
    };

    const reconciled = reconcilePartnerDashboardFacts({ partners, tennis: offline });
    expect(reconciled.activeOutIds).toEqual([]);
    const partner = reconciled.partners.find(p => p.partnerCode === partners[0]!.partnerCode)!;
    expect(partner.integrations.tennis?.dataStatus).toBe('stale');
    // Operational status not authored from offline
    expect(partner.outs[0]!.operationalStatus).toBe(partners[0]!.outs[0]!.operationalStatus);
    expect(partner.outs[0]!.observedMaxStake).toBeUndefined();
  });

  test('does not mutate input partner records', async () => {
    const { partners, tennis } = await loadBuiltPartners();
    const before = JSON.stringify(partners);
    reconcilePartnerDashboardFacts({ partners, tennis });
    expect(JSON.stringify(partners)).toBe(before);
  });

  test('sportsbook conflict when tennis mapped id disagrees with built out', async () => {
    const { partners, tennis } = await loadBuiltPartners();
    const mutated = structuredClone(partners) as PartnerDashboardRecord[];
    const ash1 = mutated.find(p => p.partnerCode === 'ASH')!.outs.find(o => o.outId === 'out-ASH-1')!;
    ash1.sportsbookId = parseSportsbookId('parlay21-com');

    const reconciled = reconcilePartnerDashboardFacts({ partners: mutated, tennis });
    const upgraded = reconciled.partners
      .find(p => p.partnerCode === 'ASH')!
      .outs.find(o => o.outId === 'out-ASH-1')!;
    expect(upgraded.sportsbookId).toBe('hard-rock-florida');
    const bookConflict = reconciled.conflicts.find(
      c => c.partnerCode === 'ASH' && c.fieldPath === 'partners[].outs[].sportsbookId'
    );
    expect(bookConflict?.values).toEqual(['hard-rock-florida', 'parlay21-com']);
    expect(bookConflict?.adapterIds[0]).toBe('tennis-contract');
  });

  test('unregistered synthetic outId is never added to activeOutIds', () => {
    const emptyPartners: PartnerDashboardRecord[] = [];
    const tennis: TennisCapacityProjection = {
      source: 'live',
      executionEvidence: true,
      observations: [
        {
          partnerCode: parsePartnerCode('ASH'),
          callSign: parsePartnerCallSign('ASH-001', parsePartnerCode('ASH')),
          outId: parseCanonicalOutId('out-ASH-99'),
          externalBookRef: null,
          sportsbookResolution: 'unresolved',
          sourceStatus: 'active',
          active: true,
          credentials: 'configured',
          observedAt: '2026-08-08T18:00:00.000Z',
          provenance: {
            sourceSystemId: parseSourceSystemId('tennis-hq'),
            adapterId: parseAdapterId('tennis-capacity-v1'),
            adapterVersion: '1',
            observedAt: '2026-08-08T18:00:00.000Z',
            originalValue: 'active',
            mappingMethod: 'identity',
            confidence: 'exact',
          },
        },
      ],
      unresolvedBookRefs: [],
    };
    const reconciled = reconcilePartnerDashboardFacts({ partners: emptyPartners, tennis });
    expect(reconciled.activeOutIds).toEqual([]);
    expect(reconciled.partners).toEqual([]);
  });
});
