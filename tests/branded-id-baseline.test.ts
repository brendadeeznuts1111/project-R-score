import { describe, expect, test } from 'bun:test';

import { findStaleBaselineKeys } from '../tools/branded-id-check.ts';

describe('branded ID baseline ratchet', () => {
  test('returns only baseline keys no longer backed by actionable declarations', () => {
    const liveKey = ['lib/a.ts', 'accountId', 'accountId: ' + 'string;'].join('\t');
    const baseline = new Set([liveKey, 'stale-key']);
    const live = new Set([liveKey, 'new-unbaselined-key']);

    expect(findStaleBaselineKeys(baseline, live)).toEqual(['stale-key']);
  });

  test('sorts stale keys for deterministic diagnostics', () => {
    expect(findStaleBaselineKeys(new Set(['z', 'a']), new Set())).toEqual(['a', 'z']);
  });
});
