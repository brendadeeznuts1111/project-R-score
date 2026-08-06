// @see https://bun.com/docs/test — bun:test
// tests/telegram-event-alerts.test.ts — stream-list-v2 parsing + seen-set + fan-out.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  buildEventAlertText,
  eventKeyOf,
  fetchStreamFeed,
  isEventSeen,
  parseStreamListPayload,
  recordEventSeen,
  runEventAlertScan,
  type StreamFeed,
} from '../lib/telegram/event-alerts.ts';
import { shouldNotifyEvent } from '../lib/telegram/partner-notifications.ts';
import { resetTelegramRateLimiters } from '../lib/telegram/telegram-api.ts';
import { openEventAlertsDb } from '../lib/telegram/event-alerts.ts';

import type { Database } from 'bun:sqlite';

let db: Database;
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  db = openEventAlertsDb(':memory:');
  resetTelegramRateLimiters();
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  db.close();
  globalThis.fetch = originalFetch;
});

const REAL_PAYLOAD = {
  sports: {
    tennis: {
      events: {
        '39779797': {
          sport: 'Tennis',
          league: 'ITF - Fano (M)',
          competitiors: { home: 'Iiro Vasa', away: 'Filip Jeff Planinsek' },
          stream_id: 39779797,
        },
        '39779823': {
          sport: 'Tennis',
          league: 'ITF - Fano (M)',
          competitiors: { home: 'A', away: 'B' },
          stream_id: 39779823,
        },
      },
    },
    soccer: {
      '123': { sport: 'Soccer', league: 'X', competitiors: { home: 'C', away: 'D' }, stream_id: 123 },
    },
    bogus: 'not-an-object',
  },
};

describe('stream feed parsing (grounded on the real payload shape)', () => {
  test('parses sports → events with the real competitiors key', () => {
    const feeds = parseStreamListPayload(REAL_PAYLOAD);
    expect(feeds.map(f => f.sport)).toEqual(['tennis', 'soccer']);
    const tennis = feeds.find(f => f.sport === 'tennis')!;
    expect(tennis.events).toHaveLength(2);
    expect(tennis.events[0]).toMatchObject({
      sport: 'tennis',
      league: 'ITF - Fano (M)',
      home: 'Iiro Vasa',
      away: 'Filip Jeff Planinsek',
      eventId: '39779797',
    });
  });

  test('skips malformed sports and events', () => {
    const feeds = parseStreamListPayload({ sports: { bogus: 'nope', empty: {} } });
    expect(feeds).toEqual([]);
    expect(parseStreamListPayload(null)).toEqual([]);
  });

  test('also accepts the legacy unwrapped event map', () => {
    const feeds = parseStreamListPayload({
      sports: {
        tennis: {
          '1': {
            sport: 'Tennis',
            league: 'L',
            competitiors: { home: 'A', away: 'B' },
            stream_id: 1,
          },
        },
      },
    });
    expect(feeds[0]?.events[0]?.eventId).toBe('1');
  });

  test('fetchStreamFeed hits the endpoint and parses', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(REAL_PAYLOAD), { status: 200 })) as typeof globalThis.fetch;
    const feeds = await fetchStreamFeed('https://example.test/stream-list-v2/', globalThis.fetch);
    expect(feeds.length).toBeGreaterThanOrEqual(2);
  });
});

describe('seen-set + alert scan', () => {
  function feed(events: Array<[string, string]>): StreamFeed[] {
    return [
      {
        sport: 'tennis',
        events: events.map(([eventId, home]) => ({
          sport: 'tennis',
          league: 'L',
          home,
          away: 'Rival',
          eventId,
          streamId: Number(eventId),
        })),
      },
    ];
  }

  test('baseline records without alerting; second scan alerts only new keys', async () => {
    const calls: Array<Record<string, unknown>> = [];
    globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body ?? '{}')));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }) as typeof globalThis.fetch;

    const token = 'test-token';
    const targetFor = async () => ({ chatId: 'chat', topicId: 5 });

    const baseline = await runEventAlertScan({
      token,
      db,
      baseline: true,
      feed: feed([['1', 'Vasa'], ['2', 'Other']]),
      targetFor,
      prefsByCode: { SPEN: {} },
    });
    expect(baseline.seen).toBe(2);
    expect(baseline.alerted).toBe(0);
    expect(calls).toHaveLength(0);
    expect(isEventSeen(db, eventKeyOf('tennis', '1'))).toBe(true);

    // Second scan: event '1' is old, '3' is new → one alert.
    const second = await runEventAlertScan({
      token,
      db,
      feed: feed([['1', 'Vasa'], ['3', 'Newcomer']]),
      targetFor,
      prefsByCode: { SPEN: {} },
    });
    expect(second.seen).toBe(1);
    expect(second.alerted).toBe(1);
    expect(calls).toHaveLength(1);
    expect(String(calls[0]!.text)).toContain('Newcomer vs Rival');
    expect(calls[0]!.message_thread_id).toBe(5);
  });

  test('alert text is passwordless and readable', () => {
    const text = buildEventAlertText({
      sport: 'tennis',
      league: 'Setka Cup',
      home: 'Ihor Dubinin',
      away: 'Pavlo Shulhachyk',
      eventId: 'x',
      streamId: 1,
    });
    expect(text).toContain('Ihor Dubinin vs Pavlo Shulhachyk');
    expect(text).toContain('Setka Cup');
    expect(
      buildEventAlertText({
        sport: 'tennis',
        league: '<script>',
        home: 'A & B',
        away: '<C>',
        eventId: 'escaped',
        streamId: 2,
      })
    ).toContain('A &amp; B vs &lt;C&gt;');
  });

  test('recordEventSeen is idempotent', () => {
    recordEventSeen(db, 'tennis|1');
    recordEventSeen(db, 'tennis|1');
    const { n } = db.query('SELECT COUNT(*) AS n FROM telegram_event_alerts_seen').get() as { n: number };
    expect(n).toBe(1);
  });
});

describe('per-sport preference filtering', () => {
  test('shouldNotifyEvent respects newEvents + newEventsSports', () => {
    expect(shouldNotifyEvent('tennis')).toBe(true); // defaults: all sports
    expect(shouldNotifyEvent('tennis', { newEvents: false })).toBe(false);
    expect(shouldNotifyEvent('tennis', { newEventsSports: ['soccer'] })).toBe(false);
    expect(shouldNotifyEvent('tennis', { newEventsSports: ['soccer', 'tennis'] })).toBe(true);
    expect(shouldNotifyEvent('Tennis', { newEventsSports: ['tennis'] })).toBe(true); // case-insensitive
    expect(shouldNotifyEvent('tennis', { newEventsSports: [' Tennis '] })).toBe(true);
  });
});
