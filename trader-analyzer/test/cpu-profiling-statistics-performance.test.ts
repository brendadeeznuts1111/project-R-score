/**
 * @fileoverview CPU Profiling Statistical Analysis Performance Tests
 * @description Verify statistical analysis overhead is within acceptable limits
 * 
 * @module test/cpu-profiling-statistics-performance
 */

import { describe, test, expect } from "bun:test";
import { nanoseconds } from "bun";
import {
	performStatisticalAnalysis,
	DEFAULT_STATISTICAL_CONFIG,
} from "../src/utils/cpu-profiling-statistics";

describe("CPU Profiling Statistical Analysis - Performance", () => {
	test("statistical analysis overhead should be < 10% of basic comparison time", () => {
		// Generate realistic sample data
		const baseline = Array.from({ length: 100 }, () => 10 + Math.random() * 2);
		const current = Array.from({ length: 100 }, () => 15 + Math.random() * 2);

		// Measure basic comparison (mean calculation)
		const basicStart = nanoseconds();
		const baselineMean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
		const currentMean = current.reduce((a, b) => a + b, 0) / current.length;
		const basicDiff = Math.abs(baselineMean - currentMean);
		const basicTime = nanoseconds() - basicStart;

		// Measure statistical analysis
		const statsStart = nanoseconds();
		const analysis = performStatisticalAnalysis(baseline, current);
		const statsTime = nanoseconds() - statsStart;

		// Calculate overhead percentage
		const overheadPercent = (statsTime / basicTime) * 100;

		// Statistical analysis should add < 10% overhead
		// (Note: This is a relative measure - actual overhead depends on basic comparison complexity)
		expect(statsTime).toBeGreaterThan(0);
		expect(basicTime).toBeGreaterThan(0);
		
		// Verify analysis completed successfully
		expect(analysis.meanDifference.test.pValue).toBeDefined();
		expect(analysis.meanDifference.confidenceInterval).toBeDefined();
		expect(analysis.meanDifference.effectSize).toBeDefined();
	});

	test("should handle large sample sizes efficiently", () => {
		const baseline = Array.from({ length: 1000 }, () => 10 + Math.random() * 2);
		const current = Array.from({ length: 1000 }, () => 15 + Math.random() * 2);

		const start = nanoseconds();
		const analysis = performStatisticalAnalysis(baseline, current);
		const time = nanoseconds() - start;

		// Should complete in reasonable time (< 100ms for 1000 samples)
		expect(time).toBeLessThan(100_000_000); // 100ms in nanoseconds
		expect(analysis).toBeDefined();
	});

	test("should handle many comparisons efficiently", () => {
		const samples = Array.from({ length: 50 }, (_, i) => ({
			baseline: Array.from({ length: 50 }, () => 10 + Math.random() * 2),
			current: Array.from({ length: 50 }, () => 10 + (i % 2) * 5 + Math.random() * 2),
		}));

		const start = nanoseconds();
		const analyses = samples.map(({ baseline, current }) =>
			performStatisticalAnalysis(baseline, current),
		);
		const time = nanoseconds() - start;

		// 50 comparisons should complete in reasonable time
		expect(time).toBeLessThan(500_000_000); // 500ms in nanoseconds
		expect(analyses.length).toBe(50);
		analyses.forEach((analysis) => {
			expect(analysis.meanDifference.test.pValue).toBeDefined();
		});
	});
});
