// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { enrichDodEntry } from '../lib/dod/enrich-entry.ts';
import {
  expectedAmountFromRow,
  formatDodMoney,
  reconcileDodAmounts,
} from '../lib/dod/reconcile.ts';

describe('dod reconcile', () => {
  test('reconcileDodAmounts ok when amounts match', () => {
    const r = reconcileDodAmounts(250, 250);
    expect(r.status).toBe('ok');
    expect(r.reconciled).toBe(true);
    expect(r.banner).toBeNull();
    expect(r.delta).toBe(0);
  });

  test('reconcileDodAmounts mismatch builds banner', () => {
    const r = reconcileDodAmounts(100, 250);
    expect(r.status).toBe('mismatch');
    expect(r.reconciled).toBe(false);
    expect(r.delta).toBe(150);
    expect(r.banner).toContain('Stake mismatch');
    expect(r.banner).toContain('$100.00');
    expect(r.banner).toContain('$250.00');
  });

  test('reconcileDodAmounts unknown when either side missing', () => {
    expect(reconcileDodAmounts(null, 250).status).toBe('unknown');
    expect(reconcileDodAmounts(100, undefined).status).toBe('unknown');
    expect(reconcileDodAmounts(undefined, undefined).reconciled).toBe(false);
  });

  test('formatDodMoney and expectedAmountFromRow', () => {
    expect(formatDodMoney(12450)).toBe('$12,450.00');
    expect(expectedAmountFromRow({ expected_amount: 100 })).toBe(100);
    expect(expectedAmountFromRow({ expectedAmount: '250.5' })).toBe(250.5);
    expect(expectedAmountFromRow({})).toBeNull();
  });

  test('enrichDodEntry adds reconcile fields for demo mismatch row', () => {
    const row = enrichDodEntry({
      extracted_text: 'BIL-001 · NBA $250',
      accounting_amount: 250,
      expected_amount: 100,
      reconciled: 0,
    });
    expect(row.reconcile_status).toBe('mismatch');
    expect(row.reconcile_banner).toContain('Stake mismatch');
    expect(row.expected_amount).toBe(100);
    expect(row.accounting_amount).toBe(250);
  });
});
