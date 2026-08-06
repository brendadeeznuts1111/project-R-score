import { describe, expect, test, beforeAll } from 'bun:test';

beforeAll(() => {
  Bun.env.BUN_TEST = '1';
  Bun.env.RESEARCH_ALERTS_DRY_RUN = '1';
});
import { getCanonicalEventId, upsertPartnerEvent } from '../lib/research/canonicalizer.ts';
import { partnerEventsFromMarkets } from '../lib/research/fetchers/events-from-markets.ts';
import { FonbetFetcher } from '../lib/research/fetchers/fonbet.ts';
import { HardRockFetcher, fetchHardRockMarkets } from '../lib/research/fetchers/hardrock.ts';
import { runResearchCycle } from '../lib/research/agent.ts';
import {
  createSnapshot,
  oddsHash,
  limitsHash,
  storeSnapshot,
  getLatestSnapshot,
} from '../lib/research/snapshot-store.ts';
import {
  matchesEventAlertConfig,
  processEventChanges,
  listEventAlertConfigs,
} from '../lib/research/event-alert-engine.ts';
import { listRecentAlerts, loadAlertRules, isEventAlertType } from '../lib/operator-research/matching/alerts.ts';
import type { EventAlertConfig, EventChange, PartnerEvent } from '../lib/research/types/event.ts';

const sampleEvent: PartnerEvent = {
  id: 'test-evt-1',
  partnerId: 'fonbet',
  sport: 'basketball',
  league: 'NBA',
  homeTeam: 'Lakers',
  awayTeam: 'Celtics',
  startTime: '2026-08-05T19:00:00.000Z',
  session: 'pregame',
  markets: [
    {
      type: 'moneyline',
      selections: [
        { label: 'Lakers', price: 1.95, maxStake: 500 },
        { label: 'Celtics', price: 1.9, maxStake: 500 },
      ],
    },
  ],
  lastUpdated: '2026-08-05T19:00:00.000Z',
  maxStakeUsd: 500,
  source: 'fixture',
};

describe('canonicalizer', () => {
  test('stable id for same teams/day', () => {
    const a = getCanonicalEventId(sampleEvent);
    const b = getCanonicalEventId({ ...sampleEvent, lastUpdated: 'later' });
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });
});

describe('partnerEventsFromMarkets', () => {
  test('groups fixture markets into events with startTime/session', async () => {
    const fonbet = await new FonbetFetcher().fetchEvents({ session: 'all' });
    expect(fonbet.length).toBeGreaterThan(0);
    expect(fonbet.every(e => e.partnerId === 'fonbet')).toBe(true);
    expect(fonbet.every(e => e.homeTeam && e.awayTeam)).toBe(true);
    expect(fonbet.every(e => !!Date.parse(e.startTime))).toBe(true);
    const live = fonbet.filter(e => e.session === 'live');
    const pre = fonbet.filter(e => e.session === 'pregame');
    expect(live.length).toBeGreaterThanOrEqual(1);
    expect(pre.length).toBeGreaterThanOrEqual(1);

    const hr = await new HardRockFetcher().fetchEvents({ session: 'all' });
    // ML + total for NYY vs BOS should collapse to one event
    expect(hr.length).toBe(1);
    expect(hr[0]!.homeTeam).toContain('NYY');
    expect(hr[0]!.markets.length).toBeGreaterThanOrEqual(2);
    expect(hr[0]!.startTime).toBe('2026-08-06T23:05:00.000Z');
  });

  test('session filter', () => {
    const markets = [
      {
        partnerId: 'x',
        marketId: '1',
        sport: 'tennis',
        league: 'ATP',
        marketType: 'moneyline',
        eventName: 'A vs B',
        session: 'live' as const,
        selections: [{ label: 'A', price: 1.5 }],
        maxStakeUsd: 100,
        currency: 'USD',
        source: 'fixture' as const,
        observedAt: new Date().toISOString(),
        startTime: '2026-08-05T20:00:00.000Z',
      },
    ];
    const live = partnerEventsFromMarkets(markets, { session: 'live' });
    const pre = partnerEventsFromMarkets(markets, { session: 'pregame' });
    expect(live.length).toBe(1);
    expect(live[0]!.startTime).toBe('2026-08-05T20:00:00.000Z');
    expect(pre.length).toBe(0);
  });
});

describe('events list session + partner ids', () => {
  test('listEvents exposes session and partner_event_ids after cycle', async () => {
    const { listEvents } = await import('../lib/operator-research/matching/events-query.ts');
    await runResearchCycle({ live: false });
    const live = listEvents({ session: 'live', limit: 50 });
    const pre = listEvents({ session: 'pregame', limit: 50 });
    expect(live.every(e => e.session === 'live' || e.status === 'live')).toBe(true);
    expect(pre.length).toBeGreaterThan(0);
    const withMap = [...live, ...pre].find(e => (e.partner_event_ids?.length ?? 0) > 0);
    expect(withMap).toBeTruthy();
    expect(withMap!.partner_event_ids[0]!.partner_event_id).toBeTruthy();
  });
});

describe('Hard Rock live URL gate', () => {
  test('live without HARDROCK_RESEARCH_URL falls back to fixture', async () => {
    const prev = Bun.env.HARDROCK_RESEARCH_URL;
    delete Bun.env.HARDROCK_RESEARCH_URL;
    try {
      const result = await fetchHardRockMarkets({ live: true });
      expect(result.ok).toBe(true);
      expect(result.mode).toBe('fixture');
    } finally {
      if (prev != null) Bun.env.HARDROCK_RESEARCH_URL = prev;
      else delete Bun.env.HARDROCK_RESEARCH_URL;
    }
  });
});

describe('snapshot store + change detection', () => {
  test('stores snapshot and detects price change', async () => {
    const unique: PartnerEvent = {
      ...sampleEvent,
      id: `test-evt-${Date.now()}`,
      homeTeam: `TeamH${Date.now() % 10000}`,
      awayTeam: `TeamA${Date.now() % 10000}`,
      startTime: '2099-01-01T12:00:00.000Z',
    };
    const canonicalId = getCanonicalEventId(unique);
    upsertPartnerEvent(unique);
    const snap1 = createSnapshot(unique, canonicalId);
    const r1 = await storeSnapshot(snap1);
    expect(r1.isNew).toBe(true);
    expect(await getLatestSnapshot(canonicalId, 'fonbet')).toBeTruthy();

    const moved: PartnerEvent = {
      ...unique,
      markets: [
        {
          type: 'moneyline',
          selections: [
            { label: unique.homeTeam, price: 2.2, maxStake: 500 },
            { label: unique.awayTeam, price: 1.7, maxStake: 500 },
          ],
        },
      ],
    };
    const snap2 = createSnapshot(moved, canonicalId);
    expect(oddsHash(snap2.markets)).not.toBe(oddsHash(snap1.markets));
    const r2 = await storeSnapshot(snap2);
    expect(r2.isNew).toBe(false);
    expect(r2.priceChanged).toBe(true);
    expect(r2.changePercent).not.toBeNull();
  });

  test('limit-only change does not flag price_change', async () => {
    const home = `LimH${Date.now() % 10000}`;
    const away = `LimA${Date.now() % 10000}`;
    const unique: PartnerEvent = {
      ...sampleEvent,
      id: `lim-${Date.now()}`,
      homeTeam: home,
      awayTeam: away,
      startTime: '2098-06-01T12:00:00.000Z',
      maxStakeUsd: 500,
      markets: [
        {
          type: 'moneyline',
          selections: [
            { label: home, price: 1.95, maxStake: 500 },
            { label: away, price: 1.9, maxStake: 500 },
          ],
        },
      ],
    };
    const canonicalId = getCanonicalEventId(unique);
    upsertPartnerEvent(unique);
    await storeSnapshot(createSnapshot(unique, canonicalId));

    const limited: PartnerEvent = {
      ...unique,
      maxStakeUsd: 250,
      markets: [
        {
          type: 'moneyline',
          selections: [
            { label: home, price: 1.95, maxStake: 250 },
            { label: away, price: 1.9, maxStake: 250 },
          ],
        },
      ],
    };
    expect(oddsHash(limited.markets)).toBe(oddsHash(unique.markets));
    expect(limitsHash(limited.markets, limited.maxStakeUsd)).not.toBe(
      limitsHash(unique.markets, unique.maxStakeUsd)
    );
    const r = await storeSnapshot(createSnapshot(limited, canonicalId));
    expect(r.priceChanged).toBe(false);
    expect(r.limitChanged).toBe(true);
  });
});

describe('event alert threshold gating', () => {
  test('price_change below threshold is ignored', () => {
    const cfg: EventAlertConfig = {
      id: 't',
      eventId: '*',
      partnerIds: [],
      trigger: 'price_change',
      threshold: 2,
      actions: ['telegram'],
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const base = {
      canonicalId: 'abc',
      partnerId: 'fonbet',
      partnerEventId: '1',
      event: sampleEvent,
      current: createSnapshot(sampleEvent, 'abc'),
    };
    const small: EventChange = { ...base, kind: 'price_change', changePercent: 1.2 };
    const big: EventChange = { ...base, kind: 'price_change', changePercent: 3.5 };
    expect(matchesEventAlertConfig(cfg, small)).toBe(false);
    expect(matchesEventAlertConfig(cfg, big)).toBe(true);
  });

  test('processEventChanges inserts into shared alerts history', async () => {
    const unique: PartnerEvent = {
      ...sampleEvent,
      id: `alert-${Date.now()}`,
      homeTeam: `AH${Date.now() % 10000}`,
      awayTeam: `AA${Date.now() % 10000}`,
      startTime: '2097-03-01T12:00:00.000Z',
    };
    const canonicalId = getCanonicalEventId(unique);
    const change: EventChange = {
      kind: 'new_event',
      canonicalId,
      partnerId: unique.partnerId,
      partnerEventId: unique.id,
      event: unique,
      previous: null,
      current: createSnapshot(unique, canonicalId),
    };
    const before = listRecentAlerts(5).length;
    const result = await processEventChanges([change]);
    expect(result.fired).toBeGreaterThan(0);
    const recent = listRecentAlerts(20);
    expect(recent.length).toBeGreaterThanOrEqual(before);
    expect(recent.some(a => a.type === 'new_event' && a.title.includes(unique.homeTeam))).toBe(
      true
    );
  });
});

describe('unified alert rules surface', () => {
  test('loadAlertRules includes research event triggers', async () => {
    const configs = await listEventAlertConfigs();
    expect(configs.length).toBeGreaterThan(0);
    const rules = await loadAlertRules();
    const eventRules = rules.filter(r => isEventAlertType(r.type));
    expect(eventRules.length).toBeGreaterThanOrEqual(configs.length);
    expect(eventRules.every(r => r.source === 'research')).toBe(true);
  });
});

describe('research cycle integration', () => {
  test(
    'fixture cycle upserts events and snapshots',
    async () => {
      const result = await runResearchCycle({ live: false });
      expect(result.ok).toBe(true);
      expect(result.markets.length).toBeGreaterThan(0);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.snapshotsStored).toBe(result.events.length);
      expect(result.limitsRecorded).toBe(result.markets.length);
    },
    { timeout: 20_000 }
  );
});
