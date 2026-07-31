// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConceptKey,
} from '../lib/portal/semantic-vocabulary.ts';
import {
  SCRAPE_BOOK_KEYS,
  SCRAPE_BOOK_VENDOR_ALIASES,
  auditScrapeWireSchema,
  resolveBookMarket,
  resolveBookPhase,
  resolveBookSport,
} from '../lib/operations/index.ts';

function deskValues(conceptId: PortalSemanticConceptKey): readonly string[] {
  return PORTAL_SEMANTIC_CONCEPTS.find(c => c.id === conceptId)?.values ?? [];
}

describe('scrape-wire schema:audit', () => {
  test('passes with live desk column values (sport/league ⊆ registry)', () => {
    const report = auditScrapeWireSchema({
      sports: deskValues('ops.limits.sport'),
      leagues: deskValues('ops.limits.league'),
      competitions: deskValues('ops.limits.competition'),
      markets: deskValues('ops.limits.market_type'),
      phases: deskValues('ops.limits.market_phase'),
    });
    expect(report.kind).toBe('scrape-wire-schema-audit');
    expect(report.ok).toBe(true);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.books).toBe(10);
    expect(report.summary.leagues).toBeGreaterThanOrEqual(18);
    expect(report.summary.warnings).toBe(0);
    expect(report.issues).toEqual([]);
  });

  test('flags bet-structure values that leak into market phase', () => {
    const report = auditScrapeWireSchema({ phases: ['pregame', 'straight'] });
    expect(report.ok).toBe(true);
    expect(report.summary.warnings).toBe(1);
    expect(report.issues.some(i => i.code === 'desk.phase_structure_bleed')).toBe(true);
  });

  test('fails when desk references an unknown league', () => {
    const report = auditScrapeWireSchema({
      leagues: ['nba', 'not_a_real_league'],
      sports: ['basketball'],
      markets: ['match_winner'],
      phases: ['pregame'],
      competitions: [],
    });
    expect(report.ok).toBe(false);
    expect(report.issues.some(i => i.code === 'desk.league_missing')).toBe(true);
  });

  test('fails when desk references an unknown sport', () => {
    const report = auditScrapeWireSchema({
      sports: ['quidditch'],
      leagues: ['nba'],
    });
    expect(report.ok).toBe(false);
    expect(report.issues.some(i => i.code === 'desk.sport_missing')).toBe(true);
  });

  test('color kernel bake coverage is required for schema:audit ok', () => {
    const report = auditScrapeWireSchema({
      sports: deskValues('ops.limits.sport'),
      leagues: deskValues('ops.limits.league'),
      competitions: deskValues('ops.limits.competition'),
      markets: deskValues('ops.limits.market_type'),
      phases: deskValues('ops.limits.market_phase'),
    });
    expect(report.ok).toBe(true);
    expect(report.issues.some(i => i.code.startsWith('color.'))).toBe(false);
  });

  test('every sportsbook has a vendor alias map; resolve overlays work', () => {
    for (const bookId of SCRAPE_BOOK_KEYS) {
      expect(SCRAPE_BOOK_VENDOR_ALIASES[bookId]).toBeDefined();
      expect(Object.keys(SCRAPE_BOOK_VENDOR_ALIASES[bookId].sports).length).toBeGreaterThan(0);
    }
    expect(resolveBookSport('caesars', 'americanfootball')).toBe('american_football');
    expect(resolveBookMarket('bet365', 'full_time_result')).toBe('match_winner');
    expect(resolveBookPhase('caesars', 'trading')).toBe('live');
    expect(resolveBookMarket('draftkings', 'moneyline')).toBe('match_winner');
  });
});
