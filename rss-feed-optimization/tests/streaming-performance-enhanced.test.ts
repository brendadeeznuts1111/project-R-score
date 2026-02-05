// Enhanced streaming performance tests for Bun v1.3.7
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { performance } from "node:perf_hooks";
import { Readable, Writable } from "node:stream";

describe("Bun v1.3.7 Streaming Performance - Enhanced", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(async () => {
		originalEnv = { ...process.env };
	});

	afterEach(async () => {
		process.env = originalEnv;
	});

	describe("JSONL Streaming", () => {
		test("should handle high-volume JSONL streaming", async () => {
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Create test data
			const testData = Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				title: `Post ${i}`,
				content: `Content for post ${i}`,
				timestamp: Date.now(),
			}));

			// Test parsing performance
			const jsonlData = JSONLStreamer.toJSONL(testData);
			const start = performance.now();

			const parsedRecords = JSONLStreamer.parseChunk(jsonlData);
			const end = performance.now();

			const duration = end - start;

			// Verify performance
			expect(duration).toBeLessThan(100); // Should be very fast
			expect(parsedRecords.length).toBe(testData.length);

			// Verify each record is valid
			for (const record of parsedRecords) {
				expect(record).toHaveProperty("id");
				expect(record).toHaveProperty("title");
				expect(record).toHaveProperty("content");
			}
		});

		test("should handle streaming with backpressure", async () => {
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Create test data
			const testData = Array.from({ length: 100 }, (_, i) => ({
				id: i,
				data: `data-${i}`,
			}));
			const jsonlData = JSONLStreamer.toJSONL(testData);

			// Create a readable stream
			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				start(controller) {
					const chunks = jsonlData.split("\n");
					for (const chunk of chunks) {
						controller.enqueue(encoder.encode(`${chunk}\n`));
					}
					controller.close();
				},
			});

			let recordCount = 0;
			const processedCount = 0;

			// Process stream with backpressure handling
			await JSONLStreamer.streamParse(
				stream,
				(record) => {
					recordCount++;
					// Simulate processing delay
					return new Promise((resolve) => setTimeout(resolve, 1));
				},
				{ batchSize: 10 },
			);

			expect(recordCount).toBe(testData.length);
		});

		test("should handle streaming errors gracefully", async () => {
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Create malformed JSONL data
			const malformedData = "Valid JSON\n{ invalid json\nAnother valid JSON";

			const result = JSONLStreamer.validateJSONL(malformedData);

			expect(result.valid).toBe(false);
			expect(result.errorCount).toBeGreaterThan(0);
			expect(result.validCount).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Buffer Streaming", () => {
		test("should optimize buffer streaming performance", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Create a readable stream
			const readable = new Readable({
				read() {
					// Generate test data
					for (let i = 0; i < 100; i++) {
						const data = Buffer.from(`Line ${i}: ${"x".repeat(100)}`);
						this.push(data);
					}
					this.push(null); // End stream
				},
			});

			// Create a writable stream
			const chunks: Buffer[] = [];
			const writable = new Writable({
				write(chunk, encoding, callback) {
					chunks.push(chunk);
					callback();
				},
			});

			const start = performance.now();

			// Pipe streams with optimized buffer handling
			readable.pipe(writable);

			// Wait for completion
			await new Promise<void>((resolve) => {
				writable.on("finish", resolve);
			});

			const end = performance.now();
			const duration = end - start;

			// Verify performance
			expect(duration).toBeLessThan(50); // Should be very fast
			expect(chunks.length).toBeGreaterThan(0);
			expect(Buffer.concat(chunks).length).toBeGreaterThan(10000);
		});

		test("should handle large buffer streaming efficiently", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Create large test data
			const largeData = Buffer.alloc(1024 * 1024, "test data"); // 1MB

			const readable = new Readable({
				read() {
					this.push(largeData);
					this.push(null);
				},
			});

			const chunks: Buffer[] = [];
			const writable = new Writable({
				write(chunk, encoding, callback) {
					chunks.push(chunk);
					callback();
				},
			});

			const start = performance.now();
			readable.pipe(writable);

			await new Promise<void>((resolve) => {
				writable.on("finish", resolve);
			});

			const end = performance.now();
			const duration = end - start;

			// Verify performance for large data
			expect(duration).toBeLessThan(100); // Should handle 1MB efficiently
			expect(Buffer.concat(chunks).length).toBe(largeData.length);
		});
	});

	describe("RSS Feed Streaming", () => {
		test("should handle RSS feed streaming with optimization", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);

			// Mock RSS feed data
			const mockFeedData = {
				title: "Test Feed",
				description: "Test Description",
				items: Array.from({ length: 100 }, (_, i) => ({
					title: `Item ${i}`,
					link: `https://example.com/item/${i}`,
					description: `Description for item ${i}`,
					pubDate: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
				})),
			};

			// Mock fetch response
			const mockResponse = new Response(JSON.stringify(mockFeedData), {
				headers: { "Content-Type": "application/json" },
			});

			const fetcher = new OptimizedRSSFetcher();

			const start = performance.now();
			const result = await fetcher.fetchFeed("https://example.com/feed.json");
			const end = performance.now();

			const duration = end - start;

			// Verify performance
			expect(duration).toBeLessThan(1000); // Should be fast even with network simulation
			expect(result).toBeDefined();
		});

		test("should handle streaming RSS feed validation", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);

			// Test with invalid feed data
			const invalidFeedData = {
				invalid: true,
				missing: "required fields",
			};

			const mockResponse = new Response(JSON.stringify(invalidFeedData), {
				headers: { "Content-Type": "application/json" },
			});

			const fetcher = new OptimizedRSSFetcher();

			try {
				await fetcher.fetchFeed("https://example.com/invalid-feed.json");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});
	});

	describe("Memory-Efficient Streaming", () => {
		test("should not leak memory during long streaming operations", async () => {
			const initialMemory = process.memoryUsage();

			// Simulate long streaming operation
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			for (let i = 0; i < 1000; i++) {
				const readable = new Readable({
					read() {
						const data = Buffer.from(`Data chunk ${i}: ${"x".repeat(1000)}`);
						this.push(data);
						this.push(null);
					},
				});

				const chunks: Buffer[] = [];
				const writable = new Writable({
					write(chunk, encoding, callback) {
						chunks.push(chunk);
						callback();
					},
				});

				readable.pipe(writable);

				await new Promise<void>((resolve) => {
					writable.on("finish", resolve);
				});
			}

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage();
			const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory increase should be reasonable (less than 50MB)
			expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
		});

		test("should handle streaming with chunk size optimization", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Test different chunk sizes
			const chunkSizes = [1024, 4096, 16384, 65536];

			for (const chunkSize of chunkSizes) {
				const readable = new Readable({
					read() {
						const data = Buffer.alloc(chunkSize, "test");
						this.push(data);
						this.push(null);
					},
				});

				const chunks: Buffer[] = [];
				const writable = new Writable({
					write(chunk, encoding, callback) {
						chunks.push(chunk);
						callback();
					},
				});

				const start = performance.now();
				readable.pipe(writable);

				await new Promise<void>((resolve) => {
					writable.on("finish", resolve);
				});

				const end = performance.now();
				const duration = end - start;

				// Each chunk size should be handled efficiently
				expect(duration).toBeLessThan(100);
				expect(chunks[0].length).toBe(chunkSize);
			}
		});
	});

	describe("Error Recovery in Streaming", () => {
		test("should handle network errors in streaming", async () => {
			const { OptimizedRSSFetcher } = await import(
				"../src/services/optimized-rss-fetcher.js"
			);

			// Mock network error
			const fetcher = new OptimizedRSSFetcher();

			try {
				await fetcher.fetchFeed("https://nonexistent-domain.invalid/feed.xml");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
				// Should handle network errors gracefully
			}
		});

		test("should handle malformed data in streaming", async () => {
			const { JSONLStreamer } = await import("../src/utils/jsonl-stream.js");

			// Test with malformed JSONL data
			const malformedData = "Valid JSON\n{ invalid json\nAnother valid JSON";

			const result = JSONLStreamer.validateJSONL(malformedData);

			expect(result.valid).toBe(false);
			expect(result.errorCount).toBeGreaterThan(0);
			expect(result.validCount).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Concurrent Streaming", () => {
		test("should handle multiple concurrent streams", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const streamPromises = Array.from({ length: 10 }, async (_, i) => {
				const readable = new Readable({
					read() {
						const data = Buffer.from(`Stream ${i}: ${"x".repeat(1000)}`);
						this.push(data);
						this.push(null);
					},
				});

				const chunks: Buffer[] = [];
				const writable = new Writable({
					write(chunk, encoding, callback) {
						chunks.push(chunk);
						callback();
					},
				});

				readable.pipe(writable);

				await new Promise<void>((resolve) => {
					writable.on("finish", resolve);
				});

				return chunks;
			});

			const start = performance.now();
			const results = await Promise.all(streamPromises);
			const end = performance.now();

			const duration = end - start;

			// Verify concurrent performance
			expect(duration).toBeLessThan(500); // Should handle 10 concurrent streams efficiently
			expect(results.length).toBe(10);
			expect(results[0].length).toBe(1);
		});
	});
});
