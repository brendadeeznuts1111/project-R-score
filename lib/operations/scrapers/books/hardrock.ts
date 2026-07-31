// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortController
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Hard Rock Tier 4 scrape agent (fixture-first; optional live JSON).
 *
 * @see https://bun.com/docs/api/fetch — fetch
 * @see docs/harness/tenants/partner-limits.md
 */

import { expandScrapedLimitSeeds } from '../../baseline-scraped-limits.ts';
import { asSportsbookId, asStateCode } from '../domain.ts';
import { parseGenericLimitsPayload } from '../scraper-targets.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';

export const HARDROCK_AGENT_ID = 'hardrock-agent' as const;
export const HARDROCK_SPORTSBOOK = asSportsbookId('hardrock');
/** Best-effort public limits shape (often unavailable — fixture fallback). */
export const HARDROCK_LIVE_URL = 'https://www.hardrock.bet/api/v1/limits?state=NJ';

export type HardRockAgentResult = {
  ok: boolean;
  mode: LimitObservation['mode'];
  observations: LimitObservation[];
  error: string | null;
};

function fixtureObservations(observedAt: string): LimitObservation[] {
  return expandScrapedLimitSeeds()
    .filter(seed => seed.sportsbook === HARDROCK_SPORTSBOOK)
    .map(seed => ({
      sportsbook: HARDROCK_SPORTSBOOK,
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
      agent: HARDROCK_AGENT_ID,
      mode: 'fixture' as const,
    }));
}

function parsePayloadToObservations(
  data: unknown,
  observedAt: string,
  mode: LimitObservation['mode']
): LimitObservation[] {
  const parsed = parseGenericLimitsPayload(data, HARDROCK_SPORTSBOOK, asStateCode('NJ'));
  return parsed.map(row => ({
    sportsbook: HARDROCK_SPORTSBOOK,
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
    agent: HARDROCK_AGENT_ID,
    mode,
  }));
}

export function scrapeHardRockHtmlStub(): HardRockAgentResult {
  return {
    ok: false,
    mode: 'html_stub',
    observations: [],
    error: 'Hard Rock HTML scrape not implemented (fails closed)',
  };
}

async function fetchLiveJson(timeoutMs: number): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(HARDROCK_LIVE_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FactoryWager-baseline-scrape/1.0',
      },
    });
    if (!response.ok) {
      console.warn(`[hardrock-agent] live HTTP ${response.status}`);
      return null;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      console.warn(`[hardrock-agent] live non-JSON content-type=${contentType}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[hardrock-agent] live error: ${message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type RunHardRockAgentOptions = {
  live?: boolean;
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
};

export async function runHardRockAgent(
  options: RunHardRockAgentOptions = {}
): Promise<HardRockAgentResult> {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const live =
    options.live === true ||
    Bun.env.BASELINE_SCRAPE_LIVE === '1' ||
    Bun.env.BASELINE_SCRAPE_LIVE === 'true';

  if (options.html) return scrapeHardRockHtmlStub();

  if (live) {
    const data = await fetchLiveJson(options.timeoutMs ?? 10_000);
    if (data != null) {
      const observations = parsePayloadToObservations(data, observedAt, 'live');
      if (observations.length > 0) {
        return { ok: true, mode: 'live', observations, error: null };
      }
    }
    return {
      ok: true,
      mode: 'fixture',
      observations: fixtureObservations(observedAt),
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
export async function scrape(options: RunHardRockAgentOptions = {}): Promise<LimitObservation[]> {
  const result = await runHardRockAgent(options);
  if (!result.ok) throw new Error(result.error ?? 'hardrock scrape failed');
  return result.observations;
}
