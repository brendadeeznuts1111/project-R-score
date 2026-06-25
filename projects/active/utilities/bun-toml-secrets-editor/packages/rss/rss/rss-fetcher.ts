// src/rss-fetcher.ts

import { handleFetchError } from "../errors/rss-errors.js";
import { RSSProfiler } from "../profiling/rss-profiler.js";

export class RSSFetcher {
	private profiler = new RSSProfiler();
	private stats = {
		dnsPrefetches: 0,
		totalRequests: 0,
		cacheHits: 0,
	};

	async fetch(url: string, options: FetchOptions = {}) {
		this.stats.totalRequests++;
		const startTime = performance.now();

		// v1.3.7: Profile the operation
		return this.profiler.profileOperation(
			`fetch_${new URL(url).hostname}`,
			async () => {
				try {
					// v1.3.7: Headers preserve casing (critical for legacy RSS)
					const response = await fetch(url, {
						headers: {
							"User-Agent": "RSS-Optimizer/1.0 (Bun/1.3.7)",
							Accept: "application/rss+xml, application/atom+xml, */*",
							"Accept-Encoding": "gzip, deflate, br",
							Connection: "keep-alive",
						},
						signal: AbortSignal.timeout(options.timeout || 30000),
					});

					const xml = await response.text();
					const parseStart = performance.now();

					// Parse (could use native FFI when available)
					const feed = await this.parseFeed(xml);

					const duration = performance.now() - startTime;

					return {
						...feed,
						meta: {
							fetchTime: `${duration.toFixed(2)}ms`,
							parseTime: `${(performance.now() - parseStart).toFixed(2)}ms`,
							headersPreserved: true, // v1.3.7 feature
						},
					};
				} catch (error: any) {
					// v1.3.7: Proper error handling for fetch errors
					handleFetchError(error, url);
				}
			},
		);
	}

	private async parseFeed(xml: string) {
		// Use fast-xml-parser or native FFI
		const { XMLParser } = await import("fast-xml-parser");
		const parser = new XMLParser({
			ignoreAttributes: false,
			parseAttributeValue: true,
		});

		return parser.parse(xml);
	}

	// Get fetcher statistics
	getStats() {
		return { ...this.stats };
	}

	// Increment DNS prefetch counter
	trackDnsPrefetch() {
		this.stats.dnsPrefetches++;
	}

	// Increment cache hit counter
	trackCacheHit() {
		this.stats.cacheHits++;
	}

	// Reset statistics
	resetStats() {
		this.stats = {
			dnsPrefetches: 0,
			totalRequests: 0,
			cacheHits: 0,
		};
	}
}

interface FetchOptions {
	timeout?: number;
}
