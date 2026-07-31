/**
 * Sports betting domain glossary — hierarchy, market types, data products.
 *
 * Operational / regulatory concepts live in regulation-policy-catalog and
 * portal semantic vocabulary. This module owns the under-covered sports data
 * plane: sport → league → event, market types, cross-market metrics, and
 * multi-leg bet structure. Wire keys align with REGULATION_SPORT_KEYS /
 * REGULATION_MARKET_KEYS and limit-raise sport_id / market_id fields.
 */

import { REGULATION_MARKET_KEYS, REGULATION_SPORT_KEYS } from './regulation-policy-catalog.ts';
import {
  LEAGUES,
  sportsTaxonomyGlossaryConcepts,
  type CompetitionKey,
  type CountryCode,
  type LeagueKey,
  type SportKey,
} from './sports-competition-catalog.ts';
import { scrapeWireGlossaryConcepts } from './scrapers/scrape-wire-taxonomy.ts';

export type SportsBettingGlossaryConcept = {
  id: string; // brand-ok — glossary concept key, not an entity identity
  label: string;
  description: string;
  category: 'market' | 'model' | 'tournament' | 'trading' | 'warehouse';
  kind:
    | 'sport'
    | 'region'
    | 'country'
    | 'league'
    | 'competition'
    | 'event'
    | 'market'
    | 'metric'
    | 'cross_market'
    | 'evidence'
    | 'multi';
  synonyms: readonly string[];
  values: readonly string[] | null;
  seeAlso: readonly string[];
  status: 'active';
  source: string;
  semanticType: 'classification' | 'resource' | 'state';
  uiRole: 'badge' | 'chip' | 'code' | 'heading' | 'token';
  unit?: string;
  format?: string;
  parentId?: string | null; // brand-ok — glossary concept relation
  scope?: string | null;
  countryCodes?: readonly string[];
  region?: string | null;
  flagEmoji?: string | null;
  flagAriaLabel?: string | null;
};

const SOURCE = 'lib/operations/sports-betting-glossary.ts';

const SPORT_LABELS: Record<(typeof REGULATION_SPORT_KEYS)[number], string> = {
  american_football: 'American football',
  baseball: 'Baseball',
  basketball: 'Basketball',
  hockey: 'Hockey',
  soccer: 'Soccer',
};

const SPORT_SYNONYMS: Record<(typeof REGULATION_SPORT_KEYS)[number], readonly string[]> = {
  american_football: ['NFL', 'NCAAF', 'football'],
  baseball: ['MLB'],
  basketball: ['NBA', 'WNBA', 'NCAAB', 'CBB'],
  hockey: ['NHL'],
  soccer: ['football', 'association football', 'EPL', 'MLS', 'UCL'],
};

/** Extra sports used in desks / TOC that are not yet jurisdiction-policy keys. */
const EXTRA_SPORTS = [
  {
    id: 'sport.tennis',
    label: 'Tennis',
    description:
      'Racket sport hierarchy root covering ATP, WTA, Challenger, and ITF match markets.',
    synonyms: ['ATP', 'WTA', 'ITF'] as const,
  },
  {
    id: 'sport.golf',
    label: 'Golf',
    description: 'Stroke-play and match-play golf competitions used in futures and prop markets.',
    synonyms: ['PGA', 'DP World Tour'] as const,
  },
  {
    id: 'sport.mma',
    label: 'MMA',
    description: 'Mixed martial arts fight card hierarchy root for bout and prop markets.',
    synonyms: ['UFC', 'Bellator'] as const,
  },
] as const;

function marketSeeAlso(...ids: string[]): string[] {
  return ids;
}

export function sportsBettingGlossaryConcepts(): SportsBettingGlossaryConcept[] {
  const scrapeWire = scrapeWireGlossaryConcepts().map(
    (c): SportsBettingGlossaryConcept => ({
      ...c,
      category: c.category,
      kind: c.kind === 'jurisdiction' ? 'region' : c.kind === 'league' ? 'league' : c.kind,
      parentId: null,
      scope: 'scrape-wire',
    })
  );

  const hierarchyRoots: SportsBettingGlossaryConcept[] = [
    {
      id: 'sport',
      label: 'Sport',
      description:
        'Top-level sports hierarchy category that scopes leagues, events, markets, and limits.',
      category: 'tournament',
      kind: 'sport',
      synonyms: ['sport key', 'sport_id'],
      values: [...REGULATION_SPORT_KEYS, 'tennis', 'golf', 'mma'],
      seeAlso: [
        'competition',
        'event',
        ...REGULATION_SPORT_KEYS.map(key => `sport.${key}`),
        'sport.tennis',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      // Root id is `competition` — Kalshi-bot already owns bare `league` (tennis tour).
      id: 'competition',
      label: 'League / competition',
      description:
        'Competition or tour nested under a sport (for example NBA, ATP, MLS). Children use league.* ids.',
      category: 'tournament',
      kind: 'league',
      synonyms: ['league', 'tour', 'series', 'league.*', 'competition.*'],
      values: LEAGUES.map(row => row.key),
      seeAlso: ['sport', 'event', ...LEAGUES.map(row => row.conceptId)],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'event',
      label: 'Event',
      description:
        'Specific match, game, or contest under a league that hosts one or more betting markets.',
      category: 'tournament',
      kind: 'event',
      synonyms: ['fixture', 'match', 'game', 'event_id'],
      values: null,
      seeAlso: ['sport', 'competition', 'event.match', 'market.match_winner'],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'heading',
    },
    {
      id: 'event.match',
      label: 'Match event',
      description:
        'Head-to-head sporting contest (two participants or teams) that anchors moneyline, spread, and total markets.',
      category: 'tournament',
      kind: 'event',
      synonyms: ['game event', 'fixture event'],
      values: null,
      seeAlso: ['event', 'market.match_winner', 'market.point_spread', 'market.total'],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'code',
    },
  ];

  const sports: SportsBettingGlossaryConcept[] = [
    ...REGULATION_SPORT_KEYS.map(
      (key): SportsBettingGlossaryConcept => ({
        id: `sport.${key}`,
        label: SPORT_LABELS[key],
        description: `${SPORT_LABELS[key]} hierarchy root used by jurisdiction policies, limit observations, and market filters.`,
        category: 'tournament',
        kind: 'sport',
        synonyms: [...SPORT_SYNONYMS[key], key],
        values: null,
        seeAlso: ['sport', 'competition', 'event', 'market.match_winner'],
        status: 'active',
        source: SOURCE,
        semanticType: 'classification',
        uiRole: 'chip',
      })
    ),
    ...EXTRA_SPORTS.map(
      (row): SportsBettingGlossaryConcept => ({
        id: row.id,
        label: row.label,
        description: row.description,
        category: 'tournament',
        kind: 'sport',
        synonyms: [...row.synonyms],
        values: null,
        seeAlso: ['sport', 'competition', 'event'],
        status: 'active',
        source: SOURCE,
        semanticType: 'classification',
        uiRole: 'chip',
      })
    ),
  ];

  const taxonomy = sportsTaxonomyGlossaryConcepts();
  const leagues: SportsBettingGlossaryConcept[] = taxonomy.filter(
    concept => concept.kind === 'league'
  );
  const geographyAndCompetition: SportsBettingGlossaryConcept[] = taxonomy.filter(
    concept => concept.kind !== 'league'
  );

  const markets: SportsBettingGlossaryConcept[] = [
    {
      id: 'market.match_winner',
      label: 'Match winner',
      description:
        'Outright winner market (moneyline / 1X2 / H2H). Wire key match_winner on limit and policy rows.',
      category: 'market',
      kind: 'market',
      synonyms: ['moneyline', 'ml', 'h2h', '1x2', 'match winner'],
      values: null,
      seeAlso: marketSeeAlso(
        'event.match',
        'market.point_spread',
        'market.total',
        'ops.limits.market_phase'
      ),
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'market.point_spread',
      label: 'Point spread',
      description:
        'Margin-of-victory market. Regulatory and limit wire key is spread; handicap is a synonym.',
      category: 'market',
      kind: 'market',
      synonyms: ['spread', 'handicap', 'line', 'ATS'],
      values: null,
      seeAlso: marketSeeAlso('market.match_winner', 'market.total', 'event.match'),
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'market.total',
      label: 'Total',
      description:
        'Over/under market on combined points, goals, or games. Wire key over_under on limit and policy rows.',
      category: 'market',
      kind: 'market',
      synonyms: ['over_under', 'over/under', 'totals', 'ou', 'total points'],
      values: null,
      seeAlso: marketSeeAlso('market.match_winner', 'market.point_spread', 'event.match'),
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'market.player_prop',
      label: 'Player prop',
      description:
        "Bet on an individual player's statistical performance within an event (points, goals, aces, …).",
      category: 'market',
      kind: 'market',
      synonyms: ['player proposition', 'player market', 'prop'],
      values: null,
      seeAlso: marketSeeAlso('market.team_prop', 'event.match', 'market.futures'),
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'market.team_prop',
      label: 'Team prop',
      description:
        "Bet on a team's statistical performance within an event, distinct from match winner or spread.",
      category: 'market',
      kind: 'market',
      synonyms: ['team proposition', 'team market'],
      values: null,
      seeAlso: marketSeeAlso('market.player_prop', 'event.match', 'market.match_winner'),
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'market.futures',
      label: 'Futures',
      description:
        'Bet on a future outcome such as a league champion, award winner, or season-long standing.',
      category: 'market',
      kind: 'market',
      synonyms: ['outright', 'season long', 'championship'],
      values: null,
      seeAlso: marketSeeAlso('competition', 'sport', 'market.match_winner'),
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'market.in_play',
      label: 'In-play',
      description:
        'Market phase for wagers placed after an event has started. Aligns with limit market phase live.',
      category: 'market',
      kind: 'market',
      synonyms: ['live', 'in play', 'live betting'],
      values: null,
      seeAlso: marketSeeAlso('ops.limits.market_phase', 'market.match_winner', 'event.match'),
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
    },
  ];

  // Keep a wire-key alias concept for each regulation market key that differs
  // from the glossary primary id so policy seeAlso can stay stable.
  const marketWireAliases: SportsBettingGlossaryConcept[] = [
    {
      id: 'market.spread',
      label: 'Spread (wire)',
      description:
        'Regulatory wire key for point-spread markets. Prefer market.point_spread in new glossary links.',
      category: 'market',
      kind: 'market',
      synonyms: [...REGULATION_MARKET_KEYS.filter(key => key === 'spread'), 'point_spread'],
      values: null,
      seeAlso: ['market.point_spread', 'market.match_winner', 'market.over_under'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
    {
      id: 'market.over_under',
      label: 'Over/under (wire)',
      description:
        'Regulatory wire key for total markets. Prefer market.total in new glossary links.',
      category: 'market',
      kind: 'market',
      synonyms: ['total', 'totals', 'ou'],
      values: null,
      seeAlso: ['market.total', 'market.match_winner', 'market.spread'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
  ];

  const metrics: SportsBettingGlossaryConcept[] = [
    {
      id: 'metric.normalized_odds',
      label: 'Normalized odds',
      description:
        'Odds converted to a comparable probability on the 0.00–1.00 scale across books and prediction venues.',
      category: 'model',
      kind: 'metric',
      synonyms: ['implied probability', 'normalized price', 'fair odds'],
      values: null,
      seeAlso: ['metric.overround', 'cross_market.unified_price', 'evidence.bookmaker_odds'],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'token',
      unit: 'probability',
      format: 'probability:0-1',
    },
    {
      id: 'metric.overround',
      label: 'Overround',
      description:
        'Sum of implied probabilities across mutually exclusive outcomes; the bookmaker margin (vig) above 1.00.',
      category: 'model',
      kind: 'metric',
      synonyms: ['vig', 'juice', 'margin', 'hold'],
      values: null,
      seeAlso: ['metric.normalized_odds', 'metric.arbitrage_gap', 'evidence.bookmaker_odds'],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'badge',
      unit: 'probability',
      format: 'probability:0-1',
    },
    {
      id: 'metric.arbitrage_gap',
      label: 'Arbitrage gap',
      description:
        'Price gap between venues for the same event/outcome that can imply a locked cross-venue edge when below 1.00 combined.',
      category: 'model',
      kind: 'metric',
      synonyms: ['arb gap', 'arb', 'cross-venue edge'],
      values: null,
      seeAlso: ['metric.overround', 'cross_market.venue_comparison', 'cross_market.unified_price'],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'badge',
      unit: 'probability',
      format: 'probability:0-1',
    },
  ];

  const crossMarket: SportsBettingGlossaryConcept[] = [
    {
      id: 'cross_market.venue_comparison',
      label: 'Venue comparison',
      description:
        'Side-by-side price comparison for the same event and market across sportsbooks and prediction markets (Kalshi, Polymarket, …).',
      category: 'market',
      kind: 'cross_market',
      synonyms: ['cross-venue comparison', 'book comparison', 'multi-venue'],
      values: null,
      seeAlso: [
        'cross_market.unified_price',
        'metric.arbitrage_gap',
        'evidence.bookmaker_odds',
        'evidence.prediction_market_price',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'heading',
    },
    {
      id: 'cross_market.unified_price',
      label: 'Unified price',
      description:
        'Single normalized price for an event/outcome derived from multiple venue quotes after vig and format normalization.',
      category: 'market',
      kind: 'cross_market',
      synonyms: ['consensus price', 'blended price', 'unified odds'],
      values: null,
      seeAlso: [
        'metric.normalized_odds',
        'cross_market.venue_comparison',
        'evidence.prediction_market_price',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'token',
      unit: 'probability',
      format: 'probability:0-1',
    },
  ];

  const evidence: SportsBettingGlossaryConcept[] = [
    {
      id: 'evidence.bookmaker_odds',
      label: 'Bookmaker odds',
      description:
        'Odds quote evidence from a specific sportsbook at a point in time, used for limit context and cross-market analytics.',
      category: 'warehouse',
      kind: 'evidence',
      synonyms: ['sportsbook odds', 'book quote', 'price quote'],
      values: null,
      seeAlso: [
        'evidence.prediction_market_price',
        'metric.normalized_odds',
        'ops.limits.evidence_trace',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'link',
    },
    {
      id: 'evidence.prediction_market_price',
      label: 'Prediction market price',
      description:
        'Price evidence from a prediction venue such as Kalshi or Polymarket for the same underlying event/outcome.',
      category: 'warehouse',
      kind: 'evidence',
      synonyms: ['Kalshi price', 'Polymarket price', 'PM price'],
      values: null,
      seeAlso: [
        'evidence.bookmaker_odds',
        'cross_market.venue_comparison',
        'cross_market.unified_price',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'link',
    },
  ];

  const multi: SportsBettingGlossaryConcept[] = [
    {
      id: 'multi.parlay',
      label: 'Parlay',
      description:
        'Single wager linking multiple selections (legs); all legs must win for the parlay to pay. UI shorthand: multi.',
      category: 'trading',
      kind: 'multi',
      synonyms: ['multi', 'accumulator', 'acca', 'combo'],
      values: null,
      seeAlso: ['multi.leg', 'market.match_winner', 'ops.limits.effective_limit'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'multi.leg',
      label: 'Parlay leg',
      description:
        'Individual selection inside a parlay / accumulator; each leg is a market outcome on an event.',
      category: 'trading',
      kind: 'multi',
      synonyms: ['leg', 'selection', 'parlay selection'],
      values: null,
      seeAlso: ['multi.parlay', 'event.match', 'market.match_winner'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
  ];

  return [
    ...hierarchyRoots,
    ...sports,
    ...geographyAndCompetition,
    ...leagues,
    ...markets,
    ...marketWireAliases,
    ...metrics,
    ...crossMarket,
    ...evidence,
    ...multi,
    ...scrapeWire,
  ];
}

/** Map a regulation / limit wire market key to the preferred glossary concept id. */
export function glossaryConceptForMarketKey(marketKey: string): string {
  switch (marketKey) {
    case 'match_winner':
      return 'market.match_winner';
    case 'spread':
      return 'market.point_spread';
    case 'over_under':
      return 'market.total';
    default:
      return `market.${marketKey}`;
  }
}

/** Map a regulation / limit wire sport key to the sport.* glossary concept id. */
export function glossaryConceptForSportKey(sportKey: SportKey): string {
  return `sport.${sportKey}`;
}

/** Map a governed league / tour key to its glossary concept id. */
export function glossaryConceptForLeagueKey(leagueKey: LeagueKey): string {
  return `league.${leagueKey}`;
}

/** Map an ISO alpha-2 event-host country to its glossary concept id. */
export function glossaryConceptForCountryCode(countryCode: CountryCode): string {
  return `country.${countryCode.toLowerCase()}`;
}

/** Map a competition tier key to its glossary concept id. */
export function glossaryConceptForCompetitionKey(competitionKey: CompetitionKey): string {
  return `competition.${competitionKey}`;
}
