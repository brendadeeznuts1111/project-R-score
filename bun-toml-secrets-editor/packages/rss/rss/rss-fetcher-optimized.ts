// src/rss-fetcher-optimized.ts
// Bun v1.3.7 Performance Optimizations:
// - 50% faster Buffer.from() with arrays
// - 35% faster async/await
// - Header casing preservation

import { handleFetchError } from "./errors/rss-errors.js";
import { RSSProfiler } from "./profiling/rss-profiler.js";

export class RSSFetcherOptimized {
	private profiler = new RSSProfiler();
	private stats = {
		dnsPrefetches: 0,
		totalRequests: 0,
		cacheHits: 0,
	};

	async fetch(url: string, options: FetchOptions = {}) {
		this.stats.totalRequests++;
		const startTime = performance.now();

		// v1.3.7: Profile the operation with optimized async/await
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

					// v1.3.7: Use Buffer for binary data (50% faster with arrays)
					const buffer = await this.responseToBuffer(response);
					const parseStart = performance.now();

					// Parse with optimized buffer handling
					const feed = await this.parseFeedBuffer(buffer);

					const duration = performance.now() - startTime;

					return {
						...feed,
						meta: {
							fetchTime: `${duration.toFixed(2)}ms`,
							parseTime: `${(performance.now() - parseStart).toFixed(2)}ms`,
							headersPreserved: true,
							bufferOptimized: true, // v1.3.7
						},
					};
				} catch (error: any) {
					handleFetchError(error, url);
				}
			},
		);
	}

	// v1.3.7: Optimized buffer conversion (50% faster Buffer.from)
	private async responseToBuffer(response: Response): Promise<Buffer> {
		const chunks: Uint8Array[] = [];
		let totalLength = 0;

		// Stream response into chunks
		for await (const chunk of response.body as any) {
			chunks.push(chunk);
			totalLength += chunk.length;
		}

		// v1.3.7: Buffer.from(array) is 50% faster
		// Concatenate all chunks efficiently
		const combined = new Uint8Array(totalLength);
		let offset = 0;

		for (const chunk of chunks) {
			combined.set(chunk, offset);
			offset += chunk.length;
		}

		// v1.3.7: Use Buffer.from for optimized conversion
		return Buffer.from(combined);
	}

	// v1.3.7: Parse feed from buffer with optimized string conversion
	private async parseFeedBuffer(buffer: Buffer) {
		const { XMLParser } = await import("fast-xml-parser");
		const parser = new XMLParser({
			ignoreAttributes: false,
			parseAttributeValue: true,
		});

		// Convert buffer to string efficiently
		const xml = buffer.toString("utf-8");
		return parser.parse(xml);
	}

	// Batch fetch with v1.3.7 optimizations
	async fetchBatch(urls: string[], options: BatchOptions = {}) {
		const { concurrency = 5 } = options;
		const results: any[] = [];

		// v1.3.7: 35% faster async/await with chunked processing
		for (let i = 0; i < urls.length; i += concurrency) {
			const chunk = urls.slice(i, i + concurrency);
			// Process chunks concurrently with optimized Promise.all
			const chunkResults = await Promise.all(
				chunk.map((url) =>
					this.fetch(url).catch((err) => ({ error: err.message, url })),
				),
			);
			results.push(...chunkResults);
		}

		return results;
	}

	getStats() {
		return { ...this.stats };
	}

	trackDnsPrefetch() {
		this.stats.dnsPrefetches++;
	}

	trackCacheHit() {
		this.stats.cacheHits++;
	}

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

interface BatchOptions {
	concurrency?: number;
}

export default { RSSFetcherOptimized };
