// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { asSportsbookId, asStateCode } from '../lib/types/branded.ts';

import { parseGenericLimitsPayload } from '../config/scraper-targets.ts';
import {
  expandScrapedLimitSeeds,
  projectScrapedLimits,
  syncScrapedLimits,
} from '../lib/operations/baseline-scraped-limits.ts';
import { scrapeSportsbookLimits } from '../lib/operations/scrapers/sportsbook-limits.ts';
import { makeBaselineSource, mergeBaselineValues } from '../lib/operations/baseline-source-tiers.ts';
import {
  buildSportsbookOpeningBaselineArtifact,
  expandSportsbookOpeningLimits,
  lookupOpeningLimit,
} from '../lib/operations/sportsbook-opening-baseline.ts';

describe('baseline scraped limits (Tier 4)', () => {
  test('offline fixture expands and projects Tier 4 provenance', async () => {
    const seeds = expandScrapedLimitSeeds();
    // 6 books × 2 sports × 2 markets × 2 structures × 2 phases
    expect(seeds.length).toBeGreaterThanOrEqual(20);
    expect(seeds).toHaveLength(96);
    const rows = projectScrapedLimits(seeds);
    expect(rows.every(row => row.source.tier === 4)).toBe(true);
    expect(rows.every(row => row.source.confidence === 'medium')).toBe(true);
    expect(rows.every(row => row.source.sourceType === 'public_scrape')).toBe(true);
    expect((await syncScrapedLimits()).count).toBe(96);
  });

  test('parser maps generic public payload (wire unknown)', () => {
    const parsed = parseGenericLimitsPayload(
      {
        extractedAt: '2026-07-31T00:00:00.000Z',
        limits: [
          {
            sport: 'basketball',
            market: 'match_winner',
            maxBet: 1500,
            dailyLimit: 9000,
            betType: 'straight',
            phase: 'pregame',
            league: 'nba',
          },
        ],
      },
      asSportsbookId('draftkings'),
      asStateCode('NJ')
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      sport: 'basketball',
      market: 'match_winner',
      openingMaxUsd: 1500,
      structure: 'straight',
      phase: 'pregame',
    });
  });

  test('scraper uses offline fixture without network', async () => {
    const scraped = await scrapeSportsbookLimits({ live: false });
    expect(scraped.length).toBeGreaterThanOrEqual(20);
    expect(scraped.every(row => row.jurisdiction === 'NJ')).toBe(true);
  });

  test('merge: Tier 4 loses to T1/T2/T5 and wins only as fallback', () => {
    const withHigher = mergeBaselineValues([
      { valueUsd: 10_000, source: makeBaselineSource(1, 'policy') },
      { valueUsd: 2_000, source: makeBaselineSource(2, 'policy:dk') },
      { valueUsd: 900, source: makeBaselineSource(4, 'scrape:dk') },
      { valueUsd: 3_000, source: makeBaselineSource(5, 'ops') },
    ]);
    expect(withHigher.complianceMaxUsd).toBe(10_000);
    expect(withHigher.commercialMaxUsd).toBe(3_000);
    expect(withHigher.commercialSource?.tier).toBe(5);

    const onlyT4 = mergeBaselineValues([
      { valueUsd: 900, source: makeBaselineSource(4, 'scrape:dk') },
    ]);
    expect(onlyT4.commercialMaxUsd).toBe(900);
    expect(onlyT4.commercialSource?.tier).toBe(4);
  });

  test('opening matrix attaches scraped estimates; commercial stays Tier 5', () => {
    const rows = expandSportsbookOpeningLimits();
    const bb = lookupOpeningLimit(rows, {
      sportsbook: 'draftkings',
      sport: 'basketball',
      market: 'match_winner',
      structure: 'straight',
      phase: 'pregame',
    });
    expect(bb?.scrapedMaxUsd).toBeGreaterThan(0);
    expect(bb?.commercialSourceTier).toBe(5);

    const artifact = buildSportsbookOpeningBaselineArtifact(new Date('2026-07-31T00:00:00.000Z'));
    expect(artifact.sources.tiers[4]).toMatchObject({ wired: true, count: 96 });
    expect(artifact.summary.scrapedRows).toBe(96);
    expect(artifact.summary.rowsWithScrapedEstimate).toBeGreaterThan(0);
  });

  test('partner-history exposes T4 estimated UI', async () => {
    const html = await Bun.file('public/portal/partner-history/index.html').text();
    expect(html).toContain('T4 scraped (estimated)');
    expect(html).toContain('Est. scrape');
    expect(html).toContain('source-chip t4');
    expect(html).toContain('baseline:sync-scraped');
  });
});
