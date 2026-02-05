/**
 * @fileoverview Funnel Configuration
 * @description Configuration types and defaults for data funneling
 * @module funnel/config
 */

import type { FunnelConfig } from "./types";

/**
 * Default funnel configuration
 */
export const defaultFunnelConfig: FunnelConfig = {
	routes: [],
	filters: [],
	aggregators: [],
	outputs: [],
};
