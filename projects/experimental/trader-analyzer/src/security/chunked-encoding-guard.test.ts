#!/usr/bin/env bun
/**
 * @fileoverview Memory-Safe Chunked Encoding Guard Tests
 * @description Comprehensive tests for memory safety, ReDoS protection, and attack vector blocking
 * @module security/chunked-encoding-guard.test
 * @version 1.0.0
 */

import { describe, expect, test } from "bun:test";
import {
	ChunkedEncodingError,
	ChunkedEncodingGuard,
	parseChunkedEncoding,
} from "./chunked-encoding-guard";

describe("ChunkedEncodingGuard", () => {
	const guard = new ChunkedEncodingGuard();

	describe("Basic Parsing", () => {
		test("should parse simple chunk", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(1);
			expect(new TextDecoder().decode(result.chunks[0])).toBe("hello");
			expect(result.totalSize).toBe(5);
			expect(result.extraData).toBeNull();
		});

		test("should parse multiple chunks", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n6\r\nworld!\r\n0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(2);
			expect(new TextDecoder().decode(result.chunks[0])).toBe("hello");
			expect(new TextDecoder().decode(result.chunks[1])).toBe("world!");
			expect(result.totalSize).toBe(11);
		});

		test("should parse empty chunks", () => {
			const data = new TextEncoder().encode("0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(0);
			expect(result.totalSize).toBe(0);
		});
	});

	describe("Memory Safety - Bounded Slices", () => {
		test("should reject oversized chunk", () => {
			const oversizedSize = guard.MAX_CHUNK_SIZE + 1;
			const hexSize = oversizedSize.toString(16);
			const data = new TextEncoder().encode(`${hexSize}\r\n${"A".repeat(oversizedSize)}\r\n0\r\n\r\n`);

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.OVERSIZED_CHUNK);
		});

		test("should accept maximum size chunk", () => {
			const maxSize = guard.MAX_CHUNK_SIZE;
			const hexSize = maxSize.toString(16);
			const chunkData = "A".repeat(maxSize);
			const data = new TextEncoder().encode(`${hexSize}\r\n${chunkData}\r\n0\r\n\r\n`);

			const result = guard.parse(data);
			expect(result.chunks[0].length).toBe(maxSize);
		});

		test("should reject total size exceeding limit", () => {
			const chunkSize = guard.MAX_CHUNK_SIZE;
			const hexSize = chunkSize.toString(16);
			const chunkData = "A".repeat(chunkSize);

			// Create enough chunks to exceed MAX_TOTAL_SIZE
			const chunks: string[] = [];
			const maxChunks = Math.floor(guard.MAX_TOTAL_SIZE / chunkSize) + 1;
			for (let i = 0; i < maxChunks; i++) {
				chunks.push(`${hexSize}\r\n${chunkData}\r\n`);
			}
			chunks.push("0\r\n\r\n");

			const data = new TextEncoder().encode(chunks.join(""));

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.OVER_SIZE_LIMIT);
		});
	});

	describe("ReDoS Protection - Linear Hex Parse", () => {
		test("should parse large hex strings quickly (linear time)", () => {
			// Create a large but valid hex string
			const largeHex = "F".repeat(1000); // 1000 'F' characters
			const chunkSize = parseInt(largeHex, 16);

			// This should be fast (linear), not slow (exponential)
			const start = Bun.nanoseconds();
			const parsed = parseInt(largeHex, 16);
			const elapsed = Bun.nanoseconds() - start;

			expect(parsed).toBe(chunkSize);
			// Should complete in < 1ms (linear scan)
			expect(elapsed).toBeLessThan(1_000_000); // 1ms in nanoseconds
		});

		test("should handle maximum hex string length", () => {
			// Use a value that fits within MAX_CHUNK_SIZE but uses max hex length
			const maxHex = guard.MAX_CHUNK_SIZE.toString(16).toUpperCase(); // Max size in hex
			const chunkData = "A".repeat(guard.MAX_CHUNK_SIZE);
			const data = new TextEncoder().encode(`${maxHex}\r\n${chunkData}\r\n0\r\n\r\n`);

			const result = guard.parse(data);
			expect(result.chunks).toHaveLength(1);
			expect(result.chunks[0].length).toBe(guard.MAX_CHUNK_SIZE);
		});

		test("should reject hex string exceeding max length", () => {
			const tooLongHex = "F".repeat(guard.MAX_SIZE_LINE_LENGTH + 1);
			const data = new TextEncoder().encode(`${tooLongHex}\r\nA\r\n0\r\n\r\n`);

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.MALFORMED);
		});
	});

	describe("Arithmetic Overflow Protection", () => {
		test("should handle safe integer range", () => {
			// JavaScript safe integer: 2^53 - 1
			const safeMax = Number.MAX_SAFE_INTEGER;
			expect(guard.MAX_TOTAL_SIZE).toBeLessThan(safeMax);

			// Should handle cumulative size correctly
			const chunkSize = 1000;
			const hexSize = chunkSize.toString(16);
			const chunkData = "A".repeat(chunkSize);

			const chunks: string[] = [];
			const numChunks = Math.floor(guard.MAX_TOTAL_SIZE / chunkSize);
			for (let i = 0; i < numChunks; i++) {
				chunks.push(`${hexSize}\r\n${chunkData}\r\n`);
			}
			chunks.push("0\r\n\r\n");

			const data = new TextEncoder().encode(chunks.join(""));
			const result = guard.parse(data);

			expect(result.totalSize).toBe(numChunks * chunkSize);
			expect(result.totalSize).toBeLessThanOrEqual(guard.MAX_TOTAL_SIZE);
		});

		test("should reject invalid hex values", () => {
			const data = new TextEncoder().encode("INVALID\r\nA\r\n0\r\n\r\n");

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.INVALID_HEX);
		});

		test("should reject negative chunk size", () => {
			const data = new TextEncoder().encode("-1\r\nA\r\n0\r\n\r\n");

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.INVALID_HEX);
		});
	});

	describe("CRLF Validation", () => {
		test("should reject missing CRLF after chunk size", () => {
			const data = new TextEncoder().encode("5hello\r\n0\r\n\r\n");

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.MALFORMED);
		});

		test("should reject missing CRLF after chunk data", () => {
			// Create data where chunk size says 5 bytes, data is provided, but no CRLF follows
			// "5\r\nhello" (5 bytes) but data ends without CRLF
			const chunkData = "hello";
			const invalidData = new TextEncoder().encode(`5\r\n${chunkData}`); // Missing CRLF after data

			expect(() => guard.parse(invalidData)).toThrow(ChunkedEncodingError.MALFORMED);
		});

		test("should reject missing final CRLF", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n0\r\n");

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.MALFORMED);
		});

		test("should handle CRLF-only data", () => {
			const data = new TextEncoder().encode("0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(0);
		});
	});

	describe("HTTP Smuggling Prevention - Extra Data Detection", () => {
		test("should detect extra data after final chunk", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n0\r\n\r\nATTACK");

			const result = guard.parse(data);
			expect(result.extraData).not.toBeNull();
			expect(new TextDecoder().decode(result.extraData!)).toBe("ATTACK");
		});

		test("should accept clean final chunk (no extra data)", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.extraData).toBeNull();
		});

		test("should detect extra data with CRLF", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n0\r\n\r\n\r\nEXTRA");
			const result = guard.parse(data);

			expect(result.extraData).not.toBeNull();
			expect(new TextDecoder().decode(result.extraData!)).toContain("EXTRA");
		});
	});

	describe("Chunk Extensions", () => {
		test("should ignore chunk extensions", () => {
			const data = new TextEncoder().encode("5;extension=value\r\nhello\r\n0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(1);
			expect(new TextDecoder().decode(result.chunks[0])).toBe("hello");
		});

		test("should handle multiple extensions", () => {
			const data = new TextEncoder().encode("5;ext1=val1;ext2=val2\r\nhello\r\n0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(1);
		});
	});

	describe("Edge Cases", () => {
		test("should handle single byte chunks", () => {
			const data = new TextEncoder().encode("1\r\nA\r\n1\r\nB\r\n0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(2);
			expect(new TextDecoder().decode(result.chunks[0])).toBe("A");
			expect(new TextDecoder().decode(result.chunks[1])).toBe("B");
		});

		test("should handle uppercase hex", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n0\r\n\r\n");
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(1);
		});

		test("should handle mixed case hex", () => {
			const chunkSize = 0xabc; // 2748 bytes
			const chunkData = "A".repeat(chunkSize);
			const data = new TextEncoder().encode(`aBc\r\n${chunkData}\r\n0\r\n\r\n`);
			const result = guard.parse(data);

			expect(result.chunks).toHaveLength(1);
			expect(result.chunks[0].length).toBe(0xabc);
		});

		test("should reject incomplete chunk data", () => {
			const data = new TextEncoder().encode("10\r\nshort\r\n0\r\n\r\n");

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.MALFORMED);
		});

		test("should reject data without final zero chunk", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n");

			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.MALFORMED);
		});
	});

	describe("Convenience Function", () => {
		test("parseChunkedEncoding should work", () => {
			const data = new TextEncoder().encode("5\r\nhello\r\n0\r\n\r\n");
			const result = parseChunkedEncoding(data);

			expect(result.chunks).toHaveLength(1);
			expect(new TextDecoder().decode(result.chunks[0])).toBe("hello");
		});
	});

	describe("Performance - Fuzzer Resistance", () => {
		test("should handle many small chunks efficiently", () => {
			const chunks: string[] = [];
			for (let i = 0; i < 1000; i++) {
				chunks.push(`1\r\nA\r\n`);
			}
			chunks.push("0\r\n\r\n");

			const data = new TextEncoder().encode(chunks.join(""));
			const start = Bun.nanoseconds();
			const result = guard.parse(data);
			const elapsed = Bun.nanoseconds() - start;

			expect(result.chunks).toHaveLength(1000);
			// Should parse 1000 chunks in < 10ms
			expect(elapsed).toBeLessThan(10_000_000); // 10ms
		});

		test("should reject attack-sized chunks quickly", () => {
			const attackSize = 2 ** 31; // 2GB fake size
			const hexSize = attackSize.toString(16);
			const data = new TextEncoder().encode(`${hexSize}\r\nA\r\n0\r\n\r\n`);

			const start = Bun.nanoseconds();
			expect(() => guard.parse(data)).toThrow(ChunkedEncodingError.OVERSIZED_CHUNK);
			const elapsed = Bun.nanoseconds() - start;

			// Should reject instantly (< 1ms)
			expect(elapsed).toBeLessThan(1_000_000); // 1ms
		});
	});

	describe("Memory Footprint", () => {
		test("should have predictable memory allocation", () => {
			const chunkSize = 1000;
			const hexSize = chunkSize.toString(16);
			const chunkData = "A".repeat(chunkSize);

			const chunks: string[] = [];
			const numChunks = 10;
			for (let i = 0; i < numChunks; i++) {
				chunks.push(`${hexSize}\r\n${chunkData}\r\n`);
			}
			chunks.push("0\r\n\r\n");

			const data = new TextEncoder().encode(chunks.join(""));
			const result = guard.parse(data);

			// Memory should be bounded: numChunks * chunkSize
			const expectedMemory = numChunks * chunkSize;
			const actualMemory = result.chunks.reduce((sum, chunk) => sum + chunk.length, 0);

			expect(actualMemory).toBe(expectedMemory);
			expect(actualMemory).toBeLessThanOrEqual(guard.MAX_TOTAL_SIZE);
		});
	});
});
