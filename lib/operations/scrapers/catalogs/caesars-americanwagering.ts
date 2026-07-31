/**
 * Caesars / American Wagering scrape endpoint catalog.
 *
 * Derived from a browser network capture of sportsbook.caesars.com (CO, 2026-07-31).
 * Templates use `{location}` (lowercase state/region code) and `{brand}` (default `czr`).
 *
 * Opening max-wager dollars are not on public config JSON. The primary limit
 * candidate (`sb/bets/configuration`) sits behind CloudFront/AWS WAF — plain
 * fetch returns 403 HTML without a browser session / WAF token.
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/operations/scrapers/books/caesars.ts
 */

export type CaesarsEndpointRole =
  | 'limit_candidate'
  | 'feature_flags'
  | 'region_config'
  | 'odds_board'
  | 'cms'
  | 'telemetry'
  | 'geocomply'
  | 'consent'
  | 'waf'
  | 'noise';

export type CaesarsEndpointGate = 'public' | 'waf' | 'session' | 'unknown';

export type CaesarsEndpointEntry = {
  id: string; // brand-ok — opaque catalog endpoint key (not a domain *Id)
  role: CaesarsEndpointRole;
  /** Absolute URL template; `{location}` / `{brand}` substituted at resolve time. */
  template: string;
  method: 'GET';
  gate: CaesarsEndpointGate;
  /** Observed in the 2026-07-31 CO capture. */
  observedInCapture: boolean;
  notes: string;
};

export const CAESARS_BRAND = 'czr' as const;
export const CAESARS_AW_HOST = 'https://api.americanwagering.com' as const;
export const CAESARS_SB_HOST = 'https://sportsbook.caesars.com' as const;

/** Default scrape jurisdiction for Tier 4 agents (capture was CO; agents use NJ). */
export const CAESARS_DEFAULT_LOCATION = 'nj' as const;

/**
 * Primary live URL for opening-limit attempts.
 * Gate: CloudFront/AWS WAF — expect 403 HTML without browser cookies / aws-waf-token.
 */
export function caesarsBetsConfigurationUrl(
  location: string = CAESARS_DEFAULT_LOCATION,
  brand: string = CAESARS_BRAND
): string {
  const loc = location.trim().toLowerCase();
  return `${CAESARS_AW_HOST}/regions/us/locations/${loc}/brands/${brand}/sb/bets/configuration`;
}

export function resolveCaesarsEndpointTemplate(
  template: string,
  opts?: { location?: string; brand?: string }
): string {
  const location = (opts?.location ?? CAESARS_DEFAULT_LOCATION).trim().toLowerCase();
  const brand = (opts?.brand ?? CAESARS_BRAND).trim().toLowerCase();
  return template.replaceAll('{location}', location).replaceAll('{brand}', brand);
}

/** Browser-like headers that unlock public AW JSON (features/splash/config). */
export const CAESARS_BROWSER_HEADERS: Readonly<Record<string, string>> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  Origin: 'https://sportsbook.caesars.com',
  Referer: 'https://sportsbook.caesars.com/',
};

/**
 * Curated catalog — signal first, then board, then documented noise classes.
 * Noise hosts from the capture are collapsed to one row per class (not every ping).
 */
export const CAESARS_ENDPOINT_CATALOG: readonly CaesarsEndpointEntry[] = [
  {
    id: 'sb-bets-configuration',
    role: 'limit_candidate',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/bets/configuration`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes:
      'Best opening-limit candidate. CloudFront 403 without WAF/session. Set CAESARS_SCRAPE_COOKIE and/or CAESARS_WAF_TOKEN to attempt live.',
  },
  {
    id: 'sb-features',
    role: 'feature_flags',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/features`,
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes:
      'ff_* flags only (gaming-limits UX toggles). No dollar ceilings. Public with browser Origin.',
  },
  {
    id: 'sb-splash',
    role: 'region_config',
    template: `${CAESARS_AW_HOST}/configs/sportsbook/{location}/splash`,
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes: 'Splash enablement only.',
  },
  {
    id: 'sb-region-json',
    role: 'region_config',
    template: `${CAESARS_SB_HOST}/us/config/{brand}/{location}.json`,
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes: 'UI config (API_PREFIX, sockets, INPUT_TYPE_FOR_GAMING_LIMITS_FORM). No max wager USD.',
  },
  {
    id: 'sb-app-configs',
    role: 'region_config',
    template: `${CAESARS_SB_HOST}/us/config/appConfigs.json`,
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes: 'americanwagering_regions + gaming_limits_monthly_reminder_regions.',
  },
  {
    id: 'sb-available-regions',
    role: 'region_config',
    template: `${CAESARS_SB_HOST}/us/config/{brand}/availableRegions.json`,
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes: 'desktop/ios/android region allowlists for jurisdiction fan-out.',
  },
  {
    id: 'sb-v4-home',
    role: 'odds_board',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/v4/home`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Home board payload — WAF gated.',
  },
  {
    id: 'sb-v3-sports-menu',
    role: 'odds_board',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/v3/sports-menu`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Sports taxonomy menu — WAF gated.',
  },
  {
    id: 'sb-v4-navigation-items',
    role: 'odds_board',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/v4/navigation-items`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Nav items — WAF gated; polled while idle in capture.',
  },
  {
    id: 'sb-v4-quick-picks',
    role: 'odds_board',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/v4/sports/{sport}/competitions/{competitionId}/quick-picks`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Competition quick-picks (odds). Not opening limits.',
  },
  {
    id: 'sb-v4-tabs',
    role: 'odds_board',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/v4/sports/{sport}/competitions/{competitionId}/tabs`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Competition tabs — odds board.',
  },
  {
    id: 'sb-v3-team-metadata',
    role: 'odds_board',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/sb/v3/teamMetadata`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Team metadata.',
  },
  {
    id: 'sb-teams-assets',
    role: 'odds_board',
    template: `${CAESARS_AW_HOST}/caesars-ui-assets/json/teams.json`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Team asset map — often WAF-gated outside browser session.',
  },
  {
    id: 'growth-banners',
    role: 'cms',
    template: `${CAESARS_AW_HOST}/regions/us/locations/{location}/brands/{brand}/gw/growth/v4/sports/{sport}/banners`,
    method: 'GET',
    gate: 'waf',
    observedInCapture: true,
    notes: 'Promo banners.',
  },
  {
    id: 'contentstack-status',
    role: 'cms',
    template:
      'https://cdn.contentstack.io/v3/content_types/app_status_messaging/entries/bltb82d7078fae2addf?environment=website',
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes: 'CMS status messaging — ignore for limits.',
  },
  {
    id: 'aws-waf-telemetry',
    role: 'waf',
    template: 'https://b470c5d1aeb4.edge.sdk.awswaf.com/b470c5d1aeb4/telemetry',
    method: 'GET',
    gate: 'session',
    observedInCapture: true,
    notes: 'AWS WAF browser SDK — explains 403 on sb/* board + bets/configuration.',
  },
  {
    id: 'geocomply-myip',
    role: 'geocomply',
    template: 'https://myip.geocomply.com/',
    method: 'GET',
    gate: 'session',
    observedInCapture: true,
    notes: 'GeoComply IP check — not limits.',
  },
  {
    id: 'geocomply-wss-class',
    role: 'geocomply',
    template: 'wss://wss.plc-gc.com:{port}/check',
    method: 'GET',
    gate: 'session',
    observedInCapture: true,
    notes: 'GeoComply WebSocket health pings (ports 9703–9705 in capture).',
  },
  {
    id: 'onetrust-consent',
    role: 'consent',
    template: 'https://cdn.cookielaw.org/consent/{consentId}/{consentId}.json',
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes: 'OneTrust consent — noise.',
  },
  {
    id: 'fullstory-class',
    role: 'telemetry',
    template: 'https://rs.fullstory.com/rec/*',
    method: 'GET',
    gate: 'session',
    observedInCapture: true,
    notes: 'FullStory session replay — drop.',
  },
  {
    id: 'ga-newrelic-bing-class',
    role: 'noise',
    template: 'https://{analytics.host}/*',
    method: 'GET',
    gate: 'public',
    observedInCapture: true,
    notes: 'GA / New Relic / Bing conversions — drop.',
  },
  {
    id: 'adobe-target',
    role: 'noise',
    template: 'https://harrahs.tt.omtrdc.net/rest/v1/delivery',
    method: 'GET',
    gate: 'session',
    observedInCapture: true,
    notes: 'Adobe Target — drop.',
  },
] as const;

export function caesarsEndpointsByRole(role: CaesarsEndpointRole): readonly CaesarsEndpointEntry[] {
  return CAESARS_ENDPOINT_CATALOG.filter(entry => entry.role === role);
}

export function caesarsLimitCandidateUrl(location?: string, brand?: string): string {
  return resolveCaesarsEndpointTemplate(caesarsEndpointsByRole('limit_candidate')[0]!.template, {
    location,
    brand,
  });
}

export type CaesarsCatalogSummary = {
  total: number;
  byRole: Record<CaesarsEndpointRole, number>;
  limitCandidates: string[];
  publicTemplates: string[];
  wafTemplates: string[];
};

export function summarizeCaesarsEndpointCatalog(): CaesarsCatalogSummary {
  const byRole = {} as Record<CaesarsEndpointRole, number>;
  for (const entry of CAESARS_ENDPOINT_CATALOG) {
    byRole[entry.role] = (byRole[entry.role] ?? 0) + 1;
  }
  return {
    total: CAESARS_ENDPOINT_CATALOG.length,
    byRole,
    limitCandidates: caesarsEndpointsByRole('limit_candidate').map(e => e.template),
    publicTemplates: CAESARS_ENDPOINT_CATALOG.filter(e => e.gate === 'public').map(e => e.template),
    wafTemplates: CAESARS_ENDPOINT_CATALOG.filter(e => e.gate === 'waf').map(e => e.template),
  };
}
