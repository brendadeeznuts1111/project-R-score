// @see https://bun.com/docs/runtime/sqlite — bun:sqlite (seen-set)
// lib/telegram/event-alerts.ts — real-time new-event alerts (stream-list-v2).
//
// Polls the external `stream-list-v2` feed (the repo's first consumer of it),
// extracts normalized events, records every seen event key in the ops DB, and
// fans out a "new event" alert to partners subscribed to that sport via the
// notification layer (`newEvents` + `newEventsSports` preferences).
//
// First scan is a baseline: it records seen keys without alerting, so a fresh
// start never spams. Subsequent scans alert only on genuinely new keys.

import type { Database } from 'bun:sqlite';

import { openOperationsDb } from '../operations/db.ts';
import { loadPackageGroupForumMetadata } from './package-group-forum.ts';
import { loadPartnerNotificationPrefs } from './partner-notification-prefs.ts';
import {
  notifyPartners,
  shouldNotifyEvent,
  type TelegramNotificationPreferences,
} from './partner-notifications.ts';
import { sendTelegramBotMessage } from './telegram-api.ts';

export const STREAM_LIST_URL = 'https://api-gs.player-us.xyz/stream-list-v2/?tv=usa';

export type StreamEvent = {
  sport: string;
  league: string;
  home: string;
  away: string;
  eventId: string; // brand-ok — opaque stream event key
  streamId: number;
};

/** Normalized feed: one entry per (sport, eventId). */
export type StreamFeed = {
  sport: string;
  events: StreamEvent[];
};

/**
 * Parse the real stream-list-v2 payload: `d.sports[sport][eventId] = {
 * sport, league, competitiors: { home, away }, stream_id, … }`.
 * Malformed entries are skipped.
 */
export function parseStreamListPayload(payload: unknown): StreamFeed[] {
  const out: StreamFeed[] = [];
  if (!payload || typeof payload !== 'object') return out;
  const sports = (payload as { sports?: unknown }).sports;
  if (!sports || typeof sports !== 'object') return out;

  for (const [sport, events] of Object.entries(sports as Record<string, unknown>)) {
    if (!events || typeof events !== 'object') continue;
    const parsed: StreamEvent[] = [];
    for (const [eventId, raw] of Object.entries(events as Record<string, unknown>)) {
      if (!raw || typeof raw !== 'object') continue;
      const e = raw as {
        sport?: unknown;
        league?: unknown;
        competitiors?: { home?: unknown; away?: unknown };
        stream_id?: unknown;
      };
      const home = e.competitiors?.home;
      const away = e.competitiors?.away;
      if (typeof e.sport !== 'string' || typeof home !== 'string' || typeof away !== 'string') {
        continue;
      }
      parsed.push({
        sport: sport.toLowerCase(),
        league: typeof e.league === 'string' ? e.league : sport,
        home,
        away,
        eventId,
        streamId: typeof e.stream_id === 'number' ? e.stream_id : Number(eventId),
      });
    }
    if (parsed.length > 0) out.push({ sport, events: parsed });
  }
  return out;
}

export async function fetchStreamFeed(
  url = STREAM_LIST_URL,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): Promise<StreamFeed[]> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`stream-list-v2 ${res.status}`);
  const payload = (await res.json()) as unknown;
  return parseStreamListPayload(payload);
}

// ─── seen-set (ops DB) ───────────────────────────────────────────────────────

const EVENT_ALERTS_SEEN_DDL = `
CREATE TABLE IF NOT EXISTS telegram_event_alerts_seen (
  event_key     TEXT PRIMARY KEY,   -- brand-ok — sport|eventId composite
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL
);
`;

export function ensureEventAlertsSeen(db: Database): void {
  db.exec(EVENT_ALERTS_SEEN_DDL);
}

export function openEventAlertsDb(path?: string): Database {
  const db = openOperationsDb({ path: path ?? undefined });
  ensureEventAlertsSeen(db);
  return db;
}

export function isEventSeen(db: Database, eventKey: string): boolean {
  return (
    db.query('SELECT 1 FROM telegram_event_alerts_seen WHERE event_key = ?').get(eventKey) !== null
  );
}

export function recordEventSeen(db: Database, eventKey: string): void {
  const now = new Date().toISOString();
  db.query(
    `INSERT INTO telegram_event_alerts_seen (event_key, first_seen_at, last_seen_at)
     VALUES (?, ?, ?)
     ON CONFLICT (event_key) DO UPDATE SET last_seen_at = excluded.last_seen_at`
  ).run(eventKey, now, now);
}

export function eventKeyOf(
  sport: string,
  eventId: string // brand-ok — opaque stream event key
): string {
  return `${sport}|${eventId}`;
}

// ─── alert message ───────────────────────────────────────────────────────────

export function buildEventAlertText(event: StreamEvent): string {
  return `🎾 New ${event.sport} match: **${event.home} vs ${event.away}**\nLeague: ${event.league}`;
}

// ─── scan + fan-out ──────────────────────────────────────────────────────────

export type EventAlertScanOpts = {
  token: string;
  feed: StreamFeed[];
  /** Resolve chat + topic for a partner; null skips. Default: forum liquidity/outs topic. */
  targetFor?: (partnerCode: string) => Promise<{ chatId: string; topicId?: number } | null>; // brand-ok — Telegram chat_id wire
  /** First scan is baseline (record seen, no alerts). */
  baseline?: boolean;
  forumsMetaDir?: string;
  profilesDir?: string;
  /** Inject partner prefs (tests) — otherwise loaded from profilesDir. */
  prefsByCode?: Record<string, TelegramNotificationPreferences>;
  db?: Database;
  /** Per-sport partner filter override (default: shouldNotifyEvent). */
  filter?: (partnerCode: string, sport: string, prefs?: unknown) => boolean;
};

export type EventAlertScanResult = {
  seen: number; // new event keys recorded this scan
  alerted: number; // partner notifications sent
  skippedPartners: number;
  failed: Array<{ eventKey: string; error: string }>;
};

/** Record new keys and alert subscribed partners for each new event. */
export async function runEventAlertScan(opts: EventAlertScanOpts): Promise<EventAlertScanResult> {
  const db = opts.db ?? openEventAlertsDb();
  if (opts.db) ensureEventAlertsSeen(db);
  const prefsByCode = opts.prefsByCode ?? (await loadPartnerNotificationPrefs(opts.profilesDir));
  let seen = 0;
  let alerted = 0;
  let skippedPartners = 0;
  const failed: EventAlertScanResult['failed'] = [];

  try {
    for (const feed of opts.feed) {
      for (const event of feed.events) {
        const key = eventKeyOf(feed.sport, event.eventId);
        if (isEventSeen(db, key)) continue;
        recordEventSeen(db, key);
        seen++;
        if (opts.baseline) continue; // first scan: record only

        for (const [partnerCode, prefs] of Object.entries(prefsByCode)) {
          const wants = opts.filter
            ? opts.filter(partnerCode, feed.sport, prefs)
            : shouldNotifyEvent(feed.sport, prefs);
          if (!wants) {
            skippedPartners++;
            continue;
          }
          let target: { chatId: string; topicId?: number } | null = null; // brand-ok — Telegram chat_id wire
          try {
            target = opts.targetFor
              ? await opts.targetFor(partnerCode)
              : await defaultTargetFor(partnerCode, opts.forumsMetaDir);
          } catch {
            target = null;
          }
          if (!target?.chatId) {
            skippedPartners++;
            continue;
          }
          try {
            const result = await sendTelegramBotMessage(opts.token, {
              chatId: target.chatId,
              text: buildEventAlertText(event),
              parseMode: 'Markdown',
              messageThreadId: target.topicId,
            });
            if (result.ok) alerted++;
            else failed.push({ eventKey: key, error: result.description ?? 'telegram error' });
          } catch (err) {
            failed.push({ eventKey: key, error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
    }
    return { seen, alerted, skippedPartners, failed };
  } finally {
    if (!opts.db) db.close();
  }
}

async function defaultTargetFor(
  partnerCode: string,
  forumsMetaDir?: string
): Promise<{ chatId: string; topicId?: number } | null> {
  // brand-ok — Telegram chat_id wire
  const meta = await loadPackageGroupForumMetadata(partnerCode, { rootDir: forumsMetaDir });
  if (!meta?.chatId) return null;
  return { chatId: meta.chatId, topicId: meta.topicsThreadMap?.['liquidity/outs'] };
}

/**
 * Cron entry: fetch the feed, scan, and alert. First run acts as baseline so a
 * fresh process never spams the full event set.
 */
export async function runEventAlerts(
  opts: { token?: string; baseline?: boolean; db?: Database } = {}
): Promise<EventAlertScanResult & { feeds: number; firstRun: boolean }> {
  const { loadTelegramEnv } = await import('./telegram-config.ts');
  const env = loadTelegramEnv();
  const token = opts.token ?? env.effectiveToken;
  if (!token) throw new Error('TELEGRAM_BOT_FACTORY not set — run telegram:factory:setup');

  const feed = await fetchStreamFeed();
  const db = opts.db ?? openEventAlertsDb();
  const firstRun = db.query('SELECT COUNT(*) AS n FROM telegram_event_alerts_seen').get() as {
    n: number;
  };
  const baseline = opts.baseline ?? firstRun.n === 0;

  const result = await runEventAlertScan({ token, feed, db, baseline });
  return { ...result, feeds: feed.length, firstRun: baseline };
}

export { notifyPartners };
