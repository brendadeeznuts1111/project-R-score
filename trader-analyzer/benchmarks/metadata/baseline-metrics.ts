/**
 * @fileoverview Baseline Performance Metrics
 * @description Critical path performance targets for multi-layer graph system
 * @module benchmarks/metadata/baseline-metrics
 */

/**
 * Baseline metrics for market analysis system
 * These represent current performance characteristics to track over time
 */
export const baselineMetrics = {
	// Layer 4: O(n²) complexity for n sports
	// Most expensive layer - cross-sport correlation detection
	crossSportCorrelation: {
		operations: 1000, // Number of sport pairs
		avgTime: 45.2, // ms (target: <50ms)
		p99Time: 78.5, // ms (target: <100ms)
		memory: 128.4, // MB
	},

	// Layer 3: O(m²) for m events
	// Cross-event correlation within sports
	crossEventCorrelation: {
		operations: 5000, // Events in 24h window
		avgTime: 23.1, // ms
		p99Time: 41.3, // ms
		memory: 67.2, // MB
	},

	// Layer 2: O(k²) for k markets per event
	// Cross-market correlation within events
	crossMarketCorrelation: {
		operations: 15000, // Markets across events
		avgTime: 12.4, // ms
		p99Time: 19.7, // ms
		memory: 34.8, // MB
	},

	// Layer 1: O(s²) for s selections per market
	// Direct correlation within markets (should be fastest)
	directCorrelation: {
		operations: 45000, // Selections
		avgTime: 3.2, // ms (should be fastest)
		p99Time: 5.8, // ms
		memory: 12.1, // MB
	},

	// Full graph assembly
	// Complete multi-layer graph construction
	fullGraphAssembly: {
		totalTime: 892.3, // ms for 50,000 nodes
		memoryPeak: 512.7, // MB
		compressionRatio: 0.14, // Post-compression (86% reduction)
	},
} as const;

/**
 * Performance thresholds for regression detection
 */
export const performanceThresholds = {
	// Maximum acceptable regression (%)
	maxRegression: 5, // Fail if >5% slower

	// Minimum improvement to consider significant (%)
	minImprovement: 2, // Celebrate if >2% faster

	// Critical path thresholds (must not exceed)
	criticalPaths: {
		crossSportCorrelation: {
			avgTime: 50, // ms
			p99Time: 100, // ms
			memory: 150, // MB
		},
		fullGraphAssembly: {
			totalTime: 1000, // ms
			memoryPeak: 600, // MB
		},
	},
} as const;

/**
 * Optimization targets based on baseline analysis
 */
export const optimizationTargets = {
	// Phase 1: Address P99 latency
	phase1: {
		layer4Alignment: {
			current: 78.5, // ms p99
			target: 47.1, // ms (40% reduction)
			method: "interval-tree",
		},
		correlationCalculation: {
			current: 45.2, // ms avg
			target: 31.6, // ms (30% reduction)
			method: "lru-cache-memoization",
		},
	},

	// Phase 2: Memory optimization
	phase2: {
		graphCompression: {
			current: 512.7, // MB peak
			target: 71.8, // MB (86% reduction with zstd)
			method: "compression-stream",
		},
		streamingProcessing: {
			current: 67.2, // MB Layer 3
			target: 20.0, // MB (70% reduction)
			method: "sliding-window-streaming",
		},
	},

	// Phase 3: Parallelization
	phase3: {
		layer4Parallel: {
			current: 892.3, // ms total
			target: 223.1, // ms (75% reduction with 4 workers)
			method: "worker-threads",
		},
	},
} as const;
