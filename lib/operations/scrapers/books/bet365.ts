// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortSignal.timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Bet365 Tier 4 scrape agent (fixture-first).
 *
 * Live path: optional JSON fetch, then optional Playwright HTML when
 * BET365_PLAYWRIGHT=1 and `playwright` is installed. Otherwise fixture fallback.
 * HTML without Playwright fails closed.
 *
 * @see https://bun.com/docs/api/fetch — fetch
 * @see docs/harness/tenants/partner-limits.md
 */

import { expandScrapedLimitSeeds } from '../../baseline-scraped-limits.ts';
import { asSportsbookId, asStateCode } from '../domain.ts';
import { parseGenericLimitsPayload } from '../scraper-targets.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';

export const BET365_AGENT_ID = 'bet365-agent' as const;
export const BET365_SPORTSBOOK = asSportsbookId('bet365');
/** Best-effort public limits shape (often unavailable — fixture fallback). */
export const BET365_LIVE_URL = 'https://www.bet365.com/api/limits?state=NJ';

export type Bet365AgentResult = {
  ok: boolean;
  mode: LimitObservation['mode'];
  observations: LimitObservation[];
  error: string | null;
};

function fixtureObservations(observedAt: string): LimitObservation[] {
  return expandScrapedLimitSeeds()
    .filter(seed => seed.sportsbook === BET365_SPORTSBOOK)
    .map(seed => ({
      sportsbook: BET365_SPORTSBOOK,
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
      agent: BET365_AGENT_ID,
      mode: 'fixture' as const,
    }));
}

function parsePayloadToObservations(
  data: unknown,
  observedAt: string,
  mode: LimitObservation['mode']
): LimitObservation[] {
  const parsed = parseGenericLimitsPayload(data, BET365_SPORTSBOOK, asStateCode('NJ'));
  return parsed.map(row => ({
    sportsbook: BET365_SPORTSBOOK,
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
    agent: BET365_AGENT_ID,
    mode,
  }));
}

export function scrapeBet365HtmlStub(): Bet365AgentResult {
  return {
    ok: false,
    mode: 'html_stub',
    observations: [],
    error: 'Bet365 HTML scrape requires BET365_PLAYWRIGHT=1 + playwright package (fails closed)',
  };
}

/**
 * Optional Playwright path — dynamic import only.
 * Returns null when Playwright unavailable or extraction yields nothing.
 */
export async function tryBet365PlaywrightHtml(timeoutMs: number): Promise<unknown | null> {
  const enabled = Bun.env.BET365_PLAYWRIGHT === '1' || Bun.env.BET365_PLAYWRIGHT === 'true';
  if (!enabled) return null;

  try {
    // Optional peer — dynamic string avoids hard dependency / typecheck on playwright.
    const playwrightMod = 'playwright';
    const playwright = (await import(playwrightMod).catch(() => null)) as {
      chromium?: {
        launch: (opts?: { headless?: boolean }) => Promise<{
          newPage: () => Promise<{
            goto: (
              url: string,
              opts?: { timeout?: number; waitUntil?: string }
            ) => Promise<unknown>;
            content: () => Promise<string>;
            close: () => Promise<void>;
          }>;
          close: () => Promise<void>;
        }>;
      };
    } | null;
    if (!playwright?.chromium) {
      console.warn('[bet365-agent] playwright not installed; skip HTML live path');
      return null;
    }

    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(BET365_LIVE_URL, {
        timeout: timeoutMs,
        waitUntil: 'domcontentloaded',
      });
      const html = await page.content();
      await page.close();
      // Bet365 does not expose a stable public limits JSON in HTML — fail closed to fixture.
      if (!html || html.length < 100) return null;
      console.warn('[bet365-agent] Playwright loaded page but limits JSON not extractable');
      return null;
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[bet365-agent] Playwright error: ${message}`);
    return null;
  }
}

async function fetchLiveJson(timeoutMs: number): Promise<unknown | null> {
  try {
    const response = await fetch(BET365_LIVE_URL, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FactoryWager-baseline-scrape/1.0',
      },
    });
    if (!response.ok) {
      console.warn(`[bet365-agent] live HTTP ${response.status}`);
      return null;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      console.warn(`[bet365-agent] live non-JSON content-type=${contentType}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[bet365-agent] live error: ${message}`);
    return null;
  }
}

export type RunBet365AgentOptions = {
  live?: boolean;
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
};

export async function runBet365Agent(
  options: RunBet365AgentOptions = {}
): Promise<Bet365AgentResult> {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const live =
    options.live === true ||
    Bun.env.BASELINE_SCRAPE_LIVE === '1' ||
    Bun.env.BASELINE_SCRAPE_LIVE === 'true';

  if (options.html) {
    const playwrightOn = Bun.env.BET365_PLAYWRIGHT === '1' || Bun.env.BET365_PLAYWRIGHT === 'true';
    if (!playwrightOn) return scrapeBet365HtmlStub();
    const data = await tryBet365PlaywrightHtml(options.timeoutMs ?? 15_000);
    if (data != null) {
      const observations = parsePayloadToObservations(data, observedAt, 'live');
      if (observations.length > 0) {
        return { ok: true, mode: 'live', observations, error: null };
      }
    }
    return scrapeBet365HtmlStub();
  }

  if (live) {
    const data = await fetchLiveJson(options.timeoutMs ?? 10_000);
    if (data != null) {
      const observations = parsePayloadToObservations(data, observedAt, 'live');
      if (observations.length > 0) {
        return { ok: true, mode: 'live', observations, error: null };
      }
    }
    const pw = await tryBet365PlaywrightHtml(options.timeoutMs ?? 15_000);
    if (pw != null) {
      const observations = parsePayloadToObservations(pw, observedAt, 'live');
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
export async function scrape(options: RunBet365AgentOptions = {}): Promise<LimitObservation[]> {
  const result = await runBet365Agent(options);
  if (!result.ok) throw new Error(result.error ?? 'bet365 scrape failed');
  return result.observations;
}
