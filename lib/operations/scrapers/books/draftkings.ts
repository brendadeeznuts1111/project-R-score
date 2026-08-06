// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortSignal.timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * DraftKings Tier 4 scrape agent.
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
import { parseDraftKingsHtml } from './draftkings-parse.ts';

export const DRAFTKINGS_AGENT_ID = 'draftkings-agent' as const;
export const DRAFTKINGS_SPORTSBOOK = asSportsbookId('draftkings');

const dkScrape = requireBookScrapeConfig('draftkings');

export const DRAFTKINGS_LIVE_URL = dkScrape.liveUrl;
/** Opt-in live HTML target (override with DRAFTKINGS_HTML_URL). */
export const DRAFTKINGS_HTML_URL = resolveHtmlLiveUrl('draftkings', 'DRAFTKINGS_HTML_URL');

export const DRAFTKINGS_HTML_FIXTURE_PATH =
  dkScrape.htmlFixtureAbs ??
  Bun.fileURLToPath(new URL('../fixtures/draftkings-limits.html', import.meta.url));

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

function wantsWebViewHtml(options: { live?: boolean }): boolean {
  return (
    options.live === true ||
    Bun.env.OPERATOR_WEBVIEW_SCRAPE === '1' ||
    Bun.env.OPERATOR_WEBVIEW_SCRAPE === 'true'
  );
}

/** Load committed synthetic HTML fixture (CI default for `--html`). */
export async function loadDraftKingsHtmlFixture(): Promise<string> {
  const file = Bun.file(DRAFTKINGS_HTML_FIXTURE_PATH);
  if (!(await file.exists())) {
    throw new Error(`DraftKings HTML fixture missing: ${DRAFTKINGS_HTML_FIXTURE_PATH}`);
  }
  return await file.text();
}

async function scrapeDraftKingsHtmlFixture(
  observedAt: string,
  error: string | null = null
): Promise<DraftKingsAgentResult> {
  const html = await loadDraftKingsHtmlFixture();
  const observations = await parseDraftKingsHtml(html, {
    observedAt,
    mode: 'html_fixture',
    referenceUrl: `file://${DRAFTKINGS_HTML_FIXTURE_PATH}`,
  });
  if (observations.length === 0) {
    return {
      ok: false,
      mode: 'html_fixture',
      observations: [],
      error: error ?? 'DraftKings HTML fixture parse returned zero rows (fails closed)',
    };
  }
  return { ok: true, mode: 'html_fixture', observations, error };
}

async function scrapeDraftKingsHtmlLive(
  timeoutMs: number,
  observedAt: string
): Promise<DraftKingsAgentResult> {
  try {
    const html = await captureHtmlViaWebView(DRAFTKINGS_HTML_URL, { timeoutMs });
    const observations = await parseDraftKingsHtml(html, {
      observedAt,
      mode: 'html_live',
      referenceUrl: DRAFTKINGS_HTML_URL,
    });
    if (observations.length > 0) {
      return { ok: true, mode: 'html_live', observations, error: null };
    }
    return scrapeDraftKingsHtmlFixture(
      observedAt,
      'live HTML parse empty; used html_fixture fallback'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[draftkings-agent] WebView HTML error: ${message}`);
    return scrapeDraftKingsHtmlFixture(
      observedAt,
      `live WebView unavailable; used html_fixture fallback (${message})`
    );
  }
}

/**
 * HTML scrape entry — fixture by default; WebView when live-gated.
 * @deprecated Prefer runDraftKingsAgent({ html: true }) — kept for older tests.
 */
export async function scrapeDraftKingsHtmlStub(): Promise<DraftKingsAgentResult> {
  return scrapeDraftKingsHtmlFixture(new Date().toISOString());
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
  /** HTML fixture parse; with live / OPERATOR_WEBVIEW_SCRAPE=1 → WebView then same parser. */
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
};

/**
 * Run the DraftKings agent. Seed fixture by default; live JSON when requested;
 * HTML path uses committed HTML fixture (or gated WebView + same parser).
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
    if (wantsWebViewHtml(options)) {
      return scrapeDraftKingsHtmlLive(resolveHtmlTimeoutMs(options.timeoutMs), observedAt);
    }
    return scrapeDraftKingsHtmlFixture(observedAt);
  }

  if (live) {
    const data = await fetchLiveJson(resolveJsonTimeoutMs(options.timeoutMs));
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
