// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortSignal.timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * FanDuel Tier 4 scrape agent (same loop as DraftKings).
 *
 * Default: offline fixture. Optional live JSON when BASELINE_SCRAPE_LIVE=1.
 * HTML scrape stub fails closed.
 *
 * @see https://bun.com/docs/api/fetch — fetch
 * @see docs/harness/tenants/partner-limits.md
 */

import { expandScrapedLimitSeeds } from '../../baseline-scraped-limits.ts';
import { asSportsbookId, asStateCode } from '../domain.ts';
import { parseGenericLimitsPayload } from '../scraper-targets.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';

export const FANDUEL_AGENT_ID = 'fanduel-agent' as const;
export const FANDUEL_SPORTSBOOK = asSportsbookId('fanduel');
export const FANDUEL_LIVE_URL = 'https://api.fanduel.com/odds/v1/limits?state=NJ';

export type FanDuelAgentResult = {
  ok: boolean;
  mode: LimitObservation['mode'];
  observations: LimitObservation[];
  error: string | null;
};

function fixtureObservations(observedAt: string): LimitObservation[] {
  return expandScrapedLimitSeeds()
    .filter(seed => seed.sportsbook === FANDUEL_SPORTSBOOK)
    .map(seed => ({
      sportsbook: FANDUEL_SPORTSBOOK,
      sport: seed.sport,
      market: seed.market,
      jurisdiction: seed.jurisdiction,
      structure: seed.structure,
      phase: seed.phase,
      openingMaxUsd: seed.openingMaxUsd,
      openingMinUsd: seed.openingMinUsd ?? null,
      dailyLimitUsd: seed.dailyLimitUsd ?? null,
      weeklyLimitUsd: seed.weeklyLimitUsd ?? null,
      vipLimitUsd: seed.vipLimitUsd ?? null,
      league: seed.league ?? null,
      eventType: seed.eventType ?? null,
      referenceUrl: seed.referenceUrl ?? null,
      sourceRef: seed.sourceRef,
      observedAt,
      agent: FANDUEL_AGENT_ID,
      mode: 'fixture' as const,
    }));
}

function parsePayloadToObservations(
  data: unknown,
  observedAt: string,
  mode: LimitObservation['mode']
): LimitObservation[] {
  const parsed = parseGenericLimitsPayload(data, FANDUEL_SPORTSBOOK, asStateCode('NJ'));
  return parsed.map(row => ({
    sportsbook: FANDUEL_SPORTSBOOK,
    sport: row.sport,
    market: row.market,
    jurisdiction: asStateCode('NJ'),
    structure: row.structure,
    phase: row.phase,
    openingMaxUsd: row.openingMaxUsd,
    openingMinUsd: row.openingMinUsd ?? null,
    dailyLimitUsd: row.dailyLimitUsd ?? null,
    weeklyLimitUsd: row.weeklyLimitUsd ?? null,
    vipLimitUsd: row.vipLimitUsd ?? null,
    league: row.league ?? null,
    eventType: row.eventType ?? null,
    referenceUrl: row.referenceUrl ?? null,
    sourceRef: row.sourceRef,
    observedAt,
    agent: FANDUEL_AGENT_ID,
    mode,
  }));
}

export function scrapeFanDuelHtmlStub(): FanDuelAgentResult {
  return {
    ok: false,
    mode: 'html_stub',
    observations: [],
    error: 'FanDuel HTML scrape not implemented (fails closed)',
  };
}

async function fetchLiveJson(timeoutMs: number): Promise<unknown | null> {
  try {
    const response = await fetch(FANDUEL_LIVE_URL, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      console.warn(`[fanduel-agent] live HTTP ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[fanduel-agent] live error: ${message}`);
    return null;
  }
}

export type RunFanDuelAgentOptions = {
  live?: boolean;
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
};

export async function runFanDuelAgent(
  options: RunFanDuelAgentOptions = {}
): Promise<FanDuelAgentResult> {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const live =
    options.live === true ||
    Bun.env.BASELINE_SCRAPE_LIVE === '1' ||
    Bun.env.BASELINE_SCRAPE_LIVE === 'true';

  if (options.html) {
    return scrapeFanDuelHtmlStub();
  }

  if (live) {
    const data = await fetchLiveJson(options.timeoutMs ?? 10_000);
    if (data != null) {
      const observations = parsePayloadToObservations(data, observedAt, 'live');
      if (observations.length > 0) {
        return { ok: true, mode: 'live', observations, error: null };
      }
    }
    const fixture = fixtureObservations(observedAt);
    return {
      ok: true,
      mode: 'fixture',
      observations: fixture,
      error: 'live unavailable; used fixture fallback',
    };
  }

  return {
    ok: true,
    mode: 'fixture',
    observations: fixtureObservations(observedAt),
    error: null,
  };
}

/** Registry contract: scrape() → LimitObservation[]. Throws on fail-closed paths. */
export async function scrape(options: RunFanDuelAgentOptions = {}): Promise<LimitObservation[]> {
  const result = await runFanDuelAgent(options);
  if (!result.ok) throw new Error(result.error ?? 'fanduel scrape failed');
  return result.observations;
}
