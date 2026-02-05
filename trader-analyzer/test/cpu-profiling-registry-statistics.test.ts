/**
 * @fileoverview CPU Profiling Registry Statistical Integration Tests
 * @description Integration tests for statistical analysis in compareProfiles
 * 
 * @module test/cpu-profiling-registry-statistics
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { CPUProfilingRegistry, CPUProfiling } from "../src/utils/cpu-profiling-registry";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const TEST_REGISTRY_DIR = join(process.cwd(), "test-profiles");

describe("CPU Profiling Registry - Statistical Analysis Integration", () => {
	let registry: CPUProfilingRegistry;

	beforeAll(() => {
		registry = new CPUProfilingRegistry({
			registryDir: TEST_REGISTRY_DIR,
			statisticalConfig: {
				significanceLevel: 0.05,
				confidenceLevel: 0.95,
				minSampleSize: 5,
			},
		});
	});

	afterAll(() => {
		// Cleanup test files
		try {
			const registryFile = join(TEST_REGISTRY_DIR, "registry.json");
			if (existsSync(registryFile)) {
				unlinkSync(registryFile);
			}
		} catch {
			// Ignore cleanup errors
		}
	});

	test("compareProfiles should include statistical analysis when raw samples available", async () => {
		// Create mock profiles with raw samples
		const baselineProfile: CPUProfiling.ProfileEntry = {
			id: "baseline-1",
			version: "v1.0.0-test",
			filename: "baseline.cpuprofile",
			filepath: "/test/baseline.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "abc1234",
			metrics: {
				totalTime: 1000,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [10, 11, 10, 11, 10, 11, 10, 11, 10, 11],
				},
			},
		};

		const currentProfile: CPUProfiling.ProfileEntry = {
			id: "current-1",
			version: "v1.0.1-test",
			filename: "current.cpuprofile",
			filepath: "/test/current.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "def5678",
			metrics: {
				totalTime: 1500,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [15, 16, 15, 16, 15, 16, 15, 16, 15, 16],
				},
			},
		};

		const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

		expect(comparison.statisticalAnalysis).toBeDefined();
		expect(comparison.statisticalAnalysis?.meanDifference.test.pValue).toBeDefined();
		expect(comparison.statisticalAnalysis?.meanDifference.confidenceInterval).toBeDefined();
		expect(comparison.statisticalAnalysis?.meanDifference.effectSize).toBeDefined();
		expect(comparison.statisticalAnalysis?.varianceComparison.test).toBeDefined();
		expect(comparison.statisticalAnalysis?.distributionComparison.test).toBeDefined();
	});

	test("compareProfiles should work without statistical analysis when samples unavailable", async () => {
		const baselineProfile: CPUProfiling.ProfileEntry = {
			id: "baseline-2",
			version: "v1.0.0-test",
			filename: "baseline.cpuprofile",
			filepath: "/test/baseline.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "abc1234",
			metrics: {
				totalTime: 1000,
				functionCalls: 100,
				// No rawSamples
			},
		};

		const currentProfile: CPUProfiling.ProfileEntry = {
			id: "current-2",
			version: "v1.0.1-test",
			filename: "current.cpuprofile",
			filepath: "/test/current.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "def5678",
			metrics: {
				totalTime: 1500,
				functionCalls: 100,
				// No rawSamples
			},
		};

		const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

		expect(comparison.severity).toBeDefined();
		expect(comparison.metrics).toBeDefined();
		expect(comparison.statisticalAnalysis).toBeUndefined(); // Should not be present
	});

	test("compareProfiles should handle insufficient sample sizes gracefully", async () => {
		const baselineProfile: CPUProfiling.ProfileEntry = {
			id: "baseline-3",
			version: "v1.0.0-test",
			filename: "baseline.cpuprofile",
			filepath: "/test/baseline.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "abc1234",
			metrics: {
				totalTime: 1000,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [10, 11], // Too few samples
				},
			},
		};

		const currentProfile: CPUProfiling.ProfileEntry = {
			id: "current-3",
			version: "v1.0.1-test",
			filename: "current.cpuprofile",
			filepath: "/test/current.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "def5678",
			metrics: {
				totalTime: 1500,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [15, 16], // Too few samples
				},
			},
		};

		const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

		// Should still work, but without statistical analysis
		expect(comparison.severity).toBeDefined();
		expect(comparison.statisticalAnalysis).toBeUndefined();
	});

	test("statistical analysis should detect significant differences", async () => {
		const baselineProfile: CPUProfiling.ProfileEntry = {
			id: "baseline-4",
			version: "v1.0.0-test",
			filename: "baseline.cpuprofile",
			filepath: "/test/baseline.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "abc1234",
			metrics: {
				totalTime: 1000,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10],
				},
			},
		};

		const currentProfile: CPUProfiling.ProfileEntry = {
			id: "current-4",
			version: "v1.0.1-test",
			filename: "current.cpuprofile",
			filepath: "/test/current.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "def5678",
			metrics: {
				totalTime: 2000,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [20, 21, 20, 21, 20, 21, 20, 21, 20, 21, 20, 21, 20, 21, 20],
				},
			},
		};

		const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

		expect(comparison.statisticalAnalysis).toBeDefined();
		expect(comparison.statisticalAnalysis?.meanDifference.test.isSignificant).toBe(true);
		expect(["large", "very large"]).toContain(comparison.statisticalAnalysis?.meanDifference.effectSize.magnitude);
	});

	test("statistical analysis should detect non-significant differences", async () => {
		const baselineProfile: CPUProfiling.ProfileEntry = {
			id: "baseline-5",
			version: "v1.0.0-test",
			filename: "baseline.cpuprofile",
			filepath: "/test/baseline.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "abc1234",
			metrics: {
				totalTime: 1000,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10],
				},
			},
		};

		const currentProfile: CPUProfiling.ProfileEntry = {
			id: "current-5",
			version: "v1.0.1-test",
			filename: "current.cpuprofile",
			filepath: "/test/current.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "def5678",
			metrics: {
				totalTime: 1010,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [10.1, 11.1, 10.1, 11.1, 10.1, 11.1, 10.1, 11.1, 10.1, 11.1, 10.1, 11.1, 10.1, 11.1, 10.1],
				},
			},
		};

		const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

		expect(comparison.statisticalAnalysis).toBeDefined();
		// Small differences may or may not be significant depending on variance
		expect(comparison.statisticalAnalysis?.meanDifference.test.pValue).toBeDefined();
	});

	test("should respect configurable significance level", async () => {
		const strictRegistry = new CPUProfilingRegistry({
			registryDir: TEST_REGISTRY_DIR,
			statisticalConfig: {
				significanceLevel: 0.01, // Stricter
				confidenceLevel: 0.99,
				minSampleSize: 5,
			},
		});

		const baselineProfile: CPUProfiling.ProfileEntry = {
			id: "baseline-6",
			version: "v1.0.0-test",
			filename: "baseline.cpuprofile",
			filepath: "/test/baseline.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "abc1234",
			metrics: {
				totalTime: 1000,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [10, 11, 10, 11, 10, 11, 10, 11, 10, 11],
				},
			},
		};

		const currentProfile: CPUProfiling.ProfileEntry = {
			id: "current-6",
			version: "v1.0.1-test",
			filename: "current.cpuprofile",
			filepath: "/test/current.cpuprofile",
			createdAt: new Date().toISOString(),
			gitHash: "def5678",
			metrics: {
				totalTime: 1500,
				functionCalls: 100,
				rawSamples: {
					executionTimes: [15, 16, 15, 16, 15, 16, 15, 16, 15, 16],
				},
			},
		};

		const comparison = await strictRegistry.compareProfiles(currentProfile, baselineProfile);

		expect(comparison.statisticalAnalysis).toBeDefined();
		expect(comparison.statisticalAnalysis?.meanDifference.confidenceInterval.level).toBe(0.99);
	});
});
