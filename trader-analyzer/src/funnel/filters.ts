/**
 * @fileoverview Data Filters
 * @description Apply filters based on properties, time, and values
 * @module funnel/filters
 */

import type { CanonicalData } from "../pipeline/types";
import type { FilterConfig, FilteredData, ValueFilter } from "./types";
import { createEmptyFilteredData } from "./utils";

/**
 * Data filter for applying various filtering strategies
 */
export class DataFilter {
	/**
	 * Apply filters based on properties
	 */
	async filter(
		data: CanonicalData,
		filterConfig: FilterConfig,
	): Promise<FilteredData> {
		let filtered: CanonicalData = { ...data };
		const appliedFilters: string[] = [];

		// Property-based filtering
		if (filterConfig.properties) {
			filtered = this.filterByProperties(filtered, filterConfig.properties);
			appliedFilters.push("properties");
		}

		// Time-based filtering
		if (filterConfig.timeRange) {
			filtered = this.filterByTime(filtered, filterConfig.timeRange);
			appliedFilters.push("timeRange");
		}

		// Value-based filtering
		if (filterConfig.valueFilters) {
			filtered = this.filterByValues(filtered, filterConfig.valueFilters);
			appliedFilters.push("valueFilters");
		}

		// Tag-based filtering
		if (filterConfig.tags) {
			filtered = this.filterByTags(filtered, filterConfig.tags);
			appliedFilters.push("tags");
		}

		// Namespace filtering
		if (filterConfig.namespace) {
			if (filtered.source.namespace !== filterConfig.namespace) {
				// Return empty filtered data
				return {
					...createEmptyFilteredData(filtered),
					filteredBy: appliedFilters,
				};
			}
			appliedFilters.push("namespace");
		}

		return {
			...filtered,
			filteredBy: appliedFilters,
		};
	}

	/**
	 * Filter by properties (include only specified properties)
	 */
	private filterByProperties(
		data: CanonicalData,
		properties: Record<string, unknown>,
	): CanonicalData {
		const filteredProperties: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(properties)) {
			if (key in data.properties && data.properties[key] === value) {
				filteredProperties[key] = data.properties[key];
			}
		}

		return {
			...data,
			properties: filteredProperties,
		};
	}

	/**
	 * Filter by time range
	 */
	private filterByTime(
		data: CanonicalData,
		timeRange: { start: number; end: number },
	): CanonicalData {
		if (data.timestamp < timeRange.start || data.timestamp > timeRange.end) {
			// Return empty filtered data
			return createEmptyFilteredData(data);
		}

		return data;
	}

	/**
	 * Filter by value filters
	 */
	private filterByValues(
		data: CanonicalData,
		valueFilters: ValueFilter[],
	): CanonicalData {
		for (const filter of valueFilters) {
			const value = data.properties[filter.property];

			if (value === undefined) {
				// Property doesn't exist, exclude
				return createEmptyFilteredData(data);
			}

			if (!this.matchesFilter(value, filter)) {
				// Doesn't match filter, exclude
				return createEmptyFilteredData(data);
			}
		}

		return data;
	}

	/**
	 * Check if value matches filter
	 */
	private matchesFilter(value: unknown, filter: ValueFilter): boolean {
		switch (filter.operator) {
			case "eq":
				return value === filter.value;
			case "ne":
				return value !== filter.value;
			case "gt":
				return (
					typeof value === "number" &&
					typeof filter.value === "number" &&
					value > filter.value
				);
			case "gte":
				return (
					typeof value === "number" &&
					typeof filter.value === "number" &&
					value >= filter.value
				);
			case "lt":
				return (
					typeof value === "number" &&
					typeof filter.value === "number" &&
					value < filter.value
				);
			case "lte":
				return (
					typeof value === "number" &&
					typeof filter.value === "number" &&
					value <= filter.value
				);
			case "in":
				return Array.isArray(filter.value) && filter.value.includes(value);
			case "contains":
				return (
					typeof value === "string" &&
					typeof filter.value === "string" &&
					value.includes(filter.value)
				);
			default:
				return false;
		}
	}

	/**
	 * Filter by tags
	 */
	private filterByTags(data: CanonicalData, tags: string[]): CanonicalData {
		const dataTags = (data.metadata?.tags as string[]) || [];

		if (!tags.some((tag) => dataTags.includes(tag))) {
			// No matching tags, exclude
			return createEmptyFilteredData(data);
		}

		return data;
	}
}
