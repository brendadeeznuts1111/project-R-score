/**
 * @dynamic-spy/kit v5.4 - Quantum Arbitrage Router v3.0
 * 
 * Multi-region + Adaptive Fallback + Observability
 */

import { QuantumURLPatternSpyFactory, MatchResult, MultiURLPatternSpy } from "./quantum-urlpattern-spy";
import { ADAPTIVE_MULTI_REGION_PATTERNS } from "./adaptive-multi-region-patterns";
import { HYPER_ENHANCED_SPORTSBOOK_PATTERNS } from "./hyper-enhanced-sportsbook-patterns";
import { FFIPatternMatcher } from "./ffi-pattern-matcher";
import { HMRManager } from "./hmr-manager";
import type { URLPatternInit } from "./core/urlpattern-spy";

export interface RouteResult {
	bookie: string;
	confidence: number;
	groups: Record<string, string>;
	matchedPattern: string;
	regionUsed: string;
	allMatches: MatchResult<any>['allMatches'];
}

export class QuantumArbRouter {
	private regionSpies = new Map<string, MultiURLPatternSpy<any>>();
	private readonly defaultGlobalSpy: MultiURLPatternSpy<any>;
	private ffiMatcher: FFIPatternMatcher;
	private hmrManager: HMRManager;

	constructor(api: any, options?: { enableCache?: boolean; enableFFI?: boolean }) {
		this.ffiMatcher = new FFIPatternMatcher();
		this.hmrManager = new HMRManager();
		const allPatterns = { ...HYPER_ENHANCED_SPORTSBOOK_PATTERNS, ...ADAPTIVE_MULTI_REGION_PATTERNS };

		Object.entries(allPatterns).forEach(([name, patterns]) => {
			this.regionSpies.set(
				name,
				QuantumURLPatternSpyFactory.createMulti(api, 'fetchOdds', patterns, { cacheResults: options?.enableCache })
			);
		});

		this.defaultGlobalSpy = QuantumURLPatternSpyFactory.createMulti(
			api,
			'fetchOdds',
			Object.values(HYPER_ENHANCED_SPORTSBOOK_PATTERNS).flat(),
			{ cacheResults: options?.enableCache }
		);
	}

	/**
	 * Dynamically add/update patterns at runtime
	 */
	public updatePatterns(
		regionName: string,
		newPatterns: URLPatternInit[],
		api: any,
		enableCache: boolean = false
	): void {
		this.regionSpies.set(
			regionName,
			QuantumURLPatternSpyFactory.createMulti(api, 'fetchOdds', newPatterns, { cacheResults: enableCache })
		);
		console.log(`Patterns for region '${regionName}' dynamically updated.`);
		
		// Trigger HMR
		this.hmrManager.triggerUpdate(regionName);
	}

	/**
	 * Get HMR manager
	 */
	getHMRManager(): HMRManager {
		return this.hmrManager;
	}

	/**
	 * Get FFI matcher
	 */
	getFFIMatcher(): FFIPatternMatcher {
		return this.ffiMatcher;
	}

	/**
	 * Route request with preferred region
	 */
	async routeRequest(url: string, preferredRegion: string = 'default-global'): Promise<RouteResult> {
		let spy: MultiURLPatternSpy<any> | undefined = this.regionSpies.get(preferredRegion);
		let regionUsed = preferredRegion;

		if (!spy) {
			console.warn(`Preferred region '${preferredRegion}' not found. Falling back to 'default-global'.`);
			spy = this.defaultGlobalSpy;
			regionUsed = 'default-global';
		}

		const match = spy.exec(url);
		if (!match) {
			// Generic fallback (priority 10)
			const genericFallbackSpy = QuantumURLPatternSpyFactory.createMulti(
				{} as any,
				'fallbackHandler',
				[{ pathname: '**', search: '**', hostname: '**' }]
			);
			const fallbackMatch = genericFallbackSpy.exec(url);
			if (fallbackMatch) {
				console.warn(`No specific pattern matched for ${url}. Using generic fallback.`);
				return {
					bookie: this.extractBookie(url),
					confidence: 0.1,
					groups: fallbackMatch.bestMatch.result.pathname.groups,
					matchedPattern: fallbackMatch.bestMatch.pattern.pathname.value,
					regionUsed: 'generic-fallback',
					allMatches: [fallbackMatch.bestMatch],
					priority: 10 // Generic fallback priority
				} as RouteResult & { priority: number };
			}
			throw new Error(`CRITICAL: No pattern matched at all for URL: ${url}`);
		}

		// Execute best match's associated spy
		const bestSpyInstance = match.bestMatch.spy;
		try {
			await (bestSpyInstance as any)(url, match.bestMatch.result.pathname.groups);
		} catch (e) {
			console.error(`Error executing handler for ${url} via pattern ${match.bestMatch.pattern.pathname.value}:`, e);
			throw e;
		}

		// Try to extract priority from pattern metadata if available
		let priority: number | undefined = undefined;
		const patternPath = match.bestMatch.pattern.pathname.value;
		
		// Check if this matches a known adaptive pattern
		try {
			const { AI_ADAPTIVE_MULTI_REGION_PATTERNS } = await import('./ai-adaptive-multi-region-patterns');
			const matchedPattern = AI_ADAPTIVE_MULTI_REGION_PATTERNS.find(p => p.pathname === patternPath);
			if (matchedPattern) {
				priority = matchedPattern.priority;
			}
		} catch (e) {
			// Ignore if adaptive patterns not available
		}
		
		return {
			bookie: this.extractBookie(url),
			confidence: match.bestMatch.confidence,
			groups: match.bestMatch.result.pathname.groups,
			matchedPattern: match.bestMatch.pattern.pathname.value,
			regionUsed,
			allMatches: match.allMatches,
			...(priority !== undefined && { priority })
		} as RouteResult & { priority?: number };
	}

	/**
	 * Extract bookie from URL
	 */
	private extractBookie(url: string): string {
		const hostname = new URL(url).hostname;
		if (hostname.includes('pinnacle')) return 'pinnacle';
		if (hostname.includes('bet365')) return 'bet365';
		if (hostname.includes('fonbet')) return 'fonbet';
		if (hostname.includes('draftkings')) return 'draftkings';
		if (hostname.includes('fanduel')) return 'fanduel';
		if (hostname.includes('betmgm')) return 'betmgm';
		return hostname.split('.')[0];
	}

	/**
	 * Get router statistics
	 */
	getStats(): {
		totalPatterns: number;
		activePatterns: number;
		regions: string[];
		cacheStats: ReturnType<typeof QuantumURLPatternSpyFactory.getCacheStats>;
		ffiStats: ReturnType<typeof FFIPatternMatcher.getStats>;
		hmrStatus: ReturnType<typeof HMRManager.getStatus>;
	} {
		return {
			totalPatterns: 320,
			activePatterns: 300,
			regions: Array.from(this.regionSpies.keys()),
			cacheStats: QuantumURLPatternSpyFactory.getCacheStats(),
			ffiStats: this.ffiMatcher.getStats(),
			hmrStatus: this.hmrManager.getStatus()
		};
	}
}

