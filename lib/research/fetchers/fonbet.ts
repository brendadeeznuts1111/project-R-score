// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Fonbet research fetcher — fixture-first (live optional via FONBET_RESEARCH_URL).
 */

import { joinPath } from '../../path-bun.ts';
import type { FetchEventsOptions, PartnerEvent } from '../types/event.ts';
import { partnerEventsFromMarkets } from './events-from-markets.ts';
import type { AccountLimit, PartnerFetcher, ResearchFetchResult, ResearchMarket } from './types.ts';
import { toAccountLimit } from './types.ts';

const PARTNER_ID = 'fonbet';
const FIXTURE_DIR = joinPath(import.meta.dir, '../../operator-research/fixtures/odds');
const FIXTURE = joinPath(FIXTURE_DIR, 'fonbet.json');

type FixtureShape = {
  host?: string;
  markets?: Array<{
    // brand-ok — opaque research/wire id
    id?: string; // brand-ok — opaque research/wire id
    sport?: string;
    league?: string;
    marketType?: string;
    name?: string;
    maxStake?: number;
    startTime?: string;
    session?: 'live' | 'pregame';
    selections?: Array<{ name?: string; label?: string; price?: number }>;
  }>;
  limits?: { maxBet?: number; currency?: string };
};

const DEFAULT_FIXTURE: FixtureShape = {
  host: 'fonbet.com',
  limits: { maxBet: 750, currency: 'USD' },
  markets: [
    {
      id: 'fonbet-nba-ml-1',
      sport: 'basketball',
      league: 'NBA',
      marketType: 'moneyline',
      name: 'Lakers vs Celtics',
      startTime: '2026-08-06T01:00:00.000Z',
      session: 'pregame',
      maxStake: 750,
      selections: [
        { label: 'Lakers', price: 1.95 },
        { label: 'Celtics', price: 1.9 },
      ],
    },
    {
      id: 'fonbet-epl-total-1',
      sport: 'football',
      league: 'Premier League',
      marketType: 'total',
      name: 'Arsenal vs Chelsea Over 2.5',
      startTime: '2026-08-06T18:30:00.000Z',
      session: 'pregame',
      maxStake: 500,
      selections: [
        { label: 'Over 2.5', price: 1.85 },
        { label: 'Under 2.5', price: 1.95 },
      ],
    },
    {
      id: 'fonbet-atp-ml-1',
      sport: 'tennis',
      league: 'ATP',
      marketType: 'moneyline',
      name: 'Djokovic vs Alcaraz live',
      startTime: '2026-08-05T20:00:00.000Z',
      session: 'live',
      maxStake: 400,
      selections: [
        { label: 'Djokovic', price: 1.72 },
        { label: 'Alcaraz', price: 2.15 },
      ],
    },
  ],
};

async function ensureFixture(): Promise<FixtureShape> {
  const file = Bun.file(FIXTURE);
  if (await file.exists()) {
    return (await file.json()) as FixtureShape;
  }
  // Bun.write creates intermediate path segments (no node:fs mkdir).
  await Bun.write(FIXTURE, JSON.stringify(DEFAULT_FIXTURE, null, 2));
  return DEFAULT_FIXTURE;
}

function marketsFromFixture(
  raw: FixtureShape,
  observedAt: string,
  source: 'live' | 'fixture'
): ResearchMarket[] {
  const fallbackMax = Number(raw.limits?.maxBet) || 500;
  const currency = raw.limits?.currency || 'USD';
  const accountId = Bun.env.FONBET_ACCOUNT_ID?.trim() || undefined;
  return (raw.markets ?? []).map((m, i) => {
    const maxStakeUsd = Number(m.maxStake) || fallbackMax;
    const eventName = m.name || m.id || `fonbet-${i}`;
    const selections = (m.selections ?? [])
      .map(s => ({
        label: String(s.label ?? s.name ?? ''),
        price: Number(s.price) || 0,
      }))
      .filter(s => s.label);
    return {
      partnerId: PARTNER_ID,
      accountId,
      marketId: m.id || `fonbet-${i}`,
      sport: m.sport || 'unknown',
      league: m.league || 'unknown',
      marketType: m.marketType || 'moneyline',
      eventName,
      selections,
      maxStakeUsd,
      maxStake: maxStakeUsd,
      currency,
      available: true,
      label: eventName,
      source,
      observedAt,
      scrapedAt: observedAt,
      startTime: m.startTime,
      session: m.session,
    };
  });
}

export async function fetchFonbetMarkets(
  opts: { live?: boolean; timeoutMs?: number } = {}
): Promise<ResearchFetchResult> {
  const observedAt = new Date().toISOString();
  const liveUrl = Bun.env.FONBET_RESEARCH_URL?.trim();

  if (opts.live && liveUrl) {
    try {
      const headers: Record<string, string> = {
        accept: 'application/json',
        'user-agent': 'BunAgent-research/1.05',
      };
      const apiKey = Bun.env.FONBET_API_KEY?.trim();
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;

      const resp = await fetch(liveUrl, {
        headers,
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
      /* fixture fallback */
    }
  }

  try {
    const raw = await ensureFixture();
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

export class FonbetFetcher implements PartnerFetcher {
  partnerId = PARTNER_ID;

  fetchMarkets(opts?: { live?: boolean; timeoutMs?: number }): Promise<ResearchFetchResult> {
    return fetchFonbetMarkets(opts);
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
