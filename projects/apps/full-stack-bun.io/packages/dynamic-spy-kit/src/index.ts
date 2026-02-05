/**
 * @dynamic-spy/kit v9.0 - Complete Export Index
 * 
 * Production-ready dynamic spy factory with URLPattern, FFI, AI patterns, HMR, and advanced error handling
 * 
 * Features:
 * - Dynamic spy patterns with URLPattern matching
 * - FFI-accelerated pattern matching (13,333 matches/sec)
 * - AI-adaptive multi-region patterns with priority routing
 * - Hot Module Replacement (HMR) for zero-downtime updates
 * - Advanced error handling with 3-tier fallback chain
 * - Bun-native APIs (Bun.watch, Bun.file, Bun.env)
 * - Prometheus/Grafana compatible metrics
 */

import { jest, expect, spyOn } from "bun:test";
import type { URLPatternInit, URLPatternResult } from './core/urlpattern-spy';
import { URLPatternSpyFactory } from './core/urlpattern-spy';

// ============================================================================
// CORE SPY INTERFACES
// ============================================================================

export interface SpyInstance {
	mock: {
		calls: any[][];
		results: any[];
	};
	toHaveBeenCalled: () => boolean;
	toHaveBeenCalledWith: (...args: any[]) => boolean;
	toHaveBeenCalledTimes: (n: number) => boolean;
	mockReset: () => void;
	mockRestore: () => void;
}

export interface SpyManager<T = any> {
	spyOnKey: (key: string) => SpyInstance;
	spyOnPattern: (pattern: string) => any; // URLPatternSpy (imported from core)
	verifyCall: (key: string, args?: any[]) => void;
	calledTimes: (key: string) => number;
	calledKeys: () => string[];
	reset: () => void;
	clear: () => void;
	getSpy: (key: string) => SpyInstance | undefined;
	getAllSpies: () => SpyInstance[];
}

export interface URLPatternMatch {
	pathname: {
		groups: Record<string, string>;
		input: string;
	};
	hostname?: {
		groups: Record<string, string>;
		input: string;
	};
}

// ============================================================================
// DYNAMIC SPY FACTORY
// ============================================================================

class DynamicSpyFactory {
	static create<T extends Record<string, any>>(
		target: T,
		method: keyof T
	): SpyManager<T> {
		const spies = new Map<string, SpyInstance>();
		const patternSpies = new Map<string, any>(); // URLPatternSpy instances
		const methodName = String(method);

		// Create base spy for the method
		let baseSpy: SpyInstance | null = null;

		const getBaseSpy = (): SpyInstance => {
			if (!baseSpy) {
				baseSpy = spyOn(target, methodName as any) as SpyInstance;
			}
			return baseSpy;
		};

		return {
			spyOnKey: (key: string): SpyInstance => {
				const spyKey = `${methodName}:${key}`;
				if (!spies.has(spyKey)) {
					const spy = getBaseSpy();
					spies.set(spyKey, spy);
				}
				return spies.get(spyKey)!;
			},

			spyOnPattern: (pattern: string): any => {
				if (patternSpies.has(pattern)) {
					return patternSpies.get(pattern)!;
				}

				// Use URLPatternSpyFactory for proper implementation
				const urlPatternSpy = URLPatternSpyFactory.create(target, methodName as any, pattern);
				patternSpies.set(pattern, urlPatternSpy);
				return urlPatternSpy;
			},

			verifyCall: (key: string, args?: any[]) => {
				const spy = spies.get(`${methodName}:${key}`);
				if (!spy) {
					throw new Error(`No spy found for key: ${key}`);
				}
				expect(spy).toHaveBeenCalled();
				if (args) {
					expect(spy).toHaveBeenCalledWith(...args);
				}
			},

			calledTimes: (key: string): number => {
				const spy = spies.get(`${methodName}:${key}`);
				return spy?.mock.calls.length ?? 0;
			},

			calledKeys: (): string[] => {
				return Array.from(spies.keys());
			},

			reset: () => {
				spies.forEach(s => s.mockReset());
				baseSpy?.mockReset();
			},

			clear: () => {
				spies.forEach(s => s.mockRestore());
				if (baseSpy) {
					baseSpy.mockRestore();
					baseSpy = null;
				}
				spies.clear();
				patternSpies.clear();
			},

			getSpy: (key: string): SpyInstance | undefined => {
				return spies.get(`${methodName}:${key}`);
			},

			getAllSpies: (): SpyInstance[] => {
				return Array.from(spies.values());
			}
		};
	}
}

// Export convenience functions
export const createSpyKit = <T extends Record<string, any>>(
	target: T,
	method: keyof T
): SpyManager<T> => {
	return DynamicSpyFactory.create(target, method);
};

export const spyKit = {
	create: <T extends Record<string, any>>(target: T, method: keyof T) => {
		return DynamicSpyFactory.create(target, method);
	}
};

// ============================================================================
// CORE URLPATTERN SPY FACTORIES
// ============================================================================

export { URLPatternSpyFactory } from './core/urlpattern-spy';
export type { 
	URLPatternSpy, 
	URLPatternInit, 
	URLPatternComponent, 
	URLPatternComponentResults,
	URLPatternResult 
} from './core/urlpattern-spy';

export { FuzzerSafeSpyFactory } from './core/fuzzer-safe-spy';
export type { SpyInstance as FuzzerSafeSpyInstance } from './core/fuzzer-safe-spy';

// ============================================================================
// QUANTUM & HYPER-CORE SPY FACTORIES
// ============================================================================

export { QuantumURLPatternSpyFactory } from './quantum-urlpattern-spy';
export type { MatchResult, MultiURLPatternSpy } from './quantum-urlpattern-spy';

export { HyperCoreURLPatternSpyFactory } from './hyper-core-urlpattern-spy';

// ============================================================================
// ROUTERS
// ============================================================================

export { ArbRouter } from './router/arb-router';
export type { BookieTestResult, SportsbookName } from './router/arb-router';

export { QuantumArbRouter } from './quantum-arb-router';
export type { RouteResult } from './quantum-arb-router';

export { HyperCoreArbRouter } from './hyper-core-arb-router';

export { UltraArbRouter } from './ultra-arb-router';
export type { UltraRouterOptions, UltraRouteResult } from './ultra-arb-router';

export { OddsRouter } from './odds-router';

export { SportsbookRouter } from './sportsbook-router';
export type { BookieTestResult as SportsbookBookieTestResult } from './sportsbook-router';

// ============================================================================
// ERROR HANDLING
// ============================================================================

export { ErrorHandlingStrategy } from './error-handling-strategy';

// ============================================================================
// FFI & AI PATTERN EVOLUTION
// ============================================================================

export { FFIPatternMatcher } from './ffi-pattern-matcher';
export type { FFIPatternMetadata, FFIMatchResult } from './ffi-pattern-matcher';

export { FFIMatcher } from './ffi-wrapper';
export type { PatternMatch } from './ffi-wrapper';

export { NeuralNet } from './ai-pattern-evolver';
export type { NeuralNetConfig, PatternEvolution } from './ai-pattern-evolver';

// ============================================================================
// AI PATTERN LOADER & ADAPTIVE PATTERNS
// ============================================================================

export { AIPatternLoader } from './ai-pattern-loader';
export type { AIPattern, PatternWithPriority } from './ai-pattern-loader';

export { 
	AI_ADAPTIVE_MULTI_REGION_PATTERNS,
	filterByEnvironment,
	sortByPriority,
	getPriorityDistribution,
	getAllPatterns,
	loadAIDrivenFeedPatterns,
	buildGlobalHyperRankedPatterns,
	initializeGlobalHyperRanked,
	updateAIDrivenFeedPatterns
} from './ai-adaptive-multi-region-patterns';
export type { AdaptivePattern, RegionPatterns } from './ai-adaptive-multi-region-patterns';

// ============================================================================
// PATTERNS
// ============================================================================

export { HYPER_ENHANCED_SPORTSBOOK_PATTERNS } from './hyper-enhanced-sportsbook-patterns';
export { ADAPTIVE_MULTI_REGION_PATTERNS } from './adaptive-multi-region-patterns';
export { PRODUCTION_PATTERNS, demonstrateProductionUsage, demonstrateCompleteAPI } from './production-examples';
export { SPORTSBOOK_PATTERNS, SPORTSBOOK_BENCHMARK } from './sportsbook-patterns';
export type { SportsbookBenchmark } from './sportsbook-patterns';

// ============================================================================
// HMR (HOT MODULE REPLACEMENT)
// ============================================================================

export { HMRManager } from './hmr-manager';
export { HMRSafePatternLoader } from './hmr-safe-pattern-loader';
export type { HMRError, HMRStats } from './hmr-safe-pattern-loader';

// ============================================================================
// TICK MONITORING & LINE MOVEMENT
// ============================================================================

export { TickMonitor } from './ticks/tick-monitor';
export { LineMovementDetector } from './ticks/line-movement';

// Legacy exports (for backward compatibility)
export { TickMonitor as TickMonitorLegacy } from './tick-monitor';
export { LineMovementDetector as LineMovementDetectorLegacy } from './line-movement-detector';

// ============================================================================
// BACKWORK ENGINE & MODEL REVERSE ENGINEERING
// ============================================================================

export { BackworkEngine } from './backwork/backwork-engine';
export { ModelReverseEngineer } from './backwork/fuzzy-matcher';
export { AsiaSpikeDetector } from './backwork/asia-spike';

// Legacy exports
export { BackworkEngine as BackworkEngineLegacy } from './backwork-engine';
export { ModelReverseEngineer as ModelReverseEngineerLegacy } from './model-reverse';
export { AsiaSpikeDetector as AsiaSpikeDetectorLegacy } from './asia-spike-detector';

// ============================================================================
// PATTERN EXTRACTION & ROI
// ============================================================================

export { PatternExtractor } from './pattern-extractor';
export type { ExtractedPattern, PatternCluster } from './pattern-extractor';
export { ROICalculator } from './roi-calculator';
export type { ROICalculation } from './roi-calculator';
export { RiskMitigator } from './risk-mitigator';
export type { RiskLevel } from './risk-mitigator';

// ============================================================================
// STORAGE & CACHE
// ============================================================================

export { R2Loader } from './storage/r2-loader';
export { TimescaleLoader } from './storage/timescale-loader';
export { MMapCache } from './storage/mmap-cache';
export { RedisArbCache } from './redis-arb-cache';
export type { ArbCacheEntry } from './redis-arb-cache';

// Legacy MMap Cache export
export { MMapCache as MMapCacheLegacy } from './mmap-cache';

// ============================================================================
// TICK ENGINE & STREAMING
// ============================================================================

export { RedisStreamsEngine } from './ticks/redis-streams';
export { LiveStreamingEngine } from './streaming-engine';
export type { LiveUpdate } from './streaming-engine';
export { BunStreamer } from './bun-streamer';

// ============================================================================
// ADVANCED CACHE
// ============================================================================

export { AdvancedCache } from './advanced-cache';
export type { HeatmapEntry, CacheMetrics } from './advanced-cache';
export { SportsCache } from './cache-layer';
export type { CacheStats } from './cache-layer';

// ============================================================================
// MAPPING ENGINE
// ============================================================================

export { MappingEngine, SPORTS_MAPPING } from './mapping-engine';
export type { SportMapping, SportsMappingData } from './mapping-engine';
export { MappingStreamer } from './mapping-streamer';

// ============================================================================
// PROXY CONFIGURATION
// ============================================================================

export { PROXY_CONFIG } from './sportsbook-proxies';
export type { ProxyConfig } from './sportsbook-proxies';

// ============================================================================
// SECRETS & CONFIG MANAGEMENT
// ============================================================================

export { SecretsManager } from './secrets-manager';
export { ConfigLoader } from './config-loader';
export type { ConfigFile } from './config-loader';

// ============================================================================
// SCRAPERS
// ============================================================================

export { OddsPortalScraper } from './scraper-archive';
export type { ScrapedOdds } from './scraper-archive';

// ============================================================================
// ML & TENSORFLOW
// ============================================================================

export { TensorFlowMatcher } from './backwork/tensorflow-matcher';
export { MLEngine } from './models/ml-engine';

// ============================================================================
// TRADING ENGINES
// ============================================================================

export { BetfairTradingEngine } from './trading/betfair-api';

// ============================================================================
// API SERVERS
// ============================================================================

export { GraphQLServer } from './api/graphql-server';
export { ENDPOINTS } from './server/endpoints';

// ============================================================================
// TYPES
// ============================================================================

export * from './types';

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = '9.0.0';
export const PACKAGE_NAME = '@dynamic-spy/kit';

// ============================================================================
// BASKETBALL MARKET SPIES
// ============================================================================

export { BasketballMarketSpies } from './basketball-market-spies';
export type { SpyInstance as BasketballSpyInstance } from './basketball-market-spies';

// ============================================================================
// HTTP AGENT CONNECTION POOL
// ============================================================================

export { HTTPAgentPool, getGlobalAgentPool } from './utils/http-agent-pool';
export type { AgentPoolOptions } from './utils/http-agent-pool';

// ============================================================================
// PRODUCTION BOOKIES & MARKETS
// ============================================================================

export { SHARP_BOOKIES_ALL, SHARP_BOOKIES_COUNT, getAllBookies, getBookieTier } from './utils/production-bookies';
export { NBA_ALL_MARKETS, NBA_MARKETS_COUNT, getAllMarkets, getMarketIndex, getMarketByIndex } from './utils/production-markets';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default DynamicSpyFactory;
