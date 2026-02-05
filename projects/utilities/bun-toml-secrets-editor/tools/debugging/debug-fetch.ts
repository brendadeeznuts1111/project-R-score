// scripts/debug-fetch.ts - Debug script for RSS Fetcher
// Usage: DEBUG_FETCH=true bun run scripts/debug-fetch.ts

import { RSSFetcher } from "../src/rss-fetcher.js";

const fetcher = new RSSFetcher();

// Enable verbose logging if DEBUG_FETCH is set
const DEBUG = process.env.DEBUG_FETCH === "true";

async function main() {
	const url = process.argv[2] || "https://news.ycombinator.com/rss";

	if (DEBUG) {
		console.log(`🔍 Debugging fetch for: ${url}`);
		console.log("Initial stats:", fetcher.getStats());
	}

	try {
		const fetchResult = await fetcher.fetch(url);
		// Profiler returns { result, operationId, duration }, extract the actual data
		const result = fetchResult.result || fetchResult;

		if (DEBUG) {
			console.log("\n✅ Fetch successful!");
			console.log("DNS prefetches:", fetcher.getStats().dnsPrefetches);
			console.log("Total requests:", fetcher.getStats().totalRequests);
			console.log("Cache hits:", fetcher.getStats().cacheHits);
			console.log("\nFeed info:");
			console.log(
				"  Title:",
				result.rss?.channel?.title || result.feed?.title || "Unknown",
			);
			console.log(
				"  Items:",
				result.rss?.channel?.item?.length || result.feed?.entry?.length || 0,
			);
			console.log("  Fetch time:", result.meta?.fetchTime);
			console.log("  Parse time:", result.meta?.parseTime);
			console.log("  Headers preserved:", result.meta?.headersPreserved);
		} else {
			console.log("Result:", JSON.stringify(result, null, 2));
		}
	} catch (error: any) {
		console.error("❌ Fetch failed:", error.message);
		console.error("Error code:", error.code);
		process.exit(1);
	}
}

main();
