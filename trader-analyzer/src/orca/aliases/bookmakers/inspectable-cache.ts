/**
 * @fileoverview Inspectable Bookmaker Cache Manager
 * @description Enhanced BookmakerCacheManager with Bun inspection and debugging capabilities
 * @module orca/aliases/bookmakers/inspectable-cache
 */

import { inspect, nanoseconds } from "bun";
import { BookmakerCacheManager, type CacheMetrics } from "./cache";

/**
 * Helper function to format bytes into human-readable string
 */
function formatBytes(bytes: number): string {
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * InspectableBookmakerCacheManager - BookmakerCacheManager with Bun inspection capabilities
 *
 * Features:
 * - Custom Bun inspect output for debugging
 * - Timing instrumentation for get/set operations
 * - Performance metrics with percentiles
 * - Formatted table outputs for entries and metrics
 */
export class InspectableBookmakerCacheManager extends BookmakerCacheManager {
	private operationTimings = new Map<string, number[]>();

	/**
	 * Custom Bun inspection method
	 */
	[inspect.custom](depth: number, options: Record<string, unknown>): string {
		// Note: inspect.custom is synchronous, so we use current state
		// Access protected metrics through a synchronous method
		const metrics = this.getMetricsSync();
		const cacheSize = this.getCacheSizeSync();

		const summary = {
			type: "BookmakerCacheManager",
			database: {
				totalEntries: cacheSize,
			},
			performance: {
				hitRate: `${(metrics.hitRate * 100).toFixed(1)}%`,
				hits: metrics.totalHits,
				misses: metrics.totalMisses,
				sets: metrics.totalSets,
			},
		};

		return inspect(summary, {
			...options,
			depth: (depth as number) - 1,
			colors: true,
			compact: false,
		});
	}

	/**
	 * Synchronous version of getMetrics for inspection
	 */
	private getMetricsSync(): CacheMetrics {
		// Access the protected metrics property
		return { ...this.metrics };
	}

	/**
	 * Synchronous version of getCacheSize for inspection
	 */
	private getCacheSizeSync(): number {
		return this.metrics.cacheSize;
	}

	/**
	 * Enhanced get with timing instrumentation
	 */
	async getWithTiming<T>(
		key: string,
	): Promise<{ value: T | null; timing: number }> {
		const start = nanoseconds();
		const value = await this.get<T>(key);
		const end = nanoseconds();
		const timing = end - start;

		this.recordTiming("get", timing);

		if (value) {
			console.log(`Cache hit: ${key}`);
			console.log(`   Timing: ${(timing / 1_000_000).toFixed(2)}ms`);
			const size = new TextEncoder().encode(JSON.stringify(value)).length;
			console.log(`   Size: ${formatBytes(size)}`);
		} else {
			console.log(`Cache miss: ${key}`);
			console.log(`   Timing: ${(timing / 1_000_000).toFixed(2)}ms`);
		}

		return { value, timing };
	}

	/**
	 * Enhanced set with timing and inspection
	 */
	async setWithInspection<T>(
		key: string,
		value: T,
		ttlSeconds: number = 300,
	): Promise<void> {
		const start = nanoseconds();
		const originalSize = new TextEncoder().encode(JSON.stringify(value)).length;

		await this.set(key, value, ttlSeconds);

		const end = nanoseconds();
		const timing = end - start;

		this.recordTiming("set", timing);

		const metrics = await this.getMetrics();

		console.log(`Cache set: ${key}`);
		console.log(`   Timing: ${(timing / 1_000_000).toFixed(2)}ms`);
		console.log(`   Size: ${formatBytes(originalSize)}`);
		console.log(`   TTL: ${ttlSeconds}s`);
		console.log(`   Total entries: ${metrics.cacheSize}`);
	}

	/**
	 * Get cache entries as a formatted table
	 */
	async getEntriesTable(limit: number = 10): Promise<string> {
		const entries = await this.getEntries(limit);

		const formatted = entries.map((entry) => ({
			Key: entry.key.substring(0, 30) + (entry.key.length > 30 ? "..." : ""),
			Hits: entry.hits,
			Size: formatBytes(entry.size),
			"Expires In": this.formatTTL(entry.expires),
		}));

		if (formatted.length === 0) {
			return "  No cache entries found.";
		}

		const header = "  Key                           Hits  Size      Expires In";
		const separator = "  " + "-".repeat(70);
		const dataRows = formatted
			.map(
				(row) =>
					`  ${row.Key.padEnd(30)} ${String(row.Hits).padEnd(5)} ${row.Size.padEnd(9)} ${row["Expires In"]}`,
			)
			.join("\n");

		return `${header}\n${separator}\n${dataRows}`;
	}

	/**
	 * Get performance metrics as table
	 */
	getPerformanceTable(): string {
		const stats = Array.from(this.operationTimings.entries()).map(
			([operation, timings]) => {
				const total = timings.reduce((a, b) => a + b, 0);
				const avg = total / timings.length;
				const min = Math.min(...timings);
				const max = Math.max(...timings);

				// Calculate percentiles
				const sorted = [...timings].sort((a, b) => a - b);
				const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
				const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
				const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

				return {
					Operation: operation,
					Calls: timings.length,
					"Avg (ms)": (avg / 1_000_000).toFixed(2),
					"Min (ms)": (min / 1_000_000).toFixed(2),
					"Max (ms)": (max / 1_000_000).toFixed(2),
					"p50 (ms)": (p50 / 1_000_000).toFixed(2),
					"p95 (ms)": (p95 / 1_000_000).toFixed(2),
					"p99 (ms)": (p99 / 1_000_000).toFixed(2),
				};
			},
		);

		if (stats.length === 0) {
			return "  No performance data available.";
		}

		const header =
			"  Operation  Calls  Avg (ms)  Min (ms)  Max (ms)  p50 (ms)  p95 (ms)  p99 (ms)";
		const separator = "  " + "-".repeat(80);
		const dataRows = stats
			.map(
				(row) =>
					`  ${row.Operation.padEnd(9)} ${String(row.Calls).padEnd(6)} ${row["Avg (ms)"].padEnd(9)} ${row["Min (ms)"].padEnd(9)} ${row["Max (ms)"].padEnd(9)} ${row["p50 (ms)"].padEnd(9)} ${row["p95 (ms)"].padEnd(9)} ${row["p99 (ms)"]}`,
			)
			.join("\n");

		return `${header}\n${separator}\n${dataRows}`;
	}

	/**
	 * Record operation timing
	 */
	private recordTiming(operation: string, timing: number): void {
		const timings = this.operationTimings.get(operation) || [];
		timings.push(timing);
		this.operationTimings.set(operation, timings);

		// Keep only last 100 timings
		if (timings.length > 100) {
			this.operationTimings.set(operation, timings.slice(-100));
		}
	}

	/**
	 * Get detailed stats summary
	 */
	async getDetailedStats(): Promise<string> {
		const metrics = await this.getMetrics();
		const stats = await this.getStats();

		const output = {
			"Total Entries": stats.totalEntries,
			"Total Size": formatBytes(stats.totalSizeBytes),
			"Average Entry Size": formatBytes(stats.avgEntrySize),
			"Hit Rate": `${(metrics.hitRate * 100).toFixed(1)}%`,
			"Total Hits": metrics.totalHits,
			"Total Misses": metrics.totalMisses,
			"Total Sets": metrics.totalSets,
			"Top Keys": stats.topKeys.slice(0, 10).map((k) => ({
				key: k.key,
				hits: k.hits,
			})),
		};

		return inspect(output, { colors: true, depth: 3, compact: false });
	}

	/**
	 * Format TTL remaining time
	 */
	private formatTTL(expiresTimestamp: number): string {
		const now = Math.floor(Date.now() / 1000);
		const remaining = expiresTimestamp - now;

		if (remaining <= 0) {
			return "EXPIRED";
		}

		if (remaining < 60) {
			return `${remaining}s`;
		} else if (remaining < 3600) {
			return `${Math.floor(remaining / 60)}m`;
		} else {
			return `${Math.floor(remaining / 3600)}h`;
		}
	}
}

// Singleton instance
let globalInspectableCache: InspectableBookmakerCacheManager | null = null;

/**
 * Get or create inspectable cache manager singleton
 */
export function getInspectableBookmakerCache(
	dbPath?: string,
): InspectableBookmakerCacheManager {
	if (!globalInspectableCache) {
		globalInspectableCache = new InspectableBookmakerCacheManager(dbPath);
	}
	return globalInspectableCache;
}
