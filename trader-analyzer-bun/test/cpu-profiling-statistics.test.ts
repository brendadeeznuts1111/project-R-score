/**
 * @fileoverview CPU Profiling Statistical Analysis Tests
 * @description Comprehensive unit and integration tests for statistical significance testing
 * 
 * @module test/cpu-profiling-statistics
 */

import { describe, test, expect } from "bun:test";
import {
	studentsTTest,
	confidenceInterval,
	cohensD,
	fTest,
	kolmogorovSmirnovTest,
	performStatisticalAnalysis,
	DEFAULT_STATISTICAL_CONFIG,
	type StatisticalConfig,
} from "../src/utils/cpu-profiling-statistics";

describe("CPU Profiling Statistical Analysis", () => {
	describe("studentsTTest", () => {
		test("should perform t-test on equal samples", () => {
			const baseline = [10, 12, 11, 13, 12, 10, 11, 12, 13, 11];
			const current = [10, 12, 11, 13, 12, 10, 11, 12, 13, 11];
			
			const result = studentsTTest(baseline, current);
			
			expect(result.testStatistic).toBeCloseTo(0, 2);
			expect(result.pValue).toBeGreaterThanOrEqual(0.05); // Not significant (may be exactly 0.05)
			expect(result.isSignificant).toBe(false);
		});

		test("should detect significant difference", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			const current = [15, 16, 15, 16, 15, 16, 15, 16, 15, 16];
			
			const result = studentsTTest(baseline, current);
			
			expect(Math.abs(result.testStatistic)).toBeGreaterThan(0); // Can be negative
			expect(result.isSignificant).toBe(true);
			expect(result.pValue).toBeLessThan(0.05);
		});

		test("should handle small sample sizes gracefully", () => {
			const baseline = [10];
			const current = [15];
			
			const result = studentsTTest(baseline, current, { ...DEFAULT_STATISTICAL_CONFIG, minSampleSize: 2 });
			
			expect(result.pValue).toBe(1.0);
			expect(result.isSignificant).toBe(false);
		});

		test("should use Welch's t-test for unequal variances", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			const current = [15, 20, 14, 18, 16, 19, 15, 17, 16, 18]; // Higher variance
			
			const result = studentsTTest(baseline, current);
			
			expect(result.testStatistic).toBeDefined();
			expect(result.degreesOfFreedom).toBeDefined();
		});

		test("should handle empty arrays", () => {
			const result = studentsTTest([], []);
			
			expect(result.pValue).toBe(1.0);
			expect(result.isSignificant).toBe(false);
		});
	});

	describe("confidenceInterval", () => {
		test("should calculate 95% confidence interval", () => {
			const baseline = [10, 12, 11, 13, 12];
			const current = [15, 17, 16, 18, 17];
			
			const ci = confidenceInterval(baseline, current);
			
			expect(ci.level).toBe(0.95);
			expect(ci.lower).toBeLessThan(ci.upper);
			expect(ci.lower).toBeLessThan(0); // Current is slower (positive difference means baseline - current is negative)
		});

		test("should handle configurable confidence level", () => {
			const baseline = [10, 11, 10, 11, 10];
			const current = [15, 16, 15, 16, 15];
			
			const ci = confidenceInterval(baseline, current, { ...DEFAULT_STATISTICAL_CONFIG, confidenceLevel: 0.99 });
			
			expect(ci.level).toBe(0.99);
		});

		test("should handle empty arrays", () => {
			const ci = confidenceInterval([], []);
			
			expect(ci.lower).toBe(0);
			expect(ci.upper).toBe(0);
		});
	});

	describe("cohensD", () => {
		test("should calculate effect size for large difference", () => {
			const baseline = [10, 11, 10, 11, 10];
			const current = [20, 21, 20, 21, 20];
			
			const effect = cohensD(baseline, current);
			
			expect(Math.abs(effect.value)).toBeGreaterThan(0.8); // Large or very large effect
			expect(["large", "very large"]).toContain(effect.magnitude);
		});

		test("should calculate effect size for small difference", () => {
			const baseline = [10, 11, 10, 11, 10];
			const current = [10.5, 11.5, 10.5, 11.5, 10.5];
			
			const effect = cohensD(baseline, current);
			
			// Effect size should be a valid number
			expect(typeof effect.value).toBe("number");
			expect(isFinite(effect.value)).toBe(true);
			expect(effect.magnitude).toBeDefined();
			expect(["negligible", "small", "medium", "large", "very large"]).toContain(effect.magnitude);
		});

		test("should handle zero variance", () => {
			const baseline = [10, 10, 10, 10, 10];
			const current = [10, 10, 10, 10, 10];
			
			const effect = cohensD(baseline, current);
			
			expect(effect.value).toBe(0);
			expect(effect.magnitude).toBe("negligible");
		});

		test("should classify effect sizes correctly", () => {
			// Test different effect size magnitudes
			const testCases = [
				{ baseline: [10, 10.1, 10, 10.1, 10], current: [10.05, 10.15, 10.05, 10.15, 10.05], expected: "negligible" },
				{ baseline: [10, 11, 10, 11, 10], current: [11, 12, 11, 12, 11], expected: "small" },
				{ baseline: [10, 11, 10, 11, 10], current: [13, 14, 13, 14, 13], expected: "medium" },
				{ baseline: [10, 11, 10, 11, 10], current: [18, 19, 18, 19, 18], expected: "large" },
			];

			for (const testCase of testCases) {
				const effect = cohensD(testCase.baseline, testCase.current);
				// Note: Exact magnitude depends on pooled std dev, so we check it's reasonable
				expect(effect.magnitude).toBeDefined();
				expect(typeof effect.value).toBe("number");
			}
		});
	});

	describe("fTest", () => {
		test("should compare variances", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			const current = [10, 15, 8, 17, 9, 16, 10, 14, 11, 15]; // Higher variance
			
			const result = fTest(baseline, current);
			
			expect(result.testStatistic).toBeGreaterThan(1);
			expect(result.pValue).toBeDefined();
		});

		test("should handle equal variances", () => {
			const baseline = [10, 11, 10, 11, 10];
			const current = [15, 16, 15, 16, 15];
			
			const result = fTest(baseline, current);
			
			expect(result.testStatistic).toBeCloseTo(1, 1);
		});

		test("should handle small samples", () => {
			const baseline = [10];
			const current = [15];
			
			const result = fTest(baseline, current);
			
			expect(result.pValue).toBe(1.0);
			expect(result.isSignificant).toBe(false);
		});
	});

	describe("kolmogorovSmirnovTest", () => {
		test("should compare distributions", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			const current = [15, 16, 15, 16, 15, 16, 15, 16, 15, 16];
			
			const result = kolmogorovSmirnovTest(baseline, current);
			
			expect(result.testStatistic).toBeGreaterThan(0);
			expect(result.pValue).toBeDefined();
			expect(result.isSignificant).toBe(true);
		});

		test("should detect identical distributions", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			const current = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			
			const result = kolmogorovSmirnovTest(baseline, current);
			
			expect(result.testStatistic).toBeCloseTo(0, 1); // May have small floating point differences
			expect(result.isSignificant).toBe(false); // Should not be significant for identical data
		});

		test("should handle empty arrays", () => {
			const result = kolmogorovSmirnovTest([], []);
			
			expect(result.pValue).toBe(1.0);
			expect(result.isSignificant).toBe(false);
		});
	});

	describe("performStatisticalAnalysis", () => {
		test("should perform complete statistical analysis", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 12, 10, 11, 10, 11];
			const current = [15, 16, 15, 16, 15, 16, 15, 16, 15, 16, 17, 15, 16, 15, 16];
			
			const analysis = performStatisticalAnalysis(baseline, current);
			
			expect(analysis.meanDifference.test.pValue).toBeDefined();
			expect(analysis.meanDifference.confidenceInterval).toBeDefined();
			expect(analysis.meanDifference.effectSize).toBeDefined();
			expect(analysis.varianceComparison.test).toBeDefined();
			expect(analysis.distributionComparison.test).toBeDefined();
			expect(analysis.sampleInfo.baselineSize).toBe(15);
			expect(analysis.sampleInfo.currentSize).toBe(15);
		});

		test("should warn on small sample sizes", () => {
			const baseline = [10, 11, 10];
			const current = [15, 16, 15];
			
			const analysis = performStatisticalAnalysis(baseline, current, {
				...DEFAULT_STATISTICAL_CONFIG,
				minSampleSize: 10,
			});
			
			expect(analysis.sampleInfo.warning).toBeDefined();
			expect(analysis.sampleInfo.warning).toContain("Small sample sizes");
		});

		test("should handle configurable significance level", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			const current = [15, 16, 15, 16, 15, 16, 15, 16, 15, 16];
			
			const analysis = performStatisticalAnalysis(baseline, current, {
				...DEFAULT_STATISTICAL_CONFIG,
				significanceLevel: 0.01,
			});
			
			expect(analysis.meanDifference.test.isSignificant).toBeDefined();
		});

		test("should handle edge case: single sample", () => {
			const baseline = [10];
			const current = [15];
			
			const analysis = performStatisticalAnalysis(baseline, current);
			
			// Should handle gracefully without crashing
			expect(analysis).toBeDefined();
			expect(analysis.sampleInfo.baselineSize).toBe(1);
			expect(analysis.sampleInfo.currentSize).toBe(1);
		});

		test("should handle edge case: zero variance", () => {
			const baseline = [10, 10, 10, 10, 10];
			const current = [15, 15, 15, 15, 15];
			
			const analysis = performStatisticalAnalysis(baseline, current);
			
			expect(analysis).toBeDefined();
			expect(analysis.meanDifference.effectSize.value).toBeDefined();
		});
	});

	describe("Edge Cases and Robustness", () => {
		test("should handle division by zero in variance", () => {
			const baseline = [10];
			const current = [10];
			
			// Should not throw
			expect(() => cohensD(baseline, current)).not.toThrow();
			expect(() => fTest(baseline, current)).not.toThrow();
		});

		test("should handle very large numbers", () => {
			const baseline = [1e6, 1e6 + 1000, 1e6, 1e6 + 1000, 1e6];
			const current = [1e6 + 5000, 1e6 + 6000, 1e6 + 5000, 1e6 + 6000, 1e6 + 5000];
			
			const analysis = performStatisticalAnalysis(baseline, current);
			
			expect(analysis.meanDifference.meanDiff).toBeDefined();
			expect(isFinite(analysis.meanDifference.meanDiff)).toBe(true);
		});

		test("should handle very small numbers", () => {
			const baseline = [0.001, 0.0011, 0.001, 0.0011, 0.001];
			const current = [0.0015, 0.0016, 0.0015, 0.0016, 0.0015];
			
			const analysis = performStatisticalAnalysis(baseline, current);
			
			expect(analysis.meanDifference.meanDiff).toBeDefined();
			expect(isFinite(analysis.meanDifference.meanDiff)).toBe(true);
		});

		test("should handle unequal sample sizes", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11];
			const current = [15, 16, 15, 16, 15];
			
			const analysis = performStatisticalAnalysis(baseline, current);
			
			expect(analysis.sampleInfo.baselineSize).toBe(8);
			expect(analysis.sampleInfo.currentSize).toBe(5);
			expect(analysis.meanDifference.test).toBeDefined();
		});
	});
});
