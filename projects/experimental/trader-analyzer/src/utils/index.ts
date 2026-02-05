/**
 * @fileoverview Utilities Module
 * @description Utility functions and classes exports
 * @module utils
 */

// Re-export all utilities from bun.ts
export * from "./bun";

// Enhanced table utilities using Bun native functions
export { inspectTable, ProgressBar, HTMLSanitizer } from "./bun";
export { EnterpriseCache } from "./enterprise-cache";
export {
	ENTERPRISE_CONFIG,
	getConfig,
} from "./enterprise-config";
export {
	CircuitBreaker,
	type RetryOptions,
	type RetryResult,
	retryWithBackoff,
} from "./enterprise-retry";
export { safeParseJSON, safeStringifyJSON } from "./json";
export {
	PerformanceMonitor,
	withPerformance,
	withAsyncPerformance,
	performanceMonitor,
} from "./performance-monitor";
export {
	DistributedID,
	type ParsedID,
} from "./distributed-id";
export {
	StringMeasurement,
	type MeasureLinesResult,
	type TruncateOptions,
	type ProgressBarOptions,
	type TableOptions,
} from "./string-measurement";
export {
	HTMLUtils,
	type SanitizeOptions,
} from "./html-utils";
export {
	Color,
	type RGB,
	type HSL,
} from "./color-utils";
export {
	BunUtilities,
	ArrayInspector,
	AdvancedTable,
	Benchmark,
} from "./bun-utilities";
export {
	type LogEntry,
	type LogFilter,
	NativeLogViewer,
	nativeLogs,
} from "./logs-native";
// Native metrics, logs, and ranking
export {
	NativeMetricsCollector,
	nativeMetrics,
	type ProcessMetrics,
	type SystemMetrics,
} from "./metrics-native";
export {
	type MiniappHealth,
	type MiniappStatus,
	NativeMiniappMonitor,
	nativeMiniapp,
} from "./miniapp-native";
export {
	NativeRankingSystem,
	nativeRanking,
	type RankableItem,
	type RankingOptions,
} from "./ranking-native";
export type {
	DisplayFormat,
	PropertyCategory,
	PropertyMatrixEntry,
	PropertyMatrixSystem,
	PropertySortField,
	SortOrder,
	TableDisplayOptions,
	TypeMatrix,
} from "./type-matrix";
// Property matrix exports
export { PropertyMatrixManager } from "./type-matrix";
// CSS bundler
export {
	BunCSSBundler,
	cssBundler,
	type BundledCSS,
	type CSSBundlerOptions,
} from "./css-bundler";
// Bun color utilities
export { BunColor, colors } from "./bun-color";
// Bun cookie utilities
export {
	BunCookieUtils,
	cookieUtils,
} from "./bun-cookie";
// Crypto utilities (Bun-native, zero-dependency)
export { CryptoUtils } from "./crypto";
