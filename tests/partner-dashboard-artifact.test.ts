import { describe, expect, test } from 'bun:test';
import {
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PROFILE_MIGRATION_REQUIRED_REASON,
  assemblePartnerDashboardArtifact,
  parseAttentionReasonCode,
  parseCanonicalOutId,
  parseCurrencyCode,
  parseAdapterId,
  parseExternalPartnerId,
  parseLedgerEntryId,
  parsePartnerCallSign,
  parsePartnerCode,
  parsePartnerDashboardArtifact,
  parseSportsbookId,
  parseSourceSystemId,
  translateOutIdIngress,
  type ConnectorSnapshot,
  type PartnerDashboardArtifact,
  type PartnerDashboardBuildInput,
  type PartnerDashboardRecord,
} from '../packages/partners/src/index.ts';

const NOW = '2026-08-05T18:00:00.000Z';

  function connectorSnapshots(): PartnerDashboardBuildInput['connectorSnapshots'] {
  return Object.fromEntries(
    PARTNER_CONNECTOR_SNAPSHOT_KEYS.map(key => [
      key,
      key === 'sportsTerminal'
        ? ({ dataStatus: 'unavailable', inputRef: '' } satisfies ConnectorSnapshot)
        : ({
            dataStatus: 'ok',
            observedAt: NOW,
            inputRef: `/registry/${key}.json`,
          } satisfies ConnectorSnapshot),
    ])
  ) as PartnerDashboardBuildInput['connectorSnapshots'];
}

function partnerRecord(options: { profile?: boolean } = {}): PartnerDashboardRecord {
  const code = parsePartnerCode('ASH');
  return {
    partnerCode: code,
    callSign: parsePartnerCallSign('ASH-001', code),
    lifecycle: {
      state: 'active',
      effectiveAt: NOW,
      provenance: {
        sourceSystemId: parseSourceSystemId(
          options.profile === false
            ? 'factorywager-partners-ops'
            : 'factorywager-partner-profile'
        ),
        adapterId: parseAdapterId(
          options.profile === false ? 'legacy-partners-ops' : 'profile-artifact'
        ),
        adapterVersion: options.profile === false ? '2' : '1',
        observedAt: NOW,
        originalValue: 'active',
        mappingMethod: 'identity',
        confidence: 'exact',
      },
    },
    operationalPhase: 'operator_ready',
    identity: {
      profileSourceSystemId: parseSourceSystemId(
        options.profile === false ? 'legacy-ops' : 'factorywager-partner-profile'
      ),
      externalPartnerRefs: [],
    },
    outs: [
      {
        outId: parseCanonicalOutId('out-ASH-1'),
        sportsbookId: parseSportsbookId('hard-rock-florida'),
        operationalStatus: 'ready',
        fundingStatus: 'funded',
        providerConnectionStatus: 'active',
        externalAccountRefs: [],
        maxBet: { currency: parseCurrencyCode('USD'), minorUnits: 50_000 },
        limitCoverageRatio: 1,
      },
    ],
    accounting: {
      balancePositions: [
        {
          accountScope: { kind: 'partner', partnerCode: code },
          amount: { currency: parseCurrencyCode('USD'), minorUnits: 125_00 },
          effectiveAt: NOW,
        },
      ],
      recentEntries: [
        {
          id: parseLedgerEntryId('ledger-ash-1'),
          entryType: 'deposit',
          amount: { currency: parseCurrencyCode('USD'), minorUnits: 125_00 },
          accountScope: { kind: 'partner', partnerCode: code },
          postedAt: NOW,
        },
      ],
    },
    communication: {
      chatLinked: true,
      handshakeStatus: 'ready',
      membershipCount: 3,
      configuredTopicKeys: ['accounting', 'ops'],
    },
    limits: { tracked: 1, missing: 0, coverageRatio: 1 },
    integrations: {
      tennis: { dataStatus: 'ok', observedAt: NOW },
      sportsTerminal: { dataStatus: 'unavailable' },
    },
    attention:
      options.profile === false
        ? [
            {
              reasonCode: PROFILE_MIGRATION_REQUIRED_REASON,
              severity: 'block',
              label: 'Canonical partner profile is not materialized',
              actionCommand: 'bun run partner-profile:migrate -- --code ASH',
            },
          ]
        : [],
  };
}

function buildInput(options: { profile?: boolean } = {}): PartnerDashboardBuildInput {
  const partner = partnerRecord(options);
  return {
    generatedAt: NOW,
    connectorSnapshots: connectorSnapshots(),
    canonicalProfileCodes: options.profile === false ? [] : [partner.partnerCode],
    activeOutIds: [partner.outs[0].outId],
    partners: [partner],
  };
}

describe('@factorywager/partners dashboard artifact', () => {
  test('assembles a validated colorless v1 read model from parsed records', () => {
    const artifact = assemblePartnerDashboardArtifact(buildInput());
    expect(artifact.schema).toBe('factorywager.partners-dashboard.v1');
    expect(artifact.activeOutIds).toEqual(['out-ASH-1']);
    expect(artifact.summary).toEqual({
      partnerCount: 1,
      canonicalProfileCount: 1,
      operatorReadyPartnerCount: 1,
      attentionPartnerCount: 0,
      registeredOutCount: 1,
      activeOutCount: 1,
      balancePositions: artifact.partners[0].accounting.balancePositions,
    });
    expect(parsePartnerDashboardArtifact(structuredClone(artifact))).toEqual(artifact);
    expect(JSON.stringify(artifact)).not.toMatch(/"(?:color|colors|theme|themeRole)"/);
  });

  test('allows legacy visibility only with an explicit migration reason', () => {
    const input = buildInput({ profile: false });
    const artifact = assemblePartnerDashboardArtifact(input);
    expect(artifact.summary.canonicalProfileCount).toBe(0);
    expect(artifact.summary.attentionPartnerCount).toBe(1);
    expect(artifact.partners[0].attention[0].reasonCode).toBe(
      'partner.profile.migration_required'
    );

    input.partners[0].attention = [];
    expect(() => assemblePartnerDashboardArtifact(input)).toThrow(
      'legacy-only partner ASH requires partner.profile.migration_required attention'
    );
  });

  test('rejects unsafe money, absent provenance, unexpected fields, and count drift', () => {
    const valid = assemblePartnerDashboardArtifact(buildInput());
    const unsafeMoney = structuredClone(valid) as PartnerDashboardArtifact;
    unsafeMoney.partners[0].outs[0].maxBet!.minorUnits = 1.25;
    expect(() => parsePartnerDashboardArtifact(unsafeMoney)).toThrow('minorUnits');

    const absentProvenance = structuredClone(valid) as PartnerDashboardArtifact;
    Reflect.deleteProperty(absentProvenance.partners[0].lifecycle.provenance, 'originalValue');
    expect(() => parsePartnerDashboardArtifact(absentProvenance)).toThrow('originalValue');

    const presentation = structuredClone(valid) as PartnerDashboardArtifact;
    Object.assign(presentation.partners[0], { color: '#fff' });
    expect(() => parsePartnerDashboardArtifact(presentation)).toThrow('presentation data');

    const leakedAdapterField = structuredClone(valid) as PartnerDashboardArtifact;
    Object.assign(leakedAdapterField.partners[0].identity, { apiToken: 'must-not-pass' });
    expect(() => parsePartnerDashboardArtifact(leakedAdapterField)).toThrow(
      'unexpected field(s): apiToken'
    );

    const leakedConflictValue = structuredClone(valid) as PartnerDashboardArtifact;
    (leakedConflictValue.conflicts as unknown[]).push({
      partnerCode: 'ASH',
      fieldPath: 'identity.externalPartnerRefs',
      adapterIds: ['profile-artifact', 'sports-terminal'],
      values: ['redacted', { apiToken: 'must-not-pass' }],
    });
    expect(() => parsePartnerDashboardArtifact(leakedConflictValue)).toThrow('JSON scalar');

    const countDrift = structuredClone(valid) as PartnerDashboardArtifact;
    countDrift.summary.partnerCount = 2;
    expect(() => parsePartnerDashboardArtifact(countDrift)).toThrow(
      'summary.partnerCount does not match'
    );
  });

  test('rejects missing connectors, cross-partner outs, and unregistered active outs', () => {
    const valid = assemblePartnerDashboardArtifact(buildInput());
    const missingConnector = structuredClone(valid) as PartnerDashboardArtifact;
    Reflect.deleteProperty(missingConnector.connectorSnapshots, 'profiles');
    expect(() => parsePartnerDashboardArtifact(missingConnector)).toThrow(
      'exact v1 connector key set'
    );

    const crossPartnerOut = structuredClone(valid) as PartnerDashboardArtifact;
    crossPartnerOut.partners[0].outs[0].outId = parseCanonicalOutId('out-BIL-1');
    expect(() => parsePartnerDashboardArtifact(crossPartnerOut)).toThrow('must belong to ASH');

    const crossPartnerBalance = structuredClone(valid) as PartnerDashboardArtifact;
    const bilCode = parsePartnerCode('BIL');
    crossPartnerBalance.partners[0].accounting.balancePositions[0].accountScope = {
      kind: 'partner',
      partnerCode: bilCode,
    };
    crossPartnerBalance.summary.balancePositions[0].accountScope = {
      kind: 'partner',
      partnerCode: bilCode,
    };
    expect(() => parsePartnerDashboardArtifact(crossPartnerBalance)).toThrow(
      'must belong to partner ASH'
    );

    const activeBlockedOut = structuredClone(valid) as PartnerDashboardArtifact;
    activeBlockedOut.partners[0].outs[0].operationalStatus = 'blocked';
    expect(() => parsePartnerDashboardArtifact(activeBlockedOut)).toThrow(
      'must reference a ready OutId'
    );

    const input = buildInput();
    input.activeOutIds = [parseCanonicalOutId('out-ASH-2')];
    expect(() => assemblePartnerDashboardArtifact(input)).toThrow(
      'active OutId is not registered'
    );

    const missingGeneratedAt = buildInput();
    Reflect.deleteProperty(missingGeneratedAt, 'generatedAt');
    expect(() => assemblePartnerDashboardArtifact(missingGeneratedAt)).toThrow(
      'artifact.generatedAt must be JSON-safe'
    );

    const missingFreshTimestamp = structuredClone(valid) as PartnerDashboardArtifact;
    Reflect.deleteProperty(missingFreshTimestamp.connectorSnapshots.profiles, 'observedAt');
    expect(() => parsePartnerDashboardArtifact(missingFreshTimestamp)).toThrow(
      'observedAt is required for ok data'
    );

    expect(() =>
      parseCanonicalOutId(`out-ASH-${'9'.repeat(40)}`)
    ).toThrow('positive safe integer');
  });

  test('requires canonical profile evidence to match the profile source', () => {
    const legacyInput = buildInput({ profile: false });
    legacyInput.canonicalProfileCodes = [legacyInput.partners[0].partnerCode];
    expect(() => assemblePartnerDashboardArtifact(legacyInput)).toThrow(
      'must match factorywager-partner-profile'
    );

    const rawLegacy = assemblePartnerDashboardArtifact(buildInput());
    rawLegacy.partners[0].identity.profileSourceSystemId = parseSourceSystemId('legacy-ops');
    expect(() => parsePartnerDashboardArtifact(rawLegacy)).toThrow(
      'requires partner.profile.migration_required attention'
    );
  });

  test('keeps CODE-N translation at ingress and rejects ambiguous aliases', () => {
    expect(translateOutIdIngress('out-ASH-2')).toEqual({
      outId: 'out-ASH-2',
      translated: false,
    });
    expect(translateOutIdIngress('ASH-2')).toEqual({
      outId: 'out-ASH-2',
      translated: true,
      originalValue: 'ASH-2',
      mappingId: 'legacy-seat-out-token',
      deprecation: {
        warningCode: 'partner.out_id.legacy_translated',
        counter: 'partner_ingress_translation_total',
      },
    });
    for (const invalid of ['ASH-0', 'ASH-01', 'ash-1', 'ASH--1', 'out-ASH-01']) {
      expect(() => translateOutIdIngress(invalid), invalid).toThrow();
    }
  });

  test('keeps external identities and attention reasons source-qualified', () => {
    const artifact = assemblePartnerDashboardArtifact(buildInput());
    artifact.partners[0].identity.externalPartnerRefs.push({
      sourceSystemId: parseSourceSystemId('sports-terminal'),
      externalId: parseExternalPartnerId('remote-42'),
    });
    artifact.partners[0].attention.push({
      reasonCode: parseAttentionReasonCode('partner.source.conflict'),
      severity: 'warn',
      label: 'External source disagrees with the canonical profile',
    });
    artifact.summary.attentionPartnerCount = 1;
    expect(parsePartnerDashboardArtifact(artifact).partners[0].identity.externalPartnerRefs).toEqual(
      [{ sourceSystemId: 'sports-terminal', externalId: 'remote-42' }]
    );
  });
});
