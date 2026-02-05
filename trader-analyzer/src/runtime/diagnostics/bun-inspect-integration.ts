/**
 * @fileoverview 7.1.0.0.0.0.0: Bun.inspect utilities for runtime diagnostics in Hyper-Bun.
 * Provides structured logging and debugging capabilities for market intelligence data flows.
 * @module runtime/diagnostics/bun-inspect-integration
 *
 * Cross-Reference Hub:
 * - @see 7.1.1.0.0.0.0 → Tabular data visualization (Bun.inspect.table)
 * - @see 7.1.2.0.0.0.0 → Deep object inspection (Bun.inspect)
 * - @see 6.1.1.2.2.1.2.0 → UIContext inspection patterns
 * - @see 9.1.1.6.1.0 → Telegram diagnostic message formatting
 */

import type { HyperBunUIContext } from "../../services/ui-context-rewriter";

/**
 * 7.1.1.4.0: Default inspection options optimized for Hyper-Bun's terminal width.
 * Accounts for Bun's default terminal width detection (console.columns).
 */
export const DEFAULT_INSPECT_OPTIONS = {
	colors: true,
	depth: 3,
	maxArrayLength: 50,
	maxStringLength: 100,
} as const;

/**
 * 7.1.1.0.0.0.0: Formats complex tabular market data for terminal/console output.
 * Leverages Bun's native table rendering with Hyper-Bun's typed data structures.
 *
 * @param tabularData - Array of market intelligence records (e.g., bookmaker odds, steam alerts)
 * @param properties - Optional column whitelist (e.g., ['timestamp', 'bookmaker', 'odds'])
 * @param options - Formatting options (colors)
 * @returns Formatted table string suitable for logging or Telegram messages
 *
 * @example 7.1.1.1.0: Market Odds Table Inspection
 * // Test Formula:
 * // 1. Generate mock odds: `const odds = [{bookmaker: 'Bet365', odds: 1.95}]`
 * // 2. Execute: `inspectMarketData(odds, ['bookmaker', 'odds'])`
 * // 3. Expected Result: Formatted table with aligned columns
 *
 * @example 7.1.1.1.1: UIContext Diagnostic Snapshot
 * // Test Formula:
 * // 1. In /registry.html handler, log: `inspectMarketData([uiContext], ['userRole', 'featureFlags'])`
 * // 2. Expected Result: Single-row table showing role and enabled features
 */
export function inspectMarketData(
	tabularData: any[],
	properties?: string[],
	options?: { colors?: boolean },
): string {
	// 7.1.1.2.0: Defensive handling for empty datasets
	if (!tabularData?.length) {
		return Bun.inspect.table([{ error: "No market data" }], properties);
	}

	// 7.1.1.3.0: Sanitize sensitive fields before inspection
	const sanitized = tabularData.map((item) => {
		const { apiKey, token, password, secret, ...safe } = item;
		return safe;
	});

	return Bun.inspect.table(sanitized, properties, {
		colors: options?.colors ?? true,
	});
}

/**
 * 7.1.2.0.0.0.0: Performs deep inspection of nested market intelligence structures.
 * Essential for debugging ShadowGraph data (see 6.1.1.2.2.1.2.2) and Telegram payloads.
 *
 * @param value - Any JavaScript value (array, object, Map, Set)
 * @param options - Inspection depth, color, and formatting options
 * @returns Detailed string representation
 *
 * @example 7.1.2.1.0: Feature Flags Deep Inspection
 * // Test Formula:
 * // 1. In UIContextRewriter, add: `console.log(inspectDeep(this.context, {depth: 2}))`
 * // 2. Start server: `bun run dev`
 * // 3. Expected Result: Colored JSON with nested featureFlags object expanded
 *
 * @example 7.1.2.1.1: Telegram Mini App State Inspection
 * // Test Formula:
 * // 1. In Mini App console: `inspectDeep(window.Telegram.WebApp.initDataUnsafe)`
 * // 2. Expected Result: Pretty-printed auth data with user object expanded
 *
 * @see 7.1.1.0.0.0.0 for tabular variant
 */
export function inspectDeep(
	value: any,
	options?: { depth?: number; colors?: boolean },
): string {
	// 7.1.2.2.0: Automatic truncation for extremely large arrays (e.g., 10k+ odds)
	if (Array.isArray(value) && value.length > 1000) {
		const truncated = value.slice(0, 100);
		return `Array(${value.length}) [${Bun.inspect(truncated, options)}...]`;
	}

	return Bun.inspect(value, {
		colors: options?.colors ?? true,
		depth: options?.depth ?? 5,
	});
}

/**
 * 7.1.2.3.0: Specialized inspector for ShadowGraph (see 6.1.1.2.2.1.2.2) data structures.
 * Handles cyclic references present in market correlation graphs.
 *
 * @param graph - ShadowGraph data structure
 * @returns Formatted string representation
 */
export function inspectShadowGraph(graph: any): string {
	return Bun.inspect(graph, {
		...DEFAULT_INSPECT_OPTIONS,
		depth: Infinity,
		colors: true,
	});
}
