// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Research agent — polls partners for markets (limits/liquidity) and events
 * (canonical IDs, snapshots, change alerts).
 */

import { upsertPartnerEvent } from './canonicalizer.ts';
import { processEventChanges } from './event-alert-engine.ts';
import { FonbetFetcher } from './fetchers/fonbet.ts';
import { HardRockFetcher } from './fetchers/hardrock.ts';
import type { PartnerFetcher, ResearchFetchResult, ResearchMarket } from './fetchers/types.ts';
import { recordLimit } from './limit-tracker.ts';
import { pushLiquiditySpot } from './liquidity-pusher.ts';
import { createSnapshot, storeSnapshot } from './snapshot-store.ts';
import type { EventChange, PartnerEvent } from './types/event.ts';

export type ResearchAgentStatus = {
  running: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  lastError: string | null;
  lastMarketCount: number;
  lastEventCount: number;
  runs: number;
  live: boolean;
};

export type ResearchAgentHandle = {
  status: () => ResearchAgentStatus;
  runOnce: () => Promise<ResearchRunResult>;
  lastMarkets: () => ResearchMarket[];
  lastEvents: () => PartnerEvent[];
  stop: () => void;
};

export type ResearchRunResult = {
  ok: boolean;
  markets: ResearchMarket[];
  events: PartnerEvent[];
  fetches: ResearchFetchResult[];
  liquidityPushed: number;
  limitsRecorded: number;
  snapshotsStored: number;
  alertsFired: number;
  changes: EventChange[];
  error?: string;
  ranAt: string;
};

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_INTERVAL_MS = 30_000;

const DEFAULT_FETCHERS: PartnerFetcher[] = [new HardRockFetcher(), new FonbetFetcher()];

let shared: ResearchAgentHandle | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let lastMarketsCache: ResearchMarket[] = [];
let lastEventsCache: PartnerEvent[] = [];
let state: ResearchAgentStatus = {
  running: false,
  intervalMs: DEFAULT_INTERVAL_MS,
  lastRunAt: null,
  lastError: null,
  lastMarketCount: 0,
  lastEventCount: 0,
  runs: 0,
  live: false,
};

function resolveIntervalMs(live: boolean, override?: number): number {
  if (typeof override === 'number' && override > 0) return override;
  const envMs = Number(Bun.env.RESEARCH_AGENT_INTERVAL_MS);
  if (Number.isFinite(envMs) && envMs > 0) return envMs;
  return live ? LIVE_INTERVAL_MS : DEFAULT_INTERVAL_MS;
}

async function collectMarkets(
  live: boolean,
  fetchers: PartnerFetcher[] = DEFAULT_FETCHERS
): Promise<{
  markets: ResearchMarket[];
  fetches: ResearchFetchResult[];
}> {
  const fetches = await Promise.all(fetchers.map(f => f.fetchMarkets({ live })));
  const markets = fetches.flatMap(f => f.markets);
  return { markets, fetches };
}

async function collectEvents(
  live: boolean,
  fetchers: PartnerFetcher[] = DEFAULT_FETCHERS
): Promise<PartnerEvent[]> {
  const batches = await Promise.all(
    fetchers.map(async f => {
      if (typeof f.fetchEvents === 'function') {
        return f.fetchEvents({ session: 'all', live });
      }
      return [] as PartnerEvent[];
    })
  );
  return batches.flat();
}

export async function runResearchCycle(
  opts: { live?: boolean; fetchers?: PartnerFetcher[] } = {}
): Promise<ResearchRunResult> {
  const ranAt = new Date().toISOString();
  const live = opts.live === true || Bun.env.RESEARCH_AGENT_LIVE === '1';
  const fetchers = opts.fetchers ?? DEFAULT_FETCHERS;

  try {
    const { markets, fetches } = await collectMarkets(live, fetchers);
    let liquidityPushed = 0;
    let limitsRecorded = 0;

    for (const m of markets) {
      recordLimit({
        partnerId: m.partnerId,
        accountId: m.accountId,
        marketId: m.marketId,
        sport: m.sport,
        league: m.league,
        marketType: m.marketType,
        maxStakeUsd: m.maxStakeUsd,
        currency: m.currency,
        source: `research:${m.source}`,
        observedAt: m.observedAt,
      });
      limitsRecorded += 1;

      const push = await pushLiquiditySpot({
        partnerId: m.partnerId,
        sport: m.sport,
        league: m.league,
        marketType: m.marketType,
        maxStakeUsd: m.maxStakeUsd,
        currency: m.currency,
        source: 'research',
        marketId: m.marketId,
        note: m.eventName ?? m.label,
      });
      if (push.ok) liquidityPushed += 1;
    }

    const events = await collectEvents(live, fetchers);
    const changes: EventChange[] = [];
    let snapshotsStored = 0;

    for (const event of events) {
      const { canonicalId } = upsertPartnerEvent(event);
      const snapshot = createSnapshot(event, canonicalId);
      const stored = await storeSnapshot(snapshot);
      snapshotsStored += 1;

      if (stored.isNew) {
        changes.push({
          kind: 'new_event',
          canonicalId,
          partnerId: event.partnerId,
          partnerEventId: event.id,
          event,
          previous: null,
          current: stored.snapshot,
        });
      } else {
        if (stored.priceChanged) {
          changes.push({
            kind: 'price_change',
            canonicalId,
            partnerId: event.partnerId,
            partnerEventId: event.id,
            event,
            previous: stored.previous,
            current: stored.snapshot,
            changePercent: stored.changePercent ?? undefined,
          });
        }
        if (stored.limitChanged) {
          changes.push({
            kind: 'limit_change',
            canonicalId,
            partnerId: event.partnerId,
            partnerEventId: event.id,
            event,
            previous: stored.previous,
            current: stored.snapshot,
            oldLimit: stored.previous ? maxStake(stored.previous) : undefined,
            newLimit: maxStake(stored.snapshot),
          });
        }
      }
    }

    const alertResult = await processEventChanges(changes);

    lastMarketsCache = markets;
    lastEventsCache = events;
    state.lastRunAt = ranAt;
    state.lastMarketCount = markets.length;
    state.lastEventCount = events.length;
    state.lastError = null;
    state.runs += 1;
    state.live = live;

    return {
      ok: true,
      markets,
      events,
      fetches,
      liquidityPushed,
      limitsRecorded,
      snapshotsStored,
      alertsFired: alertResult.fired,
      changes,
      ranAt,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    state.lastRunAt = ranAt;
    state.lastError = error;
    state.runs += 1;
    return {
      ok: false,
      markets: [],
      events: [],
      fetches: [],
      liquidityPushed: 0,
      limitsRecorded: 0,
      snapshotsStored: 0,
      alertsFired: 0,
      changes: [],
      error,
      ranAt,
    };
  }
}

function maxStake(snap: {
  maxStakeUsd?: number;
  markets: Array<{ selections: Array<{ maxStake: number }> }>;
}): number {
  if (typeof snap.maxStakeUsd === 'number') return snap.maxStakeUsd;
  let max = 0;
  for (const m of snap.markets) {
    for (const s of m.selections) if (s.maxStake > max) max = s.maxStake;
  }
  return max;
}

export function startResearchAgent(
  opts: {
    intervalMs?: number;
    runImmediately?: boolean;
    live?: boolean;
    fetchers?: PartnerFetcher[];
  } = {}
): ResearchAgentHandle {
  if (shared?.status().running) return shared;

  const live = opts.live === true || Bun.env.RESEARCH_AGENT_LIVE === '1';
  const intervalMs = resolveIntervalMs(live, opts.intervalMs);
  state = {
    ...state,
    running: true,
    intervalMs,
    live,
  };

  const handle: ResearchAgentHandle = {
    status: () => ({ ...state }),
    runOnce: () => runResearchCycle({ live: opts.live, fetchers: opts.fetchers }),
    lastMarkets: () => lastMarketsCache.slice(),
    lastEvents: () => lastEventsCache.slice(),
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      state.running = false;
      shared = null;
    },
  };

  shared = handle;

  if (opts.runImmediately !== false) {
    void runResearchCycle({ live: opts.live, fetchers: opts.fetchers });
  }

  timer = setInterval(() => {
    void runResearchCycle({ live: opts.live, fetchers: opts.fetchers });
  }, intervalMs);

  if (typeof timer === 'object' && timer && 'unref' in timer) {
    (timer as { unref: () => void }).unref();
  }

  return handle;
}

export function getResearchAgent(): ResearchAgentHandle | null {
  return shared;
}

export function getLastResearchMarkets(): ResearchMarket[] {
  return lastMarketsCache.slice();
}

export function getLastResearchEvents(): PartnerEvent[] {
  return lastEventsCache.slice();
}
