// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  baselineFromReport,
  ratchetViolations,
  type MonorepoHealthBaseline,
} from '../scripts/check-monorepo-health.ts';

const base: MonorepoHealthBaseline = {
  formulaVersion: 1,
  targetScore: 90,
  minScore: 30,
  maxDeadCodePercent: 15,
  maxLargeFilePercent: 45,
  maxCyclicDependencyCount: 20,
  maxDuplicateDepCount: 5,
};

describe('check-monorepo-health ratchet', () => {
  test('passes when within floors', () => {
    expect(
      ratchetViolations(
        {
          score: 34,
          formulaVersion: 1,
          metrics: {
            deadCodePercent: 8,
            largeFilePercent: 40,
            cyclicDependencyCount: 14,
            duplicateDepCount: 0,
          },
        },
        base
      )
    ).toEqual([]);
  });

  test('fails on score regression and cycle growth', () => {
    const v = ratchetViolations(
      {
        score: 20,
        formulaVersion: 1,
        metrics: {
          deadCodePercent: 8,
          largeFilePercent: 40,
          cyclicDependencyCount: 25,
          duplicateDepCount: 0,
        },
      },
      base
    );
    expect(v.some(x => x.includes('minScore'))).toBe(true);
    expect(v.some(x => x.includes('cyclicDependencyCount'))).toBe(true);
  });

  test('baselineFromReport pins counts and allows only percentage rounding', () => {
    const b = baselineFromReport({
      score: 34.1,
      formulaVersion: 1,
      metrics: {
        deadCodePercent: 8.6,
        largeFilePercent: 40.5,
        cyclicDependencyCount: 14,
        duplicateDepCount: 0,
      },
    });
    expect(b.minScore).toBe(34.1);
    expect(b.targetScore).toBe(90);
    expect(b.maxCyclicDependencyCount).toBe(14);
    expect(b.maxDuplicateDepCount).toBe(0);
    expect(b.maxDeadCodePercent).toBe(8.6);
  });
});
