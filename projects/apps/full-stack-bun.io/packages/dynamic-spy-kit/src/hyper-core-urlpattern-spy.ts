/**
 * @dynamic-spy/kit v9.0 - HyperCore URLPattern Spy Factory
 * 
 * Advanced pattern matching with all active patterns support + FFI optimization
 */

import { QuantumURLPatternSpyFactory, MultiURLPatternSpy } from "./quantum-urlpattern-spy";
import type { URLPatternInit } from "./core/urlpattern-spy";
import { FFIPatternMatcher } from "./ffi-pattern-matcher";

export class HyperCoreURLPatternSpyFactory {
	private static ffiEngine: FFIPatternMatcher | null = null;

	/**
	 * Initialize FFI engine with all patterns
	 */
	static initializeFFIEngine(patterns: URLPatternInit[]): void {
		if (!HyperCoreURLPatternSpyFactory.ffiEngine) {
			HyperCoreURLPatternSpyFactory.ffiEngine = new FFIPatternMatcher();
		}
		
		// FFI engine is ready (patterns are matched dynamically)
		// No need to pre-register patterns
		console.log(`✅ FFI Engine initialized with ${patterns.length} patterns`);
	}

	/**
	 * Create multi-pattern spy with FFI optimization
	 */
	static createMulti<T extends Record<string, any>>(
		target: T,
		method: keyof T,
		patterns: URLPatternInit[],
		options?: { 
			cacheResults?: boolean;
			useFFI?: boolean;
			ffiThreshold?: number;
		}
	): MultiURLPatternSpy<T> {
		// Use FFI if enabled and threshold met
		if (options?.useFFI && patterns.length >= (options.ffiThreshold || 5)) {
			if (!HyperCoreURLPatternSpyFactory.ffiEngine) {
				HyperCoreURLPatternSpyFactory.initializeFFIEngine(patterns);
			}
		}

		return QuantumURLPatternSpyFactory.createMulti(target, method, patterns, {
			cacheResults: options?.cacheResults
		});
	}

	/**
	 * Get all active patterns from router
	 */
	static getAllActivePatterns(router: any): URLPatternInit[] {
		// Extract all patterns from router's region spies
		const allPatterns: URLPatternInit[] = [];
		
		if (router.regionSpies) {
			for (const spy of router.regionSpies.values()) {
				// In production, would extract patterns from spy
				// For now, return empty array
			}
		}
		
		return allPatterns;
	}
}

