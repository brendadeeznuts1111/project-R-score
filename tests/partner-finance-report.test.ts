// @see https://bun.com/docs/test — bun:test
// tests/partner-finance-report.test.ts — finance aggregation + daily report.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  aggregatePartnerFinance,
} from '../lib/partner-profile/finance-report.ts';
import {
  ackFinanceReport,
  buildFinanceReportText,
  logFinanceReportDelivery,
  publishFinanceReports,
} from '../lib/telegram/daily-finance-report.ts';
import { ensurePartnerLedgerSchema } from '../lib/partner-profile/ledger.ts';
import { resetTelegramRateLimiters } from '../lib/telegram/telegram-api.ts';

import { Database } from 'bun:sqlite';

let db: Database;
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  db = new Database(':memory:');
  ensurePartnerLedgerSchema(db);
  resetTelegramRateLimiters();
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  db.close();
  globalThis.fetch = originalFetch;
});

function insertLedger(
  partnerCode: string,
  type: 'initial_capital' | 'deposit' | 'credit' | 'settlement' | 'free_roll',
  amount: number,
  balanceAfter: number,
  createdAt: string,
  seq = 0
): void {
  db.query(
    `INSERT INTO partner_ledger (id, partner_code, type, amount, currency, description, balance_after, created_at)
     VALUES (?, ?, ?, ?, 'usd', NULL, ?, ?)`
  ).run(`ledger-${partnerCode}-${createdAt}-${type}-${seq}`, partnerCode, type, amount, balanceAfter, createdAt);
}

function stubTelegram(resultBuilder: () => { ok: boolean; description?: string } = () => ({ ok: true })) {
  const calls: Array<{ method: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ method: String(input).split('/').pop() ?? '', body: JSON.parse(String(init?.body ?? '{}')) });
    const r = resultBuilder();
    return new Response(
      JSON.stringify(r.ok ? { ok: true, result: { message_id: 7 } } : { ok: false, description: r.description }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }) as typeof globalThis.fetch;
  return calls;
}

describe('aggregatePartnerFinance', () => {
  test('groups entries, net flow, per-type counts and latest balance per partner', () => {
    const now = new Date().toISOString();
    insertLedger('SPEN', 'deposit', 1000, 1000, now, 0);
    insertLedger('SPEN', 'deposit', 500, 1500, now, 1);
    insertLedger('SPEN', 'settlement', -200, 1300, now, 2);
    insertLedger('ASH', 'initial_capital', 2500, 2500, now, 0);

    const summaries = aggregatePartnerFinance(db, { days: 7 });
    expect(summaries).toHaveLength(2);

    const spen = summaries.find(s => s.partnerCode === 'SPEN')!;
    expect(spen.entries).toBe(3);
    expect(spen.netFlow).toBe(1300);
    expect(spen.byType.deposit).toBe(2);
    expect(spen.byType.settlement).toBe(1);
    expect(spen.latestBalance).toBe(1300);

    const ash = summaries.find(s => s.partnerCode === 'ASH')!;
    expect(ash.entries).toBe(1);
    expect(ash.latestBalance).toBe(2500);
  });

  test('honors the partnerCode filter and an empty window', () => {
    insertLedger('SPEN', 'deposit', 100, 100, new Date().toISOString());
    const filtered = aggregatePartnerFinance(db, { days: 7, partnerCode: 'ASH' });
    expect(filtered).toEqual([]);
    // Window strictly after the insert — deterministic empty result.
    const stale = aggregatePartnerFinance(db, {
      days: 1,
      since: new Date(Date.now() + 1000).toISOString(),
    });
    expect(stale).toHaveLength(0);
  });
});

describe('finance report text + delivery', () => {
  test('buildFinanceReportText renders a passwordless markdown summary', () => {
    const summary = aggregatePartnerFinance(db, { days: 7 })[0];
    expect(summary).toBeUndefined();
    const text = buildFinanceReportText({
      partnerCode: 'SPEN',
      entries: 3,
      netFlow: 1300,
      byType: { initial_capital: 0, deposit: 2, credit: 0, settlement: 1, free_roll: 0 },
      latestBalance: 1300,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-08T00:00:00.000Z',
    }, 20);
    expect(text).toContain('**Finance report — SPEN**');
    expect(text).toContain('Net flow: **$1300.00**');
    expect(text).toContain('Latest balance: **$1300.00**');
    expect(text).toContain('Commission: **20%**');
    expect(text).toContain('deposit: 2');
  });

  test('publishFinanceReports sends and logs to opted-in partners', async () => {
    const calls = stubTelegram();
    const summary = {
      partnerCode: 'SPEN',
      entries: 1,
      netFlow: 500,
      byType: { initial_capital: 0, deposit: 1, credit: 0, settlement: 0, free_roll: 0 },
      latestBalance: 500,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-08T00:00:00.000Z',
    };
    const result = await publishFinanceReports({
      token: 'test-token',
      summaries: [summary, { ...summary, partnerCode: 'SKIP' }],
      filter: s => s.partnerCode !== 'SKIP',
      targetFor: async s => ({ chatId: `chat-${s.partnerCode}`, topicId: 3 }),
      logDelivery: true,
      db,
    });
    expect(result.sent).toBe(1);
    expect(result.skipped).toEqual(['SKIP']);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body).toMatchObject({ chat_id: 'chat-SPEN', message_thread_id: 3 });

    const { n } = db
      .query("SELECT COUNT(*) AS n FROM telegram_finance_report_log WHERE partner_code = 'SPEN'")
      .get() as { n: number };
    expect(n).toBe(1);
    expect(ackFinanceReport(db, 'SPEN')).toBe(1);
    expect(ackFinanceReport(db, 'SPEN')).toBe(0);
  });
});
