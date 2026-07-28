// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  computeMonorepoHealth,
  countCycles,
  gradeMonorepoHealth,
  parseTestSummary,
} from '../lib/harness/monorepo-health.ts';

describe('monorepo-health formula', () => {
  test('example calculation lands near 74', () => {
    // User doc example: 5 dups, 15% dead, 10% large, 2% fail, 3 cycles, 80% cov
    // 100 -10 -7.5 -10 -10 -4.5 +16 = 74
    const r = computeMonorepoHealth({
      duplicateDepCount: 5,
      deadCodePercent: 15,
      largeFilePercent: 10,
      testFailureRate: 2,
      cyclicDependencyCount: 3,
      testCoveragePercent: 80,
    });
    expect(r.score).toBe(74);
    expect(r.grade).toBe('needs-improvement');
    expect(r.breakdown.duplicateDepPenalty).toBe(10);
    expect(r.breakdown.coverageBonus).toBe(16);
  });

  test('perfect metrics score 100 healthy', () => {
    const r = computeMonorepoHealth({
      duplicateDepCount: 0,
      deadCodePercent: 0,
      largeFilePercent: 0,
      testFailureRate: 0,
      cyclicDependencyCount: 0,
      testCoveragePercent: 0,
    });
    expect(r.score).toBe(100);
    expect(r.grade).toBe('healthy');
  });

  test('grades bands', () => {
    expect(gradeMonorepoHealth(95)).toBe('healthy');
    expect(gradeMonorepoHealth(90)).toBe('healthy');
    expect(gradeMonorepoHealth(89.9)).toBe('needs-improvement');
    expect(gradeMonorepoHealth(60)).toBe('needs-improvement');
    expect(gradeMonorepoHealth(59.9)).toBe('critical');
  });

  test('clamps score to 0–100', () => {
    const low = computeMonorepoHealth({
      duplicateDepCount: 100,
      deadCodePercent: 100,
      largeFilePercent: 100,
      testFailureRate: 100,
      cyclicDependencyCount: 100,
      testCoveragePercent: 0,
    });
    expect(low.score).toBe(0);
    const high = computeMonorepoHealth({
      duplicateDepCount: 0,
      deadCodePercent: 0,
      largeFilePercent: 0,
      testFailureRate: 0,
      cyclicDependencyCount: 0,
      testCoveragePercent: 100,
    });
    expect(high.score).toBe(100);
  });
});

describe('monorepo-health helpers', () => {
  test('countCycles detects back-edge', () => {
    const adj = new Map<string, string[]>([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ]);
    expect(countCycles(adj)).toBeGreaterThanOrEqual(1);
  });

  test('parseTestSummary reads pass/fail lines', () => {
    const s = parseTestSummary('  27 pass\n  2 fail\nRan 29 tests');
    expect(s.pass).toBe(27);
    expect(s.fail).toBe(2);
    expect(s.testFailureRate).toBeCloseTo((2 / 29) * 100, 5);
  });
});
