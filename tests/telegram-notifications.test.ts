// @see https://bun.com/docs/test — bun:test
// tests/telegram-notifications.test.ts — partner notification fan-out, daily
// capacity report, and inline confirmation layer (additive to lib/telegram).

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';

import {
  deliverPartnerNotification,
  notifyPartners,
  resolveNotificationPreferences,
  shouldNotify,
  type PartnerNotificationTarget,
} from '../lib/telegram/partner-notifications.ts';
import {
  ackDailyReport,
  buildDailyCapacityReportText,
  logDailyReportDelivery,
  openDailyReportDb,
  publishDailyCapacityReports,
} from '../lib/telegram/daily-capacity-report.ts';
import {
  buildInlineConfirmMarkup,
  handleNotificationCallback,
  isNotificationCallback,
  sendInlineConfirmation,
} from '../lib/telegram/inline-confirmation.ts';
import { resetTelegramRateLimiters } from '../lib/telegram/telegram-api.ts';
import {
  loadPartnerNotificationPrefs,
  loadPartnerNotificationSettings,
} from '../lib/telegram/partner-notification-prefs.ts';
import { validatePartnerProfile } from '../lib/partner-profile/schema.ts';

import type { SeatCapitalDeskSnapshot, SeatDeskViewModel } from '../lib/telegram/seat-desk-snapshot.ts';

const TOKEN = 'test-bot-token';

function seatView(overrides: Partial<SeatDeskViewModel> = {}): SeatDeskViewModel {
  return {
    callSign: 'SPEN-001',
    partnerCode: 'SPEN',
    fundStatus: 'ready',
    fundDetail: '',
    outs: [
      {
        outNum: '1',
        book: 'fantasy402',
        username: 'ezlive',
        depositMethod: 'card',
        sendTo: 'wire',
        maxBet: '500',
        freeplayPct: '0',
        status: 'ready',
        incomplete: false,
      },
    ],
    checklist: [],
    incompleteOuts: 0,
    pinned: false,
    hasTelegramDesk: true,
    deskUpdatedAt: null,
    ...overrides,
  };
}

function snapshot(views: SeatDeskViewModel[]): SeatCapitalDeskSnapshot {
  return {
    schema: 'factorywager.seat-capital-desk.v1',
    generatedAt: new Date().toISOString(),
    desks: views.length,
    blocked: 0,
    partial: 0,
    ready: views.length,
    funded: 0,
    incompleteOuts: 0,
    rows: views,
    partnerViews: [],
    partnerMessageTemplates: [],
    commands: [],
  };
}

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  resetTelegramRateLimiters();
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  rmSync('.tmp/notification-prefs', { recursive: true, force: true });
});

/** Stub api.telegram.org — records bodies, returns ok per the result builder. */
function stubTelegram(resultBuilder: (body: Record<string, unknown>) => { ok: boolean; description?: string } = () => ({ ok: true })) {
  const calls: Array<{ method: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = url.split('/').pop() ?? '';
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    calls.push({ method, body });
    const r = resultBuilder(body);
    return new Response(
      JSON.stringify(r.ok ? { ok: true, result: { message_id: 42 } } : { ok: false, description: r.description }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }) as typeof globalThis.fetch;
  return calls;
}

describe('notification preferences', () => {
  test('defaults are all-on and explicit false wins', () => {
    expect(resolveNotificationPreferences()).toEqual({
      dailyCapacity: true,
      newEvents: true,
      betConfirm: true,
      dailyFinance: true,
    });
    expect(shouldNotify('dailyCapacity')).toBe(true);
    expect(shouldNotify('dailyCapacity', { dailyCapacity: false })).toBe(false);
    expect(shouldNotify('newEvents', { betConfirm: false })).toBe(true);
  });

  test('unknown preference keys are ignored', () => {
    const prefs = resolveNotificationPreferences({ dailyCapacity: false, bogus: true } as never);
    expect(prefs.dailyCapacity).toBe(false);
    expect(prefs.newEvents).toBe(true);
  });

  test('profile loader includes partners with default preferences', async () => {
    mkdirSync('.tmp/notification-prefs', { recursive: true });
    await Bun.write(
      '.tmp/notification-prefs/SPEN.toml',
      `meta.templateId = "partner-active"
meta.name = "Test"
meta.version = "1.0.0"
meta.source = "telegram"
identity.code = "SPEN"
identity.callSign = "SPEN-001"
identity.status = "onboarded"
lifecycle.status = "active"
lifecycle.phase = "operator_ready"
settlement.commissionPct = 20
`
    );
    expect(await loadPartnerNotificationPrefs('.tmp/notification-prefs')).toEqual({ SPEN: {} });
    expect(await loadPartnerNotificationSettings('.tmp/notification-prefs')).toEqual({
      SPEN: { preferences: {}, commissionPct: 20 },
    });
  });
});

describe('profile schema telegram.preferences', () => {
  function baseProfile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      meta: { templateId: 'partner-active', name: 'Test', version: '1.0.0', source: 'telegram' },
      identity: { code: 'YOU', callSign: 'YOU-001', status: 'onboarded' },
      lifecycle: { status: 'active', phase: 'operator_ready' },
      ...overrides,
    };
  }

  test('accepts boolean preferences', () => {
    const result = validatePartnerProfile(
      baseProfile({ telegram: { chatId: '12345', preferences: { dailyCapacity: false } } })
    );
    expect(result.valid).toBe(true);
  });

  test('rejects non-boolean preference values', () => {
    const result = validatePartnerProfile(
      baseProfile({ telegram: { preferences: { dailyCapacity: 'yes' } } })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some(i => i.includes('telegram.preferences.dailyCapacity'))).toBe(true);
    }
  });
});

describe('notification delivery', () => {
  test('deliverPartnerNotification posts sendMessage with chat/topic', async () => {
    const calls = stubTelegram();
    const target: PartnerNotificationTarget = {
      partnerCode: 'SPEN',
      chatId: '999',
      topicId: 12,
    };
    const result = await deliverPartnerNotification(TOKEN, target, {
      text: '**hello**',
      parseMode: 'Markdown',
    });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe('sendMessage');
    expect(calls[0]!.body).toMatchObject({
      chat_id: '999',
      text: '**hello**',
      parse_mode: 'Markdown',
      message_thread_id: 12,
    });
  });

  test('notifyPartners continues past a failing chat', async () => {
    stubTelegram(body =>
      String(body.chat_id) === 'bad' ? { ok: false, description: 'chat not found' } : { ok: true }
    );
    const result = await notifyPartners(
      TOKEN,
      [
        { partnerCode: 'SPEN', chatId: 'good' },
        { partnerCode: 'BAD', chatId: 'bad' },
      ],
      { text: 'hi' }
    );
    expect(result.delivered).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.partnerCode).toBe('BAD');
  });
});

describe('daily capacity report', () => {
  test('builds passwordless markdown from a seat view', () => {
    const text = buildDailyCapacityReportText(seatView());
    expect(text).toContain('<b>Daily capacity — SPEN-001</b>');
    expect(text).toContain('Fund: <b>ready</b>');
    expect(text).toContain('fantasy402');
    expect(text).toContain('ezlive');
    expect(text).not.toContain('password');
  });

  test('empty outs render a placeholder', () => {
    const text = buildDailyCapacityReportText(seatView({ outs: [] }));
    expect(text).toContain('No outs on file');
  });

  test('publishes to opted-in partners and skips filtered ones', async () => {
    const calls = stubTelegram();
    const db = openDailyReportDb(':memory:');
    const result = await publishDailyCapacityReports({
      token: TOKEN,
      snapshot: snapshot([
        seatView({ partnerCode: 'SPEN', callSign: 'SPEN-001' }),
        seatView({ partnerCode: 'SKIP', callSign: 'SKIP-001' }),
      ]),
      filter: view => view.partnerCode !== 'SKIP',
      targetFor: async view => ({ chatId: `chat-${view.partnerCode}`, topicId: 5 }),
      logDelivery: true,
      db,
    });
    expect(result.sent).toBe(1);
    expect(result.skipped).toEqual(['SKIP']);
    expect(result.failed).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.chat_id).toBe('chat-SPEN');
    expect(calls[0]!.body.message_thread_id).toBe(5);
    expect(calls[0]!.body.parse_mode).toBe('HTML');
    expect(calls[0]!.body.reply_markup).toBeDefined();

    const { n } = db
      .query("SELECT COUNT(*) AS n FROM telegram_daily_report_log WHERE partner_code = 'SPEN'")
      .get() as { n: number };
    expect(n).toBe(1);
    db.close();
  });
});

describe('inline confirmation', () => {
  test('markup carries confirm + cancel rows with callback data', () => {
    const markup = buildInlineConfirmMarkup('nf:daily:ack:SPEN', '✅ Acknowledge');
    const keyboard = markup.inline_keyboard as Array<Array<{ text: string; callback_data: string }>>;
    expect(keyboard).toHaveLength(2);
    expect(keyboard[0]![0]).toMatchObject({ text: '✅ Acknowledge', callback_data: 'nf:daily:ack:SPEN' });
    expect(keyboard[1]![0]!.callback_data).toBe('nf:daily:ack:SPEN|cancel');
    expect(() => buildInlineConfirmMarkup(`nf:${'x'.repeat(64)}`, 'Too long')).toThrow(
      '1–64 bytes'
    );
  });

  test('callback routing acks the latest delivery in the ops DB', () => {
    const db = openDailyReportDb(':memory:');
    logDailyReportDelivery(db, 'SPEN');
    expect(isNotificationCallback('nf:daily:ack:SPEN')).toBe(true);
    expect(isNotificationCallback('sd:r:SPEN-001')).toBe(false);

    const result = handleNotificationCallback({ data: 'nf:daily:ack:SPEN', db });
    expect(result.acked).toBe(true);
    expect(result.toast).toContain('acknowledged');
    expect(ackDailyReport(db, 'SPEN')).toBe(0); // nothing pending anymore

    const again = handleNotificationCallback({ data: 'nf:daily:ack:SPEN', db });
    expect(again.acked).toBeUndefined();
    expect(again.toast).toContain('Nothing pending');
    expect(
      handleNotificationCallback({ data: 'nf:daily:ack:SPEN|cancel', db }).toast
    ).toBe('Cancelled.');
    expect(handleNotificationCallback({ data: 'nf:daily:ack:../x', db }).toast).toContain(
      'Unknown'
    );
    db.close();
  });

  test('sendInlineConfirmation posts reply_markup inline_keyboard', async () => {
    const calls = stubTelegram();
    const result = await sendInlineConfirmation({
      token: TOKEN,
      chatId: '999',
      text: 'Confirm?',
      data: 'nf:daily:ack:SPEN',
      confirmLabel: 'Yes',
    });
    expect(result.ok).toBe(true);
    const body = calls[0]!.body;
    expect((body.reply_markup as { inline_keyboard: unknown[] }).inline_keyboard).toHaveLength(2);
  });
});
