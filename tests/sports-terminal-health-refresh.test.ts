import { describe, expect, test } from 'bun:test';
import {
  SPORTS_TERMINAL_HEALTH_SCHEMA,
  SPORTS_TERMINAL_INPUT_REF,
  SPORTS_TERMINAL_MONEY_POLICY,
  SPORTS_TERMINAL_RUNTIME,
  normalizeSportsTerminalIntegrationHealthDocument,
  parseSportsTerminalIntegrationHealth,
} from '../packages/partners/src/index.ts';

const NOW = '2026-08-08T22:30:00.000Z';

function liveWire(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: SPORTS_TERMINAL_HEALTH_SCHEMA,
    kind: 'sports-terminal-integration-health',
    schemaVersion: 1,
    generatedAt: NOW,
    source: 'live',
    runtimeUrl: SPORTS_TERMINAL_RUNTIME,
    moneyPolicy: SPORTS_TERMINAL_MONEY_POLICY,
    contractPaths: {
      integrationHealth: `${SPORTS_TERMINAL_RUNTIME}/api/v1/partners/integration-health`,
    },
    externalIdMap: {
      'st-partner-ash-001': 'ASH',
      'st-partner-orphan-9': 'ZZZZZZ', // will be dropped if no partner row; map-only ok
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
      {
        // Live handler may emit unresolved rows with null codes
        partnerCode: null,
        callSign: null,
        externalPartnerId: 'st-unresolved-42',
        overall: 'unknown',
        sourceCount: 0,
        healthyCount: 0,
        maxStakeMinorUnits: null,
        checkedAt: NOW,
      },
    ],
    ...overrides,
  };
}

describe('Sports Terminal integration-health refresh normalize', () => {
  test('normalizes live wire: drops unresolved, omits null money, proves parse', () => {
    const doc = normalizeSportsTerminalIntegrationHealthDocument(liveWire());
    expect(doc.path).toBe(SPORTS_TERMINAL_INPUT_REF);
    expect(doc.source).toBe('live');
    expect(doc.partners).toHaveLength(1);
    expect(doc.partners[0]).toMatchObject({
      partnerCode: 'ASH',
      callSign: 'ASH-001',
      externalPartnerId: 'st-partner-ash-001',
      overall: 'healthy',
      maxStakeMinorUnits: 50_000,
    });
    expect(doc.externalIdMap).toEqual({ 'st-partner-ash-001': 'ASH' });
    expect(doc.summary).toEqual({
      partnerCount: 1,
      healthy: 1,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    });
    expect(doc.notes).toContain('st-unresolved-42');
    // Parse proof
    const projection = parseSportsTerminalIntegrationHealth(doc);
    expect(projection.observations).toHaveLength(1);
    expect(projection.observations[0]?.partnerCode).toBe('ASH');
  });

  test('rejects float money on refresh input', () => {
    const wire = liveWire();
    (wire.partners as Record<string, unknown>[])[0]!.currentBalance = 12.34;
    expect(() => normalizeSportsTerminalIntegrationHealthDocument(wire)).toThrow(
      /floating-point money|not allowed on the integration-health wire/
    );
  });

  test('fills callSign from PartnerCode when live row has null callSign', () => {
    const wire = liveWire({
      partners: [
        {
          partnerCode: 'BIL',
          callSign: null,
          externalPartnerId: 'st-partner-bil-001',
          overall: 'degraded',
          sourceCount: 3,
          healthyCount: 1,
          maxStakeMinorUnits: null,
          checkedAt: NOW,
        },
      ],
      externalIdMap: { 'st-partner-bil-001': 'BIL' },
    });
    const doc = normalizeSportsTerminalIntegrationHealthDocument(wire, { source: 'offline-join' });
    expect(doc.partners[0]?.callSign).toBe('BIL-001');
    expect(doc.partners[0]?.maxStakeMinorUnits).toBeUndefined();
    expect(doc.source).toBe('offline-join');
    parseSportsTerminalIntegrationHealth(doc);
  });

  test('committed fixture normalizes and re-parses', async () => {
    const fixture = await Bun.file(
      new URL('../public/registry/sports-terminal/partner-integration-health.json', import.meta.url)
    ).json();
    const doc = normalizeSportsTerminalIntegrationHealthDocument(fixture);
    expect(doc.summary.partnerCount).toBe(4);
    const projection = parseSportsTerminalIntegrationHealth(doc);
    expect(projection.observations.map(o => o.partnerCode).sort()).toEqual([
      'ASH',
      'BIL',
      'NOV',
      'SPEN',
    ]);
  });
});
