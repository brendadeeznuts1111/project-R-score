/**
 * Governed sport → league/tour → competition-tier → host-country taxonomy.
 *
 * League geography describes the competition's operating scope. Event geography
 * describes where a specific fixture is hosted. Global tours therefore use the
 * globe marker until an event supplies a host country.
 */

export const SPORTS_TAXONOMY_KIND = 'sports-competition-taxonomy' as const;
export const SPORTS_TAXONOMY_PATH = '/registry/sports-taxonomy.json' as const;
export const SPORTS_TAXONOMY_SCHEMA_VERSION = 1 as const;

export const SPORT_KEYS = [
  'american_football',
  'baseball',
  'basketball',
  'hockey',
  'soccer',
  'tennis',
  'golf',
  'mma',
] as const;
export type SportKey = (typeof SPORT_KEYS)[number];

export const REGION_KEYS = [
  'north_america',
  'south_america',
  'europe',
  'asia_pacific',
  'africa_middle_east',
] as const;
export type SportsRegionKey = (typeof REGION_KEYS)[number];

export const COUNTRY_CODES = [
  'US',
  'CA',
  'GB',
  'AU',
  'FR',
  'DE',
  'IT',
  'ES',
  'NL',
  'BE',
  'CH',
  'CZ',
  'PL',
  'RS',
  'GR',
  'BR',
  'AR',
  'MX',
  'JP',
  'CN',
  'KR',
  'IN',
  'ZA',
  'AE',
] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const LEAGUE_KEYS = [
  'nba',
  'wnba',
  'nfl',
  'ncaaf',
  'ncaab',
  'mlb',
  'nhl',
  'mls',
  'epl',
  'uefa_champions_league',
  'atp',
  'wta',
  'itf',
  'atp_challenger',
  'wta_125',
  'pga_tour',
  'dp_world_tour',
  'ufc',
] as const;
export type LeagueKey = (typeof LEAGUE_KEYS)[number];

export const COMPETITION_KEYS = [
  'itf_m15',
  'itf_m25',
  'itf_w15',
  'itf_w35',
  'itf_w50',
  'itf_w75',
  'itf_w100',
  'atp_challenger_50',
  'atp_challenger_75',
  'atp_challenger_100',
  'atp_challenger_125',
  'atp_challenger_175',
  'wta_125',
] as const;
export type CompetitionKey = (typeof COMPETITION_KEYS)[number];

export type CompetitionScope = 'global' | 'multi_country' | 'national';

export type SportCatalogEntry = {
  key: SportKey;
  label: string;
  conceptId: `sport.${SportKey}`;
};

export type CountryCatalogEntry = {
  code: CountryCode;
  label: string;
  region: SportsRegionKey;
  conceptId: `country.${Lowercase<CountryCode>}`;
  flagEmoji: string;
  flagAriaLabel: string;
};

export type LeagueCatalogEntry = {
  key: LeagueKey;
  label: string;
  sport: SportKey;
  scope: CompetitionScope;
  countries: readonly CountryCode[];
  conceptId: `league.${LeagueKey}`;
  synonyms: readonly string[];
};

export type CompetitionCatalogEntry = {
  key: CompetitionKey;
  label: string;
  sport: SportKey;
  league: LeagueKey;
  tier: string;
  conceptId: `competition.${CompetitionKey}`;
};

const SPORT_LABELS: Record<SportKey, string> = {
  american_football: 'American football',
  baseball: 'Baseball',
  basketball: 'Basketball',
  hockey: 'Hockey',
  soccer: 'Soccer',
  tennis: 'Tennis',
  golf: 'Golf',
  mma: 'MMA',
};

const REGION_LABELS: Record<SportsRegionKey, string> = {
  north_america: 'North America',
  south_america: 'South America',
  europe: 'Europe',
  asia_pacific: 'Asia-Pacific',
  africa_middle_east: 'Africa & Middle East',
};

const COUNTRY_ROWS: ReadonlyArray<readonly [CountryCode, string, SportsRegionKey]> = [
  ['US', 'United States', 'north_america'],
  ['CA', 'Canada', 'north_america'],
  ['GB', 'United Kingdom', 'europe'],
  ['AU', 'Australia', 'asia_pacific'],
  ['FR', 'France', 'europe'],
  ['DE', 'Germany', 'europe'],
  ['IT', 'Italy', 'europe'],
  ['ES', 'Spain', 'europe'],
  ['NL', 'Netherlands', 'europe'],
  ['BE', 'Belgium', 'europe'],
  ['CH', 'Switzerland', 'europe'],
  ['CZ', 'Czechia', 'europe'],
  ['PL', 'Poland', 'europe'],
  ['RS', 'Serbia', 'europe'],
  ['GR', 'Greece', 'europe'],
  ['BR', 'Brazil', 'south_america'],
  ['AR', 'Argentina', 'south_america'],
  ['MX', 'Mexico', 'north_america'],
  ['JP', 'Japan', 'asia_pacific'],
  ['CN', 'China', 'asia_pacific'],
  ['KR', 'South Korea', 'asia_pacific'],
  ['IN', 'India', 'asia_pacific'],
  ['ZA', 'South Africa', 'africa_middle_east'],
  ['AE', 'United Arab Emirates', 'africa_middle_east'],
];

/** Convert an ISO alpha-2 country code into Unicode regional indicators. */
export function countryFlagEmoji(code: CountryCode): string {
  return [...code]
    .map(letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join('');
}

export const SPORTS: readonly SportCatalogEntry[] = SPORT_KEYS.map(key => ({
  key,
  label: SPORT_LABELS[key],
  conceptId: `sport.${key}`,
}));

export const SPORTS_COUNTRIES: readonly CountryCatalogEntry[] = COUNTRY_ROWS.map(
  ([code, label, region]) => ({
    code,
    label,
    region,
    conceptId: `country.${code.toLowerCase()}` as `country.${Lowercase<CountryCode>}`,
    flagEmoji: countryFlagEmoji(code),
    flagAriaLabel: `${label} flag`,
  })
);

export const SPORTS_LEAGUES = [
  ['nba', 'NBA', 'basketball', 'multi_country', ['US', 'CA'], ['National Basketball Association']],
  ['wnba', 'WNBA', 'basketball', 'national', ['US'], ["Women's National Basketball Association"]],
  ['nfl', 'NFL', 'american_football', 'national', ['US'], ['National Football League']],
  [
    'ncaaf',
    'NCAA football',
    'american_football',
    'national',
    ['US'],
    ['NCAAF', 'college football'],
  ],
  [
    'ncaab',
    'NCAA basketball',
    'basketball',
    'national',
    ['US'],
    ['NCAAB', 'college basketball', 'CBB'],
  ],
  ['mlb', 'MLB', 'baseball', 'multi_country', ['US', 'CA'], ['Major League Baseball']],
  ['nhl', 'NHL', 'hockey', 'multi_country', ['US', 'CA'], ['National Hockey League']],
  ['mls', 'MLS', 'soccer', 'multi_country', ['US', 'CA'], ['Major League Soccer']],
  ['epl', 'Premier League', 'soccer', 'national', ['GB'], ['EPL', 'English Premier League']],
  [
    'uefa_champions_league',
    'UEFA Champions League',
    'soccer',
    'global',
    [],
    ['UCL', 'Champions League'],
  ],
  ['atp', 'ATP Tour', 'tennis', 'global', [], ['ATP', "men's tennis"]],
  ['wta', 'WTA Tour', 'tennis', 'global', [], ['WTA', "women's tennis"]],
  ['itf', 'ITF World Tennis Tour', 'tennis', 'global', [], ['ITF', 'ITF tennis']],
  ['atp_challenger', 'ATP Challenger Tour', 'tennis', 'global', [], ['Challenger Tour']],
  ['wta_125', 'WTA 125', 'tennis', 'global', [], ['WTA 125 Series']],
  ['pga_tour', 'PGA Tour', 'golf', 'global', [], ['PGA']],
  ['dp_world_tour', 'DP World Tour', 'golf', 'global', [], ['European Tour']],
  ['ufc', 'UFC', 'mma', 'global', [], ['Ultimate Fighting Championship']],
] as const satisfies ReadonlyArray<
  readonly [
    LeagueKey,
    string,
    SportKey,
    CompetitionScope,
    readonly CountryCode[],
    readonly string[],
  ]
>;

export const LEAGUES: readonly LeagueCatalogEntry[] = SPORTS_LEAGUES.map(
  ([key, label, sport, scope, countries, synonyms]) => ({
    key,
    label,
    sport,
    scope,
    countries,
    conceptId: `league.${key}`,
    synonyms,
  })
);

export const SPORTS_COMPETITIONS = [
  ['itf_m15', 'ITF Men M15', 'tennis', 'itf', 'M15'],
  ['itf_m25', 'ITF Men M25', 'tennis', 'itf', 'M25'],
  ['itf_w15', 'ITF Women W15', 'tennis', 'itf', 'W15'],
  ['itf_w35', 'ITF Women W35', 'tennis', 'itf', 'W35'],
  ['itf_w50', 'ITF Women W50', 'tennis', 'itf', 'W50'],
  ['itf_w75', 'ITF Women W75', 'tennis', 'itf', 'W75'],
  ['itf_w100', 'ITF Women W100', 'tennis', 'itf', 'W100'],
  ['atp_challenger_50', 'ATP Challenger 50', 'tennis', 'atp_challenger', '50'],
  ['atp_challenger_75', 'ATP Challenger 75', 'tennis', 'atp_challenger', '75'],
  ['atp_challenger_100', 'ATP Challenger 100', 'tennis', 'atp_challenger', '100'],
  ['atp_challenger_125', 'ATP Challenger 125', 'tennis', 'atp_challenger', '125'],
  ['atp_challenger_175', 'ATP Challenger 175', 'tennis', 'atp_challenger', '175'],
  ['wta_125', 'WTA 125', 'tennis', 'wta_125', '125'],
] as const satisfies ReadonlyArray<readonly [CompetitionKey, string, SportKey, LeagueKey, string]>;

export const COMPETITIONS: readonly CompetitionCatalogEntry[] = SPORTS_COMPETITIONS.map(
  ([key, label, sport, league, tier]) => ({
    key,
    label,
    sport,
    league,
    tier,
    conceptId: `competition.${key}`,
  })
);

const sportByKey = new Map(SPORTS.map(row => [row.key, row]));
const countryByCode = new Map(SPORTS_COUNTRIES.map(row => [row.code, row]));
const leagueByKey = new Map(LEAGUES.map(row => [row.key, row]));
const competitionByKey = new Map(COMPETITIONS.map(row => [row.key, row]));

export function countryForCode(code: CountryCode): CountryCatalogEntry {
  const country = countryByCode.get(code);
  if (!country) throw new Error(`Unknown sports country code: ${code}`);
  return country;
}

export function leagueForKey(key: LeagueKey): LeagueCatalogEntry {
  const league = leagueByKey.get(key);
  if (!league) throw new Error(`Unknown sports league key: ${key}`);
  return league;
}

export function competitionForKey(key: CompetitionKey): CompetitionCatalogEntry {
  const competition = competitionByKey.get(key);
  if (!competition) throw new Error(`Unknown sports competition key: ${key}`);
  return competition;
}

export type CompetitionContextInput = {
  sport?: SportKey;
  league?: LeagueKey;
  competition?: CompetitionKey;
  hostCountry?: CountryCode;
};

export type CompetitionContext = {
  sport: SportCatalogEntry | null;
  league: LeagueCatalogEntry | null;
  competition: CompetitionCatalogEntry | null;
  hostCountry: CountryCatalogEntry | null;
  flagEmoji: string;
  flagAriaLabel: string;
  issues: readonly string[];
};

/**
 * Resolve the most specific context and report inconsistent caller-provided
 * dimensions instead of silently changing them.
 */
export function resolveCompetitionContext(input: CompetitionContextInput): CompetitionContext {
  const competition = input.competition ? competitionForKey(input.competition) : null;
  const leagueKey = input.league ?? competition?.league;
  const league = leagueKey ? leagueForKey(leagueKey) : null;
  const sportKey = input.sport ?? competition?.sport ?? league?.sport;
  const sport = sportKey ? (sportByKey.get(sportKey) ?? null) : null;
  const hostCountry = input.hostCountry ? countryForCode(input.hostCountry) : null;
  const issues: string[] = [];

  if (competition && input.league && competition.league !== input.league) {
    issues.push(`Competition ${competition.key} belongs to league ${competition.league}.`);
  }
  if (competition && input.sport && competition.sport !== input.sport) {
    issues.push(`Competition ${competition.key} belongs to sport ${competition.sport}.`);
  }
  if (league && input.sport && league.sport !== input.sport) {
    issues.push(`League ${league.key} belongs to sport ${league.sport}.`);
  }

  return {
    sport,
    league,
    competition,
    hostCountry,
    flagEmoji: hostCountry?.flagEmoji ?? '🌐',
    flagAriaLabel: hostCountry?.flagAriaLabel ?? 'Global competition',
    issues,
  };
}

export type SportsTaxonomyGlossaryConcept = {
  id: string; // brand-ok — governed glossary concept key
  label: string;
  description: string;
  category: 'tournament';
  kind: 'region' | 'country' | 'league' | 'competition';
  synonyms: readonly string[];
  values: readonly string[] | null;
  seeAlso: readonly string[];
  status: 'active';
  source: 'lib/operations/sports-competition-catalog.ts';
  semanticType: 'classification';
  uiRole: 'chip' | 'badge';
  parentId: string | null; // brand-ok — glossary concept relation
  scope: CompetitionScope | null;
  countryCodes: readonly CountryCode[];
  region: SportsRegionKey | null;
  flagEmoji: string | null;
  flagAriaLabel: string | null;
};

export function sportsTaxonomyGlossaryConcepts(): SportsTaxonomyGlossaryConcept[] {
  const source = 'lib/operations/sports-competition-catalog.ts' as const;
  const roots: SportsTaxonomyGlossaryConcept[] = [
    {
      id: 'region',
      label: 'Sports region',
      description:
        'Geographic grouping used for discovery and reporting; not a regulatory jurisdiction.',
      category: 'tournament',
      kind: 'region',
      synonyms: ['geographic region', 'sports geography'],
      values: [...REGION_KEYS],
      seeAlso: ['country', 'competition'],
      status: 'active',
      source,
      semanticType: 'classification',
      uiRole: 'chip',
      parentId: null,
      scope: null,
      countryCodes: [],
      region: null,
      flagEmoji: '🌐',
      flagAriaLabel: 'Global sports regions',
    },
    {
      id: 'country',
      label: 'Event host country',
      description:
        'ISO alpha-2 country for the venue hosting an event; this field owns the event flag.',
      category: 'tournament',
      kind: 'country',
      synonyms: ['host country', 'event country', 'country code'],
      values: [...COUNTRY_CODES],
      seeAlso: ['region', 'competition', 'event'],
      status: 'active',
      source,
      semanticType: 'classification',
      uiRole: 'badge',
      parentId: 'region',
      scope: null,
      countryCodes: [],
      region: null,
      flagEmoji: '🌐',
      flagAriaLabel: 'Event host country',
    },
    {
      id: 'competition.tier',
      label: 'Competition tier',
      description: 'Named level within a league or tour, such as ITF M15 or ATP Challenger 75.',
      category: 'tournament',
      kind: 'competition',
      synonyms: ['tour level', 'tournament tier', 'competition level'],
      values: [...COMPETITION_KEYS],
      seeAlso: ['competition', 'country', 'event'],
      status: 'active',
      source,
      semanticType: 'classification',
      uiRole: 'chip',
      parentId: 'competition',
      scope: null,
      countryCodes: [],
      region: null,
      flagEmoji: null,
      flagAriaLabel: null,
    },
  ];

  const regions: SportsTaxonomyGlossaryConcept[] = REGION_KEYS.map(region => ({
    id: `region.${region}`,
    label: REGION_LABELS[region],
    description: `${REGION_LABELS[region]} reporting group for sports events and host countries.`,
    category: 'tournament',
    kind: 'region',
    synonyms: [region],
    values: SPORTS_COUNTRIES.filter(country => country.region === region).map(
      country => country.code
    ),
    seeAlso: ['region', 'country'],
    status: 'active',
    source,
    semanticType: 'classification',
    uiRole: 'chip',
    parentId: 'region',
    scope: null,
    countryCodes: SPORTS_COUNTRIES.filter(country => country.region === region).map(
      country => country.code
    ),
    region,
    flagEmoji: '🌐',
    flagAriaLabel: `${REGION_LABELS[region]} region`,
  }));

  const countries: SportsTaxonomyGlossaryConcept[] = SPORTS_COUNTRIES.map(country => ({
    id: country.conceptId,
    label: country.label,
    description: `${country.label} as an event-host geography and flag-bearing sports dimension.`,
    category: 'tournament',
    kind: 'country',
    synonyms: [country.code, country.label],
    values: null,
    seeAlso: ['country', `region.${country.region}`],
    status: 'active',
    source,
    semanticType: 'classification',
    uiRole: 'badge',
    parentId: `region.${country.region}`,
    scope: 'national',
    countryCodes: [country.code],
    region: country.region,
    flagEmoji: country.flagEmoji,
    flagAriaLabel: country.flagAriaLabel,
  }));

  const leagues: SportsTaxonomyGlossaryConcept[] = LEAGUES.map(league => ({
    id: league.conceptId,
    label: league.label,
    description: `${league.label} league or tour under ${SPORT_LABELS[league.sport]}; ${league.scope.replace('_', '-')} operating scope.`,
    category: 'tournament',
    kind: 'league',
    synonyms: [...league.synonyms, league.key],
    values: null,
    seeAlso: ['competition', `sport.${league.sport}`, 'country'],
    status: 'active',
    source,
    semanticType: 'classification',
    uiRole: 'chip',
    parentId: `sport.${league.sport}`,
    scope: league.scope,
    countryCodes: [...league.countries],
    region: null,
    flagEmoji: league.scope === 'global' ? '🌐' : league.countries.map(countryFlagEmoji).join(' '),
    flagAriaLabel:
      league.scope === 'global'
        ? 'Global competition'
        : league.countries.map(code => countryForCode(code).label).join(' and '),
  }));

  const competitions: SportsTaxonomyGlossaryConcept[] = COMPETITIONS.map(competition => ({
    id: competition.conceptId,
    label: competition.label,
    description: `${competition.label} tier within ${leagueForKey(competition.league).label}. Event host country supplies the flag.`,
    category: 'tournament',
    kind: 'competition',
    synonyms: [competition.key, competition.tier],
    values: null,
    seeAlso: [
      'competition.tier',
      `league.${competition.league}`,
      `sport.${competition.sport}`,
      'country',
    ],
    status: 'active',
    source,
    semanticType: 'classification',
    uiRole: 'chip',
    parentId: `league.${competition.league}`,
    scope: 'global',
    countryCodes: [],
    region: null,
    flagEmoji: '🌐',
    flagAriaLabel: 'Global tour; event country supplies the flag',
  }));

  return [...roots, ...regions, ...countries, ...leagues, ...competitions];
}

export function validateSportsTaxonomy(): void {
  const unique = <T>(values: readonly T[], label: string): void => {
    if (new Set(values).size !== values.length)
      throw new Error(`Duplicate ${label} in sports taxonomy.`);
  };
  unique(
    SPORTS.map(row => row.key),
    'sport key'
  );
  unique(
    SPORTS_COUNTRIES.map(row => row.code),
    'country code'
  );
  unique(
    LEAGUES.map(row => row.key),
    'league key'
  );
  unique(
    COMPETITIONS.map(row => row.key),
    'competition key'
  );
  unique(
    sportsTaxonomyGlossaryConcepts().map(row => row.id),
    'glossary concept id'
  );

  for (const league of LEAGUES) {
    if (!sportByKey.has(league.sport)) throw new Error(`Unknown sport on league ${league.key}.`);
    if (league.scope === 'global' && league.countries.length) {
      throw new Error(`Global league ${league.key} cannot own a fixed country list.`);
    }
    if (league.scope !== 'global' && !league.countries.length) {
      throw new Error(`Scoped league ${league.key} must own at least one country.`);
    }
    for (const code of league.countries) countryForCode(code);
  }
  for (const competition of COMPETITIONS) {
    const league = leagueForKey(competition.league);
    if (league.sport !== competition.sport) {
      throw new Error(`Competition ${competition.key} sport does not match its league.`);
    }
  }
}

export function buildSportsTaxonomyArtifact(generatedAt = new Date().toISOString()) {
  validateSportsTaxonomy();
  return {
    schemaVersion: SPORTS_TAXONOMY_SCHEMA_VERSION,
    kind: SPORTS_TAXONOMY_KIND,
    path: SPORTS_TAXONOMY_PATH,
    generatedAt,
    sources: {
      authority: 'lib/operations/sports-competition-catalog.ts',
      glossary: '/portal/glossary/',
      scrapeWire: 'lib/operations/scrapers/scrape-wire-taxonomy.ts',
    },
    semantics: {
      hierarchy: ['sport', 'league', 'competition', 'event_host_country'],
      flagOwner: 'event_host_country',
      globalMarker: '🌐',
      scrapeWireKeys: ['scrape.sport', 'scrape.market', 'scrape.jurisdiction'],
    },
    summary: {
      sports: SPORTS.length,
      regions: REGION_KEYS.length,
      countries: SPORTS_COUNTRIES.length,
      leagues: LEAGUES.length,
      competitions: COMPETITIONS.length,
      glossaryConcepts: sportsTaxonomyGlossaryConcepts().length,
    },
    sports: SPORTS,
    regions: REGION_KEYS.map(key => ({ key, label: REGION_LABELS[key] })),
    countries: SPORTS_COUNTRIES,
    leagues: LEAGUES.map(league => ({
      ...league,
      flagEmoji:
        league.scope === 'global' ? '🌐' : league.countries.map(countryFlagEmoji).join(' '),
    })),
    competitions: COMPETITIONS,
    glossaryConcepts: sportsTaxonomyGlossaryConcepts(),
    scrapeWire: {
      path: '/registry/scrape-wire-taxonomy.json',
      authority: 'lib/operations/scrapers/scrape-wire-taxonomy.ts',
      keys: ['scrape.sport', 'scrape.market', 'scrape.jurisdiction'],
      sports: SPORT_KEYS.length,
      states: 51,
    },
  } as const;
}
