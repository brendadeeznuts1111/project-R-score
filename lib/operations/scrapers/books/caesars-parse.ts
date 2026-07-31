/**
 * Wire parsers for Caesars / American Wagering live payloads.
 *
 * @see docs/WIRE_BOUNDARY.md
 * @see lib/operations/scrapers/catalogs/caesars-americanwagering.ts
 * @see lib/operations/scrapers/scrape-wire-taxonomy.ts
 */

import type { StateCode } from '../domain.ts';
import type { ScrapeTargetParsedRow } from '../scraper-targets.ts';
import {
  normalizeScrapeMarket,
  normalizeScrapePhase,
  normalizeScrapeSport,
  SCRAPE_DEFAULT_JURISDICTION,
} from '../scrape-wire-taxonomy.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Keys commonly used for max stake / liability on WH/AW bet config payloads. */
const MAX_KEYS = [
  'openingMaxUsd',
  'maxBet',
  'maxStake',
  'maxWager',
  'maximumStake',
  'maxLiability',
  'liability',
  'limit',
  'stakeLimit',
] as const;

const MIN_KEYS = ['openingMinUsd', 'minBet', 'minStake', 'minWager', 'minimumStake'] as const;

function pickNumber(record: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const n = parseOptionalNumber(record[key]);
    if (n != null) return n;
  }
  return null;
}

function asLimitRow(
  item: Record<string, unknown>,
  jurisdiction: StateCode,
  referenceUrl: string | null
): ScrapeTargetParsedRow | null {
  const openingMaxUsd = pickNumber(item, MAX_KEYS);
  if (openingMaxUsd == null || openingMaxUsd <= 0) return null;

  const sport = normalizeScrapeSport(
    parseString(item.sport) ??
      parseString(item.sportKey) ??
      parseString(item.sportName) ??
      'basketball'
  );
  const market = normalizeScrapeMarket(
    parseString(item.market) ??
      parseString(item.marketKey) ??
      parseString(item.marketType) ??
      'match_winner'
  );
  const structureRaw =
    parseString(item.structure) ??
    parseString(item.betType) ??
    parseString(item.betTypeCode) ??
    'straight';
  const phaseRaw = parseString(item.phase) ?? parseString(item.marketPhase) ?? 'pregame';
  const structure =
    /parlay|multi|sgp|byo/i.test(structureRaw) || structureRaw.toLowerCase() === 'parlay'
      ? 'parlay'
      : 'straight';
  const phase = normalizeScrapePhase(phaseRaw);
  const stamp = new Date().toISOString().slice(0, 10);

  return {
    sport,
    market,
    structure,
    phase,
    openingMaxUsd,
    openingMinUsd: pickNumber(item, MIN_KEYS),
    dailyLimitUsd: pickNumber(item, ['dailyLimitUsd', 'dailyLimit', 'dailyMax']),
    weeklyLimitUsd: pickNumber(item, ['weeklyLimitUsd', 'weeklyLimit', 'weeklyMax']),
    vipLimitUsd: pickNumber(item, ['vipLimitUsd', 'vipLimit']),
    league: parseString(item.league) ?? parseString(item.competitionName),
    eventType: parseString(item.eventType),
    sourceRef: `scrape:live/caesars-${jurisdiction.toLowerCase()}-${sport}-${stamp}`,
    referenceUrl,
  };
}

function parseCollectArrays(root: unknown): unknown[] {
  if (Array.isArray(root)) return root;
  if (!isRecord(root)) return [];
  const out: unknown[] = [];
  const preferred = [
    'limits',
    'configurations',
    'betConfigurations',
    'markets',
    'sports',
    'items',
    'data',
    'results',
  ];
  for (const key of preferred) {
    const v = root[key];
    if (Array.isArray(v)) out.push(...v);
  }
  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      for (const el of value) {
        if (isRecord(el)) {
          for (const nestedKey of ['markets', 'limits', 'configurations', 'betTypes']) {
            const nested = el[nestedKey];
            if (Array.isArray(nested)) {
              out.push(...nested.map(n => (isRecord(n) ? { ...el, ...n } : n)));
            }
          }
        }
      }
    }
  }
  return out;
}

/**
 * Parse bets/configuration (or a synthetic `{ limits: [...] }` fixture) into scrape rows.
 * Returns [] when shape is unrecognized — caller falls back to fixture observations.
 */
export function parseCaesarsBetsConfiguration(
  data: unknown,
  opts?: { jurisdiction?: StateCode; referenceUrl?: string | null }
): ScrapeTargetParsedRow[] {
  const jurisdiction = opts?.jurisdiction ?? SCRAPE_DEFAULT_JURISDICTION;
  const referenceUrl = opts?.referenceUrl ?? null;
  const rows: ScrapeTargetParsedRow[] = [];
  const seen = new Set<string>();

  if (isRecord(data) && pickNumber(data, MAX_KEYS) != null) {
    const row = asLimitRow(data, jurisdiction, referenceUrl);
    if (row) rows.push(row);
  }

  for (const item of parseCollectArrays(data)) {
    if (!isRecord(item)) continue;
    const row = asLimitRow(item, jurisdiction, referenceUrl);
    if (!row) continue;
    const key = `${row.sport}|${row.market}|${row.structure}|${row.phase}|${row.openingMaxUsd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

  return rows;
}

/** Detect CloudFront / AWS WAF HTML challenge bodies. */
export function isCaesarsWafHtmlBody(body: string): boolean {
  const head = body.slice(0, 800).toLowerCase();
  return (
    head.includes('403 error') ||
    head.includes('request blocked') ||
    head.includes('aws-waf') ||
    head.includes('generated by cloudfront') ||
    (head.includes('<!doctype html') && head.includes('the request could not be satisfied'))
  );
}
