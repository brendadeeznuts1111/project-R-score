// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { parseLimitRowWire } from '../lib/operations/limits/limit-row-wire.ts';

describe('parseLimitRowWire', () => {
  test('parses a valid row', () => {
    const raw = {
      lifecycleState: 'active',
      derivesFrom: ['ops.limits.effective_limit', 'api.limit_cache'],
    };
    expect(parseLimitRowWire(raw)).toEqual(raw);
  });

  test('returns empty object when E3 fields are absent (wire not landed)', () => {
    expect(parseLimitRowWire({})).toEqual({});
    expect(parseLimitRowWire({ other: 'ignore' })).toEqual({});
  });

  test('throws on non-object input', () => {
    expect(() => parseLimitRowWire(null)).toThrow(/expected object/);
    expect(() => parseLimitRowWire('row')).toThrow(/expected object/);
  });

  test('throws on invalid lifecycleState', () => {
    expect(() => parseLimitRowWire({ lifecycleState: 'unknown' })).toThrow(/lifecycleState/);
  });

  test('throws on invalid derivesFrom type', () => {
    expect(() => parseLimitRowWire({ derivesFrom: 'not-array' })).toThrow(/array/);
    expect(() => parseLimitRowWire({ derivesFrom: [42] })).toThrow(/strings/);
  });
});
