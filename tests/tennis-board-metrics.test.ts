import { describe, expect, test } from 'bun:test';
import {
  bucketMidCents,
  formatVolume,
  humanizeSeries,
  midFromStoredBook,
  sampleBoardMetrics,
  toMidDistributionDoc,
} from '../lib/tennis/board-metrics.ts';

describe('tennis board-metrics', () => {
  test('humanizeSeries', () => {
    expect(humanizeSeries('KXITFMATCH')).toBe('ITF M');
    expect(humanizeSeries('KXITFWMATCH')).toBe('ITF W');
    expect(humanizeSeries('KXATPMATCH')).toBe('ATP');
  });

  test('formatVolume', () => {
    expect(formatVolume(3_200_000)).toBe('3.2M');
    expect(formatVolume(950_000)).toBe('950.0K');
  });

  test('midFromStoredBook', () => {
    expect(
      midFromStoredBook({
        bids: [{ priceCents: 40 }],
        asks: [{ priceCents: 44 }],
      }),
    ).toBe(42);
    expect(midFromStoredBook({ bids: [{ priceCents: 50 }], asks: [] })).toBeNull();
  });

  test('bucketMidCents', () => {
    const b = bucketMidCents([10, 30, 50, 70, 90]);
    expect(b).toHaveLength(5);
    expect(b.every(x => x.count === 1)).toBe(true);
  });

  test('sample + mid-distribution doc', () => {
    const m = sampleBoardMetrics();
    expect(m.kind).toBe('tennis-board-metrics');
    const mid = toMidDistributionDoc(m);
    expect(mid.kind).toBe('tennis-mid-distribution');
    expect(mid.buckets.length).toBe(5);
  });
});
