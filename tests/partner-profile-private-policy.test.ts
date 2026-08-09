import { describe, expect, test } from 'bun:test';
import {
  assertPublicPartnerProfileLeakFree,
  buildPublicPartnerProfilesArtifact,
  detectPrivatePolicySurfacePresence,
  parsePrivatePartnerProfileSurface,
  PARTNER_PROFILE_PUBLIC_SCHEMA,
  projectPublicPartnerProfile,
} from '../packages/partners/src/index.ts';

const GENERATED_AT = '2026-08-08T22:00:00.000Z';

function privateAshFixture() {
  return {
    meta: { templateId: 'partner-active', version: '1.0.0', name: 'Partner ASH', source: 'telegram' },
    identity: { code: 'ASH', callSign: 'ASH-001', status: 'onboarded' },
    lifecycle: { status: 'active', phase: 'operator_ready' },
    lineage: { parent: '', expert: '', cutPct: 40 },
    telegram: { chatId: '-1003937534779', topics: { general: 1, ops: 12 } },
    jurisdiction: {
      type: 'pph',
      allowedStates: ['NV', 'NJ'],
      allowedCountries: ['US'],
      minimumAge: 21,
      kycTier: 'basic',
      geoFenceEnabled: true,
    },
    rules: {
      sor: {
        eligibleTiers: ['T1', 'T2'],
        maxExposurePerSignal: 250,
        maxDailyExposure: 1000,
        maxSingleBet: 500,
        signalGates: { steam: true, arb: false },
        requireOpsecGreen: true,
        opsecScoreMax: 20,
      },
    },
    books: {
      'hard-rock-florida': {
        type: 'legal',
        status: 'ready',
        account: { username: 'ash1.staging', vaultKey: 'partner:ASH:hard-rock-florida' },
        funding: { method: 'deposit.method.venmo', rail: 'Venmo', target: '@ash.hr.fl' },
        limits: { maxBet: 500 },
      },
    },
    cultivation: { initialDepositTarget: 500, depositAmounts: [100, 150] },
    settlement: { commissionPct: 10 },
    balance: { initialCapitalRequirement: 500.5 },
  };
}

describe('partner profile private policy surface (Lane D1)', () => {
  test('detects policy presence without copying secret values', () => {
    const presence = detectPrivatePolicySurfacePresence(privateAshFixture());
    expect(presence).toEqual({
      hasJurisdiction: true,
      hasSorRules: true,
      hasTelegramContact: true,
      hasBooks: true,
      hasCultivation: true,
      hasSettlement: true,
      hasBalance: true,
      hasLineage: true,
      hasAnyPrivatePolicy: true,
    });
    // Presence object itself must never embed secret payloads
    expect(JSON.stringify(presence)).not.toContain('allowedStates');
    expect(JSON.stringify(presence)).not.toContain('vaultKey');
    expect(JSON.stringify(presence)).not.toContain('-1003937534779');
  });

  test('parsePrivatePartnerProfileSurface returns identity + flags only', () => {
    const surface = parsePrivatePartnerProfileSurface(privateAshFixture(), {
      recordKey: 'ASH',
    });
    expect(surface.partnerCode).toBe('ASH');
    expect(surface.callSign).toBe('ASH-001');
    expect(surface.lifecycleState).toBe('active');
    expect(surface.operationalPhase).toBe('operator_ready');
    expect(surface.profileDocumentVersion).toBe('1.0.0');
    expect(surface.policy.hasSorRules).toBe(true);
    expect(surface.policy.hasJurisdiction).toBe(true);
    expect(surface.source.adapterId).toBe('canonical-profile-config');
    expect(surface.source.sourceRecordRef).toBe('config/partner-profiles/ASH.toml');

    const json = JSON.stringify(surface);
    for (const forbidden of [
      'allowedStates',
      'maxExposurePerSignal',
      'vaultKey',
      'ash1.staging',
      '-1003937534779',
      '@ash.hr.fl',
      'password',
      'signalGates',
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });

  test('projectPublicPartnerProfile strips jurisdiction/SOR/contact/books', () => {
    const publicProfile = projectPublicPartnerProfile(privateAshFixture(), { recordKey: 'ASH' });
    expect(publicProfile).toEqual({
      meta: { templateId: 'partner-active', version: '1.0.0' },
      identity: { code: 'ASH', callSign: 'ASH-001' },
      lifecycle: { status: 'active', phase: 'operator_ready' },
    });
    assertPublicPartnerProfileLeakFree(publicProfile);
    const json = JSON.stringify(publicProfile);
    for (const forbidden of [
      'jurisdiction',
      'rules',
      'telegram',
      'books',
      'cultivation',
      'settlement',
      'balance',
      'lineage',
      'allowedStates',
      'vaultKey',
      'chatId',
      'never-public',
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });

  test('buildPublicPartnerProfilesArtifact is leak-free and schema-shaped', () => {
    const artifact = buildPublicPartnerProfilesArtifact(
      { ASH: privateAshFixture() },
      GENERATED_AT
    );
    expect(artifact.schema).toBe(PARTNER_PROFILE_PUBLIC_SCHEMA);
    expect(artifact.schemaVersion).toBe(2);
    expect(artifact.summary.count).toBe(1);
    expect(artifact.profiles.ASH.identity.code).toBe('ASH');
    assertPublicPartnerProfileLeakFree(artifact);
    assertPublicPartnerProfileLeakFree(JSON.stringify(artifact));
  });

  test('assertPublicPartnerProfileLeakFree refuses leaked policy and credentials', () => {
    expect(() =>
      assertPublicPartnerProfileLeakFree({
        identity: { code: 'ASH', callSign: 'ASH-001' },
        jurisdiction: { allowedStates: ['NV'] },
      })
    ).toThrow(/leaks private policy/);

    expect(() =>
      assertPublicPartnerProfileLeakFree({
        identity: { code: 'ASH', callSign: 'ASH-001' },
        books: { x: { account: { vaultKey: 'partner:ASH:x' } } },
      })
    ).toThrow(/leaks private policy|forbidden secret marker/);

    expect(() =>
      assertPublicPartnerProfileLeakFree({
        meta: { note: 'vault:secret-ref' },
      })
    ).toThrow(/forbidden secret marker/);
  });

  test('rejects mismatched record key and unknown lifecycle', () => {
    expect(() =>
      parsePrivatePartnerProfileSurface(privateAshFixture(), { recordKey: 'BIL' })
    ).toThrow(/must match record key/);

    const bad = privateAshFixture();
    (bad.lifecycle as { status: string }).status = 'frozen';
    expect(() => parsePrivatePartnerProfileSurface(bad)).toThrow(/lifecycle.status/);
  });
});
