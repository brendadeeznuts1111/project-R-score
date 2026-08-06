/**
 * Research agent partner fetcher contracts.
 *
 * @see lib/research/agent.ts
 * @see lib/research/types/event.ts
 */

import type { FetchEventsOptions, PartnerEvent } from '../types/event.ts';

export type ResearchSelection = {
  label: string;
  price: number;
};

/** Normalized research market observation from a partner fetcher. */
export type ResearchMarket = {
  partnerId: string; // brand-ok — opaque research/wire id
  accountId?: string; // brand-ok — opaque research/wire id
  marketId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  marketType: string;
  /** Human event / market title */
  eventName?: string;
  selections?: ResearchSelection[];
  maxStakeUsd: number;
  /** Alias used by desk docs (`maxStake`) */
  maxStake?: number;
  currency: string;
  available?: boolean;
  label?: string;
  source: 'live' | 'fixture';
  observedAt: string;
  scrapedAt?: string;
  /** Event start (ISO). Fixture/API when known; else omit and derive from observedAt. */
  startTime?: string;
  /** Explicit live|pregame when partner provides it. */
  session?: 'live' | 'pregame';
};

export type AccountLimit = {
  partnerId: string; // brand-ok — opaque research/wire id
  accountId?: string; // brand-ok — opaque research/wire id
  marketKey: string;
  marketId?: string; // brand-ok — opaque research/wire id
  sport?: string;
  league?: string;
  marketType?: string;
  maxStake: number;
  recordedAt: string;
};

export type ResearchFetchResult = {
  ok: boolean;
  partnerId: string; // brand-ok — opaque research/wire id
  markets: ResearchMarket[];
  error?: string;
  mode: 'live' | 'fixture' | 'empty';
};

/** Extensible partner crawler — fixture-first today, live when env URL/keys set. */
export interface PartnerFetcher {
  partnerId: string; // brand-ok — opaque research/wire id
  fetchMarkets(opts?: { live?: boolean; timeoutMs?: number }): Promise<ResearchFetchResult>;
  fetchAccountLimits?(opts?: { live?: boolean }): Promise<AccountLimit[]>;
  /** Optional full event book (live + pregame). Derived from markets when omitted. */
  fetchEvents?(opts?: FetchEventsOptions): Promise<PartnerEvent[]>;
}

export type { FetchEventsOptions, PartnerEvent };

export function marketKey(sport: string, league: string, marketType: string): string {
  return `${sport}|${league}|${marketType}`;
}

export function toAccountLimit(m: ResearchMarket): AccountLimit {
  return {
    partnerId: m.partnerId,
    accountId: m.accountId,
    marketKey: marketKey(m.sport, m.league, m.marketType),
    marketId: m.marketId,
    sport: m.sport,
    league: m.league,
    marketType: m.marketType,
    maxStake: m.maxStakeUsd,
    recordedAt: m.scrapedAt ?? m.observedAt,
  };
}
