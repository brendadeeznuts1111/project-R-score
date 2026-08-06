// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Hard Rock research fetcher — fixture-first, optional live odds JSON.
 */

import { joinPath } from '../../path-bun.ts';
import type { FetchEventsOptions, PartnerEvent } from '../types/event.ts';
import { partnerEventsFromMarkets } from './events-from-markets.ts';
import type { AccountLimit, PartnerFetcher, ResearchFetchResult, ResearchMarket } from './types.ts';
import { toAccountLimit } from './types.ts';

const PARTNER_ID = 'hard-rock-florida';
const FIXTURE = joinPath(import.meta.dir, '../../operator-research/fixtures/odds/hardrock.json');
/** Live fetch only when HARDROCK_RESEARCH_URL is set (no default URL). */
const LIVE_URL = Bun.env.HARDROCK_RESEARCH_URL?.trim() || '';

type FixtureShape = {
  host?: string;
  timestamp?: number;
  markets?: Array<{
    id?: string; // brand-ok — opaque research/wire id
    name?: string;
    sport?: string;
    league?: string;
    marketType?: string;
    startTime?: string;
    session?: 'live' | 'pregame';
    selections?: Array<{ name?: string; label?: string; price?: number }>;
  }>;
  limits?: { maxBet?: number; minBet?: number; currency?: string };
};

function inferSportLeague(name: string): { sport: string; league: string } {
  const n = name.toLowerCase();
  if (n.includes('mlb') || n.includes('nyy') || n.includes('bos')) {
    return { sport: 'baseball', league: 'MLB' };
  }
  if (n.includes('nba') || n.includes('lakers')) {
    return { sport: 'basketball', league: 'NBA' };
  }
  if (n.includes('nfl')) return { sport: 'american football', league: 'NFL' };
  if (n.includes('atp') || n.includes('tennis')) return { sport: 'tennis', league: 'ATP' };
  return { sport: 'unknown', league: 'unknown' };
}

function inferMarketType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('total') || n.includes('over')) return 'total';
  if (n.includes('spread')) return 'spread';
  return 'moneyline';
}

function marketsFromFixture(
  raw: FixtureShape,
  observedAt: string,
  source: 'live' | 'fixture'
): ResearchMarket[] {
  const maxStakeUsd = Number(raw.limits?.maxBet) || 1000;
  const currency = raw.limits?.currency || 'USD';
  const accountId = Bun.env.HARDROCK_ACCOUNT_ID?.trim() || undefined;
  const fixtureStart =
    typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp)
      ? new Date(raw.timestamp > 1e12 ? raw.timestamp : raw.timestamp * 1000).toISOString()
      : undefined;

  return (raw.markets ?? []).map((m, i) => {
    const label = m.name || m.id || `market-${i}`;
    const inferred = inferSportLeague(label);
    const selections = (m.selections ?? [])
      .map(s => ({
        label: String(s.label ?? s.name ?? ''),
        price: Number(s.price) || 0,
      }))
      .filter(s => s.label);
    return {
      partnerId: PARTNER_ID,
      accountId,
      marketId: m.id || `hr-${i}`,
      sport: m.sport || inferred.sport,
      league: m.league || inferred.league,
      marketType: m.marketType || inferMarketType(label),
      eventName: label,
      selections,
      maxStakeUsd,
      maxStake: maxStakeUsd,
      currency,
      available: true,
      label,
      source,
      observedAt,
      scrapedAt: observedAt,
      startTime: m.startTime || fixtureStart,
      session: m.session,
    };
  });
}

export async function fetchHardRockMarkets(
  opts: { live?: boolean; timeoutMs?: number } = {}
): Promise<ResearchFetchResult> {
  const observedAt = new Date().toISOString();

  if (opts.live && LIVE_URL) {
    try {
      const resp = await fetch(LIVE_URL, {
        headers: {
          accept: 'application/json',
          'user-agent': 'BunAgent-research/1.05',
        },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8_000),
      });
      if (resp.ok) {
        const data = (await resp.json()) as FixtureShape;
        const markets = marketsFromFixture(data, observedAt, 'live');
        if (markets.length) {
          return { ok: true, partnerId: PARTNER_ID, markets, mode: 'live' };
        }
      }
    } catch {
      /* fall through to fixture */
    }
  }

  try {
    const file = Bun.file(FIXTURE);
    if (!(await file.exists())) {
      return {
        ok: false,
        partnerId: PARTNER_ID,
        markets: [],
        mode: 'empty',
        error: 'Hard Rock fixture missing',
      };
    }
    const raw = (await file.json()) as FixtureShape;
    const markets = marketsFromFixture(raw, observedAt, 'fixture');
    return { ok: true, partnerId: PARTNER_ID, markets, mode: 'fixture' };
  } catch (err) {
    return {
      ok: false,
      partnerId: PARTNER_ID,
      markets: [],
      mode: 'empty',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export class HardRockFetcher implements PartnerFetcher {
  partnerId = PARTNER_ID;

  fetchMarkets(opts?: { live?: boolean; timeoutMs?: number }): Promise<ResearchFetchResult> {
    return fetchHardRockMarkets(opts);
  }

  async fetchAccountLimits(opts?: { live?: boolean }): Promise<AccountLimit[]> {
    const result = await this.fetchMarkets(opts);
    return result.markets.map(toAccountLimit);
  }

  async fetchEvents(opts: FetchEventsOptions = {}): Promise<PartnerEvent[]> {
    const result = await this.fetchMarkets({
      live: opts.live,
      timeoutMs: opts.timeoutMs,
    });
    return partnerEventsFromMarkets(result.markets, opts);
  }
}
