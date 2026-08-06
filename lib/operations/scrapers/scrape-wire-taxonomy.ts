/**
 * Scrape wire taxonomy — unified book / state / sport / league / market normalization for Tier 4.
 *
 * All sportsbook agents and parsers map vendor wire strings onto these keys
 * before writing LimitObservation rows. Aligns with:
 * - {@link US_TOP_SPORTSBOOKS} fleet (mirrored locally — avoid import cycles)
 * - {@link SPORT_KEYS} / {@link SPORTS} / {@link LEAGUES} (sports-competition-catalog)
 * - {@link REGULATION_MARKET_KEYS} + glossary extended markets
 * - {@link StateCode} brands · full US states + DC registry
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/operations/sports-betting-glossary.ts
 */

import { REGULATION_MARKET_KEYS } from '../regulation-policy-catalog.ts';
import {
  LEAGUES,
  SPORTS,
  SPORT_KEYS,
  type LeagueKey,
  type SportKey,
} from '../sports-competition-catalog.ts';
import {
  asSportsbookId,
  asStateCode,
  tryStateCode,
  type SportsbookId,
  type StateCode,
} from '../../types/branded.ts';
import {
  bookColorWire,
  leagueColorWire,
  sportColorWire,
  type ScrapeWireColorWire,
} from './scrape-wire-color-kernel.ts';

export const SCRAPE_WIRE_TAXONOMY_KIND = 'scrape-wire-taxonomy' as const;
export const SCRAPE_WIRE_TAXONOMY_PATH = '/registry/scrape-wire-taxonomy.json' as const;
export const SCRAPE_WIRE_TAXONOMY_SCHEMA_VERSION = 5 as const;

// ── Sportsbooks (US top-10 Tier 4 fleet) ───────────────────────────

/**
 * US top-10 scrape fleet — mirrors {@link US_TOP_SPORTSBOOKS} without importing
 * sportsbook-opening-baseline (that module → baseline-scraped → this file).
 */
export const SCRAPE_BOOK_ROWS = [
  ['draftkings', 'DraftKings', 1],
  ['fanduel', 'FanDuel', 2],
  ['betmgm', 'BetMGM', 3],
  ['caesars', 'Caesars', 4],
  ['espnbet', 'ESPN BET', 5],
  ['fanatics', 'Fanatics', 6],
  ['hardrock', 'Hard Rock Bet', 7],
  ['bet365', 'bet365', 8],
  ['betrivers', 'BetRivers', 9],
  ['circa', 'Circa Sports', 10],
] as const;

export type ScrapeBookKey = (typeof SCRAPE_BOOK_ROWS)[number][0];

export type ScrapeBookRegistryEntry = {
  id: SportsbookId;
  key: ScrapeBookKey;
  label: string;
  rank: number;
  conceptId: `sportsbook.${ScrapeBookKey}`;
  aliases: readonly string[];
};

const SCRAPE_BOOK_EXTRA_ALIASES: Readonly<Partial<Record<ScrapeBookKey, readonly string[]>>> = {
  draftkings: ['dk', 'draft_kings'],
  fanduel: ['fd', 'fan_duel'],
  betmgm: ['mgm', 'bet_mgm'],
  caesars: ['czr', 'caesars_sportsbook', 'william_hill'],
  espnbet: ['espn', 'espn_bet', 'espn_sportsbook'],
  fanatics: ['fanatics_sportsbook'],
  hardrock: ['hard_rock', 'hardrockbet', 'hard_rock_bet'],
  bet365: ['bet_365'],
  betrivers: ['bet_rivers', 'rivers'],
  circa: ['circa_sports', 'circasports'],
};

function wireKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export const SCRAPE_BOOK_REGISTRY: readonly ScrapeBookRegistryEntry[] = SCRAPE_BOOK_ROWS.map(
  ([key, label, rank]) => ({
    id: asSportsbookId(key),
    key,
    label,
    rank,
    conceptId: `sportsbook.${key}` as const,
    aliases: [...new Set([key, wireKey(label), ...(SCRAPE_BOOK_EXTRA_ALIASES[key] ?? [])])],
  })
);

export const SCRAPE_BOOK_KEYS = SCRAPE_BOOK_ROWS.map(
  ([key]) => key
) satisfies readonly ScrapeBookKey[];

export const SCRAPE_BOOK_ALIASES: Readonly<Record<string, ScrapeBookKey>> = Object.fromEntries(
  SCRAPE_BOOK_REGISTRY.flatMap(row => row.aliases.map(alias => [wireKey(alias), row.key] as const))
);

// ── Sports ─────────────────────────────────────────────────────────

/** Canonical sports recognized on the scrape wire (full competition-catalog set). */
export const SCRAPE_SPORT_KEYS = SPORT_KEYS;
export type ScrapeSportKey = SportKey;

/** Full sport registry rows (key · label · conceptId) — same SSOT as sports taxonomy. */
export const SCRAPE_SPORT_REGISTRY = SPORTS;

// ── Leagues / codes ────────────────────────────────────────────────

export type ScrapeLeagueRegistryEntry = {
  key: LeagueKey;
  label: string;
  sport: SportKey;
  conceptId: `league.${LeagueKey}`;
  synonyms: readonly string[];
  aliases: readonly string[];
};

export const SCRAPE_LEAGUE_REGISTRY: readonly ScrapeLeagueRegistryEntry[] = LEAGUES.map(league => ({
  key: league.key,
  label: league.label,
  sport: league.sport,
  conceptId: league.conceptId,
  synonyms: league.synonyms,
  aliases: [
    ...new Set([league.key, wireKey(league.label), ...league.synonyms.map(s => wireKey(s))]),
  ],
}));

export const SCRAPE_LEAGUE_KEYS = LEAGUES.map(l => l.key);

export const SCRAPE_LEAGUE_ALIASES: Readonly<Record<string, LeagueKey>> = Object.fromEntries(
  SCRAPE_LEAGUE_REGISTRY.flatMap(row =>
    [...new Set(row.aliases)].map(alias => [alias, row.key] as const)
  )
);

/** League wire → parent sport (for LimitObservation sport when only league is present). */
export const SCRAPE_LEAGUE_TO_SPORT: Readonly<Record<LeagueKey, SportKey>> = Object.fromEntries(
  LEAGUES.map(l => [l.key, l.sport])
) as Record<LeagueKey, SportKey>;

// ── Markets ────────────────────────────────────────────────────────

/** Regulation / policy markets (opening baseline + Tier 1–2). */
export const SCRAPE_REGULATION_MARKET_KEYS = REGULATION_MARKET_KEYS;

/** Glossary markets accepted on scrape wire beyond regulation. */
export const SCRAPE_EXTENDED_MARKET_KEYS = ['player_prop', 'team_prop', 'futures'] as const;

/** Full scrape observation market keys = regulation ∪ extended. */
export const SCRAPE_MARKET_KEYS = [
  ...SCRAPE_REGULATION_MARKET_KEYS,
  ...SCRAPE_EXTENDED_MARKET_KEYS,
] as const;
export type ScrapeMarketKey = (typeof SCRAPE_MARKET_KEYS)[number];
export type ScrapeRegulationMarketKey = (typeof SCRAPE_REGULATION_MARKET_KEYS)[number];
export type ScrapeExtendedMarketKey = (typeof SCRAPE_EXTENDED_MARKET_KEYS)[number];

export type ScrapeMarketRegistryEntry = {
  key: ScrapeMarketKey;
  label: string;
  conceptId: string; // brand-ok — glossary concept id
  tier: 'regulation' | 'extended';
  aliases: readonly string[];
};

export const SCRAPE_MARKET_REGISTRY: readonly ScrapeMarketRegistryEntry[] = [
  {
    key: 'match_winner',
    label: 'Match winner',
    conceptId: 'market.match_winner',
    tier: 'regulation',
    aliases: ['match_winner', 'moneyline', 'ml', 'h2h', 'winner', '1x2', 'matchwinner'],
  },
  {
    key: 'over_under',
    label: 'Over/under',
    conceptId: 'market.total',
    tier: 'regulation',
    aliases: ['over_under', 'totals', 'total', 'ou', 'overunder', 'total_points'],
  },
  {
    key: 'spread',
    label: 'Point spread',
    conceptId: 'market.point_spread',
    tier: 'regulation',
    aliases: ['spread', 'point_spread', 'handicap', 'asian_handicap', 'ats', 'line', 'pointspread'],
  },
  {
    key: 'player_prop',
    label: 'Player prop',
    conceptId: 'market.player_prop',
    tier: 'extended',
    aliases: ['player_prop', 'player_proposition', 'player_market', 'prop', 'playerprop'],
  },
  {
    key: 'team_prop',
    label: 'Team prop',
    conceptId: 'market.team_prop',
    tier: 'extended',
    aliases: ['team_prop', 'team_proposition', 'team_market', 'teamprop'],
  },
  {
    key: 'futures',
    label: 'Futures',
    conceptId: 'market.futures',
    tier: 'extended',
    aliases: ['futures', 'outright', 'season_long', 'championship', 'future'],
  },
];

export const SCRAPE_MARKET_ALIASES: Readonly<Record<string, ScrapeMarketKey>> = Object.fromEntries(
  SCRAPE_MARKET_REGISTRY.flatMap(row => row.aliases.map(alias => [alias, row.key] as const))
);

// ── Phases (pregame · live) ────────────────────────────────────────

/** Canonical market phases on the scrape / opening-limit wire. */
export const SCRAPE_PHASE_KEYS = ['pregame', 'live'] as const;
export type ScrapePhaseKey = (typeof SCRAPE_PHASE_KEYS)[number];

export type ScrapePhaseRegistryEntry = {
  key: ScrapePhaseKey;
  label: string;
  conceptId: string; // brand-ok — glossary concept id
  aliases: readonly string[];
};

export const SCRAPE_PHASE_REGISTRY: readonly ScrapePhaseRegistryEntry[] = [
  {
    key: 'pregame',
    label: 'Pregame',
    conceptId: 'scrape.phase.pregame',
    aliases: ['pregame', 'pre_game', 'pre_match', 'prematch', 'before', 'early', 'antepost'],
  },
  {
    key: 'live',
    label: 'Live / in-play',
    conceptId: 'market.in_play',
    aliases: ['live', 'in_play', 'inplay', 'in_play_betting', 'live_betting', 'during'],
  },
];

export const SCRAPE_PHASE_ALIASES: Readonly<Record<string, ScrapePhaseKey>> = Object.fromEntries(
  SCRAPE_PHASE_REGISTRY.flatMap(row => row.aliases.map(alias => [alias, row.key] as const))
);

/** Default phase when wire omits market phase. */
export const SCRAPE_DEFAULT_PHASE: ScrapePhaseKey = 'pregame';

/** Fixture / CI expansion phases (both). */
export const SCRAPE_FIXTURE_PHASE_KEYS = SCRAPE_PHASE_KEYS;

// ── States ─────────────────────────────────────────────────────────

/**
 * Full US scrape-state registry: 50 states + DC.
 * Postal codes are StateCode brands; labels drive name aliases.
 */
export const SCRAPE_STATE_ROWS = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['DC', 'District of Columbia'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
] as const;

export type ScrapeStateKey = (typeof SCRAPE_STATE_ROWS)[number][0];

/** Full postal-code registry (51). Prefer this over the fixture jurisdiction subset. */
export const SCRAPE_STATE_KEYS = SCRAPE_STATE_ROWS.map(
  ([code]) => code
) satisfies readonly ScrapeStateKey[];

/** @deprecated Use {@link SCRAPE_STATE_KEYS} — full registry. Kept as alias. */
export const SCRAPE_JURISDICTION_KEYS = SCRAPE_STATE_KEYS;
export type ScrapeJurisdictionKey = ScrapeStateKey;

/** Fixture / CI capture jurisdictions (regulated + Colorado capture). */
export const SCRAPE_FIXTURE_JURISDICTION_KEYS = [
  'NJ',
  'CO',
  'MA',
] as const satisfies readonly ScrapeStateKey[];

/** Sports used in committed Tier 4 fixture expansion (subset of SCRAPE_SPORT_KEYS). */
export const SCRAPE_FIXTURE_SPORT_KEYS = [
  'basketball',
  'soccer',
] as const satisfies readonly ScrapeSportKey[];

/** Markets used in committed Tier 4 fixture expansion (regulation subset). */
export const SCRAPE_FIXTURE_MARKET_KEYS = [
  'match_winner',
  'over_under',
] as const satisfies readonly ScrapeRegulationMarketKey[];

/** Default scrape jurisdiction when wire omits state. */
export const SCRAPE_DEFAULT_JURISDICTION = asStateCode('NJ');

/** Extra name forms beyond wireKey(label) for URL / OCR scrape segments. */
const SCRAPE_STATE_EXTRA_ALIASES: Readonly<Partial<Record<ScrapeStateKey, readonly string[]>>> = {
  DC: ['washington_dc', 'washington_d_c', 'washingtondc', 'district_columbia'],
  NJ: ['newjersey'],
  NY: ['newyork'],
  NC: ['northcarolina'],
  SC: ['southcarolina'],
  ND: ['northdakota'],
  SD: ['southdakota'],
  WV: ['westvirginia'],
  NH: ['newhampshire'],
  NM: ['newmexico'],
  RI: ['rhodeisland'],
};

export type ScrapeStateRegistryEntry = {
  code: StateCode;
  key: ScrapeStateKey;
  label: string;
  conceptId: `jurisdiction.${ScrapeStateKey}`;
  aliases: readonly string[];
};

function aliasesForState(code: ScrapeStateKey, label: string): string[] {
  const set = new Set<string>([
    code.toLowerCase(),
    wireKey(label),
    ...(SCRAPE_STATE_EXTRA_ALIASES[code] ?? []),
  ]);
  return [...set];
}

/** Full state registry rows with alias inventory. */
export const SCRAPE_STATE_REGISTRY: readonly ScrapeStateRegistryEntry[] = SCRAPE_STATE_ROWS.map(
  ([key, label]) => ({
    code: asStateCode(key),
    key,
    label,
    conceptId: `jurisdiction.${key}` as const,
    aliases: aliasesForState(key, label),
  })
);

/** Location / region wire → StateCode (built from full registry). */
export const SCRAPE_STATE_ALIASES: Readonly<Record<string, StateCode>> = Object.fromEntries(
  SCRAPE_STATE_REGISTRY.flatMap(row => row.aliases.map(alias => [alias, row.code] as const))
);

/**
 * Vendor / OCR / URL aliases → canonical scrape sport key.
 * `football` → soccer (association) for regulation parity; use nfl/americanfootball for US gridiron.
 */
export const SCRAPE_SPORT_ALIASES: Readonly<Record<string, ScrapeSportKey>> = {
  // identity (full sport registry)
  american_football: 'american_football',
  baseball: 'baseball',
  basketball: 'basketball',
  hockey: 'hockey',
  soccer: 'soccer',
  tennis: 'tennis',
  golf: 'golf',
  mma: 'mma',
  // leagues / shorthand
  nba: 'basketball',
  wnba: 'basketball',
  ncaab: 'basketball',
  cbb: 'basketball',
  college_basketball: 'basketball',
  nfl: 'american_football',
  ncaaf: 'american_football',
  college_football: 'american_football',
  americanfootball: 'american_football',
  us_football: 'american_football',
  gridiron: 'american_football',
  mlb: 'baseball',
  nhl: 'hockey',
  icehockey: 'hockey',
  ice_hockey: 'hockey',
  epl: 'soccer',
  premier_league: 'soccer',
  mls: 'soccer',
  ucl: 'soccer',
  uefa_champions_league: 'soccer',
  champions_league: 'soccer',
  football: 'soccer',
  association_football: 'soccer',
  atp: 'tennis',
  wta: 'tennis',
  itf: 'tennis',
  atp_challenger: 'tennis',
  wta_125: 'tennis',
  pga: 'golf',
  pga_tour: 'golf',
  dp_world_tour: 'golf',
  ufc: 'mma',
  bellator: 'mma',
};

// ── Normalizers ────────────────────────────────────────────────────

/** Normalize vendor sport wire → canonical scrape sport (or null if unknown). */
export function tryNormalizeScrapeSport(
  raw: string | null | undefined
): ScrapeSportKey | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const key = wireKey(raw);
  const aliased = SCRAPE_SPORT_ALIASES[key];
  if (aliased) return aliased;
  if ((SCRAPE_SPORT_KEYS as readonly string[]).includes(key)) return key as ScrapeSportKey;
  const league = SCRAPE_LEAGUE_ALIASES[key];
  if (league) return SCRAPE_LEAGUE_TO_SPORT[league];
  return undefined;
}

/** Normalize vendor sport wire → canonical key, fallback underscore form. */
export function normalizeScrapeSport(raw: string): string {
  return tryNormalizeScrapeSport(raw) ?? wireKey(raw);
}

/** Normalize vendor market wire → canonical scrape market (or null). */
export function tryNormalizeScrapeMarket(
  raw: string | null | undefined
): ScrapeMarketKey | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const key = wireKey(raw);
  return SCRAPE_MARKET_ALIASES[key];
}

/** Normalize vendor market wire → canonical key, fallback underscore form. */
export function normalizeScrapeMarket(raw: string): string {
  return tryNormalizeScrapeMarket(raw) ?? wireKey(raw);
}

/** Normalize location / region wire → StateCode (or undefined). */
export function tryNormalizeScrapeState(raw: string | null | undefined): StateCode | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const key = wireKey(raw);
  const aliased = SCRAPE_STATE_ALIASES[key];
  if (aliased) return aliased;
  return tryStateCode(raw);
}

/** Normalize location wire → StateCode, default NJ. */
export function normalizeScrapeState(
  raw: string | null | undefined,
  fallback: StateCode = SCRAPE_DEFAULT_JURISDICTION
): StateCode {
  return tryNormalizeScrapeState(raw) ?? fallback;
}

/** Normalize sportsbook wire → ScrapeBookKey. */
export function tryNormalizeScrapeBook(raw: string | null | undefined): ScrapeBookKey | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  return SCRAPE_BOOK_ALIASES[wireKey(raw)];
}

/** Normalize sportsbook wire → book key string, fallback underscore form. */
export function normalizeScrapeBook(raw: string): string {
  return tryNormalizeScrapeBook(raw) ?? wireKey(raw);
}

/** Normalize league / tour wire → LeagueKey. */
export function tryNormalizeScrapeLeague(raw: string | null | undefined): LeagueKey | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  return SCRAPE_LEAGUE_ALIASES[wireKey(raw)];
}

/** Normalize league wire → league key string, fallback underscore form. */
export function normalizeScrapeLeague(raw: string): string {
  return tryNormalizeScrapeLeague(raw) ?? wireKey(raw);
}

/** Normalize market-phase wire → pregame | live (or undefined if empty). */
export function tryNormalizeScrapePhase(
  raw: string | null | undefined
): ScrapePhaseKey | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  return SCRAPE_PHASE_ALIASES[wireKey(raw)];
}

/** Normalize market-phase wire → pregame | live (default pregame). */
export function normalizeScrapePhase(
  raw: string | null | undefined,
  fallback: ScrapePhaseKey = SCRAPE_DEFAULT_PHASE
): ScrapePhaseKey {
  return tryNormalizeScrapePhase(raw) ?? fallback;
}

// ── Glossary ───────────────────────────────────────────────────────

export type ScrapeWireGlossaryConcept = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description: string;
  category: 'market' | 'model' | 'tournament' | 'trading' | 'warehouse';
  kind: 'sport' | 'market' | 'jurisdiction' | 'league' | 'metric' | 'evidence';
  synonyms: readonly string[];
  values: readonly string[] | null;
  seeAlso: readonly string[];
  status: 'active';
  source: string;
  semanticType: 'classification' | 'resource' | 'state';
  uiRole: 'badge' | 'chip' | 'code' | 'token';
};

const SOURCE = 'lib/operations/scrapers/scrape-wire-taxonomy.ts';

/** Glossary concepts for portal / domain-glossary bake. */
export function scrapeWireGlossaryConcepts(): ScrapeWireGlossaryConcept[] {
  return [
    {
      id: 'scrape.wire',
      label: 'Scrape wire taxonomy',
      description:
        'Canonical book, state, sport, league, and market keys that all Tier 4 sportsbook agents normalize vendor wire onto before LimitObservation write.',
      category: 'warehouse',
      kind: 'evidence',
      synonyms: ['scrape taxonomy', 'tier-4 wire', 'limit observation keys'],
      values: null,
      seeAlso: [
        'scrape.book',
        'scrape.sport',
        'scrape.league',
        'scrape.market',
        'scrape.phase',
        'scrape.jurisdiction',
        'sport',
        'market.point_spread',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'scrape.book',
      label: 'Scrape sportsbook',
      description:
        'US top-10 Tier 4 sportsbook fleet on the scrape wire (SportsbookId). Aliases (dk, czr, espn_bet, …) normalize here.',
      category: 'trading',
      kind: 'evidence',
      synonyms: ['sportsbook', 'bookId', 'book', 'SportsbookId'],
      values: [...SCRAPE_BOOK_KEYS],
      seeAlso: ['scrape.wire', 'scrape.market', 'scrape.sport'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
    },
    {
      id: 'scrape.sport',
      label: 'Scrape sport key',
      description:
        'Full sport registry on the scrape wire (competition-catalog SPORT_KEYS). League aliases (nba, nfl, ufc, …) map here before JSONL append.',
      category: 'tournament',
      kind: 'sport',
      synonyms: ['sport_id', 'sportKey', 'vendor sport'],
      values: [...SCRAPE_SPORT_KEYS],
      seeAlso: [
        'sport',
        'scrape.league',
        'sport.basketball',
        'sport.soccer',
        'sport.american_football',
        'sport.baseball',
        'sport.hockey',
        'sport.tennis',
        'sport.golf',
        'sport.mma',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
    {
      id: 'scrape.league',
      label: 'Scrape league code',
      description:
        'Competition-catalog league/tour codes on the scrape wire (nba, epl, ufc, …). Normalizes to league key and parent sport.',
      category: 'tournament',
      kind: 'league',
      synonyms: ['leagueKey', 'tour', 'competition code'],
      values: [...SCRAPE_LEAGUE_KEYS],
      seeAlso: ['competition', 'scrape.sport', 'league.nba', 'league.nfl', 'league.epl'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
    {
      id: 'scrape.market',
      label: 'Scrape market key',
      description:
        'Scrape wire markets: regulation (match_winner, over_under, spread) plus extended glossary markets (player_prop, team_prop, futures).',
      category: 'market',
      kind: 'market',
      synonyms: ['market_id', 'marketKey', 'marketType'],
      values: [...SCRAPE_MARKET_KEYS],
      seeAlso: [
        'market.match_winner',
        'market.over_under',
        'market.spread',
        'market.point_spread',
        'market.player_prop',
        'market.team_prop',
        'market.futures',
        'scrape.wire',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
    {
      id: 'scrape.phase',
      label: 'Scrape market phase',
      description:
        'Market phase on the scrape wire: pregame (before start) or live (in-play). Aliases in_play/inplay/live_betting → live; pre_match/pregame → pregame.',
      category: 'market',
      kind: 'market',
      synonyms: ['marketPhase', 'phase', 'pregame', 'live', 'in-play'],
      values: [...SCRAPE_PHASE_KEYS],
      seeAlso: ['market.in_play', 'ops.limits.market_phase', 'scrape.market', 'scrape.wire'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
    },
    {
      id: 'scrape.phase.pregame',
      label: 'Pregame phase',
      description:
        'Wagers placed before an event starts. Default scrape/opening-limit phase when wire omits phase.',
      category: 'market',
      kind: 'market',
      synonyms: ['pre-game', 'pre-match', 'early'],
      values: ['pregame'],
      seeAlso: ['scrape.phase', 'market.in_play', 'scrape.wire'],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'badge',
    },
    {
      id: 'scrape.jurisdiction',
      label: 'Scrape jurisdiction',
      description:
        'Full US state + DC registry on the scrape wire (StateCode brand). Vendor location segments (nj, colorado, washington_dc) normalize here.',
      category: 'trading',
      kind: 'jurisdiction',
      synonyms: ['state', 'location', 'region code', 'StateCode', 'US states'],
      values: [...SCRAPE_STATE_KEYS],
      seeAlso: ['jurisdiction.NJ', 'jurisdiction.MA', 'scrape.wire'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
    },
  ];
}

/** Registry row with Bun.color kernel wire (`colorKey` · `hex` · `css`). */
export type ScrapeBookRegistryBakeEntry = ScrapeBookRegistryEntry & ScrapeWireColorWire;
export type ScrapeSportRegistryBakeEntry = (typeof SCRAPE_SPORT_REGISTRY)[number] &
  ScrapeWireColorWire;
export type ScrapeLeagueRegistryBakeEntry = ScrapeLeagueRegistryEntry & ScrapeWireColorWire;

export type ScrapeWireTaxonomyArtifact = {
  kind: typeof SCRAPE_WIRE_TAXONOMY_KIND;
  schemaVersion: typeof SCRAPE_WIRE_TAXONOMY_SCHEMA_VERSION;
  path: typeof SCRAPE_WIRE_TAXONOMY_PATH;
  generatedAt: string;
  summary: {
    books: number;
    sports: number;
    leagues: number;
    markets: number;
    phases: number;
    regulationMarkets: number;
    extendedMarkets: number;
    states: number;
    fixtureJurisdictions: number;
    sportAliases: number;
    marketAliases: number;
    phaseAliases: number;
    stateAliases: number;
    bookAliases: number;
    leagueAliases: number;
    glossaryConcepts: number;
  };
  bookRegistry: readonly ScrapeBookRegistryBakeEntry[];
  books: readonly ScrapeBookKey[];
  sportRegistry: readonly ScrapeSportRegistryBakeEntry[];
  sports: readonly ScrapeSportKey[];
  leagueRegistry: readonly ScrapeLeagueRegistryBakeEntry[];
  leagues: readonly LeagueKey[];
  marketRegistry: readonly ScrapeMarketRegistryEntry[];
  markets: readonly ScrapeMarketKey[];
  regulationMarkets: readonly ScrapeRegulationMarketKey[];
  extendedMarkets: readonly ScrapeExtendedMarketKey[];
  phaseRegistry: readonly ScrapePhaseRegistryEntry[];
  phases: readonly ScrapePhaseKey[];
  stateRegistry: readonly ScrapeStateRegistryEntry[];
  states: readonly ScrapeStateKey[];
  /** @deprecated Prefer {@link states} — same full registry. */
  jurisdictions: readonly ScrapeStateKey[];
  fixtureJurisdictions: readonly ScrapeStateKey[];
  fixtureSports: readonly ScrapeSportKey[];
  fixtureMarkets: readonly ScrapeRegulationMarketKey[];
  fixturePhases: readonly ScrapePhaseKey[];
  defaultJurisdiction: StateCode;
  defaultPhase: ScrapePhaseKey;
  sportAliases: Readonly<Record<string, ScrapeSportKey>>;
  marketAliases: Readonly<Record<string, ScrapeMarketKey>>;
  phaseAliases: Readonly<Record<string, ScrapePhaseKey>>;
  stateAliases: Readonly<Record<string, StateCode>>;
  bookAliases: Readonly<Record<string, ScrapeBookKey>>;
  leagueAliases: Readonly<Record<string, LeagueKey>>;
  leagueToSport: Readonly<Record<LeagueKey, SportKey>>;
  glossaryConcepts: ScrapeWireGlossaryConcept[];
};

export function buildScrapeWireTaxonomyArtifact(
  generatedAt: string = new Date().toISOString()
): ScrapeWireTaxonomyArtifact {
  const stateRegistry = SCRAPE_STATE_REGISTRY.map(row => ({
    ...row,
    aliases: [...row.aliases],
  }));
  const bookRegistry: ScrapeBookRegistryBakeEntry[] = SCRAPE_BOOK_REGISTRY.map(row => ({
    ...row,
    aliases: [...row.aliases],
    ...bookColorWire(row.key),
  }));
  const sportRegistry: ScrapeSportRegistryBakeEntry[] = SCRAPE_SPORT_REGISTRY.map(row => ({
    ...row,
    ...sportColorWire(row.key),
  }));
  const leagueRegistry: ScrapeLeagueRegistryBakeEntry[] = SCRAPE_LEAGUE_REGISTRY.map(row => ({
    ...row,
    synonyms: [...row.synonyms],
    aliases: [...row.aliases],
    ...leagueColorWire(row.key),
  }));
  const marketRegistry = SCRAPE_MARKET_REGISTRY.map(row => ({
    ...row,
    aliases: [...row.aliases],
  }));
  const phaseRegistry = SCRAPE_PHASE_REGISTRY.map(row => ({
    ...row,
    aliases: [...row.aliases],
  }));
  return {
    kind: SCRAPE_WIRE_TAXONOMY_KIND,
    schemaVersion: SCRAPE_WIRE_TAXONOMY_SCHEMA_VERSION,
    path: SCRAPE_WIRE_TAXONOMY_PATH,
    generatedAt,
    summary: {
      books: SCRAPE_BOOK_KEYS.length,
      sports: SCRAPE_SPORT_KEYS.length,
      leagues: SCRAPE_LEAGUE_KEYS.length,
      markets: SCRAPE_MARKET_KEYS.length,
      phases: SCRAPE_PHASE_KEYS.length,
      regulationMarkets: SCRAPE_REGULATION_MARKET_KEYS.length,
      extendedMarkets: SCRAPE_EXTENDED_MARKET_KEYS.length,
      states: SCRAPE_STATE_KEYS.length,
      fixtureJurisdictions: SCRAPE_FIXTURE_JURISDICTION_KEYS.length,
      sportAliases: Object.keys(SCRAPE_SPORT_ALIASES).length,
      marketAliases: Object.keys(SCRAPE_MARKET_ALIASES).length,
      phaseAliases: Object.keys(SCRAPE_PHASE_ALIASES).length,
      stateAliases: Object.keys(SCRAPE_STATE_ALIASES).length,
      bookAliases: Object.keys(SCRAPE_BOOK_ALIASES).length,
      leagueAliases: Object.keys(SCRAPE_LEAGUE_ALIASES).length,
      glossaryConcepts: scrapeWireGlossaryConcepts().length,
    },
    bookRegistry,
    books: [...SCRAPE_BOOK_KEYS],
    sportRegistry,
    sports: [...SCRAPE_SPORT_KEYS],
    leagueRegistry,
    leagues: [...SCRAPE_LEAGUE_KEYS],
    marketRegistry,
    markets: [...SCRAPE_MARKET_KEYS],
    regulationMarkets: [...SCRAPE_REGULATION_MARKET_KEYS],
    extendedMarkets: [...SCRAPE_EXTENDED_MARKET_KEYS],
    phaseRegistry,
    phases: [...SCRAPE_PHASE_KEYS],
    stateRegistry,
    states: [...SCRAPE_STATE_KEYS],
    jurisdictions: [...SCRAPE_STATE_KEYS],
    fixtureJurisdictions: [...SCRAPE_FIXTURE_JURISDICTION_KEYS],
    fixtureSports: [...SCRAPE_FIXTURE_SPORT_KEYS],
    fixtureMarkets: [...SCRAPE_FIXTURE_MARKET_KEYS],
    fixturePhases: [...SCRAPE_FIXTURE_PHASE_KEYS],
    defaultJurisdiction: SCRAPE_DEFAULT_JURISDICTION,
    defaultPhase: SCRAPE_DEFAULT_PHASE,
    sportAliases: SCRAPE_SPORT_ALIASES,
    marketAliases: SCRAPE_MARKET_ALIASES,
    phaseAliases: SCRAPE_PHASE_ALIASES,
    stateAliases: SCRAPE_STATE_ALIASES,
    bookAliases: SCRAPE_BOOK_ALIASES,
    leagueAliases: SCRAPE_LEAGUE_ALIASES,
    leagueToSport: SCRAPE_LEAGUE_TO_SPORT,
    glossaryConcepts: scrapeWireGlossaryConcepts(),
  };
}
