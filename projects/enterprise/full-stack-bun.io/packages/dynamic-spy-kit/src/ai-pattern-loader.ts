/**
 * @dynamic-spy/kit v9.0 - AI Pattern Loader
 * 
 * Load and integrate AI-generated patterns with priority support
 * Enhanced with Bun native APIs:
 * - Bun.peek() for synchronous promise peeking
 * - Bun.readableStreamToText() for streaming large files
 * - Bun.gzipSync() / Bun.gunzipSync() for compression
 * - Bun.hash.rapidhash() for fast hashing
 * - Bun.semver for version checking
 */

import { hash, peek, gzipSync, gunzipSync, semver } from "bun";
import type { URLPatternInit } from "./core/urlpattern-spy";
import { patternCache, type CachedPattern } from "./utils/pattern-cache";

export interface AIPattern {
	id: string;
	pathname: string;
	hostname?: string;
	protocol?: string;
	search?: string;
	hash?: string;
	priority?: number; // 0-1000 scale (999 = ultra-high priority)
	bookie?: string;
	region?: string;
	version?: string; // Semver version for pattern updates
	confidence?: number;
}

export interface PatternWithPriority extends URLPatternInit {
	priority?: number;
	id?: string;
	version?: string;
	confidence?: number;
}

// In-memory pattern cache for Bun.peek() optimization
const patternPromiseCache = new Map<string, Promise<AIPattern[]>>();
const loadedPatterns = new Map<string, AIPattern[]>();

export class AIPatternLoader {
	/**
	 * Load AI-generated patterns from JSON file (Bun-native optimized)
	 * Uses Bun.peek() for synchronous access when patterns are already loaded
	 */
	static async loadPatterns(filePath: string = './patterns/ai-generated.json'): Promise<AIPattern[]> {
		// Check if already loaded (hot path with Bun.peek)
		const cached = loadedPatterns.get(filePath);
		if (cached) {
			return cached;
		}

		// Check if loading in progress (use Bun.peek to check promise state)
		const existingPromise = patternPromiseCache.get(filePath);
		if (existingPromise) {
			const peeked = peek(existingPromise);
			if (peeked !== existingPromise) {
				// Promise resolved, return result
				return peeked as AIPattern[];
			}
			// Still loading, wait for it
			return existingPromise;
		}

		// Start loading
		const loadPromise = this.loadPatternsInternal(filePath);
		patternPromiseCache.set(filePath, loadPromise);

		try {
			const patterns = await loadPromise;
			loadedPatterns.set(filePath, patterns);
			return patterns;
		} catch (e) {
			patternPromiseCache.delete(filePath);
			throw e;
		}
	}

	/**
	 * Internal pattern loading with streaming support for large files
	 */
	private static async loadPatternsInternal(filePath: string): Promise<AIPattern[]> {
		try {
			const file = Bun.file(filePath);
			if (!(await file.exists())) {
				return [];
			}

			const fileSize = file.size;

			// Use streaming for large files (> 1MB)
			if (fileSize > 1024 * 1024) {
				console.log(`📊 Streaming large pattern file: ${filePath} (${(fileSize / 1024).toFixed(1)}KB)`);
				const stream = file.stream();
				const text = await Bun.readableStreamToText(stream);
				const patterns = JSON.parse(text) as AIPattern[];
				console.log(`✅ Streamed ${patterns.length} patterns from ${filePath} (Bun.readableStreamToText)`);
				return patterns;
			}

			// Standard loading for smaller files
			const patterns = await file.json() as AIPattern[];
			console.log(`✅ Loaded ${patterns.length} AI-generated patterns from ${filePath} (Bun.file)`);

			// Cache patterns in SQLite for persistence
			this.cachePatterns(patterns);

			return patterns;
		} catch (e) {
			console.error(`Failed to load AI patterns from ${filePath}:`, e);
			return [];
		}
	}

	/**
	 * Load patterns synchronously using Bun.peek() if already cached
	 * Returns null if patterns need async loading
	 */
	static peekPatterns(filePath: string): AIPattern[] | null {
		const cached = loadedPatterns.get(filePath);
		if (cached) return cached;

		const promise = patternPromiseCache.get(filePath);
		if (promise) {
			const peeked = peek(promise);
			if (peeked !== promise) {
				return peeked as AIPattern[];
			}
		}

		return null;
	}

	/**
	 * Load batch patterns from multiple files in parallel
	 */
	static async loadBatchPatterns(filePaths: string[]): Promise<AIPattern[]> {
		const promises = filePaths.map(fp => this.loadPatterns(fp));
		const results = await Promise.all(promises);
		return results.flat();
	}

	/**
	 * Load compressed pattern file (.json.gz)
	 */
	static async loadCompressedPatterns(filePath: string): Promise<AIPattern[]> {
		try {
			const file = Bun.file(filePath);
			if (!(await file.exists())) {
				return [];
			}

			const compressed = await file.arrayBuffer();
			const decompressed = gunzipSync(new Uint8Array(compressed));
			const text = new TextDecoder().decode(decompressed);
			const patterns = JSON.parse(text) as AIPattern[];

			console.log(`✅ Loaded ${patterns.length} compressed patterns from ${filePath} (Bun.gunzipSync)`);
			return patterns;
		} catch (e) {
			console.error(`Failed to load compressed patterns from ${filePath}:`, e);
			return [];
		}
	}

	/**
	 * Save patterns to compressed file (.json.gz)
	 */
	static async saveCompressedPatterns(patterns: AIPattern[], filePath: string): Promise<void> {
		const json = JSON.stringify(patterns, null, 2);
		const compressed = gzipSync(new TextEncoder().encode(json));
		await Bun.write(filePath, compressed);
		console.log(`✅ Saved ${patterns.length} compressed patterns to ${filePath} (Bun.gzipSync)`);
	}

	/**
	 * Cache patterns in SQLite for fast lookup
	 */
	private static cachePatterns(patterns: AIPattern[]): void {
		try {
			const cachedPatterns = patterns.map(p => ({
				id: p.id,
				pathname: p.pathname,
				hostname: p.hostname || null,
				priority: p.priority || 50,
				patternData: JSON.stringify(p)
			}));

			patternCache.storePatterns(cachedPatterns);
		} catch (e) {
			// Cache failure is non-fatal
			console.warn('Pattern caching failed:', e);
		}
	}

	/**
	 * Convert AI patterns to URLPatternInit with priority
	 */
	static convertToURLPatternInit(aiPatterns: AIPattern[]): PatternWithPriority[] {
		return aiPatterns.map(pattern => ({
			pathname: pattern.pathname,
			hostname: pattern.hostname,
			protocol: pattern.protocol || 'https:',
			search: pattern.search,
			hash: pattern.hash,
			priority: pattern.priority || 50,
			id: pattern.id,
			version: pattern.version,
			confidence: pattern.confidence
		}));
	}

	/**
	 * Sort patterns by priority (highest first)
	 */
	static sortByPriority(patterns: PatternWithPriority[]): PatternWithPriority[] {
		return patterns.sort((a, b) => {
			const priorityA = a.priority || 50;
			const priorityB = b.priority || 50;
			return priorityB - priorityA;
		});
	}

	/**
	 * Get patterns by priority threshold
	 */
	static filterByPriority(
		patterns: PatternWithPriority[],
		minPriority: number = 0,
		maxPriority: number = 1000
	): PatternWithPriority[] {
		return patterns.filter(p => {
			const priority = p.priority || 50;
			return priority >= minPriority && priority <= maxPriority;
		});
	}

	/**
	 * Merge AI patterns with existing patterns
	 */
	static mergePatterns(
		existing: PatternWithPriority[],
		aiPatterns: AIPattern[]
	): PatternWithPriority[] {
		const converted = this.convertToURLPatternInit(aiPatterns);
		const merged = [...existing, ...converted];
		return this.sortByPriority(merged);
	}

	/**
	 * Check if pattern version is compatible using Bun.semver
	 */
	static isVersionCompatible(patternVersion: string, minVersion: string): boolean {
		try {
			return semver.satisfies(patternVersion, `>=${minVersion}`);
		} catch {
			return true; // Default to compatible if version parsing fails
		}
	}

	/**
	 * Filter patterns by minimum version
	 */
	static filterByVersion(patterns: AIPattern[], minVersion: string): AIPattern[] {
		return patterns.filter(p => {
			if (!p.version) return true;
			return this.isVersionCompatible(p.version, minVersion);
		});
	}

	/**
	 * Generate pattern hash using Bun.hash.rapidhash
	 */
	static hashPattern(pattern: AIPattern): string {
		const key = `${pattern.id}:${pattern.pathname}:${pattern.hostname || ''}`;
		return hash.rapidhash(key).toString();
	}

	/**
	 * Generate batch hash for pattern set
	 */
	static hashPatternSet(patterns: AIPattern[]): string {
		const combined = patterns.map(p => this.hashPattern(p)).join(':');
		return hash.rapidhash(combined).toString();
	}

	/**
	 * Invalidate cached patterns for a file
	 */
	static invalidateCache(filePath: string): void {
		loadedPatterns.delete(filePath);
		patternPromiseCache.delete(filePath);
		console.log(`🔄 Invalidated pattern cache for ${filePath}`);
	}

	/**
	 * Clear all cached patterns
	 */
	static clearCache(): void {
		loadedPatterns.clear();
		patternPromiseCache.clear();
		console.log('🔄 Cleared all pattern caches');
	}

	/**
	 * Get cache statistics
	 */
	static getCacheStats(): {
		loadedFiles: number;
		pendingLoads: number;
		totalPatterns: number;
	} {
		let totalPatterns = 0;
		for (const patterns of loadedPatterns.values()) {
			totalPatterns += patterns.length;
		}

		return {
			loadedFiles: loadedPatterns.size,
			pendingLoads: patternPromiseCache.size - loadedPatterns.size,
			totalPatterns
		};
	}
}
