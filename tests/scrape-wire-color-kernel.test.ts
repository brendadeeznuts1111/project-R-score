// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/color#output-formats
import { describe, expect, test } from 'bun:test';
import {
  SCRAPE_BOOK_KEYS,
  SCRAPE_LEAGUE_KEYS,
  SCRAPE_SPORT_KEYS,
  SCRAPE_WIRE_BOOK_COLOR_KEYS,
  SCRAPE_WIRE_COLORS,
  SCRAPE_WIRE_COLOR_ROLES,
  SCRAPE_WIRE_HEX_RE,
  assertScrapeWireColorCoverage,
  bookColorKey,
  bookColorWire,
  buildScrapeWireTaxonomyArtifact,
  isScrapeWireColorKey,
  isScrapeWireHex,
  leagueColorWire,
  resolveScrapeWireColor,
  scrapeWireAnsi16mColor,
  scrapeWireCssVar,
  scrapeWireHexColor,
  scrapeWireRoleColor,
  sportColorWire,
} from '../lib/operations/index.ts';

describe('scrape-wire color kernel', () => {
  test('palette validates via Bun.color and covers books/sports/leagues', () => {
    expect(() => assertScrapeWireColorCoverage()).not.toThrow();
    expect(SCRAPE_WIRE_BOOK_COLOR_KEYS).toEqual([...SCRAPE_BOOK_KEYS]);
    expect(Object.keys(SCRAPE_WIRE_COLOR_ROLES.book)).toHaveLength(SCRAPE_BOOK_KEYS.length);
    expect(Object.keys(SCRAPE_WIRE_COLOR_ROLES.sport)).toHaveLength(SCRAPE_SPORT_KEYS.length);
    expect(Object.keys(SCRAPE_WIRE_COLOR_ROLES.league)).toHaveLength(SCRAPE_LEAGUE_KEYS.length);

    const hexes = new Set<string>();
    for (const book of SCRAPE_BOOK_KEYS) {
      expect(isScrapeWireColorKey(book)).toBe(true);
      expect(bookColorKey(book)).toBe(book);
      expect(isScrapeWireHex(scrapeWireHexColor(book))).toBe(true);
      expect(SCRAPE_WIRE_HEX_RE.test(scrapeWireHexColor(book))).toBe(true);
      expect(Bun.color(SCRAPE_WIRE_COLORS[book], 'HEX')).toBe(scrapeWireHexColor(book));
      hexes.add(scrapeWireHexColor(book).toUpperCase());
    }
    for (const sport of SCRAPE_SPORT_KEYS) {
      expect(sportColorWire(sport).colorKey).toBe(sport);
      expect(isScrapeWireHex(sportColorWire(sport).hex)).toBe(true);
      hexes.add(sportColorWire(sport).hex.toUpperCase());
    }
    for (const league of SCRAPE_LEAGUE_KEYS) {
      expect(leagueColorWire(league).colorKey).toBe(league);
      expect(isScrapeWireHex(leagueColorWire(league).hex)).toBe(true);
      hexes.add(leagueColorWire(league).hex.toUpperCase());
    }
    expect(hexes.size).toBe(
      SCRAPE_BOOK_KEYS.length + SCRAPE_SPORT_KEYS.length + SCRAPE_LEAGUE_KEYS.length
    );
    // Known prior collisions — must stay distinct after Bun.color normalize.
    expect(scrapeWireHexColor('espnbet')).not.toBe(sportColorWire('baseball').hex);
    expect(scrapeWireHexColor('fanatics')).not.toBe(leagueColorWire('uefa_champions_league').hex);
  });

  test('role paths and css vars resolve', () => {
    expect(scrapeWireRoleColor('book.draftkings')).toBe('draftkings');
    expect(scrapeWireRoleColor('sport.basketball')).toBe('basketball');
    expect(scrapeWireRoleColor('league.nba')).toBe('nba');
    expect(scrapeWireCssVar('fanduel')).toBe('--color-fanduel');
    const resolved = resolveScrapeWireColor('betmgm');
    expect(resolved.key).toBe('betmgm');
    expect(resolved.hex).toBe('#C5A572');
    expect(resolved.rgb.r).toBeGreaterThan(0);
    expect(scrapeWireAnsi16mColor('circa')).toContain('\x1b[');
  });

  test('taxonomy bake attaches colorKey/hex/css on book/sport/league rows', () => {
    const artifact = buildScrapeWireTaxonomyArtifact('2026-07-31T00:00:00.000Z');
    expect(artifact.schemaVersion).toBe(5);
    for (const row of artifact.bookRegistry) {
      expect(row.colorKey).toBe(row.key);
      expect(row.hex).toBe(bookColorWire(row.key).hex);
      expect(row.css).toBeTruthy();
    }
    for (const row of artifact.sportRegistry) {
      expect(row.colorKey).toBe(row.key);
      expect(row.hex.startsWith('#')).toBe(true);
    }
    for (const row of artifact.leagueRegistry) {
      expect(row.colorKey).toBe(row.key);
      expect(row.hex.startsWith('#')).toBe(true);
    }
  });
});
