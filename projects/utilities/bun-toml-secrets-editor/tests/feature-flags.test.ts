#!/usr/bin/env bun
// tests/feature-flags.test.ts - Feature Flags and A/B Testing Tests

import { beforeEach, describe, expect, test } from "bun:test";
import {
	defaultRSSFeatures,
	FeatureFlags,
} from "../src/regression/feature-flags.js";

describe("FeatureFlags", () => {
	let flags: FeatureFlags;

	beforeEach(() => {
		flags = new FeatureFlags({
			testFeature: { enabled: true },
			gradualRollout: { enabled: true, rolloutPercentage: 50 },
			canaryOnly: { enabled: true, canaryDomains: ["test.example.com"] },
			disabledFeature: { enabled: false },
		});
	});

	describe("Flag Evaluation", () => {
		test("should return true for enabled feature", () => {
			expect(flags.isEnabled("testFeature")).toBe(true);
		});

		test("should return false for disabled feature", () => {
			expect(flags.isEnabled("disabledFeature")).toBe(false);
		});

		test("should handle unknown features", () => {
			expect(flags.isEnabled("unknownFeature")).toBe(false);
		});

		test("should respect gradual rollout percentage", () => {
			let enabledCount = 0;
			for (let i = 0; i < 1000; i++) {
				if (flags.isEnabled("gradualRollout", { id: `user_${i}` })) {
					enabledCount++;
				}
			}

			// With 50% rollout, should be roughly 500 (allowing variance)
			expect(enabledCount).toBeGreaterThan(400);
			expect(enabledCount).toBeLessThan(600);
		});

		test("should be deterministic for same ID", () => {
			const id = "user_123";
			const first = flags.isEnabled("gradualRollout", { id });
			const second = flags.isEnabled("gradualRollout", { id });

			expect(first).toBe(second);
		});

		test("should respect canary domains", () => {
			expect(
				flags.isEnabled("canaryOnly", { domain: "test.example.com" }),
			).toBe(true);
			expect(flags.isEnabled("canaryOnly", { domain: "other.com" })).toBe(
				false,
			);
		});
	});

	describe("Fallback Mechanism", () => {
		test("should use new operation when feature enabled", async () => {
			const newOp = async () => "new";
			const fallbackOp = async () => "old";

			const { result } = await flags.withFallback(
				"testFeature",
				newOp,
				fallbackOp,
			);
			expect(result).toBe("new");
		});

		test("should use fallback when feature disabled", async () => {
			const newOp = async () => "new";
			const fallbackOp = async () => "old";

			const { result } = await flags.withFallback(
				"disabledFeature",
				newOp,
				fallbackOp,
			);
			expect(result).toBe("old");
		});

		test("should fallback on error and record regression", async () => {
			const errorOp = async () => {
				throw new Error("Crash");
			};
			const fallbackOp = async () => "recovered";

			const { result, variant } = await flags.withFallback(
				"testFeature",
				errorOp,
				fallbackOp,
			);
			expect(result).toBe("recovered");
			expect(variant).toBe("fallback");

			const metrics = flags.getMetrics();
			expect(metrics.testFeature_regression).toBeDefined();
		});

		test("should rethrow if fallback also fails", async () => {
			const errorOp = async () => {
				throw new Error("First");
			};
			const fallbackError = async () => {
				throw new Error("Fallback");
			};

			expect(
				flags.withFallback("testFeature", errorOp, fallbackError),
			).rejects.toThrow("First"); // Should throw original error
		});
	});

	describe("A/B Testing", () => {
		test("should return variant and result", async () => {
			const control = async () => "control";
			const treatment = async () => "treatment";

			const { variant, result } = await flags.abTest(
				"gradualRollout",
				control,
				treatment,
				{ id: "user_1" },
			);

			expect(["control", "treatment"]).toContain(variant);
			expect(result).toBe(variant === "control" ? "control" : "treatment");
		});

		test("should consistently assign same variant to same ID", async () => {
			const id = "consistent_user";
			const results: string[] = [];

			for (let i = 0; i < 5; i++) {
				const { variant } = await flags.abTest(
					"gradualRollout",
					async () => "a",
					async () => "b",
					{ id },
				);
				results.push(variant);
			}

			expect(new Set(results).size).toBe(1); // All same
		});
	});

	describe("v1.3.7 Feature Testing", () => {
		test("should test all v1.3.7 optimizations", async () => {
			const mockOperation = async () => {
				// Simulate RSS operation
				await Bun.sleep(1);
				return "rss_result";
			};

			const results = await flags.testV1_3_7_Features(mockOperation, {
				domain: "test.com",
			});

			expect(results).toHaveProperty("header_case_preservation");
			expect(results).toHaveProperty("fast_buffer_parsing");
			expect(results).toHaveProperty("fast_string_padding");
			expect(results).toHaveProperty("fast_array_flat");
			expect(results).toHaveProperty("fast_async_await");
			expect(results).toHaveProperty("json5_support");
		});

		test("should provide optimization descriptions", () => {
			const descriptions = {
				header_case_preservation: flags.getOptimizationDescription(
					"header_case_preservation",
				),
				fast_buffer_parsing: flags.getOptimizationDescription(
					"fast_buffer_parsing",
				),
				fast_string_padding: flags.getOptimizationDescription(
					"fast_string_padding",
				),
			};

			expect(descriptions.header_case_preservation).toContain(
				"Critical for RSS",
			);
			expect(descriptions.fast_buffer_parsing).toContain("50% faster");
			expect(descriptions.fast_string_padding).toContain("90% faster");
		});
	});

	describe("Metrics", () => {
		test("should track success metrics", async () => {
			await flags.withFallback(
				"testFeature",
				async () => "ok",
				async () => "fallback",
			);

			const metrics = flags.getMetrics();
			// Metrics key format: ${feature}_${variant}_${success|failure}
			expect(metrics.testFeature_treatment_success).toBeDefined();
			expect(metrics.testFeature_treatment_success.count).toBe(1);
		});

		test("should calculate average duration", async () => {
			await flags.withFallback(
				"testFeature",
				async () => {
					await Bun.sleep(10);
					return "done";
				},
				async () => "fallback",
			);

			const metrics = flags.getMetrics();
			expect(
				metrics.testFeature_treatment_success.avgDuration,
			).toBeGreaterThanOrEqual(10);
		});

		test("should track regression rates", async () => {
			// Simulate failures
			for (let i = 0; i < 5; i++) {
				try {
					await flags.withFallback(
						"testFeature",
						async () => {
							throw new Error("fail");
						},
						async () => "ok",
					);
				} catch {}
			}

			const metrics = flags.getMetrics();
			expect(metrics.testFeature_regression).toBeDefined();
		});
	});

	describe("Gradual Rollout", () => {
		test("should perform gradual rollout", async () => {
			const testFlags = new FeatureFlags({
				testRollout: { enabled: true, rolloutPercentage: 0 },
			});

			const rolloutStarted = await testFlags.gradualRollout(
				"testRollout",
				50,
				25,
				100,
			); // 25% every 100ms

			expect(rolloutStarted).toBe(true);

			// Wait for first rollout step
			await Bun.sleep(150);

			expect(testFlags.isEnabled("testRollout")).toBe(true); // Should be at 25%
		});

		test("should pause rollout on high regression", async () => {
			const testFlags = new FeatureFlags({
				unstableFeature: { enabled: true, rolloutPercentage: 10 },
			});

			// Simulate high regression rate
			for (let i = 0; i < 10; i++) {
				testFlags.recordRegression("unstableFeature", new Error("Fail"), 100);
				testFlags.recordMetrics("unstableFeature", "total", 1, 100, {});
			}

			testFlags.checkRolloutHealth("unstableFeature");

			const config = testFlags.flags.get("unstableFeature");
			expect(config?.rolloutPaused).toBe(true);
		});
	});

	describe("Default RSS Features", () => {
		test("should have all v1.3.7 features enabled by default", () => {
			const defaultFlags = new FeatureFlags(defaultRSSFeatures);

			expect(defaultFlags.isEnabled("header_case_preservation")).toBe(true);
			expect(defaultFlags.isEnabled("fast_buffer_parsing")).toBe(true);
			expect(defaultFlags.isEnabled("fast_string_padding")).toBe(true);
			expect(defaultFlags.isEnabled("fast_array_flat")).toBe(true);
			expect(defaultFlags.isEnabled("json5_support")).toBe(true);
			expect(defaultFlags.isEnabled("experimental_dns_prefetch")).toBe(false);
		});

		test("should export metrics in different formats", async () => {
			// Record some metrics first
			await flags.withFallback(
				"testFeature",
				async () => "ok",
				async () => "fallback",
			);

			// JSON format
			const jsonMetrics = flags.exportMetrics("json");
			expect(() => JSON.parse(jsonMetrics)).not.toThrow();

			// Prometheus format
			const prometheusMetrics = flags.exportMetrics("prometheus");
			expect(prometheusMetrics).toContain("feature_flag_");
		});
	});
});
