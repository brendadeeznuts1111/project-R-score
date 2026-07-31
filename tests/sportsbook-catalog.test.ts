// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  SPORTSBOOK_TYPES,
  parseSportsbookType,
  resolveSportsbook,
  resolveSportsbookType,
} from '../public/portal/partner-history/sportsbook-catalog.js';
import { resolveSportLeague } from '../public/portal/partner-history/sport-league-map.js';

describe('sportsbook catalog types', () => {
  test('exposes crypto, pph, legal-us, sweepstakes, exchange wire tokens', () => {
    expect(Object.keys(SPORTSBOOK_TYPES).sort()).toEqual(
      ['crypto', 'exchange', 'legal-us', 'offshore', 'pph', 'sweepstakes'].sort()
    );
    expect(SPORTSBOOK_TYPES.crypto.glossaryId).toBe('book.type.crypto');
    expect(SPORTSBOOK_TYPES.pph.glossaryId).toBe('book.type.pph');
    expect(SPORTSBOOK_TYPES['legal-us'].glossaryId).toBe('book.type.legal');
    expect(SPORTSBOOK_TYPES.sweepstakes.glossaryId).toBe('book.type.sweepstakes');
    expect(SPORTSBOOK_TYPES.exchange.glossaryId).toBe('book.type.exchange');
  });

  test('normalizes legal / legal-us / typo crpyto', () => {
    expect(parseSportsbookType('legal-us')).toBe('legal-us');
    expect(parseSportsbookType('legal')).toBe('legal-us');
    expect(parseSportsbookType('crpyto')).toBe('crypto');
    expect(parseSportsbookType('pph')).toBe('pph');
    expect(parseSportsbookType('sweepstakes')).toBe('sweepstakes');
    expect(parseSportsbookType('exchange')).toBe('exchange');
  });

  test('catalog books carry type chips', () => {
    expect(resolveSportsbook('draftkings').type).toBe('legal-us');
    expect(resolveSportsbook('fliff').type).toBe('sweepstakes');
    expect(resolveSportsbook('polymarket').type).toBe('exchange');
    expect(resolveSportsbook('betfair').type).toBe('exchange');
    expect(resolveSportsbook('stake').type).toBe('crypto');
    expect(resolveSportsbook('pinnacle').type).toBe('pph');
    expect(resolveSportsbookType('legal-us').glossaryId).toBe('book.type.legal');
  });
});

describe('sport and league glossary map', () => {
  test('resolves league wires onto governed sport and league concepts', () => {
    expect(resolveSportLeague('nba')).toMatchObject({
      sportConcept: 'sport.basketball',
      leagueConcept: 'league.nba',
      sportLabel: 'Basketball',
      leagueLabel: 'NBA',
    });
    expect(resolveSportLeague('epl')).toMatchObject({
      sportConcept: 'sport.soccer',
      leagueConcept: 'league.epl',
    });
    expect(resolveSportLeague('ufc')).toMatchObject({
      sportConcept: 'sport.mma',
      leagueConcept: 'league.ufc',
    });
  });

  test('keeps unknown wires inside the limits glossary fallback', () => {
    expect(resolveSportLeague('future-league')).toMatchObject({
      wire: 'future-league',
      sportConcept: 'ops.limits.sport',
      leagueConcept: 'ops.limits.league',
      sportLabel: 'future-league',
    });
    expect(resolveSportLeague('')).toMatchObject({
      wire: '',
      sportConcept: 'ops.limits.sport',
      leagueConcept: null,
      sportLabel: '—',
    });
  });
});
