/**
 * @fileoverview Funnel Module
 * @description Data funneling system exports
 * @module funnel
 */

export { DataAggregator } from "./aggregators";
export { defaultFunnelConfig } from "./config";
export { DataFilter } from "./filters";
export { DataRouter } from "./router";
export type {
	AggregatedData,
	AggregationConfig,
	FilterConfig,
	FilteredData,
	FunnelConfig,
	OutputConfig,
	Route,
	RouteConfig,
	ValueFilter,
} from "./types";
export { createEmptyFilteredData, isEmptyFilteredData } from "./utils";
