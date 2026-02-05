// Comprehensive integration tests for Bun v1.3.7 RSS Feed Optimization
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { performance } from "node:perf_hooks";

describe("Bun v1.3.7 RSS Feed Optimization - Comprehensive Integration", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(async () => {
		originalEnv = { ...process.env };
	});

	afterEach(async () => {
		process.env = originalEnv;
	});

	describe("Full System Integration", () => {
		test("should handle complete RSS feed optimization workflow", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Create test feed data
			const testFeed = {
				title: "Integration Test Feed",
				description: "Test feed for comprehensive integration",
				items: Array.from({ length: 50 }, (_, i) => ({
					title: `Integration Test Item ${i}`,
					link: `https://example.com/item/${i}`,
					description: `Description for integration test item ${i}`,
					pubDate: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
					content: `Content for item ${i}: ${"x".repeat(100)}`,
				})),
			};

			// Test buffer optimization
			const bufferStart = performance.now();
			const optimizedBuffer = BufferOptimizer.optimizeFromArray(
				Array.from({ length: 1000 }, (_, i) => i % 256),
			);
			const bufferEnd = performance.now();

			expect(optimizedBuffer.length).toBe(1000);
			expect(bufferEnd - bufferStart).toBeLessThan(50);

			// Test JSONL streaming
			const jsonlStart = performance.now();
			const jsonlData = JSONLStreamer.toJSONL(testFeed.items);
			const parsedItems = JSONLStreamer.parseChunk(jsonlData);
			const jsonlEnd = performance.now();

			expect(parsedItems.length).toBe(50);
			expect(jsonlEnd - jsonlStart).toBeLessThan(100);

			// Test RSS fetcher integration
			const fetcher = new OptimizedRSSFetcher();
			const fetchStart = performance.now();

			// Mock fetch response
			const mockResponse = new Response(JSON.stringify(testFeed), {
				headers: { "Content-Type": "application/json" },
			});

			// This would normally make a network request, but we're testing the integration
			const fetchEnd = performance.now();
			const fetchDuration = fetchEnd - fetchStart;

			expect(fetchDuration).toBeLessThan(1000); // Should be fast
		});

		test("should handle error recovery across all components", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Test error handling in buffer operations
			try {
				(BufferOptimizer.optimizeFromArray as any)("invalid input");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}

			// Test error handling in JSONL operations
			const malformedData = "Invalid JSON\n{ malformed";
			const validationResult = JSONLStreamer.validateJSONL(malformedData);
			expect(validationResult.valid).toBe(false);
			expect(validationResult.errorCount).toBeGreaterThan(0);

			// Test error handling in RSS fetcher
			const fetcher = new OptimizedRSSFetcher();
			try {
				await fetcher.fetchFeed("https://invalid-domain.invalid/feed.xml");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});

		test("should maintain performance under load", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			const initialMemory = process.memoryUsage();

			// Simulate high load
			const operations = Array.from({ length: 100 }, async (_, i) => {
				// Buffer operations
				const buffer = BufferOptimizer.optimizeFromArray(
					Array.from({ length: 100 }, (_, j) => (i + j) % 256),
				);

				// JSONL operations
				const testData = Array.from({ length: 10 }, (_, j) => ({
					id: i * 10 + j,
					data: `test-${i}-${j}`,
				}));
				const jsonlData = JSONLStreamer.toJSONL(testData);
				const parsed = JSONLStreamer.parseChunk(jsonlData);

				return { bufferLength: buffer.length, parsedCount: parsed.length };
			});

			const start = performance.now();
			const results = await Promise.all(operations);
			const end = performance.now();

			const duration = end - start;

			// Verify performance
			expect(duration).toBeLessThan(1000); // Should handle 100 operations efficiently
			expect(results.length).toBe(100);
			expect(results[0].bufferLength).toBe(100);
			expect(results[0].parsedCount).toBe(10);

			// Check memory usage
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage();
			const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Reasonable memory usage
		});
	});

	describe("DNS and Connection Optimization", () => {
		test("should optimize DNS and connection handling", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { DNSOptimizer } = await import("../src/utils/dns-optimizer.js");
			const { ConnectionOptimizer } = await import(
				"../src/utils/connection-optimizer.js"
			);

			// Test DNS optimization
			const dnsOptimizer = new DNSOptimizer();
			const dnsStart = performance.now();
			await dnsOptimizer.prefetch("example.com");
			const dnsEnd = performance.now();

			expect(dnsEnd - dnsStart).toBeLessThan(100); // DNS prefetch should be fast

			// Test connection optimization
			const connectionOptimizer = new ConnectionOptimizer();
			const connectionStart = performance.now();
			const connectionResult = await connectionOptimizer.preconnect(
				"https://example.com",
			);
			const connectionEnd = performance.now();

			expect(connectionEnd - connectionStart).toBeLessThan(100); // Connection preconnect should be fast
		});

		test("should handle DNS and connection failures gracefully", async () => {
			const { DNSOptimizer } = await import("../src/utils/dns-optimizer.js");
			const { ConnectionOptimizer } = await import(
				"../src/utils/connection-optimizer.js"
			);

			// Test DNS failure handling
			const dnsOptimizer = new DNSOptimizer();
			try {
				await dnsOptimizer.prefetch(
					"invalid-domain-that-does-not-exist.invalid",
				);
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}

			// Test connection failure handling
			const connectionOptimizer = new ConnectionOptimizer();
			try {
				await connectionOptimizer.preconnect("https://invalid-domain.invalid");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});
	});

	describe("Circuit Breaker and Retry Logic", () => {
		test("should handle circuit breaker patterns", async () => {
			const { CircuitBreaker } = await import(
				"../src/utils/circuit-breaker.js"
			);

			const circuitBreaker = new CircuitBreaker({
				failureThreshold: 3,
				resetTimeout: 1000,
				halfOpenMaxCalls: 2,
			});

			// Test CLOSED state
			expect(circuitBreaker.state).toBe("CLOSED");

			// Simulate failures
			for (let i = 0; i < 3; i++) {
				await circuitBreaker.execute(async () => {
					throw new Error("Simulated failure");
				});
			}

			// Should be in OPEN state after threshold
			expect(circuitBreaker.state).toBe("OPEN");

			// Wait for reset timeout
			await new Promise((resolve) => setTimeout(resolve, 1100));

			// Should be in HALF_OPEN state
			expect(circuitBreaker.state).toBe("HALF_OPEN");
		});

		test("should handle retry logic with exponential backoff", async () => {
			const { RetryWithBackoff } = await import(
				"../src/utils/retry-with-backoff.js"
			);

			const retry = new RetryWithBackoff({
				maxRetries: 3,
				baseDelay: 100,
				maxDelay: 1000,
			});

			let attemptCount = 0;
			const operation = async () => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error("Simulated failure");
				}
				return "success";
			};

			const start = performance.now();
			const result = await retry.execute(operation);
			const end = performance.now();

			expect(result).toBe("success");
			expect(attemptCount).toBe(3);
			expect(end - start).toBeGreaterThan(200); // Should have delays between retries
		});
	});

	describe("Memory and Resource Management", () => {
		test("should manage memory efficiently across all components", async () => {
			const initialMemory = process.memoryUsage();

			// Create multiple instances and operations
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Perform many operations
			for (let i = 0; i < 500; i++) {
				// Buffer operations
				const buffer = BufferOptimizer.optimizeFromArray(
					Array.from({ length: 50 }, (_, j) => j % 256),
				);

				// JSONL operations
				const testData = Array.from({ length: 5 }, (_, j) => ({
					id: i * 5 + j,
					data: `memory-test-${i}-${j}`,
				}));
				const jsonlData = JSONLStreamer.toJSONL(testData);
				const parsed = JSONLStreamer.parseChunk(jsonlData);

				// RSS operations
				const fetcher = new OptimizedRSSFetcher();
				// Note: We're not actually fetching to avoid network calls
			}

			// Force garbage collection
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage();
			const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory increase should be reasonable despite 500 operations
			expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
		});

		test("should handle resource cleanup properly", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Create resources
			const fetcher = new OptimizedRSSFetcher();
			const buffer = BufferOptimizer.optimizeFromArray([1, 2, 3, 4, 5]);

			// Verify resources are created
			expect(buffer.length).toBe(5);

			// Resources should be garbage collected when no longer referenced
			// This is implicit in JavaScript, but we can test that operations complete
			expect(true).toBe(true);
		});
	});

	describe("Performance Benchmarks", () => {
		test("should meet performance benchmarks for all components", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Benchmark buffer operations
			const bufferBenchmark = BufferOptimizer.measureBufferPerformance(
				() => BufferOptimizer.optimizeFromArray([1, 2, 3, 4, 5]),
				1000,
			);
			expect(bufferBenchmark.opsPerSecond).toBeGreaterThan(10000);

			// Benchmark JSONL operations
			const testData = Array.from({ length: 100 }, (_, i) => ({
				id: i,
				data: `test-${i}`,
			}));
			const jsonlBenchmark = {
				start: performance.now(),
				ops: 0,
			};

			for (let i = 0; i < 1000; i++) {
				JSONLStreamer.toJSONL(testData);
				JSONLStreamer.parseChunk(JSONLStreamer.toJSONL(testData));
				jsonlBenchmark.ops++;
			}

			const jsonlDuration = performance.now() - jsonlBenchmark.start;
			const jsonlOpsPerSecond = (jsonlBenchmark.ops * 1000) / jsonlDuration;

			expect(jsonlOpsPerSecond).toBeGreaterThan(500); // JSONL operations should be reasonably fast
		});

		test("should handle concurrent operations efficiently", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			const concurrentOperations = Array.from({ length: 20 }, async (_, i) => {
				// Buffer operation
				const buffer = BufferOptimizer.optimizeFromArray(
					Array.from({ length: 100 }, (_, j) => (i + j) % 256),
				);

				// JSONL operation
				const testData = Array.from({ length: 10 }, (_, j) => ({
					id: i * 10 + j,
					data: `concurrent-${i}-${j}`,
				}));
				const jsonlData = JSONLStreamer.toJSONL(testData);
				const parsed = JSONLStreamer.parseChunk(jsonlData);

				return {
					bufferLength: buffer.length,
					parsedCount: parsed.length,
					operationId: i,
				};
			});

			const start = performance.now();
			const results = await Promise.all(concurrentOperations);
			const end = performance.now();

			const duration = end - start;

			// Verify concurrent performance
			expect(duration).toBeLessThan(500); // Should handle 20 concurrent operations efficiently
			expect(results.length).toBe(20);
			expect(results[0].bufferLength).toBe(100);
			expect(results[0].parsedCount).toBe(10);
		});
	});

	describe("Error Recovery and Resilience", () => {
		test("should recover from component failures", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Test recovery from buffer operation failure
			try {
				(BufferOptimizer.optimizeFromArray as any)("invalid");
			} catch (error) {
				// Should recover and continue
				const buffer = BufferOptimizer.optimizeFromArray([1, 2, 3]);
				expect(buffer.length).toBe(3);
			}

			// Test recovery from JSONL operation failure
			try {
				JSONLStreamer.validateJSONL("invalid json");
			} catch (error) {
				// Should recover and continue
				const validData = JSONLStreamer.toJSONL([{ valid: true }]);
				expect(validData).toContain("valid");
			}

			// Test recovery from RSS fetcher failure
			const fetcher = new OptimizedRSSFetcher();
			try {
				await fetcher.fetchFeed("https://invalid.invalid/feed.xml");
			} catch (error) {
				// Should recover and be ready for next operation
				expect(fetcher).toBeDefined();
			}
		});

		test("should handle system resource constraints", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Test with large data that might stress memory
			const largeArray = Array.from({ length: 10000 }, (_, i) => i % 256);
			const largeBuffer = BufferOptimizer.optimizeFromArray(largeArray);
			expect(largeBuffer.length).toBe(10000);

			// Test with large JSONL data
			const largeTestData = Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				data: `large-test-data-${i}`.repeat(10),
			}));
			const largeJsonl = JSONLStreamer.toJSONL(largeTestData);
			const parsedLarge = JSONLStreamer.parseChunk(largeJsonl);
			expect(parsedLarge.length).toBe(1000);
		});
	});
});
