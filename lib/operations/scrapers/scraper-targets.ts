/**
 * Public scrape targets for Tier 4 estimated baselines.
 *
 * Live URLs are best-effort / often unavailable. Default bake uses offline
 * fixtures from `lib/operations/baseline-scraped-limits.ts`. Set
 * BASELINE_SCRAPE_LIVE=1 to attempt network fetch.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import { asSportsbookId, type SportsbookId, type StateCode } from './domain.ts';
import {
  resolveBookLeague,
  resolveBookMarket,
  resolveBookPhase,
  resolveBookSport,
} from './book-vendor-aliases.ts';
import {
  normalizeScrapeLeague,
  normalizeScrapeMarket,
  normalizeScrapePhase,
  normalizeScrapeSport,
  SCRAPE_DEFAULT_JURISDICTION,
} from './scrape-wire-taxonomy.ts';
import { getBookScrapeConfig, loadScrapeAgentsConfigSync } from './scrape-agents-config.ts';

export type ScrapeTargetParsedRow = {
  sport: string;
  market: string;
  structure: 'straight' | 'parlay';
  phase: 'pregame' | 'live';
  openingMaxUsd: number | null;
  openingMinUsd?: number | null;
  dailyLimitUsd?: number | null;
  weeklyLimitUsd?: number | null;
  vipLimitUsd?: number | null;
  league?: string | null;
  eventType?: string | null;
  sourceRef: string;
  referenceUrl?: string | null;
};

export type ScrapeTarget = {
  sportsbook: SportsbookId;
  jurisdiction: StateCode;
  /** Live endpoint (optional; may 404). */
  url: string;
  headers?: Record<string, string>;
  /** Fixture key used offline. */
  fixtureKey: string;
  /** Boundary parser — wire `unknown` only. */
  parser: (data: unknown) => ScrapeTargetParsedRow[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseStringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Generic `{ limits: [...] }` public-odds shape. */
export function parseGenericLimitsPayload(
  data: unknown,
  sportsbook: SportsbookId,
  jurisdiction: StateCode
): ScrapeTargetParsedRow[] {
  if (!isRecord(data)) return [];
  const limits = data.limits;
  if (!Array.isArray(limits)) return [];
  const stamp = typeof data.extractedAt === 'string' ? data.extractedAt.slice(0, 10) : 'fixture';
  const rows: ScrapeTargetParsedRow[] = [];
  for (const item of limits) {
    if (!isRecord(item)) continue;
    const sportRaw = parseStringOrFallback(item.sport, '');
    const marketRaw = parseStringOrFallback(item.market, '');
    if (!sportRaw || !marketRaw) continue;
    const sport = resolveBookSport(sportsbook, sportRaw) ?? normalizeScrapeSport(sportRaw);
    const market = resolveBookMarket(sportsbook, marketRaw) ?? normalizeScrapeMarket(marketRaw);
    const structureRaw = parseStringOrFallback(item.structure ?? item.betType, 'straight');
    const phaseRaw = parseStringOrFallback(item.phase, 'pregame');
    const structure = structureRaw === 'parlay' ? 'parlay' : 'straight';
    const phase = resolveBookPhase(sportsbook, phaseRaw) ?? normalizeScrapePhase(phaseRaw);
    const leagueRaw = typeof item.league === 'string' ? item.league : null;
    const league = leagueRaw
      ? (resolveBookLeague(sportsbook, leagueRaw) ?? normalizeScrapeLeague(leagueRaw))
      : null;
    rows.push({
      sport,
      market,
      structure,
      phase,
      openingMaxUsd: parseOptionalNumber(item.openingMaxUsd ?? item.maxBet),
      openingMinUsd: parseOptionalNumber(item.openingMinUsd ?? item.minBet),
      dailyLimitUsd: parseOptionalNumber(item.dailyLimitUsd ?? item.dailyLimit),
      weeklyLimitUsd: parseOptionalNumber(item.weeklyLimitUsd ?? item.weeklyLimit),
      vipLimitUsd: parseOptionalNumber(item.vipLimitUsd ?? item.vipLimit),
      league,
      eventType: typeof item.eventType === 'string' ? item.eventType : null,
      sourceRef: `scrape:${stamp}/${sportsbook}-${jurisdiction.toLowerCase()}-${sport}`,
      referenceUrl:
        typeof item.referenceUrl === 'string'
          ? item.referenceUrl
          : typeof item.sourceUrl === 'string'
            ? item.sourceUrl
            : null,
    });
  }
  return rows;
}

function target(sportsbook: SportsbookId, url: string, jurisdiction?: StateCode): ScrapeTarget {
  const jur = jurisdiction ?? SCRAPE_DEFAULT_JURISDICTION;
  return {
    sportsbook,
    jurisdiction: jur,
    url,
    fixtureKey: `${sportsbook}-${jur.toLowerCase()}`,
    parser: data => parseGenericLimitsPayload(data, sportsbook, jur),
  };
}

/** Fallback URLs when operator `[scrape]` is missing (should not happen for US top-10). */
const FALLBACK_LIVE_URLS: Readonly<Record<string, string>> = {
  draftkings: 'https://api.draftkings.com/odds/v1/limits?state=NJ',
  fanduel: 'https://api.fanduel.com/odds/v1/limits?state=NJ',
  betmgm: 'https://api.betmgm.com/odds/v1/limits?state=NJ',
  caesars:
    'https://api.americanwagering.com/regions/us/locations/nj/brands/czr/sb/bets/configuration',
  espnbet: 'https://sportsbook.espn.com/apis/v1/limits?state=NJ',
  bet365: 'https://www.bet365.com/api/limits?state=NJ',
  hardrock: 'https://www.hardrock.bet/api/v1/limits?state=NJ',
  fanatics: 'https://sportsbook.fanatics.com/api/v1/limits?state=NJ',
  betrivers: 'https://nj.betrivers.com/api/v1/limits?state=NJ',
  circa: 'https://www.circasports.com/api/v1/limits?state=NJ',
};

const FLEET_BOOK_IDS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'espnbet',
  'bet365',
  'hardrock',
  'fanatics',
  'betrivers',
  'circa',
] as const;

function buildDefaultScrapeTargets(): readonly ScrapeTarget[] {
  // Ensure fleet TOML + operators are loaded once.
  loadScrapeAgentsConfigSync();
  return FLEET_BOOK_IDS.map(id => {
    const sportsbook = asSportsbookId(id);
    const cfg = getBookScrapeConfig(id);
    const url = cfg?.liveUrl ?? FALLBACK_LIVE_URLS[id]!;
    return target(sportsbook, url, cfg?.jurisdiction);
  });
}

/** Live JSON targets — URLs from `config/operators/*.toml` `[scrape].live_url`. */
export const DEFAULT_SCRAPE_TARGETS: readonly ScrapeTarget[] = buildDefaultScrapeTargets();
