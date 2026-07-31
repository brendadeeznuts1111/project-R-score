/**
 * Per-sportsbook vendor alias maps — translate book-specific wire strings
 * onto scrape-wire canonical IDs (sport · market · league · phase).
 *
 * Global aliases live in {@link scrape-wire-taxonomy}. Book maps are overlays:
 * resolve with {@link resolveBookSport} / {@link resolveBookMarket} / …
 * which try book overlay first, then the global normalizer.
 *
 * SSOT with glossary + desk column semantics — audited by `bun run schema:audit`.
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/operations/scrapers/scrape-wire-taxonomy.ts
 */

import type { LeagueKey } from '../sports-competition-catalog.ts';
import {
  SCRAPE_BOOK_KEYS,
  tryNormalizeScrapeLeague,
  tryNormalizeScrapeMarket,
  tryNormalizeScrapePhase,
  tryNormalizeScrapeSport,
  type ScrapeBookKey,
  type ScrapeMarketKey,
  type ScrapePhaseKey,
  type ScrapeSportKey,
} from './scrape-wire-taxonomy.ts';

export type BookVendorAliasMap = {
  bookId: ScrapeBookKey;
  /** Vendor sport / category string → canonical sport key. */
  sports: Readonly<Record<string, ScrapeSportKey>>;
  /** Vendor market / bet-type string → canonical market key. */
  markets: Readonly<Record<string, ScrapeMarketKey>>;
  /** Vendor league / competition string → canonical league key. */
  leagues: Readonly<Record<string, LeagueKey>>;
  /** Vendor phase string → pregame | live. */
  phases: Readonly<Record<string, ScrapePhaseKey>>;
};

function wireKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** Shared US retail shorthand (DK / FD / MGM / etc.). */
const US_RETAIL_SPORTS: Readonly<Record<string, ScrapeSportKey>> = {
  basketball: 'basketball',
  nba_basketball: 'basketball',
  football: 'american_football',
  nfl_football: 'american_football',
  soccer: 'soccer',
  baseball: 'baseball',
  hockey: 'hockey',
  ice_hockey: 'hockey',
  tennis: 'tennis',
  golf: 'golf',
  mma: 'mma',
  fighting: 'mma',
};

const US_RETAIL_MARKETS: Readonly<Record<string, ScrapeMarketKey>> = {
  moneyline: 'match_winner',
  game_moneyline: 'match_winner',
  match_moneyline: 'match_winner',
  total: 'over_under',
  game_total: 'over_under',
  spread: 'spread',
  point_spread: 'spread',
  run_line: 'spread',
  puck_line: 'spread',
  player_props: 'player_prop',
  team_props: 'team_prop',
  futures: 'futures',
  outright: 'futures',
};

const US_RETAIL_LEAGUES: Readonly<Record<string, LeagueKey>> = {
  nba: 'nba',
  wnba: 'wnba',
  nfl: 'nfl',
  ncaaf: 'ncaaf',
  ncaab: 'ncaab',
  mlb: 'mlb',
  nhl: 'nhl',
  mls: 'mls',
  epl: 'epl',
  ufc: 'ufc',
};

const US_RETAIL_PHASES: Readonly<Record<string, ScrapePhaseKey>> = {
  pregame: 'pregame',
  pre_game: 'pregame',
  early: 'pregame',
  live: 'live',
  in_play: 'live',
  inplay: 'live',
};

function bookMap(
  bookId: ScrapeBookKey,
  overlays: {
    sports?: Readonly<Record<string, ScrapeSportKey>>;
    markets?: Readonly<Record<string, ScrapeMarketKey>>;
    leagues?: Readonly<Record<string, LeagueKey>>;
    phases?: Readonly<Record<string, ScrapePhaseKey>>;
  } = {}
): BookVendorAliasMap {
  return {
    bookId,
    sports: { ...US_RETAIL_SPORTS, ...overlays.sports },
    markets: { ...US_RETAIL_MARKETS, ...overlays.markets },
    leagues: { ...US_RETAIL_LEAGUES, ...overlays.leagues },
    phases: { ...US_RETAIL_PHASES, ...overlays.phases },
  };
}

/**
 * Central per-book vendor alias registry (US top-10).
 * Keys are wireKey-normalized (lowercase, spaces → `_`).
 */
export const SCRAPE_BOOK_VENDOR_ALIASES: Readonly<Record<ScrapeBookKey, BookVendorAliasMap>> = {
  draftkings: bookMap('draftkings', {
    sports: { dk_basketball: 'basketball', dk_football: 'american_football' },
    markets: { game_lines: 'match_winner', same_game_parlay: 'match_winner' },
  }),
  fanduel: bookMap('fanduel', {
    sports: { fd_basketball: 'basketball', american_football_nfl: 'american_football' },
    markets: { win_draw_win: 'match_winner', handicap: 'spread' },
  }),
  betmgm: bookMap('betmgm', {
    markets: { '2_way_money_line': 'match_winner', over_under_total: 'over_under' },
  }),
  caesars: bookMap('caesars', {
    // American Wagering / czr path + configuration field quirks
    sports: {
      tabletennis: 'tennis',
      table_tennis: 'tennis',
      association_football: 'soccer',
      americanfootball: 'american_football',
    },
    markets: {
      matchwinner: 'match_winner',
      pointspread: 'spread',
      totalpoints: 'over_under',
      asianhandicap: 'spread',
    },
    leagues: {
      premier_league: 'epl',
      champions_league: 'uefa_champions_league',
    },
    phases: {
      pre_match: 'pregame',
      trading: 'live',
    },
  }),
  espnbet: bookMap('espnbet', {
    sports: { espn_football: 'american_football' },
  }),
  fanatics: bookMap('fanatics'),
  hardrock: bookMap('hardrock', {
    sports: { college_football: 'american_football', college_basketball: 'basketball' },
  }),
  bet365: bookMap('bet365', {
    sports: {
      soccer_football: 'soccer',
      american_football: 'american_football',
      tennis_singles: 'tennis',
    },
    markets: {
      full_time_result: 'match_winner',
      match_odds: 'match_winner',
      asian_lines: 'spread',
      goal_line: 'over_under',
    },
    phases: {
      'in-play': 'live',
      pre_event: 'pregame',
    },
  }),
  betrivers: bookMap('betrivers'),
  circa: bookMap('circa', {
    markets: { side: 'match_winner', total_combined: 'over_under' },
  }),
};

function lookup<T>(
  map: Readonly<Record<string, T>>,
  raw: string | null | undefined
): T | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  return map[wireKey(raw)];
}

export function bookVendorAliasMap(bookId: ScrapeBookKey | string): BookVendorAliasMap | undefined {
  const key = wireKey(String(bookId)) as ScrapeBookKey;
  return SCRAPE_BOOK_VENDOR_ALIASES[key];
}

/** Book overlay → global sport normalizer. */
export function resolveBookSport(
  bookId: ScrapeBookKey | string,
  raw: string | null | undefined
): ScrapeSportKey | undefined {
  const overlay = bookVendorAliasMap(bookId);
  return lookup(overlay?.sports ?? {}, raw) ?? tryNormalizeScrapeSport(raw);
}

/** Book overlay → global market normalizer. */
export function resolveBookMarket(
  bookId: ScrapeBookKey | string,
  raw: string | null | undefined
): ScrapeMarketKey | undefined {
  const overlay = bookVendorAliasMap(bookId);
  return lookup(overlay?.markets ?? {}, raw) ?? tryNormalizeScrapeMarket(raw);
}

/** Book overlay → global league normalizer. */
export function resolveBookLeague(
  bookId: ScrapeBookKey | string,
  raw: string | null | undefined
): LeagueKey | undefined {
  const overlay = bookVendorAliasMap(bookId);
  return lookup(overlay?.leagues ?? {}, raw) ?? tryNormalizeScrapeLeague(raw);
}

/** Book overlay → global phase normalizer. */
export function resolveBookPhase(
  bookId: ScrapeBookKey | string,
  raw: string | null | undefined
): ScrapePhaseKey | undefined {
  const overlay = bookVendorAliasMap(bookId);
  return lookup(overlay?.phases ?? {}, raw) ?? tryNormalizeScrapePhase(raw);
}

/** Audit helper — every registered book has a vendor alias map. */
export function listBookVendorAliasCoverage(): {
  bookId: ScrapeBookKey;
  sports: number;
  markets: number;
  leagues: number;
  phases: number;
}[] {
  return SCRAPE_BOOK_KEYS.map(bookId => {
    const map = SCRAPE_BOOK_VENDOR_ALIASES[bookId];
    return {
      bookId,
      sports: Object.keys(map.sports).length,
      markets: Object.keys(map.markets).length,
      leagues: Object.keys(map.leagues).length,
      phases: Object.keys(map.phases).length,
    };
  });
}
