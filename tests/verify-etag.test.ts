// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { runOfflineETagProof } from '../tools/verify-etag.ts';

describe('tools/verify-etag offline suite', () => {
  test('offline data-etag + deepEquals checks all pass', () => {
    const rows = runOfflineETagProof();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.every(r => r.pass)).toBe(true);
    expect(rows.some(r => r.step.includes('deepEquals'))).toBe(true);
    expect(rows.some(r => r.cache === 'SHARED')).toBe(true);
    expect(rows.some(r => r.cache === 'DIVERGES')).toBe(true);
  });
});
