import { describe, expect, test } from 'bun:test';
import {
  adaptExternalLifecycleObservation,
  adaptLifecycleFromCanonicalProfiles,
  deriveOperationalPhase,
  mapExternalLifecycleState,
  mapPartnerLifecycleStatusToState,
  PARTNER_LIFECYCLE_ADAPTER_ID,
  parsePartnerCode,
  parsePartnerProfileCoverageArtifact,
  PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
} from '../packages/partners/src/index.ts';

const NOW = '2026-08-08T18:00:00.000Z';

describe('partner lifecycle adapter', () => {
  test('maps private-profile status values by identity onto PartnerLifecycleState', () => {
    expect(mapPartnerLifecycleStatusToState('active')).toBe('active');
    expect(mapPartnerLifecycleStatusToState('suspended')).toBe('suspended');
    expect(() => mapPartnerLifecycleStatusToState('frozen')).toThrow(/unknown partner lifecycle/);
  });

  test('maps Sports Terminal frozen → suspended via declared mapping', () => {
    const mapped = mapExternalLifecycleState('sports-terminal', 'frozen');
    expect(mapped).toEqual({
      state: 'suspended',
      mappingMethod: 'declared',
      confidence: 'exact',
      adapterId: 'sports-terminal',
      adapterVersion: '2',
    });
    const fact = adaptExternalLifecycleObservation({
      partnerCode: parsePartnerCode('ASH'),
      sourceSystemId: 'sports-terminal',
      externalState: 'frozen',
      observedAt: NOW,
      sourceRecordRef: 'sports-terminal:partner/ASH',
    });
    expect(fact.state).toBe('suspended');
    expect(fact.provenance.originalValue).toBe('frozen');
    expect(fact.provenance.mappingMethod).toBe('declared');
    expect(fact.provenance.adapterId).toBe('sports-terminal');
  });

  test('derives operational phase without treating it as lifecycle authority', () => {
    expect(
      deriveOperationalPhase('active', { telegramLinked: true, hasBooks: true })
    ).toBe('operator_ready');
    expect(
      deriveOperationalPhase('active', { telegramLinked: false, hasBooks: true })
    ).toBe('incomplete');
    expect(
      deriveOperationalPhase('kyc_pending', { telegramLinked: true, hasBooks: true })
    ).toBe('onboarding');
    expect(
      deriveOperationalPhase('suspended', { telegramLinked: true, hasBooks: true })
    ).toBe('paused');
  });

  test('adapts lifecycle from public partner-profiles bake with full provenance', async () => {
    const bake = await Bun.file(
      new URL('../public/registry/partner-profiles.json', import.meta.url)
    ).json();
    const observations = adaptLifecycleFromCanonicalProfiles(bake, {
      completenessByCode: {
        ASH: { telegramLinked: true, hasBooks: true },
        BIL: { telegramLinked: true, hasBooks: true },
        NOV: { telegramLinked: false, hasBooks: true },
        SPEN: { telegramLinked: true, hasBooks: true },
      },
    });
    expect(observations.map(o => o.partnerCode)).toEqual(['ASH', 'BIL', 'NOV', 'SPEN']);
    const ash = observations.find(o => o.partnerCode === 'ASH')!;
    expect(ash.callSign).toBe('ASH-001');
    expect(ash.lifecycle.state).toBe('active');
    expect(ash.lifecycle.provenance.originalValue).toBe('active');
    expect(ash.lifecycle.provenance.sourceSystemId).toBe('factorywager-partner-profile');
    expect(ash.lifecycle.provenance.adapterId).toBe(PARTNER_LIFECYCLE_ADAPTER_ID);
    expect(ash.lifecycle.provenance.mappingMethod).toBe('identity');
    expect(ash.lifecycle.provenance.confidence).toBe('exact');
    expect(ash.lifecycle.provenance.sourceRecordRef).toContain('#/profiles/ASH');
    expect(ash.operationalPhase).toBe('operator_ready');
    const nov = observations.find(o => o.partnerCode === 'NOV')!;
    expect(nov.operationalPhase).toBe('incomplete');
  });

  test('profile-coverage artifact cannot author lifecycle (no lifecycle fields)', () => {
    const coverage = parsePartnerProfileCoverageArtifact({
      schema: PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
      generatedAt: NOW,
      evidenceByPartnerCode: {
        ASH: { callSign: 'ASH-001', profileDocumentVersion: '1.0.0' },
      },
    });
    // Coverage entries are identity-only; adapting them as profile records fails closed
    // (missing identity object / lifecycle — never fabricates a lifecycle fact).
    expect(() =>
      adaptLifecycleFromCanonicalProfiles({
        generatedAt: NOW,
        profiles: coverage.evidenceByPartnerCode,
      })
    ).toThrow(/identity|lifecycle/);
  });
});
