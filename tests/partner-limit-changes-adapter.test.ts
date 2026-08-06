import { describe, expect, test } from 'bun:test';
import { parseLimitChangesArtifact } from '../packages/partners/src/index.ts';

const NOW = '2026-08-06T18:00:00.000Z';
const NODE = '019f92bf-40d6-72e3-aa09-f0a9b8a95824';
function artifact(): any {
  return {
    schemaVersion: 3,
    generatedAt: NOW,
    byNode: {
      [NODE]: {
        raises: [
          {
            limit_id: 247,
            sportsbook: 'hardrock',
            sport_id: 'tennis',
            market_id: 'match_winner',
            bet_type: 'straight',
            previous_max: 400.25,
            new_limit: 1000.5,
            increased_at: 1786039200,
          },
        ],
      },
    },
  };
}

describe('partner limit-change adapter', () => {
  test('maps explicit identities and keeps a raise separate from current execution limits', () => {
    const result = parseLimitChangesArtifact(artifact(), {
      treeNodePartnerCodes: { [NODE]: 'ASH' },
      registeredSportsbookIds: ['hard-rock-florida'],
      sportsbookAliases: { hardrock: 'hard-rock-florida' },
    });
    expect(result.observations[0]).toMatchObject({
      partnerCode: 'ASH',
      sportsbookId: 'hard-rock-florida',
      previousReportedMaxStake: { currency: 'USD', minorUnits: 40_025 },
      reportedMaxStakeAfterChange: { currency: 'USD', minorUnits: 100_050 },
      direction: 'up',
      currentExecutionCeiling: false,
    });
  });

  test('reports unresolved joins instead of guessing identities', () => {
    const result = parseLimitChangesArtifact(artifact(), {
      treeNodePartnerCodes: { [NODE]: 'ASH' },
      registeredSportsbookIds: ['hard-rock-florida'],
    });
    expect(result.observations).toEqual([]);
    expect(result.unresolvedSportsbookRefs).toEqual(['hardrock']);
    const missingNode = parseLimitChangesArtifact(artifact(), {
      treeNodePartnerCodes: {},
      registeredSportsbookIds: ['hard-rock-florida'],
    });
    expect(missingNode.unresolvedTreeNodeIds).toEqual([NODE]);
  });

  test('rejects money with more than cent precision', () => {
    const value = artifact();
    value.byNode[NODE].raises[0].new_limit = 1.234;
    expect(() =>
      parseLimitChangesArtifact(value, {
        treeNodePartnerCodes: { [NODE]: 'ASH' },
        registeredSportsbookIds: ['hard-rock-florida'],
        sportsbookAliases: { hardrock: 'hard-rock-florida' },
      })
    ).toThrow('at most two decimal places');
  });
});
