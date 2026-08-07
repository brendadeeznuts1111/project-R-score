import { describe, expect, test } from 'bun:test';
import {
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS,
  PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1,
  PROFILE_MIGRATION_REQUIRED_REASON,
  assemblePartnerDashboardArtifact,
  evaluateConnectorFreshness,
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
    PARTNER_CONNECTOR_SNAPSHOT_KEYS.map(key => {
      const decision = evaluateConnectorFreshness({
        asOf: NOW,
        expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
        required: key === 'profiles',
        ...(key === 'sportsTerminal'
          ? {}
          : {
              current: {
                observedAt: NOW,
                inputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
              },
            }),
      });
      if (decision.disposition === 'fail_bake') throw new Error(decision.reasonCode);
      return [key, decision.snapshot satisfies ConnectorSnapshot];
    })
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
        observedMaxStake: {
          amount: { currency: parseCurrencyCode('USD'), minorUnits: 50_000 },
          provenance: {
            sourceSystemId: parseSourceSystemId('tennis-hq'),
            adapterId: parseAdapterId('tennis-contract'),
            adapterVersion: '1',
            observedAt: NOW,
            originalValue: '50000',
            mappingMethod: 'identity',
            confidence: 'exact',
          },
        },
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
    expect(artifact.schema).toBe(PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1);
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
    unsafeMoney.partners[0].outs[0].observedMaxStake!.amount.minorUnits = 1.25;
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
      fieldPath: 'partners[].outs[].operationalStatus',
      adapterIds: ['profile-artifact', 'sports-terminal'],
      values: ['ready', { apiToken: 'must-not-pass' }],
    });
    expect(() => parsePartnerDashboardArtifact(leakedConflictValue)).toThrow('JSON scalar');

    const countDrift = structuredClone(valid) as PartnerDashboardArtifact;
    countDrift.summary.partnerCount = 2;
    expect(() => parsePartnerDashboardArtifact(countDrift)).toThrow(
      'summary.partnerCount does not match'
    );
  });

  test('accepts only registered, typed, distinct conflict evidence', () => {
    const input = buildInput();
    input.conflicts = [
      {
        partnerCode: input.partners[0].partnerCode,
        fieldPath: 'partners[].outs[].operationalStatus',
        adapterIds: [parseAdapterId('tennis-contract'), parseAdapterId('sports-terminal')],
        values: ['ready', 'blocked'],
      },
    ];
    expect(assemblePartnerDashboardArtifact(input).conflicts).toHaveLength(1);

    const unknownPath = structuredClone(assemblePartnerDashboardArtifact(input));
    unknownPath.conflicts[0].fieldPath = 'partners[].identity.apiToken' as never;
    expect(() => parsePartnerDashboardArtifact(unknownPath)).toThrow(
      'artifact.conflicts[0].fieldPath must be one of'
    );

    const duplicateValues = structuredClone(assemblePartnerDashboardArtifact(input));
    duplicateValues.conflicts[0].values = ['ready', 'ready'];
    expect(() => parsePartnerDashboardArtifact(duplicateValues)).toThrow(
      'distinct normalized values'
    );

    const invalidValue = structuredClone(assemblePartnerDashboardArtifact(input));
    invalidValue.conflicts[0].values = ['ready', 'secret-token-value'];
    expect(() => parsePartnerDashboardArtifact(invalidValue)).toThrow(
      'must be one of unknown|ready|deferred|paused|blocked'
    );
  });

  test('recomputes connector freshness instead of trusting caller status', () => {
    const valid = assemblePartnerDashboardArtifact(buildInput());

    const spoofedStatus = structuredClone(valid);
    spoofedStatus.connectorSnapshots.tennis.observedAt = '2026-08-05T17:54:59.000Z';
    spoofedStatus.connectorSnapshots.tennis.ageSeconds = 301;
    expect(() => parsePartnerDashboardArtifact(spoofedStatus)).toThrow(
      'dataStatus does not match computed connector freshness'
    );

    const spoofedAge = structuredClone(valid);
    spoofedAge.connectorSnapshots.tennis.observedAt = '2026-08-05T17:59:59.000Z';
    expect(() => parsePartnerDashboardArtifact(spoofedAge)).toThrow(
      'ageSeconds does not match computed connector freshness'
    );

    const wrongInput = structuredClone(valid);
    wrongInput.connectorSnapshots.tennis.inputRef = '/registry/wrong.json';
    expect(() => parsePartnerDashboardArtifact(wrongInput)).toThrow(
      'inputRef must match the configured connector input'
    );

    const missingRequired = structuredClone(valid);
    missingRequired.connectorSnapshots.profiles = {
      dataStatus: 'unavailable',
      sourceMode: 'none',
      reasonCode: 'optional_source_unavailable',
      inputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.profiles,
    };
    expect(() => parsePartnerDashboardArtifact(missingRequired)).toThrow(
      'cannot represent required_source_unavailable'
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
      'observedAt is required for current data'
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
