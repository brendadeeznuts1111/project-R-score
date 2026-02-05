// src/batch-fetcher.ts - Batch RSS fetching with DNS prefetch
import { dns } from "bun";
import { RSSFetcher } from "./rss-fetcher.js";

const fetcher = new RSSFetcher();

export async function batchFetch(urls: string[]) {
	// Extract unique domains
	const domains = [...new Set(urls.map((u) => new URL(u).hostname))];

	// Prefetch BEFORE fetching (critical timing!)
	console.log(`⏳ Prefetching ${domains.length} domains...`);
	for (const domain of domains) {
		dns.prefetch(domain, 443);
	}

	// Small delay to let DNS resolve (optional, usually not needed)
	await Bun.sleep(50); // 50ms head start

	// Now fetch - DNS should be cached
	console.log(`🚀 Fetching ${urls.length} URLs...`);
	const results = await Promise.all(
		urls.map(async (url) => {
			try {
				return await fetcher.fetch(url);
			} catch (error: any) {
				return { error: error.message, url };
			}
		}),
	);

	return {
		results,
		stats: {
			domainsPrefetched: domains.length,
			urlsFetched: urls.length,
			dns: dns.getCacheStats(),
		},
	};
}

export default { batchFetch };
