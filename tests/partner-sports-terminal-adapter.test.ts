import { describe, expect, test } from 'bun:test';
import {
  parseSportsTerminalIntegrationHealth,
  SPORTS_TERMINAL_HEALTH_SCHEMA,
  SPORTS_TERMINAL_INPUT_REF,
  SPORTS_TERMINAL_MONEY_POLICY,
  SPORTS_TERMINAL_RUNTIME,
} from '../packages/partners/src/index.ts';

const NOW = '2026-08-08T18:00:00.000Z';

function artifact(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: SPORTS_TERMINAL_HEALTH_SCHEMA,
    kind: 'sports-terminal-integration-health',
    schemaVersion: 1,
    generatedAt: NOW,
    source: 'fixture',
    runtimeUrl: SPORTS_TERMINAL_RUNTIME,
    moneyPolicy: SPORTS_TERMINAL_MONEY_POLICY,
    contractPaths: {
      integrationHealth: `${SPORTS_TERMINAL_RUNTIME}/api/v1/partners/integration-health`,
    },
    externalIdMap: {
      'st-partner-ash-001': 'ASH',
    },
    partners: [
      {
        partnerCode: 'ASH',
        callSign: 'ASH-001',
        externalPartnerId: 'st-partner-ash-001',
        overall: 'healthy',
        sourceCount: 2,
        healthyCount: 2,
        maxStakeMinorUnits: 50_000,
        checkedAt: NOW,
      },
    ],
    ...overrides,
  };
}

describe('Sports Terminal integration-health adapter', () => {
  test('parses exact wire with ExternalPartnerRef and integer minor-unit stake', () => {
    const result = parseSportsTerminalIntegrationHealth(artifact());
    expect(result.source).toBe('fixture');
    expect(result.moneyPolicy).toBe(SPORTS_TERMINAL_MONEY_POLICY);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      partnerCode: 'ASH',
      callSign: 'ASH-001',
      overall: 'healthy',
      sourceCount: 2,
      healthyCount: 2,
      maxStakeMinorUnits: 50_000,
      externalPartnerRef: {
        sourceSystemId: 'sports-terminal',
        externalId: 'st-partner-ash-001',
      },
      provenance: {
        adapterId: 'sports-terminal',
        adapterVersion: '2',
        mappingMethod: 'identity',
        confidence: 'exact',
        originalValue: 'healthy',
      },
    });
    expect(SPORTS_TERMINAL_INPUT_REF).toBe(
      '/registry/sports-terminal/partner-integration-health.json'
    );
  });

  test('rejects floating-point money keys and unresolved external IDs', () => {
    const floatMoney = artifact();
    (floatMoney.partners as any[])[0].currentBalance = 1234.56;
    expect(() => parseSportsTerminalIntegrationHealth(floatMoney)).toThrow(
      /floating-point money|not allowed on the integration-health wire/
    );

    const majorUnitStake = artifact();
    (majorUnitStake.partners as any[])[0].maxStake = 500;
    expect(() => parseSportsTerminalIntegrationHealth(majorUnitStake)).toThrow(/maxStake/);

    const unresolved = artifact({
      externalIdMap: {},
    });
    expect(() => parseSportsTerminalIntegrationHealth(unresolved)).toThrow(/externalIdMap/);

    const mismatch = artifact({
      externalIdMap: { 'st-partner-ash-001': 'BIL' },
    });
    expect(() => parseSportsTerminalIntegrationHealth(mismatch)).toThrow(/does not match/);
  });

  test('rejects wrong runtime contract, schema, and fractional minor units', () => {
    const wrongRuntime = artifact({ runtimeUrl: 'https://example.com' });
    expect(() => parseSportsTerminalIntegrationHealth(wrongRuntime)).toThrow('runtimeUrl');

    const badSchema = artifact({ schema: 'other.v1' });
    expect(() => parseSportsTerminalIntegrationHealth(badSchema)).toThrow('schema');

    const fractional = artifact();
    (fractional.partners as any[])[0].maxStakeMinorUnits = 1.5;
    expect(() => parseSportsTerminalIntegrationHealth(fractional)).toThrow('safe integer');
  });

  test('parses committed public registry fixture for all four CODEs', async () => {
    const raw = await Bun.file(
      new URL('../public/registry/sports-terminal/partner-integration-health.json', import.meta.url)
    ).json();
    const result = parseSportsTerminalIntegrationHealth(raw);
    expect(result.observations.map(o => o.partnerCode).sort()).toEqual([
      'ASH',
      'BIL',
      'NOV',
      'SPEN',
    ]);
    expect(result.observations.find(o => o.partnerCode === 'BIL')?.overall).toBe('degraded');
    expect(result.observations.find(o => o.partnerCode === 'ASH')?.maxStakeMinorUnits).toBe(50_000);
  });
});
