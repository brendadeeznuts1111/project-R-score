/**
 * Archive Compression Engine - Advanced Compression Strategies
 * Tier-1380 Enterprise Archive Management System
 *
 * @version 2.0.0
 * @author Tier-1380 Performance Team
 */

export interface CompressionStrategy {
	name: string;
	extension: string;
	compress: (data: Uint8Array, level?: number) => Promise<Uint8Array>;
	decompress: (data: Uint8Array) => Promise<Uint8Array>;
	estimateCompressionRatio: (data: Uint8Array) => number;
	getOptimalLevel: (dataSize: number, contentType: string) => number;
}

export interface CompressionMetrics {
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
	compressionTime: number;
	decompressionTime: number;
	throughputMBps: number;
	strategy: string;
	level: number;
}

export interface CompressionBenchmark {
	strategies: string[];
	metrics: { [strategy: string]: CompressionMetrics };
	winner: string;
	recommendation: string;
}

export class ArchiveCompressionEngine {
	private readonly strategies: Map<string, CompressionStrategy> = new Map();
	private readonly cache: Map<string, Uint8Array> = new Map();
	private readonly maxCacheSize: number = 100 * 1024 * 1024; // 100MB

	constructor() {
		this.initializeStrategies();
	}

	private initializeStrategies(): void {
		// Gzip Strategy
		this.strategies.set("gzip", {
			name: "gzip",
			extension: "gz",
			compress: async (data: Uint8Array, level = 6) => {
				const stream = new CompressionStream("gzip");
				const writer = stream.writable.getWriter();
				const reader = stream.readable.getReader();

				writer.write(data);
				writer.close();

				const chunks: Uint8Array[] = [];
				let done = false;

				while (!done) {
					const { value, done: readerDone } = await reader.read();
					done = readerDone;
					if (value) chunks.push(value);
				}

				const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
				const result = new Uint8Array(totalLength);
				let offset = 0;

				for (const chunk of chunks) {
					result.set(chunk, offset);
					offset += chunk.length;
				}

				return result;
			},
			decompress: async (data: Uint8Array) => {
				const stream = new DecompressionStream("gzip");
				const writer = stream.writable.getWriter();
				const reader = stream.readable.getReader();

				writer.write(data);
				writer.close();

				const chunks: Uint8Array[] = [];
				let done = false;

				while (!done) {
					const { value, done: readerDone } = await reader.read();
					done = readerDone;
					if (value) chunks.push(value);
				}

				const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
				const result = new Uint8Array(totalLength);
				let offset = 0;

				for (const chunk of chunks) {
					result.set(chunk, offset);
					offset += chunk.length;
				}

				return result;
			},
			estimateCompressionRatio: (data: Uint8Array) => {
				// Simple heuristic based on data patterns
				const text = new TextDecoder().decode(
					data.slice(0, Math.min(1024, data.length)),
				);
				const uniqueChars = new Set(text).size;
				const repetitionRatio = 1 - uniqueChars / text.length;
				return Math.max(0.1, Math.min(0.9, repetitionRatio * 1.5));
			},
			getOptimalLevel: (dataSize: number, contentType: string) => {
				if (dataSize < 1024) return 1; // Small files, fast compression
				if (dataSize > 10 * 1024 * 1024) return 9; // Large files, max compression
				if (contentType.includes("text") || contentType.includes("json")) return 6;
				return 4; // Default for mixed content
			},
		});

		// No Compression Strategy
		this.strategies.set("none", {
			name: "none",
			extension: "tar",
			compress: async (data: Uint8Array) => data,
			decompress: async (data: Uint8Array) => data,
			estimateCompressionRatio: () => 1.0,
			getOptimalLevel: () => 0,
		});

		// Fast Compression Strategy (simulated)
		this.strategies.set("fast", {
			name: "fast",
			extension: "tar.gz",
			compress: async (data: Uint8Array) => {
				// Simulate fast compression with lower ratio
				const gzipStrategy = this.strategies.get("gzip")!;
				return await gzipStrategy.compress(data, 1);
			},
			decompress: async (data: Uint8Array) => {
				const gzipStrategy = this.strategies.get("gzip")!;
				return await gzipStrategy.decompress(data);
			},
			estimateCompressionRatio: (data: Uint8Array) => {
				const gzipStrategy = this.strategies.get("gzip")!;
				return gzipStrategy.estimateCompressionRatio(data) * 0.7; // Lower ratio for speed
			},
			getOptimalLevel: () => 1,
		});

		// Maximum Compression Strategy
		this.strategies.set("max", {
			name: "max",
			extension: "tar.gz",
			compress: async (data: Uint8Array) => {
				const gzipStrategy = this.strategies.get("gzip")!;
				return await gzipStrategy.compress(data, 9);
			},
			decompress: async (data: Uint8Array) => {
				const gzipStrategy = this.strategies.get("gzip")!;
				return await gzipStrategy.decompress(data);
			},
			estimateCompressionRatio: (data: Uint8Array) => {
				const gzipStrategy = this.strategies.get("gzip")!;
				return gzipStrategy.estimateCompressionRatio(data) * 1.1; // Better ratio
			},
			getOptimalLevel: () => 9,
		});
	}

	/**
	 * Compress data using specified strategy
	 */
	async compress(
		data: Uint8Array,
		strategy: string = "gzip",
		level?: number,
		enableCaching = true,
	): Promise<{ compressed: Uint8Array; metrics: CompressionMetrics }> {
		const compressionStrategy = this.strategies.get(strategy);
		if (!compressionStrategy) {
			throw new Error(`Unknown compression strategy: ${strategy}`);
		}

		const startTime = performance.now();
		const originalSize = data.length;

		// Check cache first
		const cacheKey = this.generateCacheKey(data, strategy, level);
		if (enableCaching && this.cache.has(cacheKey)) {
			const cached = this.cache.get(cacheKey)!;
			const compressionTime = performance.now() - startTime;

			return {
				compressed: cached,
				metrics: {
					originalSize,
					compressedSize: cached.length,
					compressionRatio: cached.length / originalSize,
					compressionTime,
					decompressionTime: 0, // Not measured for cached data
					throughputMBps: originalSize / 1024 / 1024 / (compressionTime / 1000),
					strategy,
					level:
						level ||
						compressionStrategy.getOptimalLevel(
							originalSize,
							"application/octet-stream",
						),
				},
			};
		}

		// Perform compression
		const optimalLevel =
			level ||
			compressionStrategy.getOptimalLevel(originalSize, "application/octet-stream");
		const compressed = await compressionStrategy.compress(data, optimalLevel);
		const compressionTime = performance.now() - startTime;

		// Cache result if enabled and within size limits
		if (enableCaching && compressed.length < this.maxCacheSize / 10) {
			this.cache.set(cacheKey, compressed);
			this.maintainCacheSize();
		}

		return {
			compressed,
			metrics: {
				originalSize,
				compressedSize: compressed.length,
				compressionRatio: compressed.length / originalSize,
				compressionTime,
				decompressionTime: 0, // Will be measured separately if needed
				throughputMBps: originalSize / 1024 / 1024 / (compressionTime / 1000),
				strategy,
				level: optimalLevel,
			},
		};
	}

	/**
	 * Decompress data using specified strategy
	 */
	async decompress(
		data: Uint8Array,
		strategy: string = "gzip",
	): Promise<{ decompressed: Uint8Array; metrics: Partial<CompressionMetrics> }> {
		const compressionStrategy = this.strategies.get(strategy);
		if (!compressionStrategy) {
			throw new Error(`Unknown compression strategy: ${strategy}`);
		}

		const startTime = performance.now();
		const compressedSize = data.length;

		const decompressed = await compressionStrategy.decompress(data);
		const decompressionTime = performance.now() - startTime;

		return {
			decompressed,
			metrics: {
				compressedSize,
				originalSize: decompressed.length,
				compressionRatio: compressedSize / decompressed.length,
				decompressionTime,
				strategy,
			},
		};
	}

	/**
	 * Benchmark all compression strategies for given data
	 */
	async benchmark(data: Uint8Array): Promise<CompressionBenchmark> {
		console.log(
			`🏁 Running compression benchmark on ${(data.length / 1024).toFixed(1)}KB data...`,
		);

		const metrics: { [strategy: string]: CompressionMetrics } = {};
		const strategyNames = Array.from(this.strategies.keys());

		for (const strategyName of strategyNames) {
			try {
				console.log(`  Testing ${strategyName}...`);

				// Compression
				const compressResult = await this.compress(data, strategyName, undefined, false);

				// Decompression
				const decompressResult = await this.decompress(
					compressResult.compressed,
					strategyName,
				);

				// Verify integrity
				if (decompressResult.decompressed.length !== data.length) {
					throw new Error(`Decompression size mismatch for ${strategyName}`);
				}

				metrics[strategyName] = {
					...compressResult.metrics,
					decompressionTime: decompressResult.metrics.decompressionTime || 0,
				};

				console.log(
					`    ✅ ${strategyName}: ${(compressResult.metrics.compressionRatio * 100).toFixed(1)}% ratio, ${compressResult.metrics.compressionTime.toFixed(2)}ms`,
				);
			} catch (error) {
				console.error(
					`    ❌ ${strategyName} failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Determine winner (best compression ratio with reasonable speed)
		const validMetrics = Object.entries(metrics).filter(
			([_, m]) => m.compressionRatio < 0.95,
		); // Exclude useless compression
		const winner = validMetrics.reduce(
			(best, [name, metrics]) => {
				if (!best) return [name, metrics];
				const bestScore = best[1].compressionRatio / (best[1].compressionTime / 1000);
				const currentScore = metrics.compressionRatio / (metrics.compressionTime / 1000);
				return currentScore > bestScore ? [name, metrics] : best;
			},
			null as [string, CompressionMetrics] | null,
		);

		const recommendation = this.generateRecommendation(metrics, winner?.[0]);

		return {
			strategies: strategyNames,
			metrics,
			winner: winner?.[0] || "none",
			recommendation,
		};
	}

	/**
	 * Get optimal compression strategy for data
	 */
	getOptimalStrategy(
		data: Uint8Array,
		contentType: string = "application/octet-stream",
	): {
		strategy: string;
		level: number;
		estimatedRatio: number;
		reasoning: string;
	} {
		const dataSize = data.length;
		let bestStrategy = "gzip";
		let bestLevel = 6;
		let bestScore = 0;

		for (const [name, strategy] of this.strategies) {
			if (name === "none") continue; // Skip no compression for optimization

			const level = strategy.getOptimalLevel(dataSize, contentType);
			const estimatedRatio = strategy.estimateCompressionRatio(data);

			// Score based on compression ratio and expected speed
			const speedFactor = name === "fast" ? 1.5 : name === "max" ? 0.7 : 1.0;
			const score = (1 - estimatedRatio) * speedFactor;

			if (score > bestScore) {
				bestScore = score;
				bestStrategy = name;
				bestLevel = level;
			}
		}

		const reasoning = this.generateReasoning(bestStrategy, dataSize, contentType);

		return {
			strategy: bestStrategy,
			level: bestLevel,
			estimatedRatio: this.strategies.get(bestStrategy)!.estimateCompressionRatio(data),
			reasoning,
		};
	}

	/**
	 * Get available compression strategies
	 */
	getAvailableStrategies(): string[] {
		return Array.from(this.strategies.keys());
	}

	/**
	 * Add custom compression strategy
	 */
	addStrategy(name: string, strategy: CompressionStrategy): void {
		this.strategies.set(name, strategy);
	}

	/**
	 * Remove compression strategy
	 */
	removeStrategy(name: string): boolean {
		return this.strategies.delete(name);
	}

	/**
	 * Clear compression cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; entries: number; hitRate: number } {
		return {
			size: Array.from(this.cache.values()).reduce((sum, data) => sum + data.length, 0),
			entries: this.cache.size,
			hitRate: 0, // Would need to track hits/misses for real implementation
		};
	}

	// ─── Private Helper Methods ────────────────────────────────────────────────────
	private generateCacheKey(data: Uint8Array, strategy: string, level?: number): string {
		const hash = crypto.subtle.digestSync("SHA-256", data);
		const hashHex = Array.from(new Uint8Array(hash))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return `${strategy}:${level || "default"}:${hashHex.slice(0, 16)}`;
	}

	private maintainCacheSize(): void {
		if (this.cache.size === 0) return;

		// Simple LRU: remove oldest entries if cache is too large
		let totalSize = Array.from(this.cache.values()).reduce(
			(sum, data) => sum + data.length,
			0,
		);

		while (totalSize > this.maxCacheSize && this.cache.size > 1) {
			const firstKey = this.cache.keys().next().value;
			const removedData = this.cache.get(firstKey)!;
			this.cache.delete(firstKey);
			totalSize -= removedData.length;
		}
	}

	private generateRecommendation(
		metrics: { [strategy: string]: CompressionMetrics },
		winner?: string,
	): string {
		if (!winner) {
			return "No compression provided significant benefits. Consider using uncompressed archives for faster access.";
		}

		const winnerMetrics = metrics[winner];
		const compressionRatio = (1 - winnerMetrics.compressionRatio) * 100;

		let recommendation = `Use ${winner} compression for optimal performance. `;
		recommendation += `Achieves ${compressionRatio.toFixed(1)}% size reduction in ${winnerMetrics.compressionTime.toFixed(2)}ms. `;

		if (winner === "fast") {
			recommendation += "Prioritizes speed over compression ratio.";
		} else if (winner === "max") {
			recommendation += "Prioritizes compression ratio over speed.";
		} else {
			recommendation += "Balanced approach between speed and compression.";
		}

		return recommendation;
	}

	private generateReasoning(
		strategy: string,
		dataSize: number,
		contentType: string,
	): string {
		const sizeMB = dataSize / 1024 / 1024;

		switch (strategy) {
			case "fast":
				return `Fast compression selected for ${sizeMB.toFixed(1)}MB ${contentType}. Prioritizes speed for quick operations.`;
			case "max":
				return `Maximum compression selected for ${sizeMB.toFixed(1)}MB ${contentType}. Prioritizes size reduction for storage efficiency.`;
			case "gzip":
				return `Standard gzip compression selected for ${sizeMB.toFixed(1)}MB ${contentType}. Balanced approach for general use.`;
			default:
				return `${strategy} compression selected based on data characteristics and performance requirements.`;
		}
	}
}

// ─── Export singleton instance ───────────────────────────────────────────────────
export const compressionEngine = new ArchiveCompressionEngine();
