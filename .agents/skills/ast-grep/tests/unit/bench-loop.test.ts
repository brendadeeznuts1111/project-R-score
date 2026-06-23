import { describe, expect, test } from "bun:test";
import {
  computeBenchRating,
  parseBunTestSummary,
  summarizeBenchRuns,
  type BenchRunResult,
} from "../../scripts/scan/transpiler/bench-loop.ts";

describe("bench-loop", () => {
  test("parseBunTestSummary reads pass/fail/skip lines", () => {
    const out = " 42 pass\n 0 fail\n 1 skip\nRan 42 tests across 3 files. [1.2s]";
    expect(parseBunTestSummary(out)).toEqual({ pass: 42, fail: 0, skipped: 1 });
  });

  test("computeBenchRating rewards pass rate and speed", () => {
    const fast = computeBenchRating(1, 4000, 8000);
    expect(fast.rating).toBeGreaterThanOrEqual(95);
    expect(fast.grade).toBe("A");

    const slow = computeBenchRating(1, 12000, 8000);
    expect(slow.rating).toBeLessThan(fast.rating);

    const flaky = computeBenchRating(0.5, 5000, 8000);
    expect(flaky.rating).toBeLessThanOrEqual(55);
    expect(flaky.grade).toMatch(/[DF]/);
  });

  test("summarizeBenchRuns computes p50/p95 and rating", () => {
    const runs: BenchRunResult[] = [
      { iteration: 1, exitCode: 0, elapsedMs: 1000, pass: 10, fail: 0, skipped: 0, ok: true },
      { iteration: 2, exitCode: 0, elapsedMs: 2000, pass: 10, fail: 0, skipped: 0, ok: true },
      { iteration: 3, exitCode: 1, elapsedMs: 1500, pass: 9, fail: 1, skipped: 0, ok: false },
    ];
    const summary = summarizeBenchRuns("unit", runs, 8000);
    expect(summary.iterations).toBe(3);
    expect(summary.passRate).toBeCloseTo(2 / 3, 2);
    expect(summary.p50Ms).toBe(1500);
    expect(summary.p95Ms).toBe(2000);
    expect(summary).toContainKeys(["rating", "grade", "profile"]);
  });
});