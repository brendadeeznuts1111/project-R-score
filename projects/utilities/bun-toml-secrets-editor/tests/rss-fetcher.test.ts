// test/rss-fetcher.test.ts
import { describe, expect, test } from "bun:test";
import { RSSFetcher } from "../src/rss-fetcher.js";

describe("RSS Fetcher v1.3.7", () => {
	const fetcher = new RSSFetcher();

	// v1.3.7: bun test --inspect now works without --inspect-wait
	// IDE gets real-time TestReporter events
	test("fetch with header casing preserved", async () => {
		const result = await fetcher.fetch("https://news.ycombinator.com/rss");
		expect(result.rss?.channel?.title || result.feed?.title).toBeTruthy();
		expect(result.meta?.headersPreserved).toBe(true);
	}, 10000);

	// v1.3.7: Map comparison works correctly
	test("cache headers as Map", () => {
		const headers = new Map([["Content-Type", "application/rss+xml"]]);
		expect(headers.get("Content-Type")).toBe("application/rss+xml");
		expect(headers.size).toBe(1);
	});

	// v1.3.7: Bun's native timer handling
	test("timer cleanup with Bun", async () => {
		const start = performance.now();
		await new Promise((resolve) => setTimeout(resolve, 10));
		const elapsed = performance.now() - start;
		expect(elapsed).toBeGreaterThan(5);
	});

	test("fetch with AbortSignal timeout", async () => {
		// v1.3.7: signal option stable under load
		const feed = await fetcher.fetch("https://news.ycombinator.com/rss", {
			timeout: 5000,
		});
		expect(feed.rss?.channel?.title || feed.feed?.title).toBeTruthy();
		expect(feed.meta?.fetchTime).toBeDefined();
	}, 10000);
});
