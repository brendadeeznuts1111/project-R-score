/**
 * Accounting ledger table schema — provenance columns + glossary wiring.
 */
import { describe, expect, test } from 'bun:test';
import {
  ACCOUNTING_LEDGER_COLUMNS,
  partnerTableGlossaryIds,
} from '../lib/portal/partner-tables.ts';

describe('ACCOUNTING_LEDGER_COLUMNS', () => {
  const byKey = Object.fromEntries(ACCOUNTING_LEDGER_COLUMNS.map(c => [c.key, c]));

  test('includes provenance + amount keys from partner_ledger', () => {
    for (const key of [
      'account_scope',
      'counterparty',
      'source',
      'external_id',
      'proof',
      'tracking_id',
      'batch_id',
      'book_key',
      'amount',
    ] as const) {
      expect(byKey[key]).toBeDefined();
    }
  });

  test('amount has unit usd and colorRule for negative → trading', () => {
    const amount = byKey.amount;
    expect(amount?.unit).toBe('usd');
    expect(amount?.colorRule).toBeTypeOf('function');
    expect(amount?.colorRule?.(-1)).toBe('trading');
    expect(amount?.colorRule?.(1)).toBe('tennis');
  });

  test('account_scope has glossaryId account.scope.global', () => {
    expect(byKey.account_scope?.glossaryId).toBe('account.scope.global');
  });

  test('partnerTableGlossaryIds includes account.scope.global and accounting.deposit', () => {
    const ids = partnerTableGlossaryIds();
    expect(ids).toContain('account.scope.global');
    expect(ids).toContain('accounting.deposit');
  });

  test('no column glossaryId starts with ops.field.', () => {
    for (const column of ACCOUNTING_LEDGER_COLUMNS) {
      if (column.glossaryId) {
        expect(column.glossaryId.startsWith('ops.field.')).toBe(false);
      }
    }
  });
});
