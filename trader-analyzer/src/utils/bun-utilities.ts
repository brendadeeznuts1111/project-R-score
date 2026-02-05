/**
 * @fileoverview Bun Utilities - Unified Export
 * @description Unified namespace for all Bun utility functions
 * @module utils/bun-utilities
 * 
 * Provides a single import point for all Bun-native utilities.
 */

import { ArrayInspector } from './array-inspection';
import { AdvancedTable } from './table-configuration';
import { Benchmark, PerformanceMonitor } from './benchmarking-suite';
// UUID utilities are in bun.ts but not exported as class
// Import the functions directly
import { stringWidth as bunStringWidth, escapeHTML as bunEscapeHTML } from './bun';
// Production hardening utilities
import { RateLimiter, SlidingWindowRateLimiter, RateLimiterFactory } from '../../scripts/rate-limiter';
import { 
	generateTraceId, 
	generateSpanId, 
	createTraceContext, 
	extractTraceContext, 
	injectTraceContext,
	withTraceContext,
	getCurrentTraceContext,
	type TraceContext 
} from './tracing';
import { PrometheusMetrics, prometheusMetricsHandler } from '../api/metrics/prometheus';

// Create UUID wrapper
const UUID = {
	v7: (timestamp?: number) => Bun.randomUUIDv7(timestamp),
	generateBatch: (count: number, options?: { timestamp?: number; encoding?: 'hex' | 'base64' | 'base64url' | 'buffer' }) => {
		const uuids: string[] = [];
		let currentTimestamp = options?.timestamp || Date.now();
		for (let i = 0; i < count; i++) {
			uuids.push(Bun.randomUUIDv7(currentTimestamp));
			if (i > 0 && i % 4096 === 0) {
				currentTimestamp++;
			}
		}
		return uuids;
	},
	parse: (uuid: string) => {
		const clean = uuid.replace(/-/g, '');
		if (clean.length !== 32) {
			throw new Error(`Invalid UUID format: ${uuid}`);
		}
		const buffer = Buffer.from(clean, 'hex');
		if (buffer.length !== 16) {
			throw new Error('UUID must be 16 bytes');
		}
		const timestampBytes = buffer.slice(0, 6);
		const timestamp = timestampBytes.readUIntBE(0, 6);
		return { timestamp, version: 7 as const, variant: 'RFC4122' as const, bytes: buffer };
	},
	sort: (uuids: string[]) => {
		return [...uuids].sort((a, b) => {
			const parsedA = UUID.parse(a);
			const parsedB = UUID.parse(b);
			if (parsedA.timestamp !== parsedB.timestamp) {
				return parsedA.timestamp - parsedB.timestamp;
			}
			return parsedA.bytes.compare(parsedB.bytes);
		});
	}
};
import { StringMeasurement } from './string-measurement';
import { HTMLUtils } from './html-utils';
import { Color, type RGB, type HSL } from './color-utils';

/**
 * Bun Utilities - Unified Namespace
 * 
 * Single import point for all Bun-native utilities.
 * 
 * @example
 * ```typescript
 * import { BunUtilities } from './src/utils/bun-utilities';
 * 
 * // Generate UUID
 * const id = BunUtilities.uuid();
 * 
 * // Measure string width
 * const width = BunUtilities.stringWidth('Hello 🌍');
 * 
 * // Create progress bar
 * const bar = BunUtilities.createProgressBar(75, 100, 30);
 * 
 * // Format table
 * const table = BunUtilities.formatTable(data, columns);
 * ```
 */
export const BunUtilities = {
	// Array & Data
	inspectArray: ArrayInspector.formatArray,
	compareArrays: ArrayInspector.compareArrays,
	formatTypedArray: ArrayInspector.formatTypedArray,

	// Tables
	formatTable: AdvancedTable.format,
	createHeatmap: AdvancedTable.createHeatmap,

	// Performance
	benchmark: Benchmark.compare,
	createBenchmark: () => new Benchmark(),
	createMonitor: () => PerformanceMonitor.getInstance(),

	// UUID
	uuid: UUID.v7,
	uuidBatch: UUID.generateBatch,
	parseUUID: UUID.parse,
	sortUUIDs: UUID.sort,

	// Strings
	stringWidth: StringMeasurement.width,
	stripANSI: StringMeasurement.stripANSI,
	measureText: StringMeasurement.measureLines,
	createProgressBar: StringMeasurement.createProgressBar,
	createTextTable: StringMeasurement.createTable,

	// HTML
	escapeHTML: HTMLUtils.escape,
	sanitizeHTML: HTMLUtils.sanitize,
	createTemplate: HTMLUtils.createTemplate,
	highlightSyntax: HTMLUtils.highlightSyntax,

	// Colors
	hexToRGB: Color.hexToRGB,
	rgbToHex: Color.rgbToHex,
	rgbToHSL: Color.rgbToHSL,
	hslToRGB: Color.hslToRGB,
	createGradient: Color.gradient,
	generatePalette: Color.generatePalette,

	// Built-in Bun APIs (for convenience)
	inspect: Bun.inspect,
	nanoseconds: Bun.nanoseconds,
	randomUUIDv7: Bun.randomUUIDv7,
	escapeHTMLBuiltIn: Bun.escapeHTML,
	stringWidthBuiltIn: Bun.stringWidth,

	// Production Hardening (4.2.2.14+)
	// Rate Limiting
	createRateLimiter: (maxTokens: number, refillRate: number) => new RateLimiter(maxTokens, refillRate),
	createSlidingWindowLimiter: (windowSizeMs: number, maxRequests: number) => new SlidingWindowRateLimiter(windowSizeMs, maxRequests),
	rateLimiterFactory: RateLimiterFactory,

	// Distributed Tracing (4.2.2.16.0.0.0)
	trace: {
		generateTraceId,
		generateSpanId,
		createTraceContext,
		extractTraceContext,
		injectTraceContext,
		withTraceContext,
		getCurrentTraceContext,
	},

	// Prometheus Metrics (4.2.2.15.0.0.0)
	metrics: {
		create: () => new PrometheusMetrics(),
		createHandler: prometheusMetricsHandler,
	},

	// Memory Monitoring (4.2.2.14.2.0.0)
	memory: {
		/**
		 * Check if memory usage exceeds ceiling
		 * @param ceilingBytes Memory ceiling in bytes (default: 4GB)
		 * @returns Memory usage info and whether ceiling is exceeded
		 */
		checkCeiling: (ceilingBytes: number = 4_000_000_000) => {
			if (typeof Bun === 'undefined' || !Bun.memoryUsage) {
				return { exceeded: false, heapUsed: 0, heapTotal: 0, external: 0 };
			}
			const usage = Bun.memoryUsage();
			return {
				exceeded: usage.heapUsed > ceilingBytes,
				heapUsed: usage.heapUsed,
				heapTotal: usage.heapTotal,
				external: usage.external,
				ceilingBytes,
			};
		},
		/**
		 * Force garbage collection if available
		 */
		forceGC: () => {
			if (typeof Bun !== 'undefined' && typeof Bun.gc !== 'undefined') {
				Bun.gc(true);
				return true;
			}
			return false;
		},
		/**
		 * Get current memory usage
		 */
		getUsage: () => {
			if (typeof Bun === 'undefined' || !Bun.memoryUsage) {
				return { heapUsed: 0, heapTotal: 0, external: 0 };
			}
			return Bun.memoryUsage();
		},
	},

	// Bun 1.3+ Features
	// YAML Support
	yaml: {
		parse: (text: string) => {
			if (typeof Bun !== 'undefined' && 'YAML' in Bun) {
				return (Bun as any).YAML.parse(text);
			}
			throw new Error("YAML support requires Bun 1.3+");
		},
		stringify: (obj: any, indent?: number) => {
			if (typeof Bun !== 'undefined' && 'YAML' in Bun) {
				return (Bun as any).YAML.stringify(obj, 0, indent || 2);
			}
			throw new Error("YAML support requires Bun 1.3+");
		},
	},

	// Zstandard Compression
	zstd: {
		compress: async (data: string | Buffer) => {
			if (typeof Bun !== 'undefined' && 'zstdCompress' in Bun) {
				return await (Bun as any).zstdCompress(data);
			}
			throw new Error("Zstandard compression requires Bun 1.3+");
		},
		decompress: async (data: Buffer) => {
			if (typeof Bun !== 'undefined' && 'zstdDecompress' in Bun) {
				return await (Bun as any).zstdDecompress(data);
			}
			throw new Error("Zstandard decompression requires Bun 1.3+");
		},
	},

	// Disposable Resources
	disposable: {
		createStack: () => {
			if (typeof DisposableStack !== 'undefined') {
				return new DisposableStack();
			}
			throw new Error("DisposableStack requires Bun 1.3+");
		},
		createAsyncStack: () => {
			if (typeof AsyncDisposableStack !== 'undefined') {
				return new AsyncDisposableStack();
			}
			throw new Error("AsyncDisposableStack requires Bun 1.3+");
		},
	},
};

// Re-exports for direct imports
export {
	ArrayInspector,
	AdvancedTable,
	Benchmark,
	PerformanceMonitor,
	StringMeasurement,
	HTMLUtils,
	Color,
	type RGB,
	type HSL,
};

// Export UUID wrapper
export { UUID };

// Production hardening exports
export {
	RateLimiter,
	SlidingWindowRateLimiter,
	RateLimiterFactory,
} from '../../scripts/rate-limiter';

export {
	generateTraceId,
	generateSpanId,
	createTraceContext,
	extractTraceContext,
	injectTraceContext,
	withTraceContext,
	getCurrentTraceContext,
	traceContextStorage,
	type TraceContext,
} from './tracing';

export {
	PrometheusMetrics,
	prometheusMetricsHandler,
} from '../api/metrics/prometheus';

// Bun 1.3+ Feature Exports
export {
	loadYAMLConfig,
	saveYAMLConfig,
	mergeYAMLConfigs,
	validateYAMLConfig,
	type YAMLConfig,
} from './yaml-config';

export {
	streamToText,
	streamToJSON,
	streamToBytes,
	streamToBlob,
	textToStream,
	jsonToStream,
	bytesToStream,
	transformStream,
} from './readable-stream-helpers';

export {
	createDisposableStack,
	createAsyncDisposableStack,
	DisposableDatabase,
	DisposableFileHandle,
	type DisposableResource,
	type AsyncDisposableResource,
} from './disposable-resources';

export {
	compressZstd,
	decompressZstd,
	compressZstdSync,
	decompressZstdSync,
	createZstdResponse,
	fetchZstd,
} from './zstd-compression';

export {
	createEnhancedWebSocket,
	createCompressedWebSocketClient,
	websocketServerConfig,
	type EnhancedWebSocketConfig,
} from '../api/websocket-enhanced';

// Middleware exports
export {
	SessionMiddleware,
} from '../middleware/session-middleware';

export {
	CSRFMiddleware,
} from '../middleware/csrf-middleware';

export {
	CookieMiddleware,
} from '../middleware/cookie-middleware';

export {
	composeMiddleware,
	withMiddleware,
	type Middleware,
} from './middleware-composer';

// Integration utilities
export { RegistryFormatter } from './registry-formatter';
export { TestRunner, TestIntegration } from './test-runner';
export { CommandFormatter } from './command-formatter';
export { BenchIntegration } from './bench-integration';
