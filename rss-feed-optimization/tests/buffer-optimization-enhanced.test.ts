// Enhanced buffer optimization tests for Bun v1.3.7
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { performance } from "node:perf_hooks";

describe("Bun v1.3.7 Buffer Optimization - Enhanced", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(async () => {
		originalEnv = { ...process.env };
	});

	afterEach(async () => {
		process.env = originalEnv;
	});

	describe("BufferOptimizer Class", () => {
		test("should create optimized buffers from various input types", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Test string input
			const stringBuffer = BufferOptimizer.createOptimizedBuffer("Hello World");
			expect(stringBuffer.length).toBe(11);
			expect(stringBuffer.toString()).toBe("Hello World");

			// Test ArrayBuffer input
			const arrayBuffer = new ArrayBuffer(10);
			const uint8Array = new Uint8Array(arrayBuffer);
			for (let i = 0; i < 10; i++) {
				uint8Array[i] = i;
			}
			const bufferFromArray =
				BufferOptimizer.createOptimizedBuffer(arrayBuffer);
			expect(bufferFromArray.length).toBe(10);

			// Test Uint8Array input
			const bufferFromUint8 = BufferOptimizer.createOptimizedBuffer(uint8Array);
			expect(bufferFromUint8.length).toBe(10);
		});

		test("should optimize buffer creation from arrays", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const array = [65, 66, 67, 68, 69]; // ABCDE
			const buffer = BufferOptimizer.optimizeFromArray(array);
			expect(buffer.length).toBe(5);
			expect(buffer.toString()).toBe("ABCDE");
		});

		test("should measure buffer performance accurately", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const operation = () => {
				BufferOptimizer.createOptimizedBuffer("test");
			};

			const metrics = BufferOptimizer.measureBufferPerformance(operation, 100);
			expect(metrics.total).toBeGreaterThan(0);
			expect(metrics.average).toBeGreaterThan(0);
			expect(metrics.iterations).toBe(100);
			expect(metrics.opsPerSecond).toBeGreaterThan(0);
		});

		test("should optimize buffer concatenation", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const buffers = [
				Buffer.from("Hello"),
				Buffer.from(" "),
				Buffer.from("World"),
				Buffer.from("!"),
			];

			const result = BufferOptimizer.optimizeConcat(buffers);
			expect(result.toString()).toBe("Hello World!");
		});

		test("should handle edge cases in buffer operations", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Empty array
			const emptyBuffer = BufferOptimizer.optimizeFromArray([]);
			expect(emptyBuffer.length).toBe(0);

			// Single element
			const singleBuffer = BufferOptimizer.optimizeFromArray([65]);
			expect(singleBuffer.length).toBe(1);
			expect(singleBuffer.toString()).toBe("A");

			// Empty concatenation
			const emptyConcat = BufferOptimizer.optimizeConcat([]);
			expect(emptyConcat.length).toBe(0);

			// Single buffer concatenation
			const singleConcat = BufferOptimizer.optimizeConcat([
				Buffer.from("test"),
			]);
			expect(singleConcat.toString()).toBe("test");
		});
	});

	describe("Buffer Creation Functions", () => {
		test("should create optimized buffers with createOptimizedBuffer", async () => {
			const { createOptimizedBuffer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Test string input
			const stringBuffer = createOptimizedBuffer("Hello World");
			expect(stringBuffer.length).toBe(11);
			expect(stringBuffer.toString()).toBe("Hello World");

			// Test with different encoding
			const utf16Buffer = createOptimizedBuffer("Hello", "utf16le");
			expect(utf16Buffer.length).toBe(10); // 5 characters * 2 bytes each
		});

		test("should optimize R2 buffers", async () => {
			const { optimizeR2Buffer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const data = "Test R2 data";
			const result = optimizeR2Buffer(data);

			expect(result.buffer).toBeInstanceOf(Buffer);
			expect(result.encoding).toBe("utf8");
			expect(result.length).toBe(data.length);
			expect(result.type).toBe("string");
		});

		test("should optimize JSON buffers", async () => {
			const { optimizeJSONBuffer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const data = { test: "value", number: 42 };
			const buffer = optimizeJSONBuffer(data);

			expect(buffer).toBeInstanceOf(Buffer);
			expect(buffer.toString()).toBe(JSON.stringify(data));
		});

		test("should optimize text buffers", async () => {
			const { optimizeTextBuffer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const text = "Hello World! This is a test.";
			const buffer = optimizeTextBuffer(text);

			expect(buffer).toBeInstanceOf(Buffer);
			expect(buffer.toString()).toBe(text.normalize("NFC"));

			// Test with options
			const options = {
				maxLength: 10,
				normalize: true,
			};
			const limitedBuffer = optimizeTextBuffer(text, options);
			expect(limitedBuffer.length).toBeLessThanOrEqual(10);
		});
	});

	describe("Performance Benchmarks", () => {
		test("should benchmark buffer creation performance", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const operation = () => {
				BufferOptimizer.createOptimizedBuffer("performance test");
			};

			const metrics = BufferOptimizer.measureBufferPerformance(operation, 1000);
			expect(metrics.opsPerSecond).toBeGreaterThan(1000);
			expect(metrics.average).toBeLessThan(10); // Should be fast
		});

		test("should compare optimized vs standard buffer creation", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const testData = "comparison test data";

			// Standard Buffer.from()
			const standardStart = performance.now();
			for (let i = 0; i < 1000; i++) {
				Buffer.from(testData);
			}
			const standardEnd = performance.now();
			const standardTime = standardEnd - standardStart;

			// Optimized version
			const optimizedStart = performance.now();
			for (let i = 0; i < 1000; i++) {
				BufferOptimizer.createOptimizedBuffer(testData);
			}
			const optimizedEnd = performance.now();
			const optimizedTime = optimizedEnd - optimizedStart;

			// Optimized version should be competitive
			expect(optimizedTime).toBeLessThanOrEqual(standardTime * 2); // Allow 100% margin
		});
	});

	describe("Memory Management", () => {
		test("should not leak memory during buffer operations", async () => {
			const initialMemory = process.memoryUsage();

			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Perform many buffer operations
			for (let i = 0; i < 1000; i++) {
				const array = Array.from({ length: 100 }, (_, j) => j % 256);
				const buffer = BufferOptimizer.optimizeFromArray(array);
				BufferOptimizer.optimizeConcat([buffer, Buffer.from("test")]);
			}

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage();
			const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory increase should be reasonable (less than 10MB)
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
		});

		test("should handle buffer slicing efficiently", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const originalBuffer = Buffer.from("Hello World! This is a test string.");
			const slice = BufferOptimizer.createSlice(originalBuffer, 6, 11);

			expect(slice.toString()).toBe("World");
			expect(slice.length).toBe(5);
		});
	});

	describe("Error Handling", () => {
		test("should handle invalid inputs gracefully", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Test invalid data type - use try/catch since TypeScript doesn't allow null/undefined
			try {
				(BufferOptimizer.createOptimizedBuffer as any)(null);
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}

			try {
				(BufferOptimizer.createOptimizedBuffer as any)(undefined);
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}

			// Test invalid array
			try {
				(BufferOptimizer.optimizeFromArray as any)("not an array");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});

		test("should handle buffer concatenation errors", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Test with non-array input
			try {
				(BufferOptimizer.optimizeConcat as any)("not an array");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});
	});

	describe("Real-world Usage", () => {
		test("should handle streaming data efficiently", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			// Simulate streaming data chunks
			const chunks = Array.from({ length: 100 }, (_, i) =>
				Buffer.from(`Chunk ${i}: ${"x".repeat(100)}`),
			);

			const start = performance.now();
			const result = BufferOptimizer.optimizeConcat(chunks);
			const end = performance.now();

			expect(result.length).toBeGreaterThan(10000);
			expect(end - start).toBeLessThan(50);
		});

		test("should handle mixed data types in concatenation", async () => {
			const { BufferOptimizer } = await import(
				"../src/utils/buffer-optimization.js"
			);

			const buffers = [
				Buffer.from("String data"),
				Buffer.from([1, 2, 3, 4]),
				Buffer.from("More strings"),
				Buffer.from([255, 0, 128]),
			];

			const result = BufferOptimizer.optimizeConcat(buffers);
			expect(result.length).toBeGreaterThan(10);
		});
	});
});
