/**
 * Table-tennis tournament series glossary — Factory domain-glossary authority.
 *
 * Hierarchy (Tennis HQ classify):
 *   sport.table_tennis → league.wtt | league.ittf → tournament.* → gender.* → match
 *
 * Warehouse snaps (setka_cup_ua_w) hang facets off tournament.* leaves — see
 * tournament-snap.ts. Series keys stay aligned with KNOWN_TOURNAMENT_KEYS.
 *
 * @see lib/glossary/tournament-snap.ts
 * @see king-zippy-umbra-acre packages/tennis-hq-ssot registry/glossary-colors.json
 */

import { KNOWN_TOURNAMENT_KEYS, type KnownTournamentKey } from './tournament-snap.ts';

export type TournamentSeriesGlossaryConcept = {
  id: string; // brand-ok — glossary concept key, not an entity identity
  label: string;
  description: string;
  category: 'tournament';
  kind: 'sport' | 'league' | 'tournament' | 'gender' | 'classification';
  synonyms: readonly string[];
  values: readonly string[] | null;
  seeAlso: readonly string[];
  status: 'active';
  source: string;
  semanticType: 'classification' | 'resource';
  uiRole: 'badge' | 'chip' | 'heading' | 'token';
  parentId?: string | null; // brand-ok — glossary concept relation
  domain?: string | null; // brand-ok — business ConceptDomain
  namespace?: string | null; // brand-ok — vocabulary namespace
};

const SOURCE = 'lib/glossary/tournament-series-glossary.ts';

/** Human labels for series tournaments (shared with snap ownership known-map). */
export const TOURNAMENT_SERIES_LABELS: Record<KnownTournamentKey, string> = {
  setka_cup: 'Setka Cup',
  ittf_world: 'ITTF World',
  wtt_champions: 'WTT Champions',
  wtt_contender: 'WTT Contender',
  wtt_star_contender: 'WTT Star Contender',
  wtt_feeder: 'WTT Feeder',
};

const SERIES_META: Record<
  KnownTournamentKey,
  { description: string; synonyms: readonly string[]; parentLeague: string }
> = {
  setka_cup: {
    description:
      'Setka Cup table-tennis series. Warehouse snaps append region + gender (e.g. setka_cup_ua_w); ownership is this leaf, not each edition.',
    synonyms: ['setka', 'setka_cup', 'setka_cup_ua_w'],
    parentLeague: 'league.wtt',
  },
  ittf_world: {
    description:
      'ITTF World table-tennis championships series. Faceted warehouse keys resolve ownership to this leaf.',
    synonyms: ['ittf', 'ittf world', 'ittf_world'],
    parentLeague: 'league.ittf',
  },
  wtt_champions: {
    description: 'WTT Champions tier series — premium WTT tournament leaf for snap ownership.',
    synonyms: ['wtt champions', 'wtt_champions'],
    parentLeague: 'league.wtt',
  },
  wtt_contender: {
    description: 'WTT Contender tier series — mid-tier WTT tournament leaf for snap ownership.',
    synonyms: ['wtt contender', 'wtt_contender'],
    parentLeague: 'league.wtt',
  },
  wtt_star_contender: {
    description: 'WTT Star Contender tier series — elevated contender leaf for snap ownership.',
    synonyms: ['wtt star contender', 'wtt_star_contender'],
    parentLeague: 'league.wtt',
  },
  wtt_feeder: {
    description: 'WTT Feeder tier series — entry feeder leaf for snap ownership.',
    synonyms: ['wtt feeder', 'wtt_feeder'],
    parentLeague: 'league.wtt',
  },
};

/** Full glossary concept ids for every series leaf (tournament.${key}). */
export const TOURNAMENT_SERIES_GLOSSARY_IDS = KNOWN_TOURNAMENT_KEYS.map(
  key => `tournament.${key}`
) as readonly string[];

/**
 * Governed concepts projected into domain-glossary (bake + ownership SSOT).
 * seeAlso graph is closed under this module plus existing sport / competition /
 * event / gender roots from sports-betting + Kalshi dump.
 */
export function tournamentSeriesGlossaryConcepts(): TournamentSeriesGlossaryConcept[] {
  const seriesIds = [...TOURNAMENT_SERIES_GLOSSARY_IDS];
  const wttSeries = seriesIds.filter(id => id !== 'tournament.ittf_world');
  const ittfSeries = seriesIds.filter(id => id === 'tournament.ittf_world');

  const roots: TournamentSeriesGlossaryConcept[] = [
    {
      id: 'sport.table_tennis',
      label: 'Table tennis',
      description:
        'Racket sport hierarchy root for WTT/ITTF tours and Setka Cup series. Distinct from sport.tennis (ATP/WTA).',
      category: 'tournament',
      kind: 'sport',
      synonyms: ['ping pong', 'table-tennis', 'tt', 'table_tennis'],
      values: null,
      seeAlso: [
        'sport',
        'sport.tennis',
        'competition',
        'event',
        'tournament',
        'league.wtt',
        'league.ittf',
        ...seriesIds,
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
      parentId: 'sport',
      domain: 'trading',
      namespace: 'ops',
    },
    {
      id: 'league.wtt',
      label: 'League · WTT',
      description:
        'World Table Tennis tour league under sport.table_tennis. Children are tournament.wtt_* and Setka Cup series leaves.',
      category: 'tournament',
      kind: 'league',
      synonyms: ['WTT', 'world table tennis', 'wtt'],
      values: null,
      seeAlso: ['sport.table_tennis', 'tournament', 'competition', ...wttSeries],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
      parentId: 'sport.table_tennis',
      domain: 'trading',
      namespace: 'ops',
    },
    {
      id: 'league.ittf',
      label: 'League · ITTF',
      description:
        'International Table Tennis Federation league under sport.table_tennis. Child series includes tournament.ittf_world.',
      category: 'tournament',
      kind: 'league',
      synonyms: ['ITTF', 'international table tennis'],
      values: null,
      seeAlso: ['sport.table_tennis', 'tournament', 'competition', ...ittfSeries],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
      parentId: 'sport.table_tennis',
      domain: 'trading',
      namespace: 'ops',
    },
    {
      id: 'tournament',
      label: 'Tournament series',
      description:
        'Series-level tournament leaf category. Warehouse snaps encode tournament + region + gender; glossary owns tournament.* only.',
      category: 'tournament',
      kind: 'classification',
      synonyms: ['tour series', 'tournament key', 'tournament.*'],
      values: [...KNOWN_TOURNAMENT_KEYS],
      seeAlso: [
        'sport.table_tennis',
        'league.wtt',
        'league.ittf',
        'competition',
        'event',
        'gender',
        ...seriesIds,
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'heading',
      parentId: 'sport.table_tennis',
      domain: 'trading',
      namespace: 'ops',
    },
    {
      id: 'gender.male',
      label: 'Male',
      description:
        'Male draw facet on warehouse tournament snaps (suffix _m / _men). Not a glossary ownership leaf.',
      category: 'tournament',
      kind: 'gender',
      synonyms: ['men', 'm', 'MALE'],
      values: null,
      seeAlso: ['gender', 'gender.female', 'gender.mixed', 'tournament'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
      parentId: 'gender',
      domain: 'trading',
      namespace: 'ops',
    },
    {
      id: 'gender.female',
      label: 'Female',
      description:
        'Female draw facet on warehouse tournament snaps (suffix _w / _women). Not a glossary ownership leaf.',
      category: 'tournament',
      kind: 'gender',
      synonyms: ['women', 'w', 'FEMALE'],
      values: null,
      seeAlso: ['gender', 'gender.male', 'gender.mixed', 'tournament'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
      parentId: 'gender',
      domain: 'trading',
      namespace: 'ops',
    },
    {
      id: 'gender.mixed',
      label: 'Mixed',
      description:
        'Mixed draw facet on warehouse tournament snaps (suffix _x / _mixed). Not a glossary ownership leaf.',
      category: 'tournament',
      kind: 'gender',
      synonyms: ['mixed doubles', 'x', 'MIXED'],
      values: null,
      seeAlso: ['gender', 'gender.male', 'gender.female', 'tournament'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
      parentId: 'gender',
      domain: 'trading',
      namespace: 'ops',
    },
  ];

  const series: TournamentSeriesGlossaryConcept[] = KNOWN_TOURNAMENT_KEYS.map(key => {
    const meta = SERIES_META[key];
    const glossaryId = `tournament.${key}`;
    return {
      id: glossaryId,
      label: TOURNAMENT_SERIES_LABELS[key],
      description: meta.description,
      category: 'tournament' as const,
      kind: 'tournament' as const,
      synonyms: meta.synonyms,
      values: null,
      seeAlso: [
        'tournament',
        'sport.table_tennis',
        meta.parentLeague,
        'gender',
        'gender.male',
        'gender.female',
        'gender.mixed',
        'event',
      ],
      status: 'active' as const,
      source: SOURCE,
      semanticType: 'resource' as const,
      uiRole: 'chip' as const,
      parentId: 'tournament',
      domain: 'trading',
      namespace: 'ops',
    };
  });

  return [...roots, ...series];
}

/** Snap keys used by pages-edge / offline ownership gates. */
export const TOURNAMENT_OWNERSHIP_PROBE_SNAPS = [
  'setka_cup_ua_w',
  'setka_cup',
  'wtt_champions_md_m',
  'tournament.setka_cup',
] as const;
