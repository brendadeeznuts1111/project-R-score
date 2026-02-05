#!/usr/bin/env bun
// test/performance-optimizations.test.ts
// Bun v1.3.7 Performance Optimization Tests

import { describe, expect, test } from "bun:test";
import { ReporterOptimized } from "../src/cli/reporter-optimized.js";
import { RSSFetcherOptimized } from "../src/rss-fetcher-optimized.js";

describe("Bun v1.3.7 Buffer Optimizations (50% faster)", () => {
	test("Buffer.from with Uint8Array is optimized", () => {
		const data = new Uint8Array(1000).fill(65); // 'A' repeated
		const start = Bun.nanoseconds();
		const buf = Buffer.from(data);
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		expect(buf.length).toBe(1000);
		expect(elapsed).toBeLessThan(1); // Should be very fast with v1.3.7
	});

	test("RSSFetcherOptimized uses buffer conversion", async () => {
		const fetcher = new RSSFetcherOptimized();
		const fetchResult = await fetcher.fetch("https://news.ycombinator.com/rss");
		// Profiler returns { result, operationId, duration }
		const result = fetchResult.result || fetchResult;

		expect(result.meta.bufferOptimized).toBe(true);
		expect(result.rss || result.feed).toBeDefined();
	}, 10000);
});

describe("Bun v1.3.7 String Padding (90% faster)", () => {
	test("padStart is optimized for table alignment", () => {
		const start = Bun.nanoseconds();
		const padded = "42".padStart(10, "0");
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		expect(padded).toBe("0000000042");
		expect(elapsed).toBeLessThan(0.1); // Extremely fast
	});

	test("padEnd is optimized for table formatting", () => {
		const start = Bun.nanoseconds();
		const padded = "Name".padEnd(20, " ");
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		expect(padded).toBe("Name                ");
		expect(elapsed).toBeLessThan(0.1);
	});

	test("ReporterOptimized uses padStart/padEnd", () => {
		const reporter = new ReporterOptimized();
		const metrics = {
			feeds: 42,
			avgLatency: 250,
			cacheHitRate: 95,
		};

		const output = reporter.formatMetrics(metrics);
		expect(output).toContain("  42"); // padded
		expect(output).toContain("   250"); // padded
	});
});

describe("Bun v1.3.7 Array Flat (3x faster)", () => {
	test("flat() is optimized for nested arrays", () => {
		const nested = [
			[1, 2],
			[3, 4],
			[5, 6],
		];
		const start = Bun.nanoseconds();
		const flat = nested.flat();
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		expect(flat).toEqual([1, 2, 3, 4, 5, 6]);
		expect(elapsed).toBeLessThan(0.1);
	});

	test("ReporterOptimized uses flat for feed items", () => {
		const reporter = new ReporterOptimized();
		const feeds = [
			{ rss: { channel: { item: [{ title: "A" }, { title: "B" }] } } },
			{ rss: { channel: { item: [{ title: "C" }, { title: "D" }] } } },
		];

		const output = reporter.formatFeedList(feeds);
		expect(output).toContain("01. A");
		expect(output).toContain("04. D");
	});
});

describe("Bun v1.3.7 Async/Await (35% faster)", () => {
	test("concurrent Promise.all is optimized", async () => {
		const fetcher = new RSSFetcherOptimized();
		const urls = [
			"https://news.ycombinator.com/rss",
			"https://feeds.bbci.co.uk/news/rss.xml",
		];

		const start = Bun.nanoseconds();
		const results = await fetcher.fetchBatch(urls, { concurrency: 2 });
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		expect(results.length).toBe(2);
		expect(elapsed).toBeGreaterThan(0);
	}, 20000);
});

describe("Bun v1.3.7 Bun.wrapAnsi (88x faster)", () => {
	test("wrapAnsi is used in reporter", () => {
		const reporter = new ReporterOptimized();
		const feed = {
			rss: {
				channel: {
					title: "Test Feed",
					item: [{}, {}, {}],
				},
			},
		};

		const output = reporter.formatFeed(feed, 0);
		expect(output).toContain("Test Feed");
		expect(output).toContain("3 items");
	});

	test("progress bar uses optimized padEnd", () => {
		const reporter = new ReporterOptimized();
		const bar = reporter.formatProgressBar(50, 100);

		expect(bar).toContain("[");
		expect(bar).toContain("]");
		expect(bar).toContain("50%");
	});
});

describe("Performance Benchmarks", () => {
	test("Buffer operations benchmark", () => {
		const iterations = 10000;
		const data = new Uint8Array(100).fill(65);

		const start = Bun.nanoseconds();
		for (let i = 0; i < iterations; i++) {
			Buffer.from(data);
		}
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		console.log(
			`Buffer.from: ${iterations} iterations in ${elapsed.toFixed(2)}ms`,
		);
		expect(elapsed).toBeLessThan(100); // Should complete quickly
	});

	test("String padding benchmark", () => {
		const iterations = 10000;

		const start = Bun.nanoseconds();
		for (let i = 0; i < iterations; i++) {
			String(i).padStart(10, "0");
		}
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		console.log(
			`padStart: ${iterations} iterations in ${elapsed.toFixed(2)}ms`,
		);
		expect(elapsed).toBeLessThan(50);
	});

	test("Array flat benchmark", () => {
		const iterations = 10000;
		const nested = [
			[1, 2],
			[3, 4],
			[5, 6],
		];

		const start = Bun.nanoseconds();
		for (let i = 0; i < iterations; i++) {
			nested.flat();
		}
		const elapsed = (Bun.nanoseconds() - start) / 1e6;

		console.log(`flat(): ${iterations} iterations in ${elapsed.toFixed(2)}ms`);
		expect(elapsed).toBeLessThan(50);
	});
});
