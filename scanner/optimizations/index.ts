/**
 * Optimizations Module Index
 *
 * R-Score optimized native API integrations for the scanner CLI.
 * All exports maintain Native-Grade performance (R-Score ≥ 0.95).
 *
 * @module optimizations
 * @r-score-target ≥ 0.95
 */

// ============================================================================
// Local Imports (for module metadata functions)
// ============================================================================

import {calculateCombinedRScore} from './bun-v137-apis';

// ============================================================================
// Bun v1.3.7 Native API Integrations
// ============================================================================

export {
	// Classes
	ExecutableResolver,
	MonotonicIDGenerator,
	PromiseOptimizer,
	EditorIntegration,
	EqualityChecker,
	HTMLEscaper,

	// Functions
	calculateCombinedRScore,
	which,
	generateId,
	escapeHtml,
	deepEqual,
	openInEditor,
	peekPromise,
} from './bun-v137-apis';

export type {} from // No additional types from bun-v137-apis
'./bun-v137-apis';

// ============================================================================
// Enhanced Scanner Integration
// ============================================================================

export {
	EnhancedScanner,
	quickScan,
	validateToolchain,
	generateScanId,
	checkOptimizationStatus,
} from './enhanced-scanner';

export type {EnhancedScanResult, ScanEntry, EnhancedScannerConfig} from './enhanced-scanner';

// ============================================================================
// Core Optimizations
// ============================================================================

export {
	// R-Score calculation
	calculateRScore,
	calculatePRatio,
	calculateMImpact,
	calculateSpeedup,
	calculateBypassRatio,
	shouldUseFastPath,
	isOptimizedForNative,
	calculateEnhancedRScore,
	calculateDeepRScore,
	calculateGCPressure,

	// R-Score formatting
	formatRScore,
	formatRScoreTable,
	getPerformanceTier,

	// Buffer management
	NativeBufferManager,
	createNativeBuffer,
	streamToNativeBuffer,
	calculateNextBufferSize,

	// Concurrency
	ConcurrencyLimiter,
	ioLimiter,

	// File operations
	fileExists,
	globScan,

	// Risk calculation
	BUN_RISK_CONSTANTS,
	calculateRisk,

	// Directory scanning
	scanGenerator,
	flattenTree,
	getParentPath,
} from './bun-optimizations';

export type {
	RScoreParams,
	FastPathParams,
	PerformanceMetrics,
	PerformanceTier,
	OptimizedDirectoryNode,
	RScoreTableOptions,
} from './bun-optimizations';

// ============================================================================
// Runtime Optimizations
// ============================================================================

export {
	lazyFile,
	existsLazy,
	batchedExists,
	createRuntimeNode,
	RiskAccumulator,
	scanRuntimeGenerator,
	checksumCrc32,
	createZstdCompressionStream,
	gcHint,
	warmupScanner,
	BUN_MAX_SAFE_SIZE,
} from './runtime-optimizations';

export type {RuntimeNode, RuntimeScanOptions} from './runtime-optimizations';

// ============================================================================
// Runtime Bridge (Cloudflare + Bun Native Path)
// ============================================================================

export {
	calculateBypassRatio as calculateBypassRatioBridge,
	shouldUseFastPath as shouldUseFastPathBridge,
	nextBufferSize,
	streamToR2SafeBuffer,
	calculateRScore as calculateRScoreBridge,
	getOptimizationTier,
	calculateSpeedup as calculateSpeedupBridge,
} from './runtime-bridge';

export type {RScoreParams as RScoreParamsBridge, OptimizationTier} from './runtime-bridge';

// ============================================================================
// Module Metadata
// ============================================================================

/**
 * Module version
 */
export const VERSION = '1.3.7';

/**
 * Target Bun version for these optimizations
 */
export const TARGET_BUN_VERSION = '1.3.7';

/**
 * Combined R-Score for all optimizations
 */
export function getModuleRScore(): number {
	const {combined} = calculateCombinedRScore();
	return combined;
}

/**
 * Check if all Bun v1.3.7 APIs are available
 */
export function checkBunVersionCompatibility(): {
	compatible: boolean;
	bunVersion: string;
	missingApis: string[];
} {
	const bunVersion = process.versions.bun ?? 'unknown';

	const requiredApis = ['which', 'randomUUIDv7', 'peek', 'openInEditor', 'deepEquals', 'escapeHTML'] as const;

	const missingApis: string[] = [];

	for (const api of requiredApis) {
		if (typeof (Bun as Record<string, unknown>)[api] !== 'function') {
			missingApis.push(api);
		}
	}

	return {
		compatible: missingApis.length === 0,
		bunVersion,
		missingApis,
	};
}

/**
 * Print optimization status report
 */
export function printOptimizationStatus(): void {
	const status = checkBunVersionCompatibility();
	const rScore = getModuleRScore();

	console.log('╔════════════════════════════════════════════════════════╗');
	console.log('║     Bun v1.3.7 API Integration - Status Report        ║');
	console.log('╠════════════════════════════════════════════════════════╣');
	console.log(`║  Bun Version: ${status.bunVersion.padEnd(42)} ║`);
	console.log(`║  Compatible:  ${(status.compatible ? '✅ Yes' : '❌ No').padEnd(42)} ║`);
	console.log(`║  R-Score:     ${rScore.toFixed(4).padEnd(42)} ║`);
	console.log(
		`║  Tier:        ${(rScore >= 0.95 ? 'Elite' : rScore >= 0.9 ? 'Native-Grade' : 'Sub-Optimal').padEnd(42)} ║`,
	);
	console.log('╠════════════════════════════════════════════════════════╣');
	console.log('║  API Availability:                                     ║');

	const apis = [
		['Bun.which()', 'which'],
		['Bun.randomUUIDv7()', 'randomUUIDv7'],
		['Bun.peek()', 'peek'],
		['Bun.openInEditor()', 'openInEditor'],
		['Bun.deepEquals()', 'deepEquals'],
		['Bun.escapeHTML()', 'escapeHTML'],
	] as const;

	for (const [name, key] of apis) {
		const available = typeof (Bun as Record<string, unknown>)[key] === 'function';
		const status = available ? '✅' : '❌';
		console.log(`║    ${status} ${name.padEnd(48)} ║`);
	}

	if (status.missingApis.length > 0) {
		console.log('╠════════════════════════════════════════════════════════╣');
		console.log('║  Missing APIs:                                         ║');
		for (const api of status.missingApis) {
			console.log(`║    ⚠️  ${api.padEnd(48)} ║`);
		}
	}

	console.log('╚════════════════════════════════════════════════════════╝');
}
