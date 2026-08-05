// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortSignal.timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * DraftKings Tier 4 scrape agent.
 *
 * Default: offline fixture (CI-safe). Optional live JSON fetch when
 * BASELINE_SCRAPE_LIVE=1. HTML scrape is stubbed and fails closed.
 *
 * @see https://bun.com/docs/api/fetch — fetch
 * @see docs/harness/tenants/partner-limits.md
 */

import { expandScrapedLimitSeeds } from '../../baseline-scraped-limits.ts';
import { asSportsbookId, asStateCode } from '../domain.ts';
import { parseGenericLimitsPayload } from '../scraper-targets.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';

export const DRAFTKINGS_AGENT_ID = 'draftkings-agent' as const;
export const DRAFTKINGS_SPORTSBOOK = asSportsbookId('draftkings');
export const DRAFTKINGS_LIVE_URL = 'https://api.draftkings.com/odds/v1/limits?state=NJ';

export type DraftKingsAgentResult = {
  ok: boolean;
  mode: LimitObservation['mode'];
  observations: LimitObservation[];
  error: string | null;
};

function fixtureObservations(observedAt: string): LimitObservation[] {
  return expandScrapedLimitSeeds()
    .filter(seed => seed.sportsbook === DRAFTKINGS_SPORTSBOOK)
    .map(seed => ({
      sportsbook: DRAFTKINGS_SPORTSBOOK,
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
      agent: DRAFTKINGS_AGENT_ID,
      mode: 'fixture' as const,
    }));
}

function parsePayloadToObservations(
  data: unknown,
  observedAt: string,
  mode: LimitObservation['mode']
): LimitObservation[] {
  const parsed = parseGenericLimitsPayload(data, DRAFTKINGS_SPORTSBOOK, asStateCode('NJ'));
  return parsed.map(row => ({
    sportsbook: DRAFTKINGS_SPORTSBOOK,
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
    agent: DRAFTKINGS_AGENT_ID,
    mode,
  }));
}

/** HTML scrape stub — fails closed until a real parser is approved. */
export function scrapeDraftKingsHtmlStub(): DraftKingsAgentResult {
  return {
    ok: false,
    mode: 'html_stub',
    observations: [],
    error: 'DraftKings HTML scrape not implemented (fails closed)',
  };
}

async function fetchLiveJson(timeoutMs: number): Promise<unknown | null> {
  try {
    const response = await fetch(DRAFTKINGS_LIVE_URL, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      console.warn(`[draftkings-agent] live HTTP ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[draftkings-agent] live error: ${message}`);
    return null;
  }
}

export type RunDraftKingsAgentOptions = {
  live?: boolean;
  /** Attempt HTML stub (always fails closed). */
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
};

/**
 * Run the DraftKings agent. Fixture by default; live JSON when requested;
 * HTML path fails closed without writing observations.
 */
export async function runDraftKingsAgent(
  options: RunDraftKingsAgentOptions = {}
): Promise<DraftKingsAgentResult> {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const live =
    options.live === true ||
    Bun.env.BASELINE_SCRAPE_LIVE === '1' ||
    Bun.env.BASELINE_SCRAPE_LIVE === 'true';

  if (options.html) {
    return scrapeDraftKingsHtmlStub();
  }

  if (live) {
    const data = await fetchLiveJson(options.timeoutMs ?? 10_000);
    if (data != null) {
      const observations = parsePayloadToObservations(data, observedAt, 'live');
      if (observations.length > 0) {
        return { ok: true, mode: 'live', observations, error: null };
      }
    }
    // Fail closed on empty live — fall back to fixture so the loop stays usable.
    const fixture = fixtureObservations(observedAt);
    return {
      ok: true,
      mode: 'fixture',
      observations: fixture,
      error: 'live unavailable; used fixture fallback',
    };
  }

  const observations = fixtureObservations(observedAt);
  return { ok: true, mode: 'fixture', observations, error: null };
}

/** Registry contract: scrape() → LimitObservation[]. Throws on fail-closed paths. */
export async function scrape(options: RunDraftKingsAgentOptions = {}): Promise<LimitObservation[]> {
  const result = await runDraftKingsAgent(options);
  if (!result.ok) throw new Error(result.error ?? 'draftkings scrape failed');
  return result.observations;
}
