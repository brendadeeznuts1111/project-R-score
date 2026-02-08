import { test, expect } from 'bun:test';
import { FraudPreventionEngine } from './core';
import { hashPhone } from './phone';

test('recordEvent and getAccountHistory', () => {
  const dbPath = '/tmp/fraud-test-' + Date.now() + '.db';
  const engine = new FraudPreventionEngine(dbPath);
  engine.recordEvent({
    userId: '@alice',
    eventType: 'payment_attempt',
    gateway: 'venmo',
    amountCents: 5000,
    success: true,
  });
  const entries = engine.getAccountHistory({ userId: '@alice', limit: 10 });
  expect(entries.length).toBe(1);
  expect(entries[0].userId).toBe('@alice');
  expect(entries[0].eventType).toBe('payment_attempt');
  expect(entries[0].gateway).toBe('venmo');
  engine.close();
});

test('registerReference and lookupByPhoneHash', async () => {
  const dbPath = '/tmp/fraud-test2-' + Date.now() + '.db';
  const engine = new FraudPreventionEngine(dbPath);
  const phoneHash = await hashPhone('+1 504 555 1234');
  engine.registerReference({ userId: '@alice', referenceType: 'phone_hash', valueHash: phoneHash });
  const userIds = engine.lookupByPhoneHash(phoneHash);
  expect(userIds).toContain('@alice');
  engine.close();
});

test('getCrossLookups finds same phone on multiple accounts', async () => {
  const dbPath = '/tmp/fraud-test3-' + Date.now() + '.db';
  const engine = new FraudPreventionEngine(dbPath);
  const phoneHash = await hashPhone('5045551234');
  engine.registerReference({ userId: '@alice', referenceType: 'phone_hash', valueHash: phoneHash });
  engine.registerReference({ userId: '@bob', referenceType: 'phone_hash', valueHash: phoneHash });
  const cross = engine.getCrossLookups({ referenceType: 'phone_hash', minAccounts: 2 });
  expect(cross.length).toBe(1);
  expect(cross[0].userIds.sort()).toEqual(['@alice', '@bob']);
  engine.close();
});

