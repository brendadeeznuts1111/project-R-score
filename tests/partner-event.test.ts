// @see https://bun.com/docs/test/writing-tests
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  TRIGGERS,
  buildTriggerEvent,
  partnerEventTriggerCode,
  validateTriggerFields,
} from '../scripts/partners-event.ts';
import { appendPartnerOpsEvent } from '../lib/telegram/partner-ops-registry.ts';

describe('partners:event trigger → code mapping', () => {
  test('five shippable triggers map to shipped event codes', () => {
    expect(partnerEventTriggerCode('deposit_received')).toBe('DEPOSIT_RECEIVED');
    expect(partnerEventTriggerCode('deposit_allocated')).toBe('DEPOSIT_ALLOCATED');
    expect(partnerEventTriggerCode('credit_extended')).toBe('CREDIT_EXTENDED');
    expect(partnerEventTriggerCode('free_roll_applied')).toBe('FREE_ROLL_APPLIED');
    expect(partnerEventTriggerCode('settlement_processed')).toBe('SETTLEMENT_PROCESSED');
  });

  test('deferred triggers have no shipped code (null)', () => {
    expect(TRIGGERS.withdrawal_processed).toBeNull();
    expect(TRIGGERS.credit_repaid).toBeNull();
    expect(TRIGGERS.fee_deducted).toBeNull();
  });

  test('unknown triggers return null', () => {
    expect(partnerEventTriggerCode('bogus')).toBeNull();
  });
});

describe('partners:event required-field validation', () => {
  test('deposit_received requires amount + rail', () => {
    expect(validateTriggerFields('deposit_received', { partner: 'ASH' })).toContain(
      'trigger deposit_received requires --amount',
    );
    expect(validateTriggerFields('deposit_received', { amount: 1000 })).toContain(
      'trigger deposit_received requires --rail',
    );
    expect(validateTriggerFields('deposit_received', { amount: 1000, rail: 'venmo' })).toEqual([]);
  });

  test('deposit_allocated and settlement require amount + out', () => {
    expect(validateTriggerFields('deposit_allocated', { amount: 1000 })).toContain(
      'trigger deposit_allocated requires --out',
    );
    expect(validateTriggerFields('settlement_processed', { amount: 500 })).toContain(
      'trigger settlement_processed requires --out',
    );
  });

  test('credit_extended requires amount', () => {
    expect(validateTriggerFields('credit_extended', {})).toContain(
      'trigger credit_extended requires --amount',
    );
  });

  test('free_roll_applied requires nothing', () => {
    expect(validateTriggerFields('free_roll_applied', {})).toEqual([]);
  });

  test('non-finite amount rejected', () => {
    expect(validateTriggerFields('credit_extended', { amount: Number.NaN })).toContain(
      '--amount must be a finite number',
    );
  });

  test('unknown trigger rejected', () => {
    expect(validateTriggerFields('bogus', {})).toEqual(['unknown trigger "bogus"']);
  });
});

describe('partners:event event construction', () => {
  test('buildTriggerEvent sets code, conceptId, amount, rail', () => {
    const event = buildTriggerEvent('deposit_received', {
      partner: 'ash',
      amount: 1000,
      rail: 'venmo',
    });
    expect(event.code).toBe('DEPOSIT_RECEIVED');
    expect(event.conceptId).toBe('event.deposit.received');
    expect(event.amount).toBe(1000);
    expect(event.rail).toBe('venmo');
    expect(event.partnerCode).toBe('ASH'); // uppercased
  });

  test('deferred trigger throws (no shipped code)', () => {
    expect(() => buildTriggerEvent('withdrawal_processed', {})).toThrow(/no shipped event code/);
  });
});

describe('partners:event append round-trip', () => {
  test('appends a JSONL line to a temp root and reads back', async () => {
    const root = mkdtempSync(join(tmpdir(), 'partners-event-'));
    try {
      const event = buildTriggerEvent('credit_extended', { partner: 'ASH', amount: 5000 });
      const path = await appendPartnerOpsEvent(event, root);
      expect(path.endsWith('reports/telegram/partners-events.jsonl')).toBe(true);

      const line = readFileSync(path, 'utf8').trim().split('\n').at(-1);
      const parsed = JSON.parse(line!) as { code: string; conceptId: string /* brand-ok — glossary concept key */; amount: number };
      expect(parsed.code).toBe('CREDIT_EXTENDED');
      expect(parsed.conceptId).toBe('event.credit.extended');
      expect(parsed.amount).toBe(5000);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
