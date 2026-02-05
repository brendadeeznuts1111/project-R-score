#!/usr/bin/env bun
// tests/profiler.test.ts - Comprehensive RSSProfiler Tests

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { RSSProfiler } from "../src/profiling/rss-profiler";

describe("RSSProfiler", () => {
	let profiler: RSSProfiler;

	beforeAll(() => {
		profiler = new RSSProfiler({ samplingInterval: 100 });
	});

	afterAll(async () => {
		await profiler.disconnect();
	});

	describe("Basic Profiling", () => {
		test("should profile async operation successfully", async () => {
			const operation = async () => {
				await Bun.sleep(50);
				return "result";
			};

			const { result, operationId, duration } = await profiler.profileOperation(
				"test_op",
				operation,
			);

			expect(result).toBe("result");
			expect(operationId).toMatch(/^test_op_\d+$/);
			expect(duration).toBeGreaterThanOrEqual(50);
			expect(profiler.profiles.has(operationId)).toBe(true);
		});

		test("should capture profile data on failure", async () => {
			const error = new Error("Test error");
			const operation = async () => {
				await Bun.sleep(10);
				throw error;
			};

			let caughtError;
			try {
				await profiler.profileOperation("failing_op", operation);
			} catch (e) {
				caughtError = e;
			}

			expect(caughtError).toBe(error);
			// Profile should still be captured even on failure
			const profiles = Array.from(profiler.profiles.values());
			const failedProfile = profiles.find((p) => p.name === "failing_op");
			expect(failedProfile).toBeDefined();
			expect(failedProfile?.success).toBe(false);
		});

		test("should calculate CPU hotspots correctly", async () => {
			// Simulate CPU-intensive work
			const cpuIntensive = async () => {
				let sum = 0;
				for (let i = 0; i < 1000000; i++) sum += i;
				return sum;
			};

			const { operationId } = await profiler.profileOperation(
				"cpu_test",
				cpuIntensive,
			);
			const analysis = profiler.analyzeBottlenecks(operationId);

			expect(analysis).not.toBeNull();
			expect(analysis?.totalDuration).toBeGreaterThan(0);
			expect(analysis?.hotspots.length).toBeGreaterThan(0);
		});

		test("should respect sampling interval configuration", () => {
			const customProfiler = new RSSProfiler({ samplingInterval: 50 });
			expect(customProfiler.samplingInterval).toBe(50);
		});
	});

	describe("Memory Management", () => {
		test("should cleanup old profiles", async () => {
			// Insert old profile manually
			const oldId = "old_test_123";
			profiler.profiles.set(oldId, {
				name: "old_test",
				duration: 100,
				timestamp: Date.now() - 7200000, // 2 hours old
				profile: { nodes: [], samples: [] },
				success: true,
			} as any);

			profiler.cleanup(3600000); // 1 hour max age

			expect(profiler.profiles.has(oldId)).toBe(false);
		});

		test("should keep recent profiles during cleanup", async () => {
			const recentId = "recent_test";
			const { operationId } = await profiler.profileOperation(
				recentId,
				async () => "test",
			);

			profiler.cleanup(3600000);
			expect(profiler.profiles.has(operationId)).toBe(true);
		});
	});

	describe("Connection Safety", () => {
		test("should handle multiple connect calls gracefully", async () => {
			await profiler.connect();
			await profiler.connect(); // Should not throw
			expect(profiler.connected).toBe(true);
		});

		test("should emit metrics in correct format", () => {
			const mockProfile = {
				nodes: [
					{
						id: 1,
						callFrame: { functionName: "test", url: "test.js", lineNumber: 1 },
					},
				],
				samples: [1, 1, 1],
			};

			// Should not throw and should output valid JSON to console
			expect(() => {
				profiler.emitMetrics("op_123", "test_op", 100, mockProfile);
			}).not.toThrow();
		});
	});

	describe("v1.3.7 Optimization Detection", () => {
		test("should detect Buffer.from() optimization opportunities", async () => {
			const bufferOp = async () => {
				const arr = new Uint8Array(1000);
				const buffer = Buffer.from(arr); // v1.3.7 optimization
				return buffer.toString();
			};

			const { operationId } = await profiler.profileOperation(
				"buffer_test",
				bufferOp,
			);
			const analysis = profiler.analyzeBottlenecks(operationId);

			expect(analysis?.v1_3_7_optimizations).toContain(
				"50% faster Buffer.from() optimization available",
			);
		});

		test("should detect string padding optimization opportunities", async () => {
			const paddingOp = async () => {
				return "test".padStart(20, "0"); // v1.3.7 optimization
			};

			const { operationId } = await profiler.profileOperation(
				"padding_test",
				paddingOp,
			);
			const analysis = profiler.analyzeBottlenecks(operationId);

			expect(analysis?.v1_3_7_optimizations).toContain(
				"90% faster string padding optimization available",
			);
		});
	});
});
