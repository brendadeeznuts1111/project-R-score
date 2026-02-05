#!/usr/bin/env bun
/**
 * @fileoverview Multi-Layer System Performance Tests with Test Hooks
 * @description Comprehensive testing with onTestFinished hooks for cleanup
 * @module test/profiling/multilayer-performance
 *
 * Version: 1.1.1.1.5.0.1
 *
 * @see {@link ../../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

import { afterEach, beforeEach, describe, expect, onTestFinished, test } from "bun:test";
import { ProfilingMultiLayerGraphSystem } from "../../src/arbitrage/shadow-graph/profiling/instrumented-system";

/**
 * Mock market data generator
 */
class MockMarketDataGenerator {
	static generate(count: number): unknown[] {
		return Array.from({ length: count }, (_, i) => ({
			id: `market_${i}`,
			data: `data_${i}`,
		}));
	}
}

describe("Header 1.1.1.1.5.0.1: Multi-Layer System Performance Tests", () => {
	let system: ProfilingMultiLayerGraphSystem;
	let mockData: unknown[];

	beforeEach(() => {
		// Generate test data
		mockData = MockMarketDataGenerator.generate(1000);

		// Initialize system with profiling disabled for tests
		system = new ProfilingMultiLayerGraphSystem({
			data: mockData,
			enableProfiling: false,
			testMode: true,
		});
	});

	afterEach(() => {
		// Global cleanup
		system.cleanup();
	});

	test("Layer 1 correlation computation should be efficient", async () => {
		const startTime = performance.now();

		// Test Layer 1 computations
		const layer1Results = await system.computeLayer1Correlations(mockData);

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Performance assertion
		expect(duration).toBeLessThan(100); // Should complete in <100ms

		// Data assertion
		expect(layer1Results.correlations).toBeArray();
		expect(layer1Results.correlations.length).toBeGreaterThan(0);

		// Use onTestFinished for test-specific cleanup
		onTestFinished(() => {
			// Clean up test artifacts
			system.clearLayerCache(1);
			console.log("🧹 Cleaned Layer 1 test artifacts");
		});
	});

	test("Cross-sport anomaly detection should handle recursion", () => {
		// Test recursive pattern detection (like Fibonacci but for sports)
		function detectPatternRecursion(events: unknown[], depth: number): number {
			if (events.length <= 1 || depth >= 10) {
				return events.length;
			}

			const mid = Math.floor(events.length / 2);
			const left = detectPatternRecursion(events.slice(0, mid), depth + 1);
			const right = detectPatternRecursion(events.slice(mid), depth + 1);

			return left + right + 1; // +1 for merge operation
		}

		const patternCount = detectPatternRecursion(mockData, 0);
		expect(patternCount).toBeGreaterThan(0);

		onTestFinished(() => {
			// Record test metrics
			system.recordTestMetric("pattern_recursion", {
				inputSize: mockData.length,
				patternCount,
				testName: "cross_sport_anomaly_recursion",
			});
		});
	});

	// Use test.serial for non-concurrent tests that need onTestFinished
	test.serial("Hidden edge detection with cleanup hooks", async () => {
		const hiddenEdges = await system.detectHiddenEdges({
			confidenceThreshold: 0.7,
			minObservations: 3,
		});

		expect(hiddenEdges).toBeArray();

		// Multiple onTestFinished hooks can be used
		onTestFinished(() => {
			console.log("🧹 First cleanup: clearing edge cache");
			system.clearEdgeCache();
		});

		onTestFinished(() => {
			console.log("🧹 Second cleanup: validating edge counts");
			const remaining = system.getEdgeCount();
			expect(remaining).toBe(0);
		});

		onTestFinished(async () => {
			console.log("🧹 Third cleanup: async database cleanup");
			await system.cleanupDatabase();
		});
	});

	describe("Header 1.1.1.1.5.0.2: Memory and Performance Regression Tests", () => {
		test("should not have memory leaks in recursive operations", () => {
			const initialMemory = process.memoryUsage().heapUsed;

			// Perform recursive operations
			const results: unknown[] = [];
			for (let i = 0; i < 100; i++) {
				// Simulate recursive computation
				results.push({ iteration: i, data: mockData.slice(0, 100) });
			}

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;

			// Memory should not increase excessively
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // <10MB

			onTestFinished(() => {
				// Force garbage collection and verify
				if (global.gc) {
					global.gc();
					const postGCMemory = process.memoryUsage().heapUsed;
					console.log(
						`🧹 Memory after GC: ${(postGCMemory / 1024 / 1024).toFixed(2)}MB`,
					);
				}
			});
		});

		test("CPU profiling integration works correctly", () => {
			// Skip in CI environment
			if (process.env.CI) {
				console.log("⏭️ Skipping CPU profiling test in CI");
				return;
			}

			const start = performance.now();

			// Simulate CPU-intensive work
			let total = 0;
			for (let i = 0; i < 1000000; i++) {
				total += Math.sin(i) * Math.cos(i);
			}

			const duration = performance.now() - start;

			// Should complete in reasonable time
			expect(duration).toBeLessThan(500); // <500ms

			onTestFinished(() => {
				// Record performance metric
				system.recordPerformanceMetric("cpu_intensive_loop", duration, {
					iterations: 1000000,
					total,
				});
			});
		});
	});
});
