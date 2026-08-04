// @see https://bun.com/docs/runtime/sqlite — bun:sqlite (ack log)
// lib/telegram/daily-capacity-report.ts — daily capacity report + delivery log.
//
// Builds a per-partner capacity report from the seat-capital desk snapshot
// (`SeatDeskViewModel` — passwordless out rows with maxBet / bookMaxLine) and
// publishes it to each subscribed partner's `liquidity/outs` forum topic via
// the existing rate-limited Telegram client.
//
// A delivery is recorded in the ops DB (`telegram_daily_report_log`) so the
// inline confirmation callback (`nf:daily:ack:<CALLSIGN>`) can mark it
// acknowledged — the "closing the loop" acknowledgement for partners.

import type { Database } from 'bun:sqlite';

import { openOperationsDb } from '../operations/db.ts';
import { formatUsdAmount } from './seat-desk-book-max.ts';
import { loadPackageGroupForumMetadata } from './package-group-forum.ts';
import { resolveNotificationPreferences } from './partner-notifications.ts';
import { sendTelegramBotMessage } from './telegram-api.ts';

import type { SeatCapitalDeskSnapshot, SeatDeskViewModel } from './seat-desk-snapshot.ts';

// ─── report text ─────────────────────────────────────────────────────────────

/** Passwordless per-partner capacity report (Markdown). */
export function buildDailyCapacityReportText(view: SeatDeskViewModel): string {
  const lines: string[] = [
    `📊 **Daily capacity — ${view.callSign}**`,
    `Fund: **${view.fundStatus}**${view.fundDetail ? ` · ${view.fundDetail}` : ''}`,
    '',
  ];
  if (view.outs.length === 0) {
    lines.push('_No outs on file._');
  }
  for (const out of view.outs) {
    const maxBet =
      out.maxBet && Number.isFinite(Number(out.maxBet))
        ? formatUsdAmount(Number(out.maxBet))
        : out.maxBet;
    lines.push(
      `• ${out.book} · \`${out.username}\` · max ${maxBet}${out.bookMaxLine ? ` · ${out.bookMaxLine}` : ''}`
    );
  }
  return lines.join('\n');
}

// ─── delivery log (ops DB) ───────────────────────────────────────────────────

const DAILY_REPORT_LOG_DDL = `
CREATE TABLE IF NOT EXISTS telegram_daily_report_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_code  TEXT NOT NULL,   -- brand-ok — partner CODE (^[A-Z]{3,6}$)
  delivered_at  TEXT NOT NULL,
  acked_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_telegram_daily_report_code ON telegram_daily_report_log (partner_code, delivered_at);
`;

/** Idempotent — create the ack log table in the ops DB. */
export function ensureDailyReportLog(db: Database): void {
  db.exec(DAILY_REPORT_LOG_DDL);
}

/** Open the ops DB (WAL + shared schema) with the report log ensured. */
export function openDailyReportDb(path?: string): Database {
  const db = openOperationsDb({ path: path ?? undefined, skipInit: false });
  ensureDailyReportLog(db);
  return db;
}

/** Record a delivered report for a partner; returns the log row id. */
export function logDailyReportDelivery(db: Database, partnerCode: string): number {
  const { lastInsertRowid } = db
    .query('INSERT INTO telegram_daily_report_log (partner_code, delivered_at) VALUES (?, ?)')
    .run(partnerCode, new Date().toISOString());
  return Number(lastInsertRowid);
}

/**
 * Acknowledge the most recent un-acked delivery for a partner (inline-button
 * confirm). Returns the number of rows acked (0 = nothing pending).
 */
export function ackDailyReport(db: Database, partnerCode: string): number {
  const { changes } = db
    .query(
      `UPDATE telegram_daily_report_log
       SET acked_at = ?
       WHERE partner_code = ?
         AND acked_at IS NULL
         AND delivered_at = (
           SELECT MAX(delivered_at) FROM telegram_daily_report_log WHERE partner_code = ?
         )`
    )
    .run(new Date().toISOString(), partnerCode, partnerCode);
  return Number(changes);
}

// ─── publisher ───────────────────────────────────────────────────────────────

export type DailyCapacityPublishOpts = {
  token: string;
  snapshot: SeatCapitalDeskSnapshot;
  /** Resolve chat + topic for a partner view; null skips (no forum metadata). */
  targetFor?: (view: SeatDeskViewModel) => Promise<{ chatId: string; topicId?: number } | null>; // brand-ok — Telegram chat_id wire
  /** Per-partner opt-in filter (default: preferences allow dailyCapacity). */
  filter?: (view: SeatDeskViewModel, prefs?: Record<string, boolean | undefined>) => boolean;
  forumsMetaDir?: string;
  logDelivery?: boolean;
  /** Inject a delivery-log DB (tests) — otherwise openDailyReportDb() is used. */
  db?: Database;
};

export type DailyCapacityPublishResult = {
  sent: number;
  skipped: string[]; // brand-ok — partner CODEs skipped (no target or opted out)
  failed: Array<{ partnerCode: string; error: string }>;
};

/**
 * Publish the daily capacity report to every desk row's partner chat.
 * Default target: the partner's package-group forum `liquidity/outs` topic
 * (same resolution `publishSeatCapitalDesk` uses).
 */
export async function publishDailyCapacityReports(
  opts: DailyCapacityPublishOpts
): Promise<DailyCapacityPublishResult> {
  const { token, snapshot } = opts;
  const skipped: string[] = [];
  const failed: DailyCapacityPublishResult['failed'] = [];
  let sent = 0;

  const db = opts.logDelivery ? (opts.db ?? openDailyReportDb()) : null;
  if (db) ensureDailyReportLog(db);

  for (const view of snapshot.rows) {
    if (opts.filter && !opts.filter(view)) {
      skipped.push(view.partnerCode);
      continue;
    }
    let target: { chatId: string; topicId?: number } | null = null; // brand-ok — Telegram chat_id wire
    try {
      if (opts.targetFor) {
        target = await opts.targetFor(view);
      } else {
        const meta = await loadPackageGroupForumMetadata(view.partnerCode, {
          rootDir: opts.forumsMetaDir,
        });
        if (meta?.chatId) {
          target = { chatId: meta.chatId, topicId: meta.topicsThreadMap?.['liquidity/outs'] };
        }
      }
    } catch {
      target = null;
    }
    if (!target?.chatId) {
      skipped.push(view.partnerCode);
      continue;
    }

    try {
      const result = await sendTelegramBotMessage(token, {
        chatId: target.chatId,
        text: buildDailyCapacityReportText(view),
        parseMode: 'Markdown',
        messageThreadId: target.topicId,
      });
      if (result.ok) {
        sent++;
        db && logDailyReportDelivery(db, view.partnerCode);
      } else {
        failed.push({
          partnerCode: view.partnerCode,
          error: result.description ?? `telegram error ${result.errorCode ?? 'unknown'}`,
        });
      }
    } catch (err) {
      failed.push({
        partnerCode: view.partnerCode,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { sent, skipped, failed };
}

/**
 * Cron entry: build the desk snapshot, resolve per-partner preferences from
 * partner profiles, and publish to opted-in partners.
 */
export async function runDailyCapacityReport(
  opts: { intakeDir?: string; profilesDir?: string; token?: string } = {}
): Promise<DailyCapacityPublishResult & { desks: number }> {
  const { buildSeatCapitalDeskSnapshot } = await import('./seat-desk-snapshot.ts');
  const { loadPartnerNotificationPrefs } = await import('./partner-notification-prefs.ts');
  const { loadTelegramEnv } = await import('./telegram-config.ts');

  const env = loadTelegramEnv();
  const token = opts.token ?? env.effectiveToken;
  if (!token) throw new Error('TELEGRAM_BOT_FACTORY not set — run telegram:factory:setup');

  const snapshot = await buildSeatCapitalDeskSnapshot(opts.intakeDir);
  const prefsByCode = await loadPartnerNotificationPrefs(opts.profilesDir);

  const result = await publishDailyCapacityReports({
    token,
    snapshot,
    logDelivery: true,
    filter: view => resolveNotificationPreferences(prefsByCode[view.partnerCode]).dailyCapacity,
  });

  return { ...result, desks: snapshot.rows.length };
}
