// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortSignal.timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Caesars Tier 4 scrape agent (fixture-first; American Wagering live path).
 *
 * Live primary: `api.americanwagering.com/.../sb/bets/configuration`
 * (see catalogs/caesars-americanwagering.ts). That route is WAF-gated —
 * without CAESARS_SCRAPE_COOKIE / CAESARS_WAF_TOKEN the agent records the
 * block and falls back to the committed fixture.
 *
 * @see https://bun.com/docs/api/fetch — fetch
 * @see docs/harness/tenants/partner-limits.md
 */

import { expandScrapedLimitSeeds } from '../../baseline-scraped-limits.ts';
import { asSportsbookId, type StateCode } from '../domain.ts';
import {
  CAESARS_BROWSER_HEADERS,
  CAESARS_DEFAULT_LOCATION,
  caesarsBetsConfigurationUrl,
  caesarsLimitCandidateUrl,
} from '../catalogs/caesars-americanwagering.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';
import { normalizeScrapeState } from '../scrape-wire-taxonomy.ts';
import { isCaesarsWafHtmlBody, parseCaesarsBetsConfiguration } from './caesars-parse.ts';

export const CAESARS_AGENT_ID = 'caesars-agent' as const;
export const CAESARS_SPORTSBOOK = asSportsbookId('caesars');

/** @deprecated Use caesarsBetsConfigurationUrl() — kept as the default NJ live URL. */
export const CAESARS_LIVE_URL = caesarsBetsConfigurationUrl(CAESARS_DEFAULT_LOCATION);

export type CaesarsLiveFetchKind = 'json' | 'waf' | 'http_error' | 'network' | 'empty';

export type CaesarsLiveFetchResult = {
  kind: CaesarsLiveFetchKind;
  url: string;
  status: number | null;
  data: unknown | null;
  detail: string | null;
};

export type CaesarsAgentResult = {
  ok: boolean;
  mode: LimitObservation['mode'];
  observations: LimitObservation[];
  error: string | null;
  live?: CaesarsLiveFetchResult;
};

function locationFromEnv(): string {
  const raw = Bun.env.CAESARS_SCRAPE_LOCATION?.trim().toLowerCase();
  return raw && raw.length > 0 ? raw : CAESARS_DEFAULT_LOCATION;
}

function jurisdictionForLocation(location: string): StateCode {
  return normalizeScrapeState(location);
}

function buildLiveHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...CAESARS_BROWSER_HEADERS };
  const cookie = Bun.env.CAESARS_SCRAPE_COOKIE?.trim();
  if (cookie) headers.Cookie = cookie;
  const waf = Bun.env.CAESARS_WAF_TOKEN?.trim();
  if (waf) headers['x-aws-waf-token'] = waf;
  return headers;
}

function fixtureObservations(observedAt: string): LimitObservation[] {
  return expandScrapedLimitSeeds()
    .filter(seed => seed.sportsbook === CAESARS_SPORTSBOOK)
    .map(seed => ({
      sportsbook: CAESARS_SPORTSBOOK,
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
      agent: CAESARS_AGENT_ID,
      mode: 'fixture' as const,
    }));
}

function rowsToObservations(
  rows: ReturnType<typeof parseCaesarsBetsConfiguration>,
  observedAt: string,
  jurisdiction: StateCode,
  mode: LimitObservation['mode']
): LimitObservation[] {
  return rows.map(row => ({
    sportsbook: CAESARS_SPORTSBOOK,
    sport: row.sport,
    market: row.market,
    jurisdiction,
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
    agent: CAESARS_AGENT_ID,
    mode,
  }));
}

/** Fetch bets/configuration with browser headers + optional cookie/WAF token. */
export async function fetchCaesarsBetsConfiguration(opts?: {
  location?: string;
  timeoutMs?: number;
  url?: string;
}): Promise<CaesarsLiveFetchResult> {
  const location = opts?.location ?? locationFromEnv();
  const url = opts?.url ?? caesarsLimitCandidateUrl(location);
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 12_000),
      headers: buildLiveHeaders(),
    });
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();

    if (!response.ok) {
      if (response.status === 403 || isCaesarsWafHtmlBody(text)) {
        return {
          kind: 'waf',
          url,
          status: response.status,
          data: null,
          detail: 'CloudFront/AWS WAF blocked bets/configuration (need browser session)',
        };
      }
      return {
        kind: 'http_error',
        url,
        status: response.status,
        data: null,
        detail: `HTTP ${response.status}`,
      };
    }

    if (isCaesarsWafHtmlBody(text)) {
      return {
        kind: 'waf',
        url,
        status: response.status,
        data: null,
        detail: 'WAF challenge HTML returned with 200',
      };
    }

    if (
      !contentType.includes('json') &&
      !text.trim().startsWith('{') &&
      !text.trim().startsWith('[')
    ) {
      return {
        kind: 'empty',
        url,
        status: response.status,
        data: null,
        detail: `non-JSON content-type=${contentType}`,
      };
    }

    try {
      const data: unknown = JSON.parse(text);
      return { kind: 'json', url, status: response.status, data, detail: null };
    } catch {
      return {
        kind: 'empty',
        url,
        status: response.status,
        data: null,
        detail: 'JSON parse failed',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'network', url, status: null, data: null, detail: message };
  }
}

export function scrapeCaesarsHtmlStub(): CaesarsAgentResult {
  return {
    ok: false,
    mode: 'html_stub',
    observations: [],
    error: 'Caesars HTML scrape not implemented (fails closed)',
  };
}

export type RunCaesarsAgentOptions = {
  live?: boolean;
  html?: boolean;
  timeoutMs?: number;
  observedAt?: string;
  /** Override jurisdiction location segment (default CAESARS_SCRAPE_LOCATION or nj). */
  location?: string;
};

export async function runCaesarsAgent(
  options: RunCaesarsAgentOptions = {}
): Promise<CaesarsAgentResult> {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const live =
    options.live === true ||
    Bun.env.BASELINE_SCRAPE_LIVE === '1' ||
    Bun.env.BASELINE_SCRAPE_LIVE === 'true';

  if (options.html) return scrapeCaesarsHtmlStub();

  if (live) {
    const location = options.location ?? locationFromEnv();
    const jurisdiction = jurisdictionForLocation(location);
    const liveResult = await fetchCaesarsBetsConfiguration({
      location,
      timeoutMs: options.timeoutMs,
    });

    if (liveResult.kind === 'json' && liveResult.data != null) {
      const rows = parseCaesarsBetsConfiguration(liveResult.data, {
        jurisdiction,
        referenceUrl: liveResult.url,
      });
      const observations = rowsToObservations(rows, observedAt, jurisdiction, 'live');
      if (observations.length > 0) {
        return {
          ok: true,
          mode: 'live',
          observations,
          error: null,
          live: liveResult,
        };
      }
      return {
        ok: true,
        mode: 'fixture',
        observations: fixtureObservations(observedAt),
        error: 'live JSON had no parseable limit rows; used fixture fallback',
        live: liveResult,
      };
    }

    const reason =
      liveResult.kind === 'waf'
        ? `WAF blocked (${liveResult.status ?? '?'}); used fixture fallback`
        : `live unavailable (${liveResult.kind}: ${liveResult.detail ?? 'n/a'}); used fixture fallback`;
    console.warn(`[caesars-agent] ${reason}`);
    return {
      ok: true,
      mode: 'fixture',
      observations: fixtureObservations(observedAt),
      error: reason,
      live: liveResult,
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
export async function scrape(options: RunCaesarsAgentOptions = {}): Promise<LimitObservation[]> {
  const result = await runCaesarsAgent(options);
  if (!result.ok) throw new Error(result.error ?? 'caesars scrape failed');
  return result.observations;
}

export {
  caesarsBetsConfigurationUrl,
  caesarsLimitCandidateUrl,
  parseCaesarsBetsConfiguration,
  isCaesarsWafHtmlBody,
};
