/**
 * @fileoverview Funnel Types
 * @description Type definitions for data funneling system
 * @module funnel/types
 */

import type { CanonicalData } from "../pipeline/types";

/**
 * Route configuration
 */
export interface Route {
	target: string; // Output channel name
	filters?: FilterConfig;
	aggregator?: AggregationConfig;
	priority: number;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
	properties?: Record<string, unknown>;
	timeRange?: { start: number; end: number };
	valueFilters?: ValueFilter[];
	tags?: string[];
	namespace?: string;
}

/**
 * Value filter
 */
export interface ValueFilter {
	property: string;
	operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
	value: unknown;
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
	type:
		| "sum"
		| "average"
		| "min"
		| "max"
		| "count"
		| "group_by"
		| "time_series";
	property?: string;
	groupBy?: string | string[];
	interval?: number; // For time_series, in milliseconds
}

/**
 * Aggregated data result
 */
export interface AggregatedData {
	type: AggregationConfig["type"];
	value: unknown;
	data: unknown[];
	timestamp: number;
	metadata?: Record<string, unknown>;
}

/**
 * Output channel configuration
 */
export interface OutputConfig {
	name: string;
	type: "api" | "websocket" | "file" | "database";
	config: Record<string, unknown>;
}

/**
 * Route configuration for setup
 */
export interface RouteConfig {
	name: string;
	source: string | string[]; // Data source pattern
	conditions: {
		properties?: Record<string, unknown>;
		tags?: string[];
		namespace?: string;
	};
	target: string; // Output channel
	priority: number;
	featureFlag?: string; // Feature flag gate
	filters?: FilterConfig;
	aggregator?: AggregationConfig;
}

/**
 * Funnel configuration
 */
export interface FunnelConfig {
	routes: RouteConfig[];
	filters: FilterConfig[];
	aggregators: AggregationConfig[];
	outputs: OutputConfig[];
}

/**
 * Filtered data
 */
export interface FilteredData extends CanonicalData {
	filteredBy?: string[]; // Which filters were applied
}
