// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortSignal.timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/api/file-io#reading-files-bun-file — Bun.file
/**
 * FanDuel Tier 4 scrape agent (same loop as DraftKings).
 *
 * Default: offline seed fixture (CI-safe). Optional live JSON when
 * BASELINE_SCRAPE_LIVE=1. HTML path: committed HTML fixture parse by default;
 * optional Bun.WebView live capture when `--html` + (`--live` or
 * OPERATOR_WEBVIEW_SCRAPE=1).
 *
 * @see https://bun.com/docs/api/fetch — fetch
 * @see docs/harness/tenants/partner-limits.md
 */

import { expandScrapedLimitSeeds } from '../../baseline-scraped-limits.ts';
import { asSportsbookId, asStateCode } from '../domain.ts';
import { parseGenericLimitsPayload } from '../scraper-targets.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';
import {
  requireBookScrapeConfig,
  resolveHtmlLiveUrl,
  resolveHtmlTimeoutMs,
  resolveJsonTimeoutMs,
} from '../scrape-agents-config.ts';
import { captureHtmlViaWebView } from '../webview-html.ts';
import { parseFanDuelHtml } from './fanduel-parse.ts';

export const FANDUEL_AGENT_ID = 'fanduel-agent' as const;
export const FANDUEL_SPORTSBOOK = asSportsbookId('fanduel');

const fdScrape = requireBookScrapeConfig('fanduel');

export const FANDUEL_LIVE_URL = fdScrape.liveUrl;
/** Opt-in live HTML target (override with FANDUEL_HTML_URL). */
export const FANDUEL_HTML_URL = resolveHtmlLiveUrl('fanduel', 'FANDUEL_HTML_URL');

export const FANDUEL_HTML_FIXTURE_PATH =
  fdScrape.htmlFixtureAbs ??
  Bun.fileURLToPath(new URL('../fixtures/fanduel-limits.html', import.meta.url));

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

function wantsWebViewHtml(options: { live?: boolean }): boolean {
  return (
    options.live === true ||
    Bun.env.OPERATOR_WEBVIEW_SCRAPE === '1' ||
    Bun.env.OPERATOR_WEBVIEW_SCRAPE === 'true'
  );
}

/** Load committed synthetic HTML fixture (CI default for `--html`). */
export async function loadFanDuelHtmlFixture(): Promise<string> {
  const file = Bun.file(FANDUEL_HTML_FIXTURE_PATH);
  if (!(await file.exists())) {
    throw new Error(`FanDuel HTML fixture missing: ${FANDUEL_HTML_FIXTURE_PATH}`);
  }
  return await file.text();
}

async function scrapeFanDuelHtmlFixture(
  observedAt: string,
  error: string | null = null
): Promise<FanDuelAgentResult> {
  const html = await loadFanDuelHtmlFixture();
  const observations = await parseFanDuelHtml(html, {
    observedAt,
    mode: 'html_fixture',
    referenceUrl: `file://${FANDUEL_HTML_FIXTURE_PATH}`,
  });
  if (observations.length === 0) {
    return {
      ok: false,
      mode: 'html_fixture',
      observations: [],
      error: error ?? 'FanDuel HTML fixture parse returned zero rows (fails closed)',
    };
  }
  return { ok: true, mode: 'html_fixture', observations, error };
}

async function scrapeFanDuelHtmlLive(
  timeoutMs: number,
  observedAt: string
): Promise<FanDuelAgentResult> {
  try {
    const html = await captureHtmlViaWebView(FANDUEL_HTML_URL, { timeoutMs });
    const observations = await parseFanDuelHtml(html, {
      observedAt,
      mode: 'html_live',
      referenceUrl: FANDUEL_HTML_URL,
    });
    if (observations.length > 0) {
      return { ok: true, mode: 'html_live', observations, error: null };
    }
    return scrapeFanDuelHtmlFixture(
      observedAt,
      'live HTML parse empty; used html_fixture fallback'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[fanduel-agent] WebView HTML error: ${message}`);
    return scrapeFanDuelHtmlFixture(
      observedAt,
      `live WebView unavailable; used html_fixture fallback (${message})`
    );
  }
}

/**
 * HTML scrape entry — fixture by default; WebView when live-gated.
 * @deprecated Prefer runFanDuelAgent({ html: true }) — kept for older tests.
 */
export async function scrapeFanDuelHtmlStub(): Promise<FanDuelAgentResult> {
  return scrapeFanDuelHtmlFixture(new Date().toISOString());
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
  /** HTML fixture parse; with live / OPERATOR_WEBVIEW_SCRAPE=1 → WebView then same parser. */
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
};

/**
 * Run the FanDuel agent. Seed fixture by default; live JSON when requested;
 * HTML path uses committed HTML fixture (or gated WebView + same parser).
 */
export async function runFanDuelAgent(
  options: RunFanDuelAgentOptions = {}
): Promise<FanDuelAgentResult> {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const live =
    options.live === true ||
    Bun.env.BASELINE_SCRAPE_LIVE === '1' ||
    Bun.env.BASELINE_SCRAPE_LIVE === 'true';

  if (options.html) {
    if (wantsWebViewHtml(options)) {
      return scrapeFanDuelHtmlLive(resolveHtmlTimeoutMs(options.timeoutMs), observedAt);
    }
    return scrapeFanDuelHtmlFixture(observedAt);
  }

  if (live) {
    const data = await fetchLiveJson(resolveJsonTimeoutMs(options.timeoutMs));
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
