import { describe, expect, test } from 'bun:test';
import {
  applyDefaultPayment,
  applyHarnessStagingIntake,
  applyHarnessStagingRails,
  applyIntakeField,
  buildSeatDeskViewModel,
  buildSeatOutDeskLines,
  firstIncompleteOutIndex,
  formatOutId,
  formatSeatCapitalDeskHtml,
  parsePaymentLine,
  patchSeatOut,
  resolveFundStatus,
  resolveOutId,
  tryParseDeskStatus,
  type SeatIntakeRecord,
} from '../lib/telegram/seat-capital-desk.ts';

const fixture: SeatIntakeRecord = {
  partnerCode: 'SPEN',
  callSign: 'SPEN-001',
  outs: [
    {
      book: 'www.parlay21.com',
      bookLogin: 'vc2013',
      password: 'htown',
      paymentRail: 'Venmo',
      sendTo: '@ash-demo',
      primary: true,
    },
    { book: 'lonestarwagering.com', bookLogin: 'Yungg1', password: 'Yungg1' },
  ],
};

describe('seat-capital-desk', () => {
  test('formatOutId assigns sequential partner out numbers', () => {
    expect(formatOutId('SPEN', 0)).toBe('SPEN-1');
    expect(formatOutId('SPEN', 4)).toBe('SPEN-5');
  });

  test('parsePaymentLine splits rail and send-to', () => {
    expect(parsePaymentLine('Venmo @ash-demo')).toEqual({
      paymentRail: 'Venmo',
      sendTo: '@ash-demo',
    });
    expect(parsePaymentLine('SPEN-2 | CashApp | $sign')).toEqual({
      paymentRail: 'CashApp',
      sendTo: '$sign',
    });
  });

  test('buildSeatOutDeskLines omits partner column (forum context)', () => {
    const lines = buildSeatOutDeskLines(fixture);
    expect(lines[0]).not.toContain('PARTNER');
    expect(lines[0]).toContain('#');
    expect(lines[0]).toContain('MAX BET');
    expect(lines[0]).toContain('FP% DEP');
    expect(lines.some(l => l.includes('vc2013'))).toBe(true);
    expect(lines.some(l => l.includes('Venmo') && l.includes('@ash-demo'))).toBe(true);
  });

  test('patchSeatOut sets maxBet and normalizes freeplay pct', () => {
    const patched = patchSeatOut(fixture, 'SPEN-1', {
      maxBet: '$500',
      freeplay: '100',
    });
    const out1 = patched.outs.find(o => o.book.includes('parlay'));
    expect(out1?.maxBet).toBe('$500');
    expect(out1?.freeplay).toBe('100%');
    const lines = buildSeatOutDeskLines(patched);
    expect(lines.some(l => l.includes('$500') && l.includes('100%'))).toBe(true);
  });

  test('patchSeatOut sets payment rail fields', () => {
    expect(resolveOutId('SPEN', '2')).toBe('SPEN-2');
    const patched = patchSeatOut(fixture, 'SPEN-2', {
      paymentRail: 'PayPal',
      sendTo: 'partner@mail.com',
    });
    const lines = buildSeatOutDeskLines(patched);
    const dataRow = lines.find(l => l.includes('PayPal'));
    expect(dataRow).toBeDefined();
    expect(dataRow).toContain('partner@mai');
  });

  test('applyDefaultPayment fills empty outs only', () => {
    const withDefault: SeatIntakeRecord = {
      ...fixture,
      defaultPaymentRail: 'Venmo',
      defaultSendTo: '@spen-default',
    };
    const applied = applyDefaultPayment(withDefault);
    const lines = buildSeatOutDeskLines(applied);
    const row2 = lines.find(l => l.includes('Yungg1'));
    expect(lines.some(l => l.includes('@ash-demo'))).toBe(true);
    expect(row2).toContain('@spen-def');
  });

  test('formatSeatCapitalDeskHtml shows username but hides password', () => {
    const html = formatSeatCapitalDeskHtml(fixture, new Date('2026-07-27T02:30:00.000Z'));
    expect(html).not.toContain('htown');
    expect(html).toContain('vc2013');
    expect(html).toContain('Yungg1');
    expect(html).toContain('FUND');
    expect(html.match(/<pre>/g)?.length).toBe(1);
  });

  test('applyIntakeField patches out fields and fundStatus', () => {
    const updated = applyIntakeField(fixture, 'SPEN-2.balance=$500');
    const out2 = updated.outs.find(o => o.book.includes('lonestar'));
    expect(out2?.balance).toBe('$500');
    const status = applyIntakeField(updated, 'fundStatus=partial');
    expect(status.fundStatus).toBe('partial');
  });

  test('buildSeatOutDeskLines aligns wide send-to with Bun.stringWidth', () => {
    const wide: SeatIntakeRecord = {
      ...fixture,
      outs: [
        ...fixture.outs,
        {
          book: 'emoji.example.com',
          bookLogin: 'user',
          paymentRail: 'Venmo',
          sendTo: '💸@wide',
          outId: 'SPEN-3',
        },
      ],
    };
    const lines = buildSeatOutDeskLines(wide);
    const dataRow = lines.find(l => /^\s*3\s*│/.test(l) || l.split('│')[0]?.trim() === '3');
    expect(dataRow).toBeDefined();
    const cols = dataRow!.split('│').map(c => c.trim());
    expect(cols[0]).toBe('3');
    expect(cols[4]).toContain('💸');
  });

  test('tryParseDeskStatus accepts deferred and defered typo', () => {
    expect(tryParseDeskStatus('defered')).toBe('deferred');
    expect(tryParseDeskStatus('Deferred')).toBe('deferred');
  });

  test('applyHarnessStagingRails fills missing defaults and propagates to outs', () => {
    const blocked: SeatIntakeRecord = {
      partnerCode: 'BIL',
      callSign: 'BIL-001',
      defaultPaymentRail: 'Venmo',
      defaultSendTo: '',
      outs: [{ outId: 'BIL-1', book: 'Partner book TBD', primary: true }],
    };
    const next = applyHarnessStagingRails(blocked);
    expect(next.defaultSendTo).toBe('@bil.newpartner');
    expect(next.outs[0]?.sendTo).toBe('@bil.newpartner');
    expect(resolveFundStatus(next).status).toBe('ready');
  });

  test('applyHarnessStagingIntake adds staging login and default book terms', () => {
    const intake: SeatIntakeRecord = {
      partnerCode: 'ASH',
      callSign: 'ASH-001',
      defaultPaymentRail: 'Venmo',
      defaultSendTo: '@ash.hr.fl',
      outs: [{ outId: 'ASH-1', book: 'Hard Rock Florida', primary: true }],
    };
    const next = applyHarnessStagingIntake(intake);
    expect(next.outs[0]?.bookLogin).toBe('ash1.staging');
    expect(next.outs[0]?.maxBet).toBe('500');
    expect(next.outs[0]?.freeplay).toBe('25%');
    expect(buildSeatDeskViewModel(next).incompleteOuts).toBe(0);
  });

  test('resolveFundStatus: partial when lead ready but others incomplete; ready when all set', () => {
    expect(resolveFundStatus(fixture).status).toBe('partial');
    const missingRail: SeatIntakeRecord = {
      ...fixture,
      outs: [
        { ...fixture.outs[0]!, paymentRail: undefined, sendTo: undefined },
        fixture.outs[1]!,
      ],
    };
    expect(resolveFundStatus(missingRail).status).toBe('blocked');
    const allReady: SeatIntakeRecord = {
      ...fixture,
      outs: [
        fixture.outs[0]!,
        {
          ...fixture.outs[1]!,
          paymentRail: 'Venmo',
          sendTo: '@ash-demo',
        },
      ],
    };
    expect(resolveFundStatus(allReady).status).toBe('ready');
    const forced = applyIntakeField(fixture, 'fundStatus=ready');
    expect(resolveFundStatus(forced).status).toBe('ready');
  });

  test('firstIncompleteOutIndex skips deferred outs', () => {
    const record: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        { book: 'complete.com', bookLogin: 'u1', paymentRail: 'Venmo', sendTo: '@ok', outId: 'SPEN-1' },
        { book: 'deferred.com', bookLogin: 'u2', deskStatus: 'deferred', outId: 'SPEN-2' },
        { book: 'needs.com', bookLogin: 'u3', outId: 'SPEN-3' },
      ],
    };
    expect(firstIncompleteOutIndex(record)).toBe(2);
  });
});
