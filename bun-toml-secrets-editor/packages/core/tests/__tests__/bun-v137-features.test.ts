/**
 * Bun v1.3.7 Feature Tests
 *
 * Tests for v1.3.7 specific features:
 * - Bun.wrapAnsi()
 * - Bun.JSON5
 * - Bun.JSONL
 * - HTTP/2 header casing
 * - Performance optimizations
 */

import { describe, expect, it } from "bun:test";
import {
	convertToJSON5,
	parseJSON5,
	stringifyJSON5,
	validateJSON5,
} from "../config/json5-loader-v137.js";
import { RSSFetcherV137 } from "../rss/rss-fetcher-v137.js";

describe("Bun v1.3.7 Features", () => {
	describe("Feature Detection", () => {
		it("should detect Bun.wrapAnsi", () => {
			const hasWrapAnsi = typeof Bun !== "undefined" && "wrapAnsi" in Bun;
			expect(hasWrapAnsi).toBe(true);
		});

		it("should detect Bun.JSON5", () => {
			const hasJSON5 = typeof Bun !== "undefined" && "JSON5" in Bun;
			expect(hasJSON5).toBe(true);
		});

		it("should detect Bun.JSONL", () => {
			const hasJSONL = typeof Bun !== "undefined" && "JSONL" in Bun;
			expect(hasJSONL).toBe(true);
		});
	});

	describe("JSON5 Parsing", () => {
		it("should parse JSON5 with comments", () => {
			const json5 = `
        {
          // This is a comment
          "name": "test",
          "value": 123,
        }
      `;

			const result = parseJSON5(json5);
			expect(result.name).toBe("test");
			expect(result.value).toBe(123);
		});

		it("should parse JSON5 with trailing commas", () => {
			const json5 = `{
        "a": 1,
        "b": 2,
      }`;

			const result = parseJSON5(json5);
			expect(result.a).toBe(1);
			expect(result.b).toBe(2);
		});

		it("should parse JSON5 with single quotes", () => {
			const json5 = `{
        'name': 'test',
        'value': 123
      }`;

			const result = parseJSON5(json5);
			expect(result.name).toBe("test");
		});

		it("should stringify to JSON5 format", () => {
			const obj = { name: "test", value: 123 };
			const json5 = stringifyJSON5(obj);

			// Bun.JSON5.stringify uses unquoted keys and single quotes
			expect(json5).toContain("name");
			expect(json5).toContain("test");
			expect(json5).toContain("value");
			expect(json5).toContain("123");
		});

		it("should validate JSON5", () => {
			const valid = `{ "name": "test" }`;
			const invalid = `{ name: "test"`; // Missing closing brace

			expect(validateJSON5(valid).valid).toBe(true);
			expect(validateJSON5(invalid).valid).toBe(false);
		});

		it("should convert JSON to JSON5 with comments", () => {
			const json = {
				name: "test",
				database: { host: "localhost", port: 5432 },
			};

			const comments = {
				name: "Application name",
				"database.host": "Database host",
			};

			const json5 = convertToJSON5(json, comments);

			expect(json5).toContain("// Application name");
			expect(json5).toContain("// Database host");
		});
	});

	describe("Performance Optimizations", () => {
		it("should have fast array.flat() (3x faster in v1.3.7)", () => {
			const arr = Array(1000).fill([1, 2, 3]);

			const start = performance.now();
			for (let i = 0; i < 1000; i++) {
				arr.flat();
			}
			const duration = performance.now() - start;

			// Should be very fast (< 50ms for 1000 iterations)
			expect(duration).toBeLessThan(50);
		});

		it("should have fast string padding (90% faster in v1.3.7)", () => {
			const start = performance.now();
			for (let i = 0; i < 100000; i++) {
				"test".padStart(10);
			}
			const duration = performance.now() - start;

			// Should be very fast (< 100ms for 100000 iterations)
			expect(duration).toBeLessThan(100);
		});

		it("should have fast async/await (35% faster in v1.3.7)", async () => {
			const start = performance.now();

			// Create 1000 async operations
			const promises = Array(1000)
				.fill(null)
				.map(async () => {
					await Promise.resolve();
					return 1;
				});

			await Promise.all(promises);
			const duration = performance.now() - start;

			// Should complete quickly
			expect(duration).toBeLessThan(500);
		});
	});

	describe("RSS Fetcher v1.3.7", () => {
		it("should create RSSFetcherV137 instance", () => {
			const fetcher = new RSSFetcherV137();
			expect(fetcher).toBeDefined();
		});

		it("should track HTTP/2 requests", () => {
			const fetcher = new RSSFetcherV137();
			const stats = fetcher.getStats();

			expect(stats.http2Percentage).toBeDefined();
			expect(stats.streamingPercentage).toBeDefined();
		});

		it("should reset statistics", () => {
			const fetcher = new RSSFetcherV137();

			// Reset should clear stats
			fetcher.resetStats();
			const stats = fetcher.getStats();

			expect(stats.totalRequests).toBe(0);
			expect(stats.http2Requests).toBe(0);
		});
	});

	describe("Template Resolution Performance", () => {
		it("should resolve templates quickly", async () => {
			const { resolveTemplate } = await import("../config/template-engine.js");

			const template = `
        [database]
        host = "localhost"
        password = "\${secrets:production:DB_PASSWORD}"
      `;

			const start = performance.now();
			const result = await resolveTemplate(template, { strict: false });
			const duration = performance.now() - start;

			// Should resolve in under 100ms
			expect(duration).toBeLessThan(100);
			expect(result.content).toContain("[database]");
		});
	});
});

describe("Bun v1.3.7 Integration", () => {
	it("should have all v1.3.7 features available", () => {
		const features = {
			wrapAnsi: typeof Bun !== "undefined" && "wrapAnsi" in Bun,
			JSON5: typeof Bun !== "undefined" && "JSON5" in Bun,
			JSONL: typeof Bun !== "undefined" && "JSONL" in Bun,
			version: typeof Bun !== "undefined" && Bun.version,
		};

		console.log("Bun v1.3.7 Features:", features);

		expect(features.wrapAnsi).toBe(true);
		expect(features.JSON5).toBe(true);
		expect(features.JSONL).toBe(true);
		expect(features.version).toContain("1.3");
	});
});
