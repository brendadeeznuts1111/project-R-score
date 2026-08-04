// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';

import {
  parseTournamentSnap,
  verifyTournamentSnapOwnership,
} from '../lib/glossary/tournament-snap.ts';
import { positionalSnaps } from '../tools/verify-tournament-glossary.ts';

const FIXTURE_DIR = joinPath(import.meta.dir, 'fixtures', 'tournament-snap');
const FIXTURE_GLOSSARY = joinPath(FIXTURE_DIR, 'domain-glossary.json');

describe('parseTournamentSnap', () => {
  test('setka_cup_ua_w → setka_cup + ua + FEMALE', () => {
    const p = parseTournamentSnap('setka_cup_ua_w');
    expect(p).not.toBeNull();
    expect(p!.tournamentKey).toBe('setka_cup');
    expect(p!.glossaryId).toBe('tournament.setka_cup');
    expect(p!.region).toBe('ua');
    expect(p!.gender).toBe('FEMALE');
    expect(p!.tournamentLabel).toBe('Setka Cup');
  });

  test('setka_cup bare series', () => {
    const p = parseTournamentSnap('setka_cup');
    expect(p!.glossaryId).toBe('tournament.setka_cup');
    expect(p!.region).toBeNull();
    expect(p!.gender).toBeNull();
  });

  test('tournament.setka_cup prefix stripped', () => {
    const p = parseTournamentSnap('tournament.setka_cup');
    expect(p!.tournamentKey).toBe('setka_cup');
  });

  test('setka_cup_w gender only', () => {
    const p = parseTournamentSnap('setka_cup_w');
    expect(p!.tournamentKey).toBe('setka_cup');
    expect(p!.gender).toBe('FEMALE');
  });

  test('wtt_champions_md_m region+gender', () => {
    const p = parseTournamentSnap('wtt_champions_md_m');
    expect(p!.tournamentKey).toBe('wtt_champions');
    expect(p!.region).toBe('md');
    expect(p!.gender).toBe('MALE');
  });

  test('empty / whitespace → null', () => {
    expect(parseTournamentSnap('')).toBeNull();
    expect(parseTournamentSnap('   ')).toBeNull();
  });

  test('region+gender only (ua_w) → null — no tournament series', () => {
    expect(parseTournamentSnap('ua_w')).toBeNull();
  });

  test('unknown series fallback foo_bar_ua_w', () => {
    const p = parseTournamentSnap('foo_bar_ua_w');
    expect(p).not.toBeNull();
    expect(p!.tournamentKey).toBe('foo_bar');
    expect(p!.region).toBe('ua');
    expect(p!.gender).toBe('FEMALE');
    expect(p!.glossaryId).toBe('tournament.foo_bar');
  });

  test('malformed known facets → null', () => {
    expect(parseTournamentSnap('setka_cup_ua_z')).toBeNull();
    expect(parseTournamentSnap('setka_cup_usa_w')).toBeNull();
    expect(parseTournamentSnap('setka_cup_ua_w_extra')).toBeNull();
  });
});

describe('verifyTournamentSnapOwnership', () => {
  test('setka_cup_ua_w owned via fixture domain-glossary', async () => {
    const report = await verifyTournamentSnapOwnership('setka_cup_ua_w', {
      domainGlossary: FIXTURE_GLOSSARY,
      tennisHqColors: joinPath(FIXTURE_DIR, 'missing-tennis.json'),
    });
    expect(report.parts?.glossaryId).toBe('tournament.setka_cup');
    expect(report.ok).toBe(true);
    expect(report.ownedBy?.source).toBe('domain-glossary');
    expect(report.ownedBy?.label).toBe('Setka Cup');
  });

  test('setka_cup_ua_w falls back to known-map without domain hit', async () => {
    const report = await verifyTournamentSnapOwnership('setka_cup_ua_w', {
      domainGlossary: joinPath(FIXTURE_DIR, 'empty-glossary.json'),
      tennisHqColors: joinPath(FIXTURE_DIR, 'missing-tennis.json'),
    });
    expect(report.ok).toBe(true);
    expect(report.ownedBy?.source).toBe('known-map');
  });

  test('malformed domain-glossary does not silently fall through to known-map', async () => {
    const report = await verifyTournamentSnapOwnership('setka_cup_ua_w', {
      domainGlossary: joinPath(FIXTURE_DIR, 'malformed-glossary.json'),
      tennisHqColors: joinPath(FIXTURE_DIR, 'missing-tennis.json'),
    });
    expect(report.ok).toBe(false);
    expect(report.ownedBy).toBeNull();
    expect(report.issues.some(i => i.includes('failed to parse'))).toBe(true);
  });

  test('unparseable snap sanitizes propose hint', async () => {
    const report = await verifyTournamentSnapOwnership('bad";$(id)_x');
    expect(report.ok).toBe(false);
    expect(report.parts).toBeNull();
    expect(report.proposeHint).toBeDefined();
    expect(report.proposeHint!).not.toContain('$(');
    expect(report.proposeHint!).not.toMatch(/bad/);
    expect(report.proposeHint!).toContain('tournament.unknown');
    // double-quoted --label arg uses only the safe fallback token
    expect(report.proposeHint!).toContain('--label "unknown"');
  });
});

describe('positionalSnaps', () => {
  test('--json before snap does not consume the snap', () => {
    expect(positionalSnaps(['bun', 'tool', '--json', 'setka_cup_ua_w'])).toEqual([
      'setka_cup_ua_w',
    ]);
  });

  test('--json after snap keeps the snap', () => {
    expect(positionalSnaps(['bun', 'tool', 'setka_cup_ua_w', '--json'])).toEqual([
      'setka_cup_ua_w',
    ]);
  });

  test('--list-known is not a snap', () => {
    expect(positionalSnaps(['bun', 'tool', '--list-known'])).toEqual([]);
  });
});
