/**
 * Wire-boundary parse for Tier 4 limit scrape observations.
 *
 * @see docs/WIRE_BOUNDARY.md
 * @see docs/harness/tenants/partner-limits.md
 */

import { asStateCode, type StateCode } from '../../types/branded.ts';
import type { OpeningBetStructure, OpeningMarketPhase } from '../baseline-scraped-limits.ts';
import { normalizeScrapePhase } from './scrape-wire-taxonomy.ts';

export type LimitObservation = {
  sportsbook: string; // brand-ok — sportsbook slug
  sport: string;
  market: string;
  jurisdiction: StateCode;
  structure: OpeningBetStructure;
  phase: OpeningMarketPhase;
  openingMaxUsd: number | null;
  openingMinUsd: number | null;
  dailyLimitUsd: number | null;
  weeklyLimitUsd: number | null;
  vipLimitUsd: number | null;
  league: string | null;
  eventType: string | null;
  referenceUrl: string | null;
  sourceRef: string;
  observedAt: string;
  agent: string;
  mode: 'fixture' | 'live' | 'html_stub';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseOptionalNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseStructure(value: unknown): OpeningBetStructure {
  return value === 'parlay' ? 'parlay' : 'straight';
}

function parsePhase(value: unknown): OpeningMarketPhase {
  if (typeof value !== 'string') return 'pregame';
  return normalizeScrapePhase(value);
}

function parseMode(value: unknown): LimitObservation['mode'] {
  if (value === 'live' || value === 'html_stub' || value === 'fixture') return value;
  return 'fixture';
}

/** Parse one JSONL / API observation at the wire boundary. */
export function parseLimitObservationFromUnknown(value: unknown): LimitObservation {
  if (!isRecord(value)) throw new Error('LimitObservation: expected object');
  const sportsbook = parseOptionalNonEmptyString(value.sportsbook);
  const sport = parseOptionalNonEmptyString(value.sport);
  const market = parseOptionalNonEmptyString(value.market);
  const jurisdictionRaw = parseOptionalNonEmptyString(value.jurisdiction);
  const sourceRef = parseOptionalNonEmptyString(value.sourceRef);
  const observedAt = parseOptionalNonEmptyString(value.observedAt);
  const agent = parseOptionalNonEmptyString(value.agent);
  if (!sportsbook || !sport || !market || !jurisdictionRaw || !sourceRef || !observedAt || !agent) {
    throw new Error(
      'LimitObservation: missing sportsbook|sport|market|jurisdiction|sourceRef|observedAt|agent'
    );
  }
  return {
    sportsbook,
    sport,
    market,
    jurisdiction: asStateCode(jurisdictionRaw),
    structure: parseStructure(value.structure ?? value.betType),
    phase: parsePhase(value.phase),
    openingMaxUsd: parseFiniteNumber(value.openingMaxUsd ?? value.maxBet),
    openingMinUsd: parseFiniteNumber(value.openingMinUsd ?? value.minBet),
    dailyLimitUsd: parseFiniteNumber(value.dailyLimitUsd ?? value.dailyLimit),
    weeklyLimitUsd: parseFiniteNumber(value.weeklyLimitUsd ?? value.weeklyLimit),
    vipLimitUsd: parseFiniteNumber(value.vipLimitUsd ?? value.vipLimit),
    league: parseOptionalNonEmptyString(value.league),
    eventType: parseOptionalNonEmptyString(value.eventType),
    referenceUrl: parseOptionalNonEmptyString(value.referenceUrl ?? value.sourceUrl),
    sourceRef,
    observedAt,
    agent,
    mode: parseMode(value.mode),
  };
}

export function isLimitObservation(value: unknown): value is LimitObservation {
  try {
    parseLimitObservationFromUnknown(value);
    return true;
  } catch {
    return false;
  }
}

export function observationCellKey(obs: LimitObservation): string {
  return [obs.sportsbook, obs.sport, obs.market, obs.jurisdiction, obs.structure, obs.phase].join(
    '|'
  );
}
