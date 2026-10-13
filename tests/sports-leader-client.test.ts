import { describe, expect, test } from 'bun:test';
import {
  VERIFIED_LEAGUES,
  athleteFromSearch,
  createSportsLeaderApi,
  parseSportsLeaderDocument,
  parseSportsLeaderToolResult,
  sportsLeaderChildEnv,
  sportsLeaderEntryPoint,
  type JsonObject,
  type SportsLeaderCaller,
  type ToolArgs,
} from '../lib/mcp/sports-leader.ts';

function recordingCaller(docs: Record<string, JsonObject>): {
  call: SportsLeaderCaller;
  calls: Array<{ name: string; args: ToolArgs }>;
} {
  const calls: Array<{ name: string; args: ToolArgs }> = [];
  const call: SportsLeaderCaller = async (name, args) => {
    calls.push({ name, args });
    const doc = docs[name];
    if (!doc) throw new Error(`unexpected tool ${name}`);
    return doc;
  };
  return { call, calls };
}

describe('sports-leader client', () => {
  test('tracks the 30 verified leagues and the built stdio entry', () => {
    expect(VERIFIED_LEAGUES).toHaveLength(30);
    expect(VERIFIED_LEAGUES.some(row => row.league === 'nfl' && row.sport === 'football')).toBe(
      true
    );
    expect(VERIFIED_LEAGUES.some(row => row.league === 'eng.1')).toBe(true);
    expect(sportsLeaderEntryPoint()).toEndWith('/vendor/sports-leader-mcp/dist/index.js');
  });

  test('strips PORT so the server stays on stdio', () => {
    const env = sportsLeaderChildEnv({ PATH: '/usr/bin', PORT: '3000', HOME: '/tmp' });
    expect(env.PATH).toBe('/usr/bin');
    expect(env.HOME).toBe('/tmp');
    expect('PORT' in env).toBe(false);
  });

  test('parses compact JSON and refuses raw payloads', () => {
    expect(parseSportsLeaderDocument('{"events":[]}')).toEqual({ events: [] });
    expect(() => parseSportsLeaderDocument('not-json')).toThrow(/non-JSON/);
    expect(() => parseSportsLeaderDocument('{"raw":true,"response":{}}')).toThrow(/raw=true/);
    expect(
      parseSportsLeaderToolResult({
        content: [{ type: 'text', text: '{"count":1}' }],
      })
    ).toEqual({ count: 1 });
    expect(() =>
      parseSportsLeaderToolResult({
        isError: true,
        content: [{ type: 'text', text: 'Upstream error 400' }],
      })
    ).toThrow(/Upstream error 400/);
  });

  test('getLiveScores calls get_scoreboard without raw', async () => {
    const { call, calls } = recordingCaller({
      get_scoreboard: { events: [] },
    });
    const api = createSportsLeaderApi(call);
    const board = await api.getLiveScores('football', 'nfl');
    expect(board).toEqual({ events: [] });
    expect(calls).toEqual([{ name: 'get_scoreboard', args: { sport: 'football', league: 'nfl' } }]);
    expect(calls[0]?.args.raw).toBeUndefined();
    await expect(api.getLiveScores('football', 'not-a-league')).rejects.toThrow(/unverified/);
  });

  test('getGameOdds passes providerId only when set', async () => {
    const { call, calls } = recordingCaller({
      get_game_odds: { count: 0, odds: [] },
    });
    const api = createSportsLeaderApi(call);
    await api.getGameOdds('football', 'nfl', '401872980');
    await api.getGameOdds('football', 'nfl', '401872980', 37);
    expect(calls[0]?.args).toEqual({
      sport: 'football',
      league: 'nfl',
      eventId: '401872980',
    });
    expect(calls[1]?.args.providerId).toBe(37);
    expect(calls[1]?.args.raw).toBeUndefined();
    await expect(api.getGameOdds('football', 'nfl', '  ')).rejects.toThrow(/eventId/);
  });

  test('getSlate requires YYYYMMDD', async () => {
    const { call, calls } = recordingCaller({
      get_slate: { gameCount: 1, games: [] },
    });
    const api = createSportsLeaderApi(call);
    await api.getSlate('football', 'nfl', '20261008');
    expect(calls[0]?.args).toEqual({
      sport: 'football',
      league: 'nfl',
      date: '20261008',
    });
    await expect(api.getSlate('football', 'nfl', '2026-10-08')).rejects.toThrow(/YYYYMMDD/);
  });

  test('getPlayerReport searches then loads overview, stats, and splits', async () => {
    const { call, calls } = recordingCaller({
      search: {
        groups: [
          {
            type: 'player',
            results: [
              {
                id: '3139477',
                type: 'player',
                name: 'Patrick Mahomes',
                sport: 'football',
                league: 'nfl',
              },
            ],
          },
        ],
      },
      get_athlete_overview: { name: 'Patrick Mahomes' },
      get_athlete_stats: { season: 2026 },
      get_athlete_splits: { splits: [] },
    });
    const api = createSportsLeaderApi(call);
    const report = await api.getPlayerReport('Patrick Mahomes');
    expect(report.athlete.id).toBe('3139477');
    expect(report.overview).toEqual({ name: 'Patrick Mahomes' });
    expect(report.stats).toEqual({ season: 2026 });
    expect(report.splits).toEqual({ splits: [] });
    expect(calls.map(entry => entry.name)).toEqual([
      'search',
      'get_athlete_overview',
      'get_athlete_stats',
      'get_athlete_splits',
    ]);
    expect(calls[1]?.args).toEqual({
      sport: 'football',
      league: 'nfl',
      athleteId: '3139477',
    });
    expect(calls.some(entry => entry.args.raw !== undefined)).toBe(false);
    expect(athleteFromSearch({ groups: [{ type: 'article', results: [] }] })).toBeUndefined();
    await expect(api.getPlayerReport('   ')).rejects.toThrow(/playerName/);
  });
});
