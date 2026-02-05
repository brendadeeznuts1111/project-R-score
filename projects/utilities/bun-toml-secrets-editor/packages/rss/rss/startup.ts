// src/startup.ts - DNS prefetch on application boot
import { dns } from "bun";

// Top RSS feeds - prefetch during app initialization
const TOP_FEEDS = [
	"news.ycombinator.com",
	"feeds.bbci.co.uk",
	"rss.cnn.com",
	"medium.com",
	"substack.com",
	"techcrunch.com",
	"wired.com",
	"arstechnica.com",
	"slashdot.org",
	"reddit.com",
];

export function prefetchOnStartup() {
	console.log("🌐 Prefetching top feed DNS entries...");

	for (const host of TOP_FEEDS) {
		dns.prefetch(host, 443); // HTTPS port
	}

	console.log(`📡 Prefetched ${TOP_FEEDS.length} hosts`);
	console.log("Cache stats:", dns.getCacheStats());
}

// Get list of top feeds for reference
export function getTopFeeds(): string[] {
	return [...TOP_FEEDS];
}

export default { prefetchOnStartup, getTopFeeds };
