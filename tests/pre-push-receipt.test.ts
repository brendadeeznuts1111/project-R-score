import { describe, expect, test } from 'bun:test';
import { receiptMatches, sha256, type PrePushReceipt } from '../scripts/pre-push-receipt.ts';

const receipt: PrePushReceipt = {
  schemaVersion: 1,
  tree: 'tree',
  bunVersion: '1.4.0',
  bunRevision: 'revision',
  gateConfigHash: 'config',
  status: 'passed',
  finishedAt: '2026-08-25T00:00:00.000Z',
};

describe('pre-push receipts', () => {
  test('hashes deterministic receipt inputs', () => {
    expect(sha256('same')).toBe(sha256('same'));
    expect(sha256('same')).not.toBe(sha256('other'));
  });

  test('requires exact tree, Bun revision, and gate configuration', () => {
    const expected = {
      tree: receipt.tree,
      bunVersion: receipt.bunVersion,
      bunRevision: receipt.bunRevision,
      gateConfigHash: receipt.gateConfigHash,
    };
    expect(receiptMatches(receipt, expected)).toBe(true);
    expect(receiptMatches({ ...receipt, bunRevision: 'other' }, expected)).toBe(false);
    expect(receiptMatches({ ...receipt, gateConfigHash: 'other' }, expected)).toBe(false);
    expect(receiptMatches({ ...receipt, status: 'passed', tree: 'other' }, expected)).toBe(false);
  });
});
