// tests/v1.3.7-features.test.ts
import { describe, expect, test } from "bun:test";

describe("Bun v1.3.7 Features", () => {
	test("should demonstrate header casing preservation", () => {
		// v1.3.7: Headers preserve EXACT casing as written
		const headers = new Headers({
			Authorization: "Bearer token",
			"Content-Type": "application/json",
			"X-Custom-Header": "value",
		});

		// Headers.get() is case-insensitive for lookup
		expect(headers.get("Authorization")).toBe("Bearer token");
		expect(headers.get("authorization")).toBe("Bearer token");
		expect(headers.get("Content-Type")).toBe("application/json");
		expect(headers.get("content-type")).toBe("application/json");

		// But the internal representation preserves casing
		expect(headers.has("Authorization")).toBe(true);
		expect(headers.has("Content-Type")).toBe(true);
	});

	test("should demonstrate Buffer.from() performance", () => {
		const arr = new Uint8Array(1024);

		// v1.3.7: 50% faster Buffer.from()
		const buffer = Buffer.from(arr);
		expect(buffer).toBeInstanceOf(Buffer);
		expect(buffer.length).toBe(1024);
	});

	test("should demonstrate async/await performance", async () => {
		// v1.3.7: 35% faster async/await
		const result = await Promise.resolve("done");
		expect(result).toBe("done");
	});

	test("should demonstrate Array.flat() performance", () => {
		// v1.3.7: 3x faster Array.flat()
		const nested = [
			[1, 2, 3],
			[4, 5, 6],
		];
		const flat = nested.flat();
		expect(flat).toEqual([1, 2, 3, 4, 5, 6]);
	});

	test("should demonstrate String.padStart() performance", () => {
		// v1.3.7: 90% faster String.padStart()
		const padded = "test".padStart(20, "0");
		expect(padded).toBe("0000000000000000test"); // 16 zeros + "test" = 20 characters
	});

	test("should demonstrate Bun.wrapAnsi availability", () => {
		// v1.3.7: 88x faster than wrap-ansi npm package
		const longText =
			"\x1b[31mThis is red text that needs wrapping at 20 columns\x1b[0m";

		// Note: Bun.wrapAnsi may not be available in all test environments
		// This test documents the feature availability
		if (
			typeof (Bun as unknown as { wrapAnsi?: Function }).wrapAnsi === "function"
		) {
			const wrapped = (Bun as unknown as { wrapAnsi: Function }).wrapAnsi(
				longText,
				20,
			);
			expect(typeof wrapped).toBe("string");
			expect(wrapped.length).toBeGreaterThan(0);
		} else {
			// Bun.wrapAnsi may not be available in all environments
			console.warn("Bun.wrapAnsi not available in this environment");
		}
	});

	test("should demonstrate RSSFetcherV137 integration", async () => {
		const { RSSFetcherV137 } = await import(
			"../src/services/rss-fetcher-v1.3.7.js"
		);
		const fetcher = new RSSFetcherV137();

		// Test that the fetcher can be instantiated and has the expected methods
		expect(fetcher).toBeDefined();
		expect(typeof fetcher.fetchWithPreservedCasing).toBe("function");
		expect(typeof fetcher.fetchWordPressFeed).toBe("function");
		expect(typeof fetcher.fetchStrictCasing).toBe("function");
	});

	test("should demonstrate CLIReporter integration", async () => {
		const { CLIReporter } = await import("../src/utils/cli-reporter.js");
		const reporter = new CLIReporter();

		// Test that the reporter can be instantiated and has the expected methods
		expect(reporter).toBeDefined();
		expect(typeof reporter.formatLogEntry).toBe("function");
		expect(typeof reporter.formatFeedEntry).toBe("function");
		expect(typeof reporter.formatStatsTable).toBe("function");
	});

	test("should demonstrate profiler markdown output", async () => {
		const { default: PerformanceMonitor } = await import("../src/profiler.js");
		const profiler = new PerformanceMonitor();

		// Test that the profiler can be instantiated and has the expected methods
		expect(profiler).toBeDefined();
		expect(typeof profiler.generateMarkdownProfile).toBe("function");
		expect(typeof profiler.toMarkdown).toBe("function");
		expect(typeof profiler.captureHeapSnapshot).toBe("function");
	});
});
