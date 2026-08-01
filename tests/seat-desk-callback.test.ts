import { describe, expect, test } from 'bun:test';
import {
  buildAdoptBookMaxCallbackData,
  buildSeatDeskAdoptBookMaxConfirmMarkup,
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
  validateFreeplay,
  validateMaxBet,
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
    expect(parseSeatDeskCallback('sd:p:SPEN-001:SPEN-1:max')).toEqual({
      op: 'pick',
      callSign: 'SPEN-001',
      outId: 'SPEN-1',
      field: 'max',
    });
    expect(parseSeatDeskCallback('sd:p:SPEN-001:SPEN-1:fp')).toEqual({
      op: 'pick',
      callSign: 'SPEN-001',
      outId: 'SPEN-1',
      field: 'fp',
    });
    expect(parseSeatDeskCallback('sd:bm:SPEN-001:SPEN-1')).toEqual({
      op: 'adoptBookMax',
      callSign: 'SPEN-001',
      outId: 'SPEN-1',
    });
    expect(parseSeatDeskCallback('sd:bmy:SPEN-001:SPEN-1')).toEqual({
      op: 'confirmAdoptBookMax',
      callSign: 'SPEN-001',
      outId: 'SPEN-1',
    });
    // Confirm adopt must not be parsed as bare back (`sd:b:`)
    expect(parseSeatDeskCallback('sd:b:SPEN-001')).toEqual({
      op: 'back',
      callSign: 'SPEN-001',
    });
    expect(parseSeatDeskCallback('play:noop')).toBeNull();
  });

  test('buildAdoptBookMaxCallbackData stays under 64 UTF-8 bytes', () => {
    const offer = buildAdoptBookMaxCallbackData('SPEN-001', 'SPEN-1', 'offer');
    const confirm = buildAdoptBookMaxCallbackData('SPEN-001', 'SPEN-12', 'confirm');
    expect(offer).toBe('sd:bm:SPEN-001:SPEN-1');
    expect(confirm).toBe('sd:bmy:SPEN-001:SPEN-12');
    expect(callbackDataUtf8ByteLength(offer)).toBeLessThanOrEqual(64);
    expect(callbackDataUtf8ByteLength(confirm)).toBeLessThanOrEqual(64);
    expect(parseSeatDeskCallback(offer)?.op).toBe('adoptBookMax');
    expect(parseSeatDeskCallback(confirm)?.op).toBe('confirmAdoptBookMax');
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

  test('buildSeatDeskRootMarkup includes portal dossier URL beside Refresh', () => {
    const kb = buildSeatDeskRootMarkup(fixture) as {
      inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
    };
    const dossier = kb.inline_keyboard.flat().find(b => b.text === '📁 Dossier');
    expect(dossier?.url).toContain('/portal/account/?account=');
    expect(dossier?.url).toMatch(/account=SPEN|account=SPEN-001/);
    const refresh = kb.inline_keyboard.flat().find(b => b.text === '↻ Refresh');
    expect(refresh?.callback_data).toMatch(/^sd:r:/);
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

  test('field picker offers Max bet and FP% when fund fields complete', () => {
    const termsOnly: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        {
          book: 'parlay21.com',
          bookLogin: 'vc2013',
          paymentRail: 'Venmo',
          sendTo: '@filled',
          outId: 'SPEN-1',
          primary: true,
        },
      ],
    };
    const kb = buildSeatDeskFieldPickerMarkup('SPEN-001', 'SPEN-1', termsOnly) as {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string }>>;
    };
    const labels = kb.inline_keyboard[0]!.map(b => b.text);
    expect(labels).toContain('Max bet');
    expect(labels).toContain('FP%');
    expect(labels).not.toContain('Username');
  });

  test('field picker offers Use book max when bookMax differs from desk maxBet', () => {
    const withDeskMax: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        {
          book: 'draftkings.com',
          bookLogin: 'dk',
          paymentRail: 'Venmo',
          sendTo: '@filled',
          maxBet: '$500',
          freeplay: '25%',
          outId: 'SPEN-1',
          primary: true,
        },
      ],
    };
    const kb = buildSeatDeskFieldPickerMarkup('SPEN-001', 'SPEN-1', withDeskMax, {
      bookMax: 1500,
    }) as {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string }>>;
    };
    const flat = kb.inline_keyboard.flat();
    const adopt = flat.find(b => b.callback_data?.startsWith('sd:bm:'));
    expect(adopt?.text).toBe('Use book $1,500');
    expect(adopt?.callback_data).toBe('sd:bm:SPEN-001:SPEN-1');
    expect(callbackDataUtf8ByteLength(adopt!.callback_data!)).toBeLessThanOrEqual(64);
  });

  test('field picker omits adopt when desk maxBet already matches book max', () => {
    const matched: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        {
          book: 'draftkings.com',
          bookLogin: 'dk',
          paymentRail: 'Venmo',
          sendTo: '@filled',
          maxBet: '$1,500',
          freeplay: '25%',
          outId: 'SPEN-1',
          primary: true,
        },
      ],
    };
    const kb = buildSeatDeskFieldPickerMarkup('SPEN-001', 'SPEN-1', matched, {
      bookMax: 1500,
    }) as {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string }>>;
    };
    const flat = kb.inline_keyboard.flat();
    expect(flat.some(b => b.callback_data?.startsWith('sd:bm:'))).toBe(false);
  });

  test('adopt confirm markup uses sd:bmy and stays under 64 bytes', () => {
    const kb = buildSeatDeskAdoptBookMaxConfirmMarkup('SPEN-001', 'SPEN-1', 1500) as {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string }>>;
    };
    const confirm = kb.inline_keyboard.flat().find(b => b.callback_data?.startsWith('sd:bmy:'));
    expect(confirm?.text).toBe('✓ Set maxBet $1,500');
    expect(confirm?.callback_data).toBe('sd:bmy:SPEN-001:SPEN-1');
    for (const btn of kb.inline_keyboard.flat()) {
      if (btn.callback_data) {
        expect(callbackDataUtf8ByteLength(btn.callback_data)).toBeLessThanOrEqual(64);
      }
    }
  });

  test('root markup shows Fill when only book terms missing', () => {
    const termsOnly: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        {
          book: 'parlay21.com',
          bookLogin: 'vc2013',
          paymentRail: 'Venmo',
          sendTo: '@filled',
          outId: 'SPEN-1',
          primary: true,
        },
      ],
    };
    const kb = buildSeatDeskRootMarkup(termsOnly) as {
      inline_keyboard: Array<Array<{ text: string }>>;
    };
    expect(kb.inline_keyboard.flat().map(b => b.text)).toContain('1 · Fill');
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

  test('validateMaxBet and validateFreeplay normalize book terms', () => {
    expect(validateMaxBet('  $500  ')).toBe('$500');
    expect(validateMaxBet('')).toBeNull();
    expect(validateFreeplay('25')).toBe('25%');
    expect(validateFreeplay('30%')).toBe('30%');
  });
});
