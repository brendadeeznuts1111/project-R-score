import { describe, expect, test } from 'bun:test';
import { detectCrossBookArbitrage } from '../lib/operator-research/matching/arbitrage.ts';
import { evaluateAlerts, listRecentAlerts } from '../lib/operator-research/matching/alerts.ts';
import { queryOddsHistorySeries } from '../lib/operator-research/matching/history-query.ts';
import { scoreMovementByTier } from '../lib/operator-research/matching/smart-money.ts';
import { checkApiKey, authEnabled } from '../lib/operator-research/auth/api-key.ts';
import { seedAll } from '../lib/operator-research/normalization/seed.ts';
import { enrichOdds } from '../lib/operator-research/normalization/enrich-odds.ts';
import { parseOddsJson } from '../lib/operator-research/odds/odds-parser.ts';
import { FIXTURES_DIR } from '../lib/operator-research/paths.ts';
import { join } from 'node:path';

async function ingestFixture(host: string, fixtureId: string, tsBump = 0) { // brand-ok — opaque research/wire id
  const path = join(FIXTURES_DIR, 'odds', `${fixtureId}.json`);
  const text = await Bun.file(path).text();
  const snapshot = parseOddsJson(text, { host, source: 'fixture' });
  if (tsBump) snapshot.timestamp += tsBump;
  await enrichOdds(snapshot, { session: 'pregame', storeBlob: true, minMovePct: 1 });
  return snapshot;
}

describe('cross-book arb + alerts + history', () => {
  test('tier weight scoring', () => {
    const weights = { 1: 1, 2: 0.55, 3: 0.25 };
    expect(scoreMovementByTier(10, 1, weights)).toBe(1);
    expect(scoreMovementByTier(10, 3, weights)).toBe(0.25);
    expect(scoreMovementByTier(5, 2, weights)).toBeCloseTo(0.275, 3);
  });

  test('api key gate when env unset is open', () => {
    // Without OPERATOR_RESEARCH_API_KEY, requests succeed
    const req = new Request('http://localhost/api/odds');
    const result = checkApiKey(req);
    expect(result.ok).toBe(true);
    // authEnabled reflects current env
    expect(typeof authEnabled()).toBe('boolean');
  });

  test('hardrock + draftkings fixtures yield positive arb', async () => {
    await seedAll();
    await ingestFixture('hardrock.bet', 'hardrock', 0);
    await ingestFixture('hardrock.bet', 'hardrock-moved', 30_000);
    await ingestFixture('sportsbook.draftkings.com', 'draftkings', 15_000);

    const arbs = detectCrossBookArbitrage({ minEdgePct: 1.5 });
    expect(arbs.length).toBeGreaterThan(0);
    const best = arbs[0]!;
    expect(best.edgePct).toBeGreaterThan(1.5);
    expect(best.invSum).toBeLessThan(1);
    expect(best.legs.length).toBeGreaterThanOrEqual(2);
    const books = new Set(best.legs.map(l => l.bookmaker));
    expect(books.size).toBeGreaterThanOrEqual(2);

    const alerts = await evaluateAlerts({ arbs });
    // May be empty if already persisted with same id — either way list works
    const recent = listRecentAlerts(20);
    expect(recent.length + alerts.length).toBeGreaterThan(0);

    const series = queryOddsHistorySeries({
      eventId: best.eventId,
      market: best.marketCode || 'moneyline',
      bucketMs: 60_000,
    });
    expect(series.points.length).toBeGreaterThan(0);
  });
});
