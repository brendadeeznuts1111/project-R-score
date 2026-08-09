import { describe, expect, test } from 'bun:test';
import {
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  PARTNER_PROFILE_COVERAGE_ADAPTER_ID,
  PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
  buildPartnerProfileCoverageArtifact,
  derivePartnerProfileCoverage,
  parsePartnerCode,
  parsePartnerProfileCoverageArtifact,
  parseProfileDocumentVersion,
  adaptPartnerProfileCoverageArtifact,
} from '../packages/partners/src/index.ts';

const generatedAt = '2026-08-05T12:00:00.000Z';

function privateFixture() {
  return {
    ASH: {
      meta: { version: '1.2.3', templateId: 'partner-active' },
      identity: { code: 'ASH', callSign: 'ASH-001', status: 'onboarded' },
      lifecycle: { status: 'active', phase: 'operator_ready' },
      telegram: { chatId: '-1000000000000' },
      books: {
        example: {
          account: { username: 'private-user', password: 'never-public', vaultKey: 'vault:key' },
          funding: { target: '@private-payment-target' },
        },
      },
      balance: { initialCapitalRequirement: 500.5 },
    },
  };
}

describe('partner profile coverage boundary', () => {
  test('projects only canonical identity coverage from a private profile', () => {
    const artifact = buildPartnerProfileCoverageArtifact(privateFixture(), generatedAt);
    expect(artifact).toEqual({
      schema: PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
      generatedAt,
      evidenceByPartnerCode: {
        ASH: { callSign: 'ASH-001', profileDocumentVersion: '1.2.3' },
      },
    });
    const json = JSON.stringify(artifact);
    for (const forbidden of [
      'never-public',
      'private-user',
      'vault:key',
      '@private-payment-target',
      '-1000000000000',
      'operator_ready',
      'initialCapitalRequirement',
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });

  test('emits source-qualified evidence without lifecycle or phase', () => {
    const artifact = buildPartnerProfileCoverageArtifact(privateFixture(), generatedAt);
    const evidence = adaptPartnerProfileCoverageArtifact(artifact);
    expect(evidence).toEqual([
      {
        partnerCode: 'ASH',
        callSign: 'ASH-001',
        profileDocumentVersion: '1.2.3',
        source: {
          sourceSystemId: CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
          adapterId: PARTNER_PROFILE_COVERAGE_ADAPTER_ID,
          adapterVersion: '1',
          observedAt: generatedAt,
          sourceRecordRef:
            '/registry/partner-profile-coverage.json#/evidenceByPartnerCode/ASH',
        },
      },
    ]);
    expect(JSON.stringify(evidence)).not.toContain('lifecycle');
    expect(JSON.stringify(evidence)).not.toContain('phase');
  });

  test('derives deterministic present and missing coverage', () => {
    const artifact = buildPartnerProfileCoverageArtifact(privateFixture(), generatedAt);
    expect(
      derivePartnerProfileCoverage(artifact, [parsePartnerCode('ROOT'), parsePartnerCode('ASH')])
    ).toEqual({
      presentCodes: ['ASH'],
      missingCodes: ['ROOT'],
      complete: false,
    });
    expect(() =>
      derivePartnerProfileCoverage(artifact, [parsePartnerCode('ASH'), parsePartnerCode('ASH')])
    ).toThrow('visibleCodes must not contain duplicate PartnerCode values');
  });

  test('public artifact covers the four production CODEs from private profiles', async () => {
    const artifact = parsePartnerProfileCoverageArtifact(
      await Bun.file(
        new URL('../public/registry/partner-profile-coverage.json', import.meta.url)
      ).json()
    );
    const production = (['ASH', 'BIL', 'NOV', 'SPEN'] as const).map(parsePartnerCode);
    const coverage = derivePartnerProfileCoverage(artifact, production);
    expect(coverage.presentCodes).toEqual(production);
    expect(coverage.missingCodes).toEqual([]);
    expect(coverage.complete).toBe(true);
    // Still fail-closed for unknown requested CODEs
    expect(
      derivePartnerProfileCoverage(artifact, [parsePartnerCode('ROOT'), ...production]).missingCodes
    ).toEqual(['ROOT']);
  });

  test('rejects loose schemas, mismatched identities, and noncanonical time', async () => {
    expect(parseProfileDocumentVersion('1.2.3')).toBe('1.2.3');
    expect(() => parseProfileDocumentVersion(' 1.2.3 ')).toThrow('ProfileDocumentVersion');
    expect(() =>
      parsePartnerProfileCoverageArtifact({
        schema: PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
        generatedAt,
        evidenceByPartnerCode: {
          ASH: {
            callSign: 'ROOT-001',
            profileDocumentVersion: '1',
            lifecycle: 'active',
          },
        },
      })
    ).toThrow('must contain exactly');
    expect(() => buildPartnerProfileCoverageArtifact({ ROOT: privateFixture().ASH }, generatedAt)).toThrow(
      'identity.code must match its record key'
    );
    expect(() =>
      parsePartnerProfileCoverageArtifact({
        schema: PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
        generatedAt: '2026-08-05',
        evidenceByPartnerCode: {},
      })
    ).toThrow('canonical UTC ISO timestamp');

    const legacyArtifact = await Bun.file(
      new URL('../public/registry/partner-profiles.json', import.meta.url)
    ).json();
    expect(() => parsePartnerProfileCoverageArtifact(legacyArtifact)).toThrow(
      `profileCoverage must contain exactly: evidenceByPartnerCode, generatedAt, schema`
    );
  });
});
