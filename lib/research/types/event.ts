/**
 * Partner event + snapshot contracts for all-sports research monitoring.
 *
 * @see lib/research/fetchers/types.ts
 * @see lib/research/agent.ts
 */

export type EventSession = 'live' | 'pregame';

export type EventMarketSelection = {
  label: string;
  price: number;
  maxStake: number;
};

export type EventMarket = {
  type: string;
  selections: EventMarketSelection[];
};

/** Normalized event from a partner fetcher (live or fixture). */
export type PartnerEvent = {
  id: string; // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  session: EventSession;
  markets: EventMarket[];
  lastUpdated: string;
  /** Optional max stake rolled up from markets */
  maxStakeUsd?: number;
  source?: 'live' | 'fixture';
};

/** Point-in-time odds/limits capture for change detection + history. */
export type EventSnapshot = {
  eventId: string; // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  canonicalId: string; // brand-ok — opaque research/wire id
  timestamp: string;
  markets: EventMarket[];
  oddsHash: string;
  session: EventSession;
  maxStakeUsd?: number;
};

export type EventChangeKind = 'new_event' | 'price_change' | 'limit_change';

export type EventChange = {
  kind: EventChangeKind;
  canonicalId: string; // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  partnerEventId: string; // brand-ok — opaque research/wire id
  event: PartnerEvent;
  previous?: EventSnapshot | null;
  current: EventSnapshot;
  changePercent?: number;
  oldLimit?: number;
  newLimit?: number;
};

export type EventAlertTrigger = EventChangeKind;

export type EventAlertConfig = {
  id: string; // brand-ok — opaque research/wire id
  /** Canonical event id, or `*` for all */
  eventId: string; // brand-ok — opaque research/wire id
  partnerIds: string[];
  trigger: EventAlertTrigger;
  threshold?: number;
  actions: Array<'telegram' | 'webhook'>;
  telegramChatId?: string; // brand-ok — opaque research/wire id
  enabled: boolean;
  createdAt: string;
};

export type FetchEventsOptions = {
  sports?: string[];
  session?: EventSession | 'all';
  live?: boolean;
  timeoutMs?: number;
};
