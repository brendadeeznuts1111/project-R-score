import { describe, expect, test } from 'bun:test';
import {
  buildSeatDeskFieldPickerMarkup,
  buildSeatDeskRailPickerMarkup,
  buildSeatDeskRootMarkup,
  callbackDataUtf8ByteLength,
  listIncompleteOuts,
  parseSeatDeskCallback,
  SEAT_DESK_RAIL_CODE_BY_NAME,
  SEAT_DESK_RAIL_CODES,
} from '../lib/telegram/seat-desk-markup.ts';
import {
  clearSeatDeskPending,
  getSeatDeskPending,
  seatDeskPendingExpiry,
  setSeatDeskPending,
} from '../lib/telegram/seat-desk-pending.ts';
import {
  parseSeatDeskPipeLine,
  validateBookLogin,
  validateSendTo,
} from '../lib/telegram/seat-desk-reply.ts';
import type { SeatIntakeRecord } from '../lib/telegram/seat-capital-desk.ts';
import {
  buildSeatDeskTableCopyBody,
  buildSeatDeskTableCopyReplyLine,
  buildSeatDeskTableCopyText,
  buildSeatDeskTodoCopyText,
} from '../lib/telegram/seat-capital-desk.ts';

const fixture: SeatIntakeRecord = {
  partnerCode: 'SPEN',
  callSign: 'SPEN-001',
  outs: [
    {
      book: 'parlay21.com',
      bookLogin: 'vc2013',
      paymentRail: 'Venmo',
      sendTo: '@filled',
      primary: true,
      outId: 'SPEN-1',
    },
    {
      book: 'lonestarwagering.com',
      bookLogin: 'Yungg1',
      outId: 'SPEN-2',
    },
    {
      book: 'action92.com',
      bookLogin: 'user3',
      paymentRail: 'Zelle',
      outId: 'SPEN-3',
    },
  ],
};

const spenFive: SeatIntakeRecord = {
  partnerCode: 'SPEN',
  callSign: 'SPEN-001',
  outs: [
    { book: 'www.parlay21.com', bookLogin: 'vc2013', outId: 'SPEN-1', primary: true },
    { book: 'www.lonestarwagering.com', bookLogin: 'Yungg1', outId: 'SPEN-2' },
    { book: 'action92.com', outId: 'SPEN-3' },
    { book: 'betvegas23.com', bookLogin: 'Henry019', outId: 'SPEN-4' },
    { book: 'Orange777', bookLogin: 'dmk1064', outId: 'SPEN-5' },
  ],
};

describe('seat-desk callback grammar', () => {
  test('parseSeatDeskCallback covers sd:* ops', () => {
    expect(parseSeatDeskCallback('sd:r:SPEN-001')).toEqual({
      op: 'refresh',
      callSign: 'SPEN-001',
    });
    expect(parseSeatDeskCallback('sd:f:SPEN-001:SPEN-2')).toEqual({
      op: 'fill',
      callSign: 'SPEN-001',
      outId: 'SPEN-2',
    });
    expect(parseSeatDeskCallback('play:noop')).toBeNull();
  });

  test('rail code map round-trips names', () => {
    for (const [code, name] of Object.entries(SEAT_DESK_RAIL_CODES)) {
      expect(SEAT_DESK_RAIL_CODE_BY_NAME[name]).toBe(code);
    }
  });

  test('callback_data stays under 64 UTF-8 bytes', () => {
    const kb = buildSeatDeskRootMarkup(fixture) as {
      inline_keyboard: Array<Array<{ callback_data?: string }>>;
    };
    const all = kb.inline_keyboard
      .flat()
      .map(b => b.callback_data)
      .filter((d): d is string => Boolean(d));
    for (const data of all) {
      expect(callbackDataUtf8ByteLength(data)).toBeLessThanOrEqual(64);
    }
  });
});

describe('seat-desk Fill markup', () => {
  test('buildSeatDeskTableCopyBody uses # column only', () => {
    expect(buildSeatDeskTableCopyBody(spenFive)).toBe(
      [
        'SPEN-001',
        '# BOOK USER DM SEND MAX FP%',
        '1 parlay21.com vc2013 — — — —',
        '2 lonestarwagering.com Yungg1 — — — —',
        '3 action92.com — — — — —',
        '4 betvegas23.com Henry019 — — — —',
        '5 Orange777 dmk1064 — — — —',
      ].join('\n')
    );
  });

  test('buildSeatDeskTodoCopyText lists missing fields per out', () => {
    expect(buildSeatDeskTodoCopyText(spenFive)).toBe(
      [
        'SPEN-001 todos',
        'out 1 need deposit method, send-to, max, fp%',
        'out 2 need deposit method, send-to, max, fp%',
        'out 3 need username, deposit method, send-to, max, fp%',
        'out 4 need deposit method, send-to, max, fp%',
        'out 5 need deposit method, send-to, max, fp%',
      ].join('\n')
    );
  });

  test('buildSeatDeskTableCopyReplyLine targets first incomplete out', () => {
    expect(buildSeatDeskTableCopyReplyLine(spenFive)).toBe('Reply: 1 | Venmo | @handle');
    expect(buildSeatDeskTableCopyReplyLine(fixture)).toBe('Reply: 2 | Venmo | @handle');
  });

  test('buildSeatDeskTableCopyText joins table body and reply', () => {
    expect(buildSeatDeskTableCopyText(spenFive)).toBe(
      `${buildSeatDeskTableCopyBody(spenFive)}\n${buildSeatDeskTableCopyReplyLine(spenFive)}`
    );
  });

  test('buildSeatDeskRootMarkup includes copy buttons', () => {
    const kb = buildSeatDeskRootMarkup(fixture) as {
      inline_keyboard: Array<Array<{ text: string; copy_text?: { text: string } }>>;
    };
    const copyBtns = kb.inline_keyboard.flat().filter(b => b.copy_text);
    expect(copyBtns.map(b => b.text)).toEqual([
      '📋 Copy table',
      '📋 Copy todo',
      '📋 Copy reply',
    ]);
    for (const btn of copyBtns) {
      expect(callbackDataUtf8ByteLength(btn.copy_text!.text)).toBeLessThanOrEqual(256);
    }
  });

  test('Fill buttons use out number not SPEN-N', () => {
    const kb = buildSeatDeskRootMarkup(fixture) as {
      inline_keyboard: Array<Array<{ text: string }>>;
    };
    const labels = kb.inline_keyboard.flat().map(b => b.text);
    expect(labels).toContain('2 · Fill');
    expect(labels).toContain('3 · Fill');
    expect(labels).not.toContain('SPEN-2 · Fill');
  });

  test('field picker offers Username when login missing', () => {
    const kb = buildSeatDeskFieldPickerMarkup('SPEN-001', 'SPEN-3', spenFive) as {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string }>>;
    };
    const row = kb.inline_keyboard[0]!;
    expect(row.map(b => b.text)).toContain('Username');
    expect(row.some(b => b.callback_data?.endsWith(':user'))).toBe(true);
  });
});

describe('seat-desk pending + pipe intake', () => {
  const pendingPath = 'reports/telegram/seat-desk-pending.test.json';

  test('parseSeatDeskPipeLine accepts numeric out id', () => {
    expect(parseSeatDeskPipeLine('2 | Venmo | @handle', spenFive)).toEqual({
      outId: 'SPEN-2',
      paymentRail: 'Venmo',
      sendTo: '@handle',
    });
  });

  test('pending expires and clears', async () => {
    await setSeatDeskPending(
      'test-user',
      {
        callSign: 'SPEN-001',
        outId: 'SPEN-2',
        field: 'sendTo',
        promptMessageId: 1,
        chatId: '-100',
        threadId: 26,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
      pendingPath
    );
    expect(await getSeatDeskPending('test-user', pendingPath)).toBeNull();
    await clearSeatDeskPending('test-user', pendingPath);
  });

  test('validateSendTo rejects empty and overlong', () => {
    expect(validateSendTo('  @ok  ')).toBe('@ok');
    expect(validateSendTo('')).toBeNull();
  });

  test('validateBookLogin rejects empty and overlong', () => {
    expect(validateBookLogin('  vc2013  ')).toBe('vc2013');
    expect(validateBookLogin('')).toBeNull();
  });
});
