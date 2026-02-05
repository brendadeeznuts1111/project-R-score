/**
 * @fileoverview Hyper-Bun Deep Console Inspector
 * @description Property-based type interpretation and sub-child node context resolution
 * @module utils/deep-console-log
 * @version 7.3.0.0.0.0.0
 *
 * Provides a highly specialized, Bun-native utility for logging deeply nested Hyper-Bun
 * domain objects with property-based type interpretation and contextual sub-child node
 * resolution.
 *
 * @see {@link docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md|Console Depth Debugging Documentation}
 */

/**
 * 7.3.2.0.0.0.0: Defines how specific Hyper-Bun data types and their properties
 * should be formatted and prioritized during deep console inspection.
 * This allows for 'property-based type interpretation'.
 */
export interface HyperBunInspectContext {
	[typeName: string]: {
		/** Primary identifier property (e.g., 'node_id' for MarketOfferingNode) */
		primary_id_property: string;
		/** Properties always shown regardless of depth (e.g., 'bookmaker_name', 'market_exposure_level') */
		summary_properties?: string[];
		/** Property to derive a console color (e.g., 'threat_level', 'market_exposure_level') */
		color_hint_property?: string;
		/** Property that holds a deeplink (e.g., 'deeplink_url' on TMAAlertSummary) */
		deep_link_property?: string;
		/** Custom transformation for a specific property's value */
		transform_property?: {
			[propName: string]: (value: any, parent: any) => string;
		};
	};
}

/**
 * Options for deepConsoleLog utility
 */
export interface DeepConsoleLogOptions {
	/** Override console depth (defaults to Bun's --console-depth or 10) */
	depth?: number;
	/** Custom inspect context (defaults to defaultInspectContext) */
	context?: HyperBunInspectContext;
	/** Enable color output (default: true) */
	color?: boolean;
	/** Maximum array items to display before truncation */
	maxArrayItems?: number;
}

/**
 * Default inspect context for Hyper-Bun types
 * 7.3.2.0.0.0.0: Property-Based Type Interpretation
 */
export const defaultInspectContext: HyperBunInspectContext = {
	MarketOfferingNode: {
		primary_id_property: 'node_id',
		summary_properties: ['bookmaker_name', 'market_exposure_level', 'last_line_value'],
		color_hint_property: 'market_exposure_level',
		transform_property: {
			market_exposure_level: (val: string) => {
				if (val === 'dark_pool') return `🔴 ${val}`;
				if (val === 'api_exposed') return `🟠 ${val}`;
				return `🟢 ${val}`;
			}
		}
	},
	CovertSteamEventRecord: {
		primary_id_property: 'alert_id',
		summary_properties: ['event_identifier', 'severity', 'sharp_money_footprint_indicator'],
		color_hint_property: 'severity',
		transform_property: {
			severity: (val: number) => val >= 8 ? `🚨 ${val}` : `⚠️ ${val}`
		}
	},
	TMATradingDashboardData: {
		primary_id_property: 'session_id',
		summary_properties: ['total_pnl', 'active_positions', 'available_balance'],
		color_hint_property: 'total_pnl',
		transform_property: {
			total_pnl: (val: number) => val >= 0 ? `💰 +${val}` : `📉 ${val}`
		}
	},
	TMABalanceOverview: {
		primary_id_property: 'bookmaker',
		summary_properties: ['balance', 'available_liquidity', 'pending_bets'],
		color_hint_property: 'available_liquidity',
		transform_property: {
			available_liquidity: (val: number) => {
				if (val < 1000) return `🔴 Low (${val})`;
				if (val < 5000) return `🟠 Medium (${val})`;
				return `🟢 High (${val})`;
			}
		}
	},
	TMAAlertSummary: {
		primary_id_property: 'alert_id',
		summary_properties: ['type', 'severity', 'timestamp', 'deeplink_url'],
		color_hint_property: 'severity',
		deep_link_property: 'deeplink_url',
		transform_property: {
			severity: (val: string) => {
				const severityMap: Record<string, string> = {
					'critical': '🚨',
					'high': '⚠️',
					'medium': 'ℹ️',
					'low': '📌'
				};
				return `${severityMap[val] || '•'} ${val}`;
			}
		}
	}
};

/**
 * ANSI color codes for console output
 */
const ANSI_COLORS = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	gray: '\x1b[90m'
} as const;

/**
 * 7.3.5.0.0.0.0: Get Bun's console depth from environment
 */
function getBunConsoleDepth(): number | undefined {
	const depthStr = process.env.BUN_CONSOLE_DEPTH;
	if (depthStr) {
		const depth = parseInt(depthStr, 10);
		if (!isNaN(depth) && depth > 0) {
			return depth;
		}
	}
	return undefined;
}

/**
 * Get effective depth for inspection
 * 7.3.4.1.0.0.0: Custom Display Depth
 */
function getEffectiveDepth(options?: DeepConsoleLogOptions): number {
	// Explicit override takes precedence
	if (options?.depth !== undefined) {
		return options.depth;
	}

	// Check Bun's console depth from environment
	const bunDepth = getBunConsoleDepth();
	if (bunDepth !== undefined) {
		return bunDepth;
	}

	// Default for Hyper-Bun objects
	return 10;
}

/**
 * Infer type name from object structure
 * 7.3.3.2.0.0.0: Dynamic Type Recognition
 */
function inferTypeName(obj: any, context: HyperBunInspectContext): string | null {
	// Check if object matches any known type by checking for primary_id_property
	for (const [typeName, typeConfig] of Object.entries(context)) {
		if (obj && typeof obj === 'object' && typeConfig.primary_id_property in obj) {
			return typeName;
		}
	}

	// Check constructor name
	if (obj?.constructor?.name && obj.constructor.name !== 'Object') {
		return obj.constructor.name;
	}

	return null;
}

/**
 * 7.3.3.0.0.0.0: Resolve sub-child node context
 * Resolves and enriches the context of a child node during deep inspection.
 */
function resolveSubChildNodeContext(
	childObject: any,
	parentObject: any,
	typeName: string | null
): string {
	let contextString = '';

	// Resolve parent references
	if (typeName === 'MarketPropagationLink' && parentObject?.node_id) {
		contextString += ` (from parent ${parentObject.node_id})`;
	}

	if (childObject?.parent_node_id && parentObject?.node_id !== childObject.parent_node_id) {
		// Parent node ID exists but doesn't match current parent
		contextString += ` (parent: ${childObject.parent_node_id})`;
	}

	// Resolve source references
	if (childObject?.source_node_id) {
		contextString += ` (source: ${childObject.source_node_id})`;
	}

	// Resolve related references
	if (childObject?.related_node_ids && Array.isArray(childObject.related_node_ids)) {
		const relatedCount = childObject.related_node_ids.length;
		contextString += ` (${relatedCount} related node${relatedCount !== 1 ? 's' : ''})`;
	}

	return contextString;
}

/**
 * Format a property value using transform functions
 */
function formatPropertyValue(
	propName: string,
	value: any,
	obj: any,
	context: HyperBunInspectContext,
	typeName: string | null
): string {
	if (!typeName) return String(value);

	const typeConfig = context[typeName];
	if (!typeConfig?.transform_property?.[propName]) {
		return String(value);
	}

	return typeConfig.transform_property[propName](value, obj);
}

/**
 * Get color for a property value
 */
function getColorForValue(value: any, colorHint?: string): string {
	if (!colorHint) return ANSI_COLORS.reset;

	if (typeof value === 'string') {
		if (value.includes('🔴') || value.includes('dark_pool') || value === 'critical') {
			return ANSI_COLORS.red;
		}
		if (value.includes('🟠') || value === 'high') {
			return ANSI_COLORS.yellow;
		}
		if (value.includes('🟢') || value === 'low' || value === 'displayed') {
			return ANSI_COLORS.green;
		}
	}

	if (typeof value === 'number') {
		if (value < 0) return ANSI_COLORS.red;
		if (value === 0) return ANSI_COLORS.yellow;
		return ANSI_COLORS.green;
	}

	return ANSI_COLORS.reset;
}

/**
 * Format object for console output
 * 7.3.4.3.0.0.0: Structured & Color-Coded Output
 */
function formatObject(
	obj: any,
	depth: number,
	currentDepth: number,
	context: HyperBunInspectContext,
	parent?: any,
	options: DeepConsoleLogOptions = {}
): string {
	if (currentDepth >= depth) {
		return '[Object]';
	}

	if (obj === null) return 'null';
	if (obj === undefined) return 'undefined';
	if (typeof obj !== 'object') return String(obj);

	const typeName = inferTypeName(obj, context);
	const typeConfig = typeName ? context[typeName] : null;

	const indent = '  '.repeat(currentDepth);
	const nextDepth = currentDepth + 1;
	const useColor = options.color !== false;

	// Format arrays
	if (Array.isArray(obj)) {
		const maxItems = options.maxArrayItems ?? 5;
		const itemsToShow = Math.min(obj.length, maxItems);
		const lines: string[] = ['['];

		for (let i = 0; i < itemsToShow; i++) {
			const item = obj[i];
			const itemTypeName = inferTypeName(item, context);
			const itemContext = resolveSubChildNodeContext(item, obj, itemTypeName);
			const formatted = formatObject(item, depth, nextDepth, context, obj, options);
			lines.push(`${indent}  ${formatted}${itemContext}`);
		}

		if (obj.length > maxItems) {
			lines.push(`${indent}  ... ${obj.length - maxItems} more items`);
		}

		lines.push(`${indent}]`);
		return lines.join('\n');
	}

	// Format objects
	const lines: string[] = [];
	const typePrefix = typeName ? `${typeName} ` : '';
	lines.push(`${typePrefix}{`);

	// Show primary ID first
	if (typeConfig?.primary_id_property && obj[typeConfig.primary_id_property] !== undefined) {
		const idValue = obj[typeConfig.primary_id_property];
		const color = useColor ? getColorForValue(idValue, typeConfig.color_hint_property) : '';
		const reset = useColor ? ANSI_COLORS.reset : '';
		lines.push(`${indent}  ${typeConfig.primary_id_property}: ${color}${idValue}${reset}`);
	}

	// Show summary properties
	if (typeConfig?.summary_properties) {
		for (const propName of typeConfig.summary_properties) {
			if (propName in obj && propName !== typeConfig.primary_id_property) {
				const value = obj[propName];
				const formatted = formatPropertyValue(propName, value, obj, context, typeName);
				const color = useColor ? getColorForValue(value, typeConfig.color_hint_property) : '';
				const reset = useColor ? ANSI_COLORS.reset : '';
				lines.push(`${indent}  ${propName}: ${color}${formatted}${reset}`);
			}
		}
	}

	// Show other properties (if depth allows)
	if (nextDepth < depth) {
		for (const [key, value] of Object.entries(obj)) {
			// Skip already shown properties
			if (typeConfig?.primary_id_property === key) continue;
			if (typeConfig?.summary_properties?.includes(key)) continue;

			const formatted = formatObject(value, depth, nextDepth, context, obj, options);
			lines.push(`${indent}  ${key}: ${formatted}`);
		}
	} else {
		// Truncated
		const remainingProps = Object.keys(obj).filter(
			key => key !== typeConfig?.primary_id_property && !typeConfig?.summary_properties?.includes(key)
		);
		if (remainingProps.length > 0) {
			lines.push(`${indent}  ... ${remainingProps.length} more properties`);
		}
	}

	lines.push(`${indent}}`);
	return lines.join('\n');
}

/**
 * 7.3.4.0.0.0.0: Main deepConsoleLog utility
 * Provides structured, depth-controlled inspection of Hyper-Bun domain objects.
 *
 * @param obj - The object to inspect
 * @param options - Inspection options
 *
 * @example
 * ```typescript
 * import { deepConsoleLog } from './utils/deep-console-log';
 * import type { MarketOfferingNode } from './types';
 *
 * const node: MarketOfferingNode = { /* ... *\/ };
 * deepConsoleLog(node); // Uses default depth=10
 * deepConsoleLog(node, { depth: 3 }); // Custom depth
 * ```
 */
export function deepConsoleLog<T>(obj: T, options?: DeepConsoleLogOptions): void {
	const effectiveDepth = getEffectiveDepth(options);
	const context = options?.context ?? defaultInspectContext;
	const formatted = formatObject(obj, effectiveDepth, 0, context, undefined, options);
	console.log(formatted);
}

/**
 * Register additional inspect context for custom types
 * Allows extending the default context with project-specific types.
 *
 * @param additionalContext - Additional type contexts to merge
 *
 * @example
 * ```typescript
 * import { registerInspectContext } from './utils/deep-console-log';
 *
 * registerInspectContext({
 *   CustomType: {
 *     primary_id_property: 'id',
 *     summary_properties: ['name', 'status']
 *   }
 * });
 * ```
 */
export function registerInspectContext(additionalContext: HyperBunInspectContext): void {
	Object.assign(defaultInspectContext, additionalContext);
}

/**
 * Get current inspect context
 */
export function getInspectContext(): HyperBunInspectContext {
	return { ...defaultInspectContext };
}
