// scripts/debug-fetch.ts - Debug script for RSS Fetcher
// Usage: DEBUG_FETCH=true bun run scripts/debug-fetch.ts

import { RSSFetcher } from "../src/rss-fetcher.js";

const fetcher = new RSSFetcher();

// Enable verbose logging if DEBUG_FETCH is set
const DEBUG = process.env.DEBUG_FETCH === "true";

async function main() {
	const url = process.argv[2] || "https://news.ycombinator.com/rss";

	if (DEBUG) {
		console.info(`🔍 Debugging fetch for: ${url}`);
		console.info("Initial stats:", fetcher.getStats());
	}

	try {
		const fetchResult = await fetcher.fetch(url);
		// Profiler returns { result, operationId, duration }, extract the actual data
		const result = fetchResult.result || fetchResult;

		if (DEBUG) {
			console.info("\n✅ Fetch successful!");
			console.info("DNS prefetches:", fetcher.getStats().dnsPrefetches);
			console.info("Total requests:", fetcher.getStats().totalRequests);
			console.info("Cache hits:", fetcher.getStats().cacheHits);
			console.info("\nFeed info:");
			console.info(
				"  Title:",
				result.rss?.channel?.title || result.feed?.title || "Unknown",
			);
			console.info(
				"  Items:",
				result.rss?.channel?.item?.length || result.feed?.entry?.length || 0,
			);
			console.info("  Fetch time:", result.meta?.fetchTime);
			console.info("  Parse time:", result.meta?.parseTime);
			console.info("  Headers preserved:", result.meta?.headersPreserved);
		} else {
			console.info("Result:", JSON.stringify(result, null, 2));
		}
	} catch (error: any) {
		console.error("❌ Fetch failed:", error.message);
		console.error("Error code:", error.code);
		process.exit(1);
	}
}

main();
