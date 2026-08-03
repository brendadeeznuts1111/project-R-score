import { describe, expect, test } from 'bun:test';
import {
  foregroundForHex,
  getLedgerRowStyle,
} from '../lib/portal/partner-ledger-ui.ts';
import {
  partnerOpsConceptColorWire,
  PARTNER_OPS_COLORS,
} from '../lib/telegram/partner-ops-color-kernel.ts';

describe('getLedgerRowStyle', () => {
  test('deposit → tennis', () => {
    expect(getLedgerRowStyle('deposit').colorKey).toBe('tennis');
  });

  test('withdrawal → trading', () => {
    expect(getLedgerRowStyle('withdrawal').colorKey).toBe('trading');
  });

  test('transfer → kalshi (new map)', () => {
    expect(getLedgerRowStyle('transfer').colorKey).toBe('kalshi');
  });

  test('settlement → polymarket', () => {
    expect(getLedgerRowStyle('settlement').colorKey).toBe('polymarket');
  });

  test('free_roll → research', () => {
    expect(getLedgerRowStyle('free_roll').colorKey).toBe('research');
  });

  test('credit → kalshi', () => {
    expect(getLedgerRowStyle('credit').colorKey).toBe('kalshi');
  });

  test('fictional → unknown', () => {
    expect(getLedgerRowStyle('fictional').colorKey).toBe('unknown');
  });

  test('account.scope.global via partnerOpsConceptColorWire is env', () => {
    expect(partnerOpsConceptColorWire('account.scope.global').colorKey).toBe('env');
  });

  test('getLedgerRowStyle sets data-glossary-concept and --row-color', () => {
    const style = getLedgerRowStyle('deposit');
    expect(style['data-glossary-concept']).toBe('accounting.deposit');
    expect(style['data-color-key']).toBe('tennis');
    expect(style.style['--row-color']).toBe(style.hex);
    expect(style.hex).toBeTruthy();
    expect(style.style['--row-fg']).toBe(foregroundForHex(style.hex));
    expect(style.token).toBe('--partner-ops-tennis');
  });

  test('hex matches kernel palette for mapped types', () => {
    const deposit = getLedgerRowStyle('deposit');
    expect(deposit.hex.toLowerCase()).toBe(PARTNER_OPS_COLORS.tennis.toLowerCase());
    const transfer = getLedgerRowStyle('transfer');
    expect(transfer.hex.toLowerCase()).toBe(PARTNER_OPS_COLORS.kalshi.toLowerCase());
  });
});

describe('foregroundForHex', () => {
  test('dark backgrounds get light foreground', () => {
    expect(foregroundForHex('#1F6FEB')).toBe('#e6edf3');
  });

  test('light backgrounds get dark foreground', () => {
    expect(foregroundForHex('#ffffff')).toBe('#0d1117');
  });

  test('invalid hex falls back to light text', () => {
    expect(foregroundForHex('not-a-color')).toBe('#e6edf3');
  });
});
