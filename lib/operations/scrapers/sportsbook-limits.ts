// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortController
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Tier 4 public sportsbook limit scraper.
 *
 * Default: offline fixture payloads (no network).
 * Live: BASELINE_SCRAPE_LIVE=1 attempts configured URLs, falls back to fixture per target.
 *
 * @see https://bun.com/docs/api/fetch — fetch
 * @see docs/harness/tenants/partner-limits.md
 */

import {
  DEFAULT_SCRAPE_TARGETS,
  type ScrapeTarget,
  type ScrapeTargetParsedRow,
} from './scraper-targets.ts';
import { expandScrapedLimitSeeds, type ScrapedLimitSeed } from '../baseline-scraped-limits.ts';

export type ScrapedLimit = ScrapedLimitSeed;

function fixturePayloadForTarget(target: ScrapeTarget): { limits: unknown[] } {
  const seeds = expandScrapedLimitSeeds().filter(
    seed =>
      seed.sportsbook === target.sportsbook && String(seed.jurisdiction) === target.jurisdiction
  );
  return {
    limits: seeds.map(seed => ({
      sport: seed.sport,
      market: seed.market,
      structure: seed.structure,
      phase: seed.phase,
      openingMaxUsd: seed.openingMaxUsd,
      openingMinUsd: seed.openingMinUsd,
      dailyLimitUsd: seed.dailyLimitUsd,
      weeklyLimitUsd: seed.weeklyLimitUsd,
      vipLimitUsd: seed.vipLimitUsd,
      league: seed.league,
      eventType: seed.eventType,
      referenceUrl: seed.referenceUrl,
      sourceUrl: seed.referenceUrl,
    })),
  };
}

function toScrapedLimit(target: ScrapeTarget, parsed: ScrapeTargetParsedRow): ScrapedLimit {
  return {
    sportsbook: target.sportsbook,
    jurisdiction: target.jurisdiction,
    sport: parsed.sport,
    market: parsed.market,
    structure: parsed.structure,
    phase: parsed.phase,
    openingMaxUsd: parsed.openingMaxUsd,
    openingMinUsd: parsed.openingMinUsd ?? null,
    dailyLimitUsd: parsed.dailyLimitUsd ?? null,
    weeklyLimitUsd: parsed.weeklyLimitUsd ?? null,
    vipLimitUsd: parsed.vipLimitUsd ?? null,
    league: parsed.league ?? null,
    eventType: parsed.eventType ?? null,
    sourceRef: parsed.sourceRef,
    referenceUrl: parsed.referenceUrl ?? null,
  };
}

async function fetchTargetLive(target: ScrapeTarget, timeoutMs: number): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target.url, {
      headers: target.headers ?? {},
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(
        `Scrape failed for ${target.sportsbook} (${target.jurisdiction}): HTTP ${response.status}`
      );
      return null;
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Scrape error for ${target.sportsbook} (${target.jurisdiction}): ${message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type ScrapeSportsbookLimitsOptions = {
  timeoutMs?: number;
  /** Force live network attempts (also enabled by BASELINE_SCRAPE_LIVE=1). */
  live?: boolean;
  targets?: readonly ScrapeTarget[];
};

/**
 * Scrape public limits. Offline fixture by default so bake/CI stay deterministic.
 */
export async function scrapeSportsbookLimits(
  options: ScrapeSportsbookLimitsOptions = {}
): Promise<ScrapedLimit[]> {
  const targets = options.targets ?? DEFAULT_SCRAPE_TARGETS;
  const live =
    options.live === true ||
    Bun.env.BASELINE_SCRAPE_LIVE === '1' ||
    Bun.env.BASELINE_SCRAPE_LIVE === 'true';
  const timeoutMs = options.timeoutMs ?? 10_000;
  const results: ScrapedLimit[] = [];

  for (const target of targets) {
    let data: unknown = null;
    if (live) {
      data = await fetchTargetLive(target, timeoutMs);
    }
    if (data == null) {
      data = fixturePayloadForTarget(target);
    }
    const parsed = target.parser(data);
    for (const row of parsed) {
      results.push(toScrapedLimit(target, row));
    }
  }
  return results;
}
