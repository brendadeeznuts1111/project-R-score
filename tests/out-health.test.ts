// @see https://bun.com/docs/test — bun:test
// tests/out-health.test.ts — per-out balance & connectivity health checks.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  alertOpsOnDegraded,
  buildOutHealthAlertText,
  checkOutConnectivity,
  enumerateOuts,
  parseOutBalance,
  runOutHealthChecks,
} from '../lib/telegram/out-health.ts';
import { resetTelegramRateLimiters } from '../lib/telegram/telegram-api.ts';

import type { SeatCapitalDeskSnapshot, SeatDeskViewModel } from '../lib/telegram/seat-desk-snapshot.ts';

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  resetTelegramRateLimiters();
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function outView(overrides: Record<string, unknown> = {}): SeatDeskViewModel {
  return {
    callSign: 'SPEN-001',
    partnerCode: 'SPEN',
    fundStatus: 'ready',
    fundDetail: '',
    outs: [
      {
        outNum: 'OUT-1',
        book: 'fantasy402',
        username: 'ezlive',
        depositMethod: 'card',
        sendTo: 'wire',
        maxBet: '500',
        freeplayPct: '0',
        status: 'ready',
        incomplete: false,
        ...overrides,
      },
    ],
    checklist: [],
    incompleteOuts: 0,
    pinned: false,
    hasTelegramDesk: true,
    deskUpdatedAt: null,
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

describe('out health checks', () => {
  test('connectivity flags incomplete / blocked / missing send-to outs', () => {
    expect(
      checkOutConnectivity({
        partnerCode: 'SPEN', outNum: 'OUT-1', book: 'b', username: 'u', sendTo: 'wire',
        displayStatus: 'ready', incomplete: false,
      }).degraded
    ).toBe(false);
    expect(
      checkOutConnectivity({
        partnerCode: 'SPEN', outNum: 'OUT-2', book: 'b', username: 'u', sendTo: 'wire',
        displayStatus: 'ready', incomplete: true,
      }).degraded
    ).toBe(true);
    expect(
      checkOutConnectivity({
        partnerCode: 'SPEN', outNum: 'OUT-3', book: 'b', username: 'u', sendTo: '',
        displayStatus: 'ready', incomplete: false,
      }).degraded
    ).toBe(true);
  });

  test('parseOutBalance handles dollar formats and garbage', () => {
    expect(parseOutBalance('$12,345.67')).toBe(12345.67);
    expect(parseOutBalance('500')).toBe(500);
    expect(parseOutBalance(undefined)).toBeNull();
    expect(parseOutBalance('n/a')).toBeNull();
    expect(parseOutBalance('$12oops')).toBeNull();
  });

  test('runOutHealthChecks reports ok / offline / low_balance with a pluggable balance', () => {
    const report = runOutHealthChecks({
      snapshot: snapshot([
        outView({ outNum: 'OUT-1' }),
        outView({ outNum: 'OUT-2', incomplete: true }),
        outView({ outNum: 'OUT-3' }),
      ]),
      minBalance: 500,
      balanceFor: source => (source.outNum === 'OUT-3' ? 100 : undefined),
    });
    expect(report.checked).toBe(3);
    expect(report.ok).toBe(1);
    const byOut = new Map(report.degraded.map(d => [d.outNum, d]));
    expect(byOut.get('OUT-2')!.status).toBe('offline');
    expect(byOut.get('OUT-3')!.status).toBe('low_balance');
    expect(byOut.get('OUT-3')!.threshold).toBe(500);
    expect(byOut.get('OUT-3')!.balance).toBe(100);
  });

  test('filters by out and partner', () => {
    const report = runOutHealthChecks({
      snapshot: snapshot([outView({ outNum: 'OUT-1' }), outView({ outNum: 'OUT-2' })]),
      outFilter: 'OUT-2',
    });
    expect(report.checked).toBe(1);
    expect(report.degraded).toEqual([]);
  });

  test('enumerateOuts flattens rows → outs with balance when present', () => {
    const sources = enumerateOuts(snapshot([outView({ balance: '$1,000.00' })]));
    expect(sources).toHaveLength(1);
    expect(sources[0]!.balance).toBe('$1,000.00');
  });

  test('alert text lists degraded outs and is sent to ops (stub)', async () => {
    const report = runOutHealthChecks({
      snapshot: snapshot([outView({ outNum: 'OUT-1', incomplete: true })]),
    });
    const text = buildOutHealthAlertText(report);
    expect(text).toContain('1 degraded of 1');
    expect(text).toContain('OUT-1');

    const calls: Array<Record<string, unknown>> = [];
    globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body ?? '{}')));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }) as typeof globalThis.fetch;

    const { sent } = await alertOpsOnDegraded({
      token: 't',
      chatId: 'ops',
      report,
    });
    expect(sent).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.chat_id).toBe('ops');
    expect(String(calls[0]!.text)).toContain('OUT-1');

    // Nothing degraded → no alert sent.
    const healthy = runOutHealthChecks({ snapshot: snapshot([outView()]) });
    expect((await alertOpsOnDegraded({ token: 't', chatId: 'ops', report: healthy })).sent).toBe(false);
  });
});
