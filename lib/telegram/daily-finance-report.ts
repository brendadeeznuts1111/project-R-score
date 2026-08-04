// @see https://bun.com/docs/runtime/sqlite — bun:sqlite (delivery log)
// lib/telegram/daily-finance-report.ts — daily P&L-adjacent report + delivery.
//
// Aggregates `partner_ledger` per partner (entry count, net flow, per-type
// counts, latest balance), renders a Markdown report, and publishes it to each
// opted-in partner's `liquidity/outs` forum topic — the finance counterpart to
// `daily-capacity-report.ts`, sharing the same publisher shape and a dedicated
// ops-DB delivery log (`telegram_finance_report_log`) with inline ack support.

import type { Database } from 'bun:sqlite';

import { openOperationsDb } from '../operations/db.ts';
import {
  aggregatePartnerFinance,
  type PartnerFinanceSummary,
} from '../partner-profile/finance-report.ts';
import { loadPackageGroupForumMetadata } from './package-group-forum.ts';
import { loadPartnerNotificationPrefs } from './partner-notification-prefs.ts';
import { resolveNotificationPreferences } from './partner-notifications.ts';
import { sendTelegramBotMessage } from './telegram-api.ts';

// ─── report text ─────────────────────────────────────────────────────────────

/** Per-partner finance report (Markdown). `commissionPct` optional (0–100). */
export function buildFinanceReportText(
  summary: PartnerFinanceSummary,
  commissionPct?: number
): string {
  const lines: string[] = [
    `💼 **Finance report — ${summary.partnerCode}**`,
    `Window: ${summary.from.slice(0, 10)} → ${summary.to.slice(0, 10)}`,
    '',
    `Entries: **${summary.entries}** · Net flow: **$${summary.netFlow.toFixed(2)}**`,
    `Latest balance: **$${(summary.latestBalance ?? 0).toFixed(2)}**`,
    '',
  ];
  const activeTypes = (Object.entries(summary.byType) as Array<[string, number]>).filter(
    ([, n]) => n > 0
  );
  if (activeTypes.length === 0) {
    lines.push('_No ledger activity in this window._');
  } else {
    for (const [type, n] of activeTypes) lines.push(`• ${type}: ${n}`);
  }
  if (commissionPct != null) {
    lines.push('', `Commission: **${commissionPct}%**`);
  }
  return lines.join('\n');
}

// ─── delivery log (ops DB) ───────────────────────────────────────────────────

const FINANCE_REPORT_LOG_DDL = `
CREATE TABLE IF NOT EXISTS telegram_finance_report_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_code  TEXT NOT NULL,   -- brand-ok — partner CODE (^[A-Z]{3,6}$)
  delivered_at  TEXT NOT NULL,
  acked_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_telegram_finance_report_code ON telegram_finance_report_log (partner_code, delivered_at);
`;

/** Idempotent — create the finance delivery log table in the ops DB. */
export function ensureFinanceReportLog(db: Database): void {
  db.exec(FINANCE_REPORT_LOG_DDL);
}

/** Open the ops DB with the finance log ensured. */
export function openFinanceReportDb(path?: string): Database {
  const db = openOperationsDb({ path: path ?? undefined });
  ensureFinanceReportLog(db);
  return db;
}

/** Record a delivered finance report; returns the log row id. */
export function logFinanceReportDelivery(db: Database, partnerCode: string): number {
  const { lastInsertRowid } = db
    .query('INSERT INTO telegram_finance_report_log (partner_code, delivered_at) VALUES (?, ?)')
    .run(partnerCode, new Date().toISOString());
  return Number(lastInsertRowid);
}

/** Acknowledge the most recent un-acked finance delivery; returns rows acked. */
export function ackFinanceReport(db: Database, partnerCode: string): number {
  const { changes } = db
    .query(
      `UPDATE telegram_finance_report_log
       SET acked_at = ?
       WHERE partner_code = ?
         AND acked_at IS NULL
         AND delivered_at = (
           SELECT MAX(delivered_at) FROM telegram_finance_report_log WHERE partner_code = ?
         )`
    )
    .run(new Date().toISOString(), partnerCode, partnerCode);
  return Number(changes);
}

// ─── publisher ───────────────────────────────────────────────────────────────

export type FinanceReportPublishOpts = {
  token: string;
  summaries: PartnerFinanceSummary[];
  /** Resolve chat + topic for a summary; null skips. */
  targetFor?: (
    summary: PartnerFinanceSummary
  ) => Promise<{ chatId: string; topicId?: number } | null>; // brand-ok — Telegram chat_id wire
  /** Per-partner opt-in filter (default: dailyFinance preference). */
  filter?: (summary: PartnerFinanceSummary, prefs?: Record<string, boolean | undefined>) => boolean;
  /** commissionPct per partner (from profile.settlement.commissionPct). */
  commissionPctByCode?: Record<string, number>;
  forumsMetaDir?: string;
  logDelivery?: boolean;
  /** Inject a delivery-log DB (tests) — otherwise openFinanceReportDb() is used. */
  db?: Database;
};

export type FinanceReportPublishResult = {
  sent: number;
  skipped: string[]; // brand-ok — partner CODEs
  failed: Array<{ partnerCode: string; error: string }>;
};

/** Publish the finance report to every aggregated partner's forum topic. */
export async function publishFinanceReports(
  opts: FinanceReportPublishOpts
): Promise<FinanceReportPublishResult> {
  const { token, summaries } = opts;
  const skipped: string[] = [];
  const failed: FinanceReportPublishResult['failed'] = [];
  let sent = 0;

  const db = opts.logDelivery ? (opts.db ?? openFinanceReportDb()) : null;
  if (db) ensureFinanceReportLog(db);

  for (const summary of summaries) {
    if (opts.filter && !opts.filter(summary)) {
      skipped.push(summary.partnerCode);
      continue;
    }
    let target: { chatId: string; topicId?: number } | null = null; // brand-ok — Telegram chat_id wire
    try {
      if (opts.targetFor) {
        target = await opts.targetFor(summary);
      } else {
        const meta = await loadPackageGroupForumMetadata(summary.partnerCode, {
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
      skipped.push(summary.partnerCode);
      continue;
    }

    try {
      const result = await sendTelegramBotMessage(token, {
        chatId: target.chatId,
        text: buildFinanceReportText(summary, opts.commissionPctByCode?.[summary.partnerCode]),
        parseMode: 'Markdown',
        messageThreadId: target.topicId,
      });
      if (result.ok) {
        sent++;
        db && logFinanceReportDelivery(db, summary.partnerCode);
      } else {
        failed.push({
          partnerCode: summary.partnerCode,
          error: result.description ?? `telegram error ${result.errorCode ?? 'unknown'}`,
        });
      }
    } catch (err) {
      failed.push({
        partnerCode: summary.partnerCode,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { sent, skipped, failed };
}

/**
 * Cron entry: open the ops DB, aggregate the ledger over the window, resolve
 * per-partner dailyFinance prefs, and publish.
 */
export async function runDailyFinanceReport(
  opts: {
    days?: number;
    partnerCode?: string;
    token?: string;
    profilesDir?: string;
    db?: Database;
  } = {}
): Promise<FinanceReportPublishResult & { partners: number }> {
  const { loadTelegramEnv } = await import('./telegram-config.ts');
  const env = loadTelegramEnv();
  const token = opts.token ?? env.effectiveToken;
  if (!token) throw new Error('TELEGRAM_BOT_FACTORY not set — run telegram:factory:setup');

  const db = opts.db ?? openFinanceReportDb();
  try {
    const summaries = aggregatePartnerFinance(db, {
      days: opts.days ?? 7,
      ...(opts.partnerCode ? { partnerCode: opts.partnerCode } : {}),
    });
    const prefsByCode = await loadPartnerNotificationPrefs(opts.profilesDir);
    const result = await publishFinanceReports({
      token,
      summaries,
      db,
      logDelivery: true,
      filter: summary =>
        resolveNotificationPreferences(prefsByCode[summary.partnerCode]).dailyFinance,
    });
    return { ...result, partners: summaries.length };
  } finally {
    if (!opts.db) db.close();
  }
}
