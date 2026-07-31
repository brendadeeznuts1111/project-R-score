// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  baselineTierLabel,
  makeBaselineSource,
  mergeBaselineValues,
} from '../lib/operations/baseline-source-tiers.ts';

describe('baseline source tiers', () => {
  test('merge: Tier 1 wins compliance; Tier 5 wins commercial over 2/4', () => {
    const merged = mergeBaselineValues([
      { valueUsd: 10_000, source: makeBaselineSource(1, 'internal:reg/MA') },
      { valueUsd: 4_000, source: makeBaselineSource(2, 'policy:dk') },
      { valueUsd: 3_000, source: makeBaselineSource(4, 'scrape:dk') },
      { valueUsd: 5_000, source: makeBaselineSource(5, 'ops:matrix') },
    ]);
    expect(merged.complianceMaxUsd).toBe(10_000);
    expect(merged.complianceSource?.tier).toBe(1);
    expect(merged.commercialMaxUsd).toBe(5_000);
    expect(merged.commercialSource?.tier).toBe(5);
  });

  test('merge: Tier 2 beats Tier 4 for commercial when Tier 5 absent', () => {
    const merged = mergeBaselineValues([
      { valueUsd: 4_000, source: makeBaselineSource(2, 'policy:fd') },
      { valueUsd: 2_500, source: makeBaselineSource(4, 'scrape:fd') },
    ]);
    expect(merged.commercialMaxUsd).toBe(4_000);
    expect(merged.commercialSource?.tier).toBe(2);
  });

  test('merge: Tier 3 wins live comparison over ops and scrape', () => {
    const merged = mergeBaselineValues([
      { valueUsd: 9_000, source: makeBaselineSource(3, 'api:bet365') },
      { valueUsd: 5_000, source: makeBaselineSource(5, 'ops:matrix') },
      { valueUsd: 1_000, source: makeBaselineSource(4, 'scrape:bet365') },
    ]);
    expect(merged.liveComparisonMaxUsd).toBe(9_000);
    expect(merged.liveComparisonSource?.tier).toBe(3);
    expect(merged.commercialMaxUsd).toBe(5_000);
  });

  test('tier labels and defaults', () => {
    expect(baselineTierLabel(1)).toContain('regulatory');
    expect(baselineTierLabel(5)).toContain('ops');
    const src = makeBaselineSource(1, 'internal:seed');
    expect(src.confidence).toBe('highest');
    expect(src.sourceType).toBe('regulatory');
  });
});
