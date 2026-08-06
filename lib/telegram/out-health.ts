// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// lib/telegram/out-health.ts — per-out balance & connectivity health checks.
//
// Reads outs from the seat-capital desk snapshot (passwordless view:
// book, username, sendTo, display status, optional balance), runs pluggable
// checks, and can alert the ops chat when any out is offline or low-balance.
// Balance data is often absent from the desk view — `balanceFor` is the
// pluggable hook a future provider API can fill (mocked in tests).

import type { SeatCapitalDeskSnapshot } from './seat-desk-snapshot.ts';
import { sendTelegramBotMessage } from './telegram-api.ts';
import { escapeHtml } from './templates/escape.ts';

export type OutHealthStatus = 'ok' | 'offline' | 'low_balance';

export type OutHealthResult = {
  partnerCode: string; // brand-ok — partner CODE
  outNum: string; // brand-ok — seat out token
  book: string;
  username: string;
  status: OutHealthStatus;
  reason: string;
  balance: number | null;
  threshold: number | null;
};

export type OutHealthReport = {
  generatedAt: string;
  checked: number;
  ok: number;
  degraded: OutHealthResult[];
};

export type OutHealthSource = {
  partnerCode: string; // brand-ok — partner CODE
  outNum: string; // brand-ok — seat out token
  book: string;
  username: string;
  sendTo: string;
  displayStatus: string;
  incomplete: boolean;
  balance?: string;
};

/** Flatten the desk snapshot into per-out health sources (passwordless). */
export function enumerateOuts(snapshot: SeatCapitalDeskSnapshot): OutHealthSource[] {
  const out: OutHealthSource[] = [];
  for (const row of snapshot.rows) {
    for (const o of row.outs) {
      out.push({
        partnerCode: row.partnerCode,
        outNum: o.outNum,
        book: o.book,
        username: o.username,
        sendTo: o.sendTo,
        displayStatus: o.status,
        incomplete: o.incomplete,
        ...(o.balance ? { balance: o.balance } : {}),
      });
    }
  }
  return out;
}

/** Connectivity check from the desk view: incomplete, blocked, or missing rail. */
export function checkOutConnectivity(out: OutHealthSource): { degraded: boolean; reason: string } {
  if (out.incomplete) return { degraded: true, reason: 'out incomplete' };
  if (!out.sendTo || out.sendTo.trim() === '')
    return { degraded: true, reason: 'no default send-to' };
  if (out.displayStatus === 'blocked') return { degraded: true, reason: 'display status blocked' };
  return { degraded: false, reason: 'connectivity ok' };
}

/** Parse a "$12,345.67"-style balance string; undefined when absent/unparseable. */
export function parseOutBalance(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const cleaned = raw.replace(/[$,]/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export type OutHealthCheckOpts = {
  snapshot: SeatCapitalDeskSnapshot;
  /** Low-balance threshold; null disables the balance check. */
  minBalance?: number;
  /** Filter to one out (outNum) / partner (partnerCode). */
  outFilter?: string;
  partnerFilter?: string;
  /** Pluggable live balance source (default: the desk view balance field). */
  balanceFor?: (source: OutHealthSource) => number | undefined;
};

/** Run the checks and return a report (never throws). */
export function runOutHealthChecks(opts: OutHealthCheckOpts): OutHealthReport {
  const minBalance = opts.minBalance ?? null;
  const generatedAt = new Date().toISOString();
  const results: OutHealthResult[] = [];

  for (const source of enumerateOuts(opts.snapshot)) {
    if (opts.outFilter && !source.outNum.toUpperCase().includes(opts.outFilter.toUpperCase()))
      continue;
    if (opts.partnerFilter && source.partnerCode !== opts.partnerFilter.toUpperCase()) continue;

    const connectivity = checkOutConnectivity(source);
    const balance = opts.balanceFor?.(source) ?? parseOutBalance(source.balance);
    const lowBalance = minBalance !== null && balance !== null && balance < minBalance;

    const status: OutHealthStatus = connectivity.degraded
      ? 'offline'
      : lowBalance
        ? 'low_balance'
        : 'ok';
    results.push({
      partnerCode: source.partnerCode,
      outNum: source.outNum,
      book: source.book,
      username: source.username,
      status,
      reason: connectivity.degraded
        ? connectivity.reason
        : lowBalance
          ? `balance $${balance!.toFixed(2)} < $${minBalance!}`
          : 'ok',
      balance,
      threshold: minBalance,
    });
  }

  const degraded = results.filter(r => r.status !== 'ok');
  return { generatedAt, checked: results.length, ok: results.length - degraded.length, degraded };
}

/** Ops alert text for degraded outs (Telegram HTML). */
export function buildOutHealthAlertText(report: OutHealthReport): string {
  const lines = [
    `🚨 <b>Out health alert</b> — ${report.degraded.length} degraded of ${report.checked}`,
  ];
  for (const d of report.degraded.slice(0, 20)) {
    lines.push(
      `• <code>${escapeHtml(d.outNum)}</code> (${escapeHtml(d.partnerCode)} · ${escapeHtml(d.book)}) — <b>${escapeHtml(d.status)}</b>: ${escapeHtml(d.reason)}`
    );
  }
  return lines.join('\n');
}

export type AlertOpsOpts = {
  token: string;
  chatId: string; // brand-ok — Telegram chat_id wire
  report: OutHealthReport;
  topicId?: number;
};

/** Send the degraded-outs alert to an ops chat (no-op when nothing degraded). */
export async function alertOpsOnDegraded(opts: AlertOpsOpts): Promise<{ sent: boolean }> {
  if (opts.report.degraded.length === 0) return { sent: false };
  const result = await sendTelegramBotMessage(opts.token, {
    chatId: opts.chatId,
    text: buildOutHealthAlertText(opts.report),
    parseMode: 'HTML',
    messageThreadId: opts.topicId,
  });
  return { sent: result.ok };
}
