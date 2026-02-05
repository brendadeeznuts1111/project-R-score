/**
 * @fileoverview Funnel Utilities
 * @description Utility functions for data filtering
 * @module funnel/utils
 */

import type { CanonicalData } from "../pipeline/types";

/**
 * Create an empty filtered data object (used when data should be excluded)
 * This preserves the structure while marking data as filtered out
 */
export function createEmptyFilteredData(data: CanonicalData): CanonicalData {
	return {
		...data,
		properties: {},
	};
}

/**
 * Check if filtered data is empty (all properties filtered out)
 */
export function isEmptyFilteredData(data: CanonicalData): boolean {
	return Object.keys(data.properties).length === 0;
}
