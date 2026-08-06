import { describe, expect, test } from 'bun:test';
import { parseTennisCapacityArtifact } from '../packages/partners/src/index.ts';

const NOW = '2026-08-06T18:00:00.000Z';
function artifact(source: 'live' | 'offline-join' = 'live'): any {
  return {
    schemaVersion: 1,
    kind: 'tennis-partner-contracts',
    runtimeUrl: 'https://tennis.factory-wager.com',
    generatedAt: NOW,
    source,
    contractPaths: {
      partnersCapacity: 'https://tennis.factory-wager.com/api/v1/partners/capacity',
      accountingFinance: 'https://tennis.factory-wager.com/api/v1/accounting/finance',
    },
    partners: [
      {
        partnerCode: 'ASH',
        callSign: 'ASH-001',
        outs: [
          {
            outId: 'out-ASH-1',
            partnerCode: 'ASH',
            callSign: 'ASH-001',
            status: 'active',
            bookId: 'book-hard-rock-florida',
            secretsConfigured: true,
            perBetMaxCents: 50_000,
          },
        ],
      },
    ],
  };
}

describe('Tennis partner capacity adapter', () => {
  test('projects live canonical out, credentials, book mapping, and integer max stake', () => {
    const result = parseTennisCapacityArtifact(artifact(), {
      bookRefMap: { 'book-hard-rock-florida': 'hard-rock-florida' },
    });
    expect(result).toMatchObject({ source: 'live', executionEvidence: true });
    expect(result.observations[0]).toMatchObject({
      partnerCode: 'ASH',
      outId: 'out-ASH-1',
      sportsbookId: 'hard-rock-florida',
      active: true,
      credentials: 'configured',
      maxStake: { currency: 'USD', minorUnits: 50_000 },
      maxStakeFact: { kind: 'max_stake', status: 'known' },
    });
  });

  test('does not promote offline compatibility capacity into execution evidence', () => {
    const result = parseTennisCapacityArtifact(artifact('offline-join'));
    expect(result.executionEvidence).toBe(false);
    expect(result.observations[0]!.maxStake).toBeUndefined();
    expect(result.unresolvedBookRefs).toEqual(['book-hard-rock-florida']);
  });

  test('rejects wrong runtime contracts, cross-partner outs, and fractional cents', () => {
    const wrongRuntime = artifact();
    wrongRuntime.runtimeUrl = 'https://example.com';
    expect(() => parseTennisCapacityArtifact(wrongRuntime)).toThrow('runtimeUrl');
    const cross = artifact();
    cross.partners[0].outs[0].outId = 'out-BIL-1';
    expect(() => parseTennisCapacityArtifact(cross)).toThrow('must belong');
    const fractional = artifact();
    fractional.partners[0].outs[0].perBetMaxCents = 1.5;
    expect(() => parseTennisCapacityArtifact(fractional)).toThrow('safe integer');
  });
});
