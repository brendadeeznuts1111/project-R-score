/**
 * RSS Feed Optimization Library
 * High-performance RSS feed handling for Bun.js
 */

// Core utilities and services
export { ConfigManager, initConfig, getConfig } from "./config/index.js";
export { CircuitBreaker } from "./utils/circuit-breaker.js";
export { RetryWithBackoff, RetryConfigs } from "./utils/retry-with-backoff.js";
export { DNSOptimizer } from "./utils/dns-optimizer.js";
export { ConnectionOptimizer } from "./utils/connection-optimizer.js";
export { EnhancedJSONLStreamer } from "./utils/jsonl-stream-enhanced.js";
export { OptimizedRSSFetcher } from "./services/optimized-rss-fetcher.js";

// New RSS Parser and Generator classes
export { RSSParser } from "./services/rss-parser.js";
export { RSSGenerator } from "./services/rss-generator.js";
export { PerformanceMonitor } from "./utils/performance-monitor.js";

// Types
export type { RSSFeed, RSSItem, ParserOptions } from "./types/index.js";

// Version
export const VERSION = "1.0.0";

// Bun API status (dynamic type checking for optional Bun APIs)
export function getBunAPIStatus() {
	return {
		hasJSON5:
			typeof Bun !== "undefined" &&
			(Bun as unknown as { JSON5?: object }).JSON5,
		hasJSONL:
			typeof Bun !== "undefined" &&
			(Bun as unknown as { JSONL?: object }).JSONL,
		hasWrapAnsi:
			typeof Bun !== "undefined" &&
			(Bun as unknown as { wrapAnsi?: object }).wrapAnsi,
		hasStringWidth:
			typeof Bun !== "undefined" &&
			(Bun as unknown as { stringWidth?: object }).stringWidth,
		hasS3Client:
			typeof Bun !== "undefined" && (Bun as unknown as { s3?: object }).s3,
		bunVersion: typeof Bun !== "undefined" ? Bun.version : "unknown",
	};
}