// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  parseTournamentSnap,
  verifyTournamentSnapOwnership,
} from '../lib/glossary/tournament-snap.ts';

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
});

describe('verifyTournamentSnapOwnership', () => {
  test('setka_cup_ua_w is owned via tournament.setka_cup (known-map or tennis-hq)', async () => {
    const report = await verifyTournamentSnapOwnership('setka_cup_ua_w');
    expect(report.parts?.glossaryId).toBe('tournament.setka_cup');
    expect(report.ok).toBe(true);
    expect(report.ownedBy).not.toBeNull();
    // Prefer tennis-hq colors when present; known-map always works for setka_cup
    expect(['tennis-hq-colors', 'known-map', 'domain-glossary']).toContain(
      report.ownedBy!.source
    );
  });
});
