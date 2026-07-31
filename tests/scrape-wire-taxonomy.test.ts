// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  SCRAPE_BOOK_KEYS,
  SCRAPE_BOOK_REGISTRY,
  SCRAPE_DEFAULT_JURISDICTION,
  SCRAPE_EXTENDED_MARKET_KEYS,
  SCRAPE_FIXTURE_JURISDICTION_KEYS,
  SCRAPE_FIXTURE_MARKET_KEYS,
  SCRAPE_FIXTURE_SPORT_KEYS,
  SCRAPE_LEAGUE_KEYS,
  SCRAPE_LEAGUE_REGISTRY,
  SCRAPE_MARKET_KEYS,
  SCRAPE_MARKET_REGISTRY,
  SCRAPE_PHASE_KEYS,
  SCRAPE_PHASE_REGISTRY,
  SCRAPE_REGULATION_MARKET_KEYS,
  SCRAPE_SPORT_KEYS,
  SCRAPE_SPORT_REGISTRY,
  SCRAPE_STATE_KEYS,
  SCRAPE_STATE_REGISTRY,
  SCRAPE_WIRE_TAXONOMY_KIND,
  SCRAPE_WIRE_TAXONOMY_SCHEMA_VERSION,
  buildScrapeWireTaxonomyArtifact,
  normalizeMarketCatalogKey,
  normalizeScrapeMarket,
  normalizeScrapeSport,
  normalizeScrapeState,
  normalizeSportCatalogKey,
  scrapeWireGlossaryConcepts,
  sportsBettingGlossaryConcepts,
  tryNormalizeScrapeBook,
  tryNormalizeScrapeLeague,
  tryNormalizeScrapeMarket,
  tryNormalizeScrapePhase,
  tryNormalizeScrapeSport,
  tryNormalizeScrapeState,
  normalizeScrapePhase,
} from '../lib/operations/index.ts';

describe('scrape wire taxonomy', () => {
  test('US top-10 sportsbook fleet with aliases', () => {
    expect(SCRAPE_BOOK_KEYS).toHaveLength(10);
    expect(SCRAPE_BOOK_REGISTRY).toHaveLength(10);
    expect(SCRAPE_BOOK_KEYS[0]).toBe('draftkings');
    expect(SCRAPE_BOOK_KEYS[9]).toBe('circa');
    expect(tryNormalizeScrapeBook('DK')).toBe('draftkings');
    expect(tryNormalizeScrapeBook('czr')).toBe('caesars');
    expect(tryNormalizeScrapeBook('ESPN BET')).toBe('espnbet');
    expect(tryNormalizeScrapeBook('Hard Rock Bet')).toBe('hardrock');
    for (const row of SCRAPE_BOOK_REGISTRY) {
      expect(tryNormalizeScrapeBook(row.key)).toBe(row.key);
      expect(row.conceptId).toBe(`sportsbook.${row.key}`);
    }
  });

  test('full sport registry matches competition-catalog keys with labels', () => {
    expect(SCRAPE_SPORT_KEYS).toHaveLength(8);
    expect(SCRAPE_SPORT_REGISTRY).toHaveLength(8);
    expect(tryNormalizeScrapeSport('NBA')).toBe('basketball');
    expect(tryNormalizeScrapeSport('nfl')).toBe('american_football');
    expect(tryNormalizeScrapeSport('Football')).toBe('soccer');
    expect(tryNormalizeScrapeSport('premier_league')).toBe('soccer');
    expect(tryNormalizeScrapeSport('ufc')).toBe('mma');
    expect(normalizeSportCatalogKey('wnba')).toBe('basketball');
    for (const key of SCRAPE_SPORT_KEYS) {
      expect(tryNormalizeScrapeSport(key)).toBe(key);
    }
  });

  test('league codes normalize to league key and parent sport', () => {
    expect(SCRAPE_LEAGUE_KEYS.length).toBeGreaterThanOrEqual(18);
    expect(SCRAPE_LEAGUE_REGISTRY.every(l => l.sport && l.conceptId.startsWith('league.'))).toBe(
      true
    );
    expect(tryNormalizeScrapeLeague('NBA')).toBe('nba');
    expect(tryNormalizeScrapeLeague('Premier League')).toBe('epl');
    expect(tryNormalizeScrapeLeague('UCL')).toBe('uefa_champions_league');
    expect(tryNormalizeScrapeSport('epl')).toBe('soccer');
    expect(tryNormalizeScrapeSport('uefa_champions_league')).toBe('soccer');
  });

  test('markets cover regulation + extended glossary with aliases', () => {
    expect([...SCRAPE_REGULATION_MARKET_KEYS]).toEqual(['match_winner', 'over_under', 'spread']);
    expect([...SCRAPE_EXTENDED_MARKET_KEYS]).toEqual(['player_prop', 'team_prop', 'futures']);
    expect(SCRAPE_MARKET_KEYS).toHaveLength(6);
    expect(SCRAPE_MARKET_REGISTRY).toHaveLength(6);
    expect(tryNormalizeScrapeMarket('moneyline')).toBe('match_winner');
    expect(tryNormalizeScrapeMarket('1x2')).toBe('match_winner');
    expect(tryNormalizeScrapeMarket('totals')).toBe('over_under');
    expect(tryNormalizeScrapeMarket('point_spread')).toBe('spread');
    expect(tryNormalizeScrapeMarket('ATS')).toBe('spread');
    expect(tryNormalizeScrapeMarket('player prop')).toBe('player_prop');
    expect(tryNormalizeScrapeMarket('outright')).toBe('futures');
    expect(normalizeScrapeMarket('Match Winner')).toBe('match_winner');
    expect(normalizeMarketCatalogKey('ML')).toBe('match_winner');
  });

  test('full US state + DC registry (51) with postal and name aliases', () => {
    expect(SCRAPE_STATE_KEYS).toHaveLength(51);
    expect(SCRAPE_STATE_REGISTRY).toHaveLength(51);
    expect(String(tryNormalizeScrapeState('nj'))).toBe('NJ');
    expect(String(tryNormalizeScrapeState('washington_dc'))).toBe('DC');
    expect(String(normalizeScrapeState(undefined))).toBe(String(SCRAPE_DEFAULT_JURISDICTION));
  });

  test('phases cover pregame and live with in-play aliases', () => {
    expect([...SCRAPE_PHASE_KEYS]).toEqual(['pregame', 'live']);
    expect(SCRAPE_PHASE_REGISTRY).toHaveLength(2);
    expect(tryNormalizeScrapePhase('pregame')).toBe('pregame');
    expect(tryNormalizeScrapePhase('pre-match')).toBe('pregame');
    expect(tryNormalizeScrapePhase('LIVE')).toBe('live');
    expect(tryNormalizeScrapePhase('in-play')).toBe('live');
    expect(tryNormalizeScrapePhase('inplay')).toBe('live');
    expect(normalizeScrapePhase(undefined)).toBe('pregame');
    expect(normalizeScrapePhase('during')).toBe('live');
  });

  test('fixture expansion keys stay basketball/soccer × match_winner/over_under × NJ/CO/MA', () => {
    expect([...SCRAPE_FIXTURE_SPORT_KEYS]).toEqual(['basketball', 'soccer']);
    expect([...SCRAPE_FIXTURE_MARKET_KEYS]).toEqual(['match_winner', 'over_under']);
    expect([...SCRAPE_FIXTURE_JURISDICTION_KEYS]).toEqual(['NJ', 'CO', 'MA']);
  });

  test('artifact + glossary concepts include books, leagues, markets, phases', () => {
    const artifact = buildScrapeWireTaxonomyArtifact('2026-07-31T00:00:00.000Z');
    expect(artifact.kind).toBe(SCRAPE_WIRE_TAXONOMY_KIND);
    expect(artifact.schemaVersion).toBe(SCRAPE_WIRE_TAXONOMY_SCHEMA_VERSION);
    expect(artifact.summary.books).toBe(10);
    expect(artifact.summary.sports).toBe(8);
    expect(artifact.summary.leagues).toBeGreaterThanOrEqual(18);
    expect(artifact.summary.markets).toBe(6);
    expect(artifact.summary.phases).toBe(2);
    expect(artifact.summary.states).toBe(51);
    expect(artifact.bookRegistry).toHaveLength(10);
    expect(artifact.bookRegistry.every(r => r.hex?.startsWith('#') && r.colorKey === r.key)).toBe(
      true
    );
    expect(artifact.sportRegistry.every(r => r.hex?.startsWith('#') && r.colorKey === r.key)).toBe(
      true
    );
    expect(artifact.leagueRegistry.every(r => r.hex?.startsWith('#') && r.colorKey === r.key)).toBe(
      true
    );
    expect(artifact.phaseRegistry).toHaveLength(2);
    expect(artifact.fixturePhases).toEqual(['pregame', 'live']);
    expect(artifact.marketRegistry.filter(m => m.tier === 'regulation')).toHaveLength(3);
    expect(artifact.glossaryConcepts.map(c => c.id)).toEqual([
      'scrape.wire',
      'scrape.book',
      'scrape.sport',
      'scrape.league',
      'scrape.market',
      'scrape.phase',
      'scrape.phase.pregame',
      'scrape.jurisdiction',
    ]);

    const wireIds = new Set(scrapeWireGlossaryConcepts().map(c => c.id));
    const glossaryIds = new Set(sportsBettingGlossaryConcepts().map(c => c.id));
    for (const id of wireIds) {
      expect(glossaryIds.has(id)).toBe(true);
    }
  });
});
