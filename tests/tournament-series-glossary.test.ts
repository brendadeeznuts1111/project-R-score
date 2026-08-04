// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  TOURNAMENT_SERIES_GLOSSARY_IDS,
  TOURNAMENT_SERIES_LABELS,
  tournamentSeriesGlossaryConcepts,
} from '../lib/glossary/tournament-series-glossary.ts';
import { KNOWN_TOURNAMENT_KEYS } from '../lib/glossary/tournament-snap.ts';

describe('tournamentSeriesGlossaryConcepts', () => {
  const concepts = tournamentSeriesGlossaryConcepts();
  const ids = new Set(concepts.map(c => c.id));

  test('closed seeAlso graph within module + shared roots', () => {
    const externalRoots = new Set([
      'sport',
      'sport.tennis',
      'competition',
      'event',
      'gender',
    ]);
    const dangling: string[] = [];
    for (const c of concepts) {
      for (const rel of c.seeAlso) {
        if (!ids.has(rel) && !externalRoots.has(rel)) {
          dangling.push(`${c.id} -> ${rel}`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  test('includes sport / league / tournament roots and all series leaves', () => {
    expect(ids.has('sport.table_tennis')).toBe(true);
    expect(ids.has('league.wtt')).toBe(true);
    expect(ids.has('league.ittf')).toBe(true);
    expect(ids.has('tournament')).toBe(true);
    for (const key of KNOWN_TOURNAMENT_KEYS) {
      expect(ids.has(`tournament.${key}`)).toBe(true);
      expect(TOURNAMENT_SERIES_LABELS[key]).toBeTruthy();
    }
    expect(TOURNAMENT_SERIES_GLOSSARY_IDS).toHaveLength(KNOWN_TOURNAMENT_KEYS.length);
  });

  test('gender facets hang off gender root (not ownership leaves)', () => {
    expect(ids.has('gender.male')).toBe(true);
    expect(ids.has('gender.female')).toBe(true);
    expect(ids.has('gender.mixed')).toBe(true);
    const female = concepts.find(c => c.id === 'gender.female')!;
    expect(female.parentId).toBe('gender');
    expect(female.kind).toBe('gender');
  });

  test('setka_cup series leaf parent is tournament classification', () => {
    const setka = concepts.find(c => c.id === 'tournament.setka_cup')!;
    expect(setka).toBeDefined();
    expect(setka.label).toBe('Setka Cup');
    expect(setka.parentId).toBe('tournament');
    expect(setka.seeAlso).toContain('sport.table_tennis');
    expect(setka.domain).toBe('trading');
  });

  test('no duplicate concept ids', () => {
    expect(ids.size).toBe(concepts.length);
  });
});
