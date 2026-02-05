/**
 * @fileoverview Binary Tag Collection
 * @description Collection for managing binary data with metadata tags and performance tracking
 * @module utils/binary-tag-collection
 */

import { inspect } from "bun";

/**
 * Binary tag entry
 */
export interface BinaryTag {
	key: string;
	value?: Uint8Array | ArrayBuffer | DataView;
	metadata?: Record<string, unknown>;
}

/**
 * Performance log entry
 */
interface PerformanceEntry {
	operation: string;
	duration: number; // milliseconds
	timestamp: number;
}

/**
 * BinaryTagCollection - Collection for binary data with tags
 *
 * Features:
 * - Tag-based binary data organization
 * - Binary data caching with auto-eviction
 * - Performance tracking with Bun.nanoseconds()
 * - Custom Bun.inspect() output for debugging
 */
export class BinaryTagCollection {
	public readonly tags: BinaryTag[] = [];
	private readonly binaryCache = new Map<string, ArrayBuffer>();
	private readonly performanceLog: PerformanceEntry[] = [];

	/**
	 * Add a tag to the collection
	 */
	addTag(tag: BinaryTag): void {
		this.tags.push(tag);
	}

	/**
	 * Get tag by key
	 */
	getTag(key: string): BinaryTag | undefined {
		return this.tags.find((t) => t.key === key);
	}

	/**
	 * Custom Bun inspection method
	 */
	[inspect.custom](depth: number, options: any): string {
		if (depth < 0) {
			return options.stylize("[BinaryTagCollection]", "special");
		}

		const lines = [
			`${options.stylize("BinaryTagCollection", "special")} (${this.tags.length} tags)`,
			`  ${options.stylize("cache", "string")}: ${this.binaryCache.size} cached binaries`,
			`  ${options.stylize("performance", "string")}: ${this.performanceLog.length} entries`,
		];

		// Show tag summary
		if (this.tags.length > 0) {
			lines.push(`  ${options.stylize("tags", "string")}:`);
			this.tags.slice(0, 5).forEach((tag, i) => {
				const valueStr = tag.value
					? tag.value instanceof Uint8Array
						? tag.value.toString()
						: tag.value instanceof ArrayBuffer
							? `ArrayBuffer(${tag.value.byteLength})`
							: tag.value instanceof DataView
								? `DataView(${tag.value.byteLength})`
								: String(tag.value)
					: "undefined";
				const truncated =
					valueStr.length > 50 ? valueStr.substring(0, 50) + "..." : valueStr;
				lines.push(
					`    [${i}] ${tag.key}=${truncated}${valueStr.length > 50 ? "" : ""}`,
				);
			});
			if (this.tags.length > 5) {
				lines.push(`    ... and ${this.tags.length - 5} more`);
			}
		}

		// Show performance metrics if available
		if (this.performanceLog.length > 0) {
			const avgTime =
				this.performanceLog.reduce((sum, e) => sum + e.duration, 0) /
				this.performanceLog.length;
			lines.push(
				`  ${options.stylize("avg processing time", "string")}: ${avgTime.toFixed(2)}ms`,
			);
		}

		return options.colors
			? lines.join("\n")
			: lines.map((l) => l.replace(/\u001b\[\d+m/g, "")).join("\n");
	}

	/**
	 * Performance tracking method
	 */
	trackPerformance<T>(operation: string, fn: () => T): T {
		const start = Bun.nanoseconds();
		const result = fn();
		const end = Bun.nanoseconds();

		this.performanceLog.push({
			operation,
			duration: (end - start) / 1e6, // Convert to ms
			timestamp: Date.now(),
		});

		// Keep only last 100 entries
		if (this.performanceLog.length > 100) {
			this.performanceLog.splice(0, 50);
		}

		return result;
	}

	/**
	 * Async performance tracking method
	 */
	async trackPerformanceAsync<T>(
		operation: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const start = Bun.nanoseconds();
		const result = await fn();
		const end = Bun.nanoseconds();

		this.performanceLog.push({
			operation,
			duration: (end - start) / 1e6, // Convert to ms
			timestamp: Date.now(),
		});

		// Keep only last 100 entries
		if (this.performanceLog.length > 100) {
			this.performanceLog.splice(0, 50);
		}

		return result;
	}

	/**
	 * Cache management - cache binary data
	 */
	cacheBinary(key: string, data: ArrayBuffer): void {
		this.binaryCache.set(key, data);

		// Auto-evict old entries
		if (this.binaryCache.size > 1000) {
			const firstKey = this.binaryCache.keys().next().value;
			this.binaryCache.delete(firstKey);
		}
	}

	/**
	 * Get cached binary data
	 */
	getCachedBinary(key: string): ArrayBuffer | undefined {
		return this.binaryCache.get(key);
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.binaryCache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): {
		size: number;
		maxSize: number;
		keys: string[];
	} {
		return {
			size: this.binaryCache.size,
			maxSize: 1000,
			keys: Array.from(this.binaryCache.keys()),
		};
	}

	/**
	 * Get performance statistics
	 */
	getPerformanceStats(): {
		totalOperations: number;
		averageDuration: number;
		minDuration: number;
		maxDuration: number;
		operations: Record<string, number>;
	} {
		if (this.performanceLog.length === 0) {
			return {
				totalOperations: 0,
				averageDuration: 0,
				minDuration: 0,
				maxDuration: 0,
				operations: {},
			};
		}

		const durations = this.performanceLog.map((e) => e.duration);
		const operations: Record<string, number> = {};

		for (const entry of this.performanceLog) {
			operations[entry.operation] = (operations[entry.operation] || 0) + 1;
		}

		return {
			totalOperations: this.performanceLog.length,
			averageDuration:
				durations.reduce((sum, d) => sum + d, 0) / durations.length,
			minDuration: Math.min(...durations),
			maxDuration: Math.max(...durations),
			operations,
		};
	}

	/**
	 * Clear performance log
	 */
	clearPerformanceLog(): void {
		this.performanceLog.length = 0;
	}
}
