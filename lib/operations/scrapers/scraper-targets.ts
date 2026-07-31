/**
 * Public scrape targets for Tier 4 estimated baselines.
 *
 * Live URLs are best-effort / often unavailable. Default bake uses offline
 * fixtures from `lib/operations/baseline-scraped-limits.ts`. Set
 * BASELINE_SCRAPE_LIVE=1 to attempt network fetch.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import { asSportsbookId, asStateCode, type SportsbookId, type StateCode } from './domain.ts';

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
    const sport = parseStringOrFallback(item.sport, '');
    const market = parseStringOrFallback(item.market, '');
    if (!sport || !market) continue;
    const structureRaw = parseStringOrFallback(item.structure ?? item.betType, 'straight');
    const phaseRaw = parseStringOrFallback(item.phase, 'pregame');
    const structure = structureRaw === 'parlay' ? 'parlay' : 'straight';
    const phase = phaseRaw === 'live' ? 'live' : 'pregame';
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
      league: typeof item.league === 'string' ? item.league : null,
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

const NJ = asStateCode('NJ');

function target(sportsbook: SportsbookId, url: string): ScrapeTarget {
  return {
    sportsbook,
    jurisdiction: NJ,
    url,
    fixtureKey: `${sportsbook}-nj`,
    parser: data => parseGenericLimitsPayload(data, sportsbook, NJ),
  };
}

export const DEFAULT_SCRAPE_TARGETS: readonly ScrapeTarget[] = [
  target(asSportsbookId('draftkings'), 'https://api.draftkings.com/odds/v1/limits?state=NJ'),
  target(asSportsbookId('fanduel'), 'https://api.fanduel.com/odds/v1/limits?state=NJ'),
  target(asSportsbookId('betmgm'), 'https://api.betmgm.com/odds/v1/limits?state=NJ'),
  target(
    asSportsbookId('caesars'),
    'https://api.americanwagering.com/regions/us/locations/nj/brands/czr/sb/bets/configuration'
  ),
  target(asSportsbookId('espnbet'), 'https://sportsbook.espn.com/apis/v1/limits?state=NJ'),
  target(asSportsbookId('bet365'), 'https://www.bet365.com/api/limits?state=NJ'),
  target(asSportsbookId('hardrock'), 'https://www.hardrock.bet/api/v1/limits?state=NJ'),
  target(asSportsbookId('fanatics'), 'https://sportsbook.fanatics.com/api/v1/limits?state=NJ'),
  target(asSportsbookId('betrivers'), 'https://nj.betrivers.com/api/v1/limits?state=NJ'),
  target(asSportsbookId('circa'), 'https://www.circasports.com/api/v1/limits?state=NJ'),
] as const;
