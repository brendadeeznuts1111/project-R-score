/**
 * @fileoverview CPU Profiling Statistical Analysis Integration Tests
 * @description End-to-end validation of 6.7.1A.0.0.0.0 with infrastructure
 * 
 * Validates that statistical analysis works with:
 * - Database infrastructure (tables initialized)
 * - Real performance data from CPU profiles
 * - Complete statistical test suite
 * 
 * @module test/cpu-profiling-statistics-integration
 * @version 6.7.1A.0.0.0.0
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { CPUProfilingRegistry } from "../src/utils/cpu-profiling-registry";
import { initializeUrlAnomalyDatabase } from "../src/utils/database-initialization";
import {
	performStatisticalAnalysis,
	DEFAULT_STATISTICAL_CONFIG,
} from "../src/utils/cpu-profiling-statistics";

describe("6.7.1A.0.0.0.0 - Statistical Analysis Integration", () => {
	beforeAll(async () => {
		// Ensure database infrastructure is initialized
		const initResult = await initializeUrlAnomalyDatabase();
		expect(initResult.success).toBe(true);
		expect(initResult.tables.url_anomaly_audit.exists).toBe(true);
		expect(initResult.tables.line_movement_audit_v2.exists).toBe(true);
	});

	describe("Infrastructure Validation", () => {
		test("database tables should be initialized", async () => {
			const initResult = await initializeUrlAnomalyDatabase();
			
			expect(initResult.success).toBe(true);
			expect(initResult.database_path).toBe("./data/research.db");
			expect(initResult.tables.url_anomaly_audit.exists).toBe(true);
			expect(initResult.tables.line_movement_audit_v2.exists).toBe(true);
			expect(initResult.permissions.write).toBe(true);
		});

		test("database should be accessible for statistical analysis", async () => {
			const { Database } = await import("bun:sqlite");
			const db = new Database("./data/research.db", { create: true });
			
			// Verify tables exist
			const tables = db.query<{ name: string }, []>(
				`SELECT name FROM sqlite_master WHERE type='table'`
			).all();
			
			const tableNames = tables.map(t => t.name);
			expect(tableNames).toContain("url_anomaly_audit");
			expect(tableNames).toContain("line_movement_audit_v2");
			
			db.close();
		});
	});

	describe("Statistical Analysis with Real Data", () => {
		test("should perform complete statistical analysis on performance samples", () => {
			// Simulate realistic CPU profiling data
			// Baseline: stable performance around 10ms
			const baselineSamples = [
				10.2, 10.5, 10.1, 10.3, 10.4, 10.2, 10.6, 10.3, 10.1, 10.5,
				10.4, 10.2, 10.3, 10.5, 10.1, 10.4, 10.2, 10.6, 10.3, 10.1,
			];

			// Current: regression with higher variance (15ms average)
			const currentSamples = [
				15.1, 15.3, 15.0, 15.2, 15.4, 15.1, 15.5, 15.2, 15.0, 15.3,
				15.4, 15.1, 15.2, 15.5, 15.0, 15.4, 15.1, 15.6, 15.2, 15.0,
			];

			const analysis = performStatisticalAnalysis(baselineSamples, currentSamples);

			// Verify all statistical tests executed
			expect(analysis.meanDifference.test).toBeDefined();
			expect(analysis.varianceComparison.test).toBeDefined();
			expect(analysis.distributionComparison.test).toBeDefined();
			expect(analysis.meanDifference.confidenceInterval).toBeDefined();
			expect(analysis.meanDifference.effectSize).toBeDefined();

			// Verify significant regression detected
			expect(analysis.meanDifference.test.isSignificant).toBe(true);
			expect(analysis.meanDifference.test.pValue).toBeLessThan(0.05);
			expect(analysis.meanDifference.meanDiff).toBeLessThan(0); // Current slower

			// Verify effect size indicates practical importance
			expect(analysis.meanDifference.effectSize.magnitude).toMatch(/large|very large/);
			expect(Math.abs(analysis.meanDifference.effectSize.value)).toBeGreaterThan(0.8);

			// Verify confidence interval excludes zero
			expect(analysis.meanDifference.confidenceInterval.lower).toBeLessThan(0);
			expect(analysis.meanDifference.confidenceInterval.upper).toBeLessThan(0);
		});

		test("should detect non-significant differences correctly", () => {
			// Two similar performance profiles
			const baselineSamples = [10.1, 10.2, 10.3, 10.1, 10.2, 10.3, 10.1, 10.2, 10.3, 10.1];
			const currentSamples = [10.2, 10.3, 10.1, 10.2, 10.3, 10.1, 10.2, 10.3, 10.1, 10.2];

			const analysis = performStatisticalAnalysis(baselineSamples, currentSamples);

			// Should not be statistically significant
			expect(analysis.meanDifference.test.isSignificant).toBe(false);
			expect(analysis.meanDifference.test.pValue).toBeGreaterThanOrEqual(0.05);

			// Effect size should be negligible or small
			expect(["negligible", "small"]).toContain(analysis.meanDifference.effectSize.magnitude);
		});

		test("should detect variance changes", () => {
			// Baseline: low variance
			const baselineSamples = [10.0, 10.1, 10.0, 10.1, 10.0, 10.1, 10.0, 10.1, 10.0, 10.1];

			// Current: high variance (performance instability)
			const currentSamples = [10.0, 15.0, 8.0, 12.0, 9.0, 14.0, 7.0, 13.0, 8.0, 12.0];

			const analysis = performStatisticalAnalysis(baselineSamples, currentSamples);

			// Variance comparison should detect significant change
			expect(analysis.varianceComparison.test.isSignificant).toBe(true);
			expect(analysis.varianceComparison.varianceRatio).toBeGreaterThan(1);
		});
	});

	describe("CPU Profiling Registry Integration", () => {
		test("compareProfiles should include statistical analysis when samples available", async () => {
			const registry = new CPUProfilingRegistry();

			// Create mock profiles with raw samples
			const baselineProfile: typeof registry extends CPUProfilingRegistry
				? CPUProfiling.ProfileEntry
				: never = {
				id: "baseline-test",
				version: "v1.0.0-test",
				filename: "baseline-test.cpuprofile",
				filepath: "/test/baseline-test.cpuprofile",
				createdAt: new Date().toISOString(),
				gitHash: "abc1234",
				metrics: {
					totalTime: 1000,
					functionCalls: 100,
					rawSamples: {
						executionTimes: [10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11],
					},
				},
			} as any;

			const currentProfile: typeof registry extends CPUProfilingRegistry
				? CPUProfiling.ProfileEntry
				: never = {
				id: "current-test",
				version: "v1.0.1-test",
				filename: "current-test.cpuprofile",
				filepath: "/test/current-test.cpuprofile",
				createdAt: new Date().toISOString(),
				gitHash: "def5678",
				metrics: {
					totalTime: 1500,
					functionCalls: 100,
					rawSamples: {
						executionTimes: [15, 16, 15, 16, 15, 16, 15, 16, 15, 16, 15, 16, 15, 16, 15, 16, 15, 16, 15, 16],
					},
				},
			} as any;

			const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

			// Verify statistical analysis is included
			expect(comparison.statisticalAnalysis).toBeDefined();
			expect(comparison.statisticalAnalysis?.meanDifference.test.pValue).toBeDefined();
			expect(comparison.statisticalAnalysis?.meanDifference.test.isSignificant).toBe(true);
			expect(comparison.statisticalAnalysis?.meanDifference.effectSize.magnitude).toBeDefined();
			expect(comparison.statisticalAnalysis?.meanDifference.confidenceInterval).toBeDefined();
		});
	});

	describe("6.7.1A.0.0.0.0 Feature Completeness", () => {
		test("all core statistical tests should be available", () => {
			const baseline = [10, 11, 10, 11, 10];
			const current = [15, 16, 15, 16, 15];

			const analysis = performStatisticalAnalysis(baseline, current);

			// 1. Student's t-test / Welch's t-test
			expect(analysis.meanDifference.test.testStatistic).toBeDefined();
			expect(analysis.meanDifference.test.degreesOfFreedom).toBeDefined();
			expect(analysis.meanDifference.test.pValue).toBeDefined();
			expect(typeof analysis.meanDifference.test.isSignificant).toBe("boolean");

			// 2. Confidence Intervals
			expect(analysis.meanDifference.confidenceInterval.lower).toBeDefined();
			expect(analysis.meanDifference.confidenceInterval.upper).toBeDefined();
			expect(analysis.meanDifference.confidenceInterval.level).toBe(0.95);

			// 3. Cohen's d Effect Size
			expect(analysis.meanDifference.effectSize.value).toBeDefined();
			expect(analysis.meanDifference.effectSize.magnitude).toBeDefined();
			expect(["negligible", "small", "medium", "large", "very large"]).toContain(
				analysis.meanDifference.effectSize.magnitude,
			);

			// 4. F-test for Variance
			expect(analysis.varianceComparison.test.testStatistic).toBeDefined();
			expect(analysis.varianceComparison.test.pValue).toBeDefined();
			expect(analysis.varianceComparison.varianceRatio).toBeDefined();

			// 5. Kolmogorov-Smirnov Test
			expect(analysis.distributionComparison.test.testStatistic).toBeDefined();
			expect(analysis.distributionComparison.test.pValue).toBeDefined();
			expect(analysis.distributionComparison.maxDifference).toBeDefined();
		});

		test("should handle configurable parameters", () => {
			const baseline = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
			const current = [15, 16, 15, 16, 15, 16, 15, 16, 15, 16];

			const strictConfig = {
				significanceLevel: 0.01, // Stricter: 1%
				confidenceLevel: 0.99, // 99% confidence
				minSampleSize: 5,
			};

			const analysis = performStatisticalAnalysis(baseline, current, strictConfig);

			expect(analysis.meanDifference.confidenceInterval.level).toBe(0.99);
			// With stricter significance level, same data might not be significant
			// (This is expected behavior - stricter thresholds)
		});

		test("should handle edge cases gracefully", () => {
			// Small sample sizes
			const smallBaseline = [10, 11];
			const smallCurrent = [15, 16];
			const smallAnalysis = performStatisticalAnalysis(smallBaseline, smallCurrent, {
				...DEFAULT_STATISTICAL_CONFIG,
				minSampleSize: 2,
			});
			expect(smallAnalysis.sampleInfo.warning).toBeDefined();

			// Empty arrays (should not crash)
			const emptyAnalysis = performStatisticalAnalysis([], []);
			expect(emptyAnalysis).toBeDefined();

			// Zero variance (should not crash)
			const zeroVarBaseline = [10, 10, 10, 10, 10];
			const zeroVarCurrent = [15, 15, 15, 15, 15];
			const zeroVarAnalysis = performStatisticalAnalysis(zeroVarBaseline, zeroVarCurrent);
			expect(zeroVarAnalysis).toBeDefined();
		});
	});
});
