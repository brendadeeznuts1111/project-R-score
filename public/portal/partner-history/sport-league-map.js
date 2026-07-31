/**
 * Map wire sport_id values onto governed sport.* / league.* glossary concepts.
 * Limit-change rows often use league codes (nba) or sport roots (soccer, basketball).
 */

/** @type {Record<string, { sport: string; league: string | null; sportLabel: string; leagueLabel: string | null }>} */
const WIRE_MAP = Object.freeze({
  nba: {
    sport: 'sport.basketball',
    league: 'league.nba',
    sportLabel: 'Basketball',
    leagueLabel: 'NBA',
  },
  wnba: {
    sport: 'sport.basketball',
    league: 'league.wnba',
    sportLabel: 'Basketball',
    leagueLabel: 'WNBA',
  },
  ncaab: {
    sport: 'sport.basketball',
    league: 'league.ncaab',
    sportLabel: 'Basketball',
    leagueLabel: 'NCAAB',
  },
  basketball: {
    sport: 'sport.basketball',
    league: null,
    sportLabel: 'Basketball',
    leagueLabel: null,
  },
  nfl: {
    sport: 'sport.american_football',
    league: 'league.nfl',
    sportLabel: 'American football',
    leagueLabel: 'NFL',
  },
  ncaaf: {
    sport: 'sport.american_football',
    league: 'league.ncaaf',
    sportLabel: 'American football',
    leagueLabel: 'NCAAF',
  },
  american_football: {
    sport: 'sport.american_football',
    league: null,
    sportLabel: 'American football',
    leagueLabel: null,
  },
  football: {
    sport: 'sport.american_football',
    league: null,
    sportLabel: 'American football',
    leagueLabel: null,
  },
  mlb: {
    sport: 'sport.baseball',
    league: 'league.mlb',
    sportLabel: 'Baseball',
    leagueLabel: 'MLB',
  },
  baseball: {
    sport: 'sport.baseball',
    league: null,
    sportLabel: 'Baseball',
    leagueLabel: null,
  },
  nhl: {
    sport: 'sport.hockey',
    league: 'league.nhl',
    sportLabel: 'Hockey',
    leagueLabel: 'NHL',
  },
  hockey: {
    sport: 'sport.hockey',
    league: null,
    sportLabel: 'Hockey',
    leagueLabel: null,
  },
  soccer: {
    sport: 'sport.soccer',
    league: null,
    sportLabel: 'Soccer',
    leagueLabel: null,
  },
  mls: {
    sport: 'sport.soccer',
    league: 'league.mls',
    sportLabel: 'Soccer',
    leagueLabel: 'MLS',
  },
  epl: {
    sport: 'sport.soccer',
    league: 'league.epl',
    sportLabel: 'Soccer',
    leagueLabel: 'EPL',
  },
  uefa_champions_league: {
    sport: 'sport.soccer',
    league: 'league.uefa_champions_league',
    sportLabel: 'Soccer',
    leagueLabel: 'UCL',
  },
  ucl: {
    sport: 'sport.soccer',
    league: 'league.uefa_champions_league',
    sportLabel: 'Soccer',
    leagueLabel: 'UCL',
  },
  tennis: {
    sport: 'sport.tennis',
    league: null,
    sportLabel: 'Tennis',
    leagueLabel: null,
  },
  atp: {
    sport: 'sport.tennis',
    league: 'league.atp',
    sportLabel: 'Tennis',
    leagueLabel: 'ATP',
  },
  wta: {
    sport: 'sport.tennis',
    league: 'league.wta',
    sportLabel: 'Tennis',
    leagueLabel: 'WTA',
  },
  golf: {
    sport: 'sport.golf',
    league: null,
    sportLabel: 'Golf',
    leagueLabel: null,
  },
  mma: {
    sport: 'sport.mma',
    league: null,
    sportLabel: 'MMA',
    leagueLabel: null,
  },
  ufc: {
    sport: 'sport.mma',
    league: 'league.ufc',
    sportLabel: 'MMA',
    leagueLabel: 'UFC',
  },
});

export function resolveSportLeague(sportId) {
  const key = String(sportId ?? '')
    .trim()
    .toLowerCase();
  const hit = WIRE_MAP[key];
  if (hit) {
    return {
      wire: key,
      sportConcept: hit.sport,
      leagueConcept: hit.league,
      sportLabel: hit.sportLabel,
      leagueLabel: hit.leagueLabel,
      sportHref: `/portal/glossary/#glossary:${hit.sport}`,
      leagueHref: hit.league ? `/portal/glossary/#glossary:${hit.league}` : null,
    };
  }
  if (!key) {
    return {
      wire: '',
      sportConcept: 'ops.limits.sport',
      leagueConcept: null,
      sportLabel: '—',
      leagueLabel: null,
      sportHref: '/portal/glossary/#glossary:ops.limits.sport',
      leagueHref: null,
    };
  }
  // Unknown wire: still deep-link ops.limits.sport / ops.limits.league
  return {
    wire: key,
    sportConcept: 'ops.limits.sport',
    leagueConcept: 'ops.limits.league',
    sportLabel: key,
    leagueLabel: '—',
    sportHref: '/portal/glossary/#glossary:ops.limits.sport',
    leagueHref: '/portal/glossary/#glossary:ops.limits.league',
  };
}
