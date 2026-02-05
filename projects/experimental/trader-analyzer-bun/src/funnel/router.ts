/**
 * @fileoverview Data Router
 * @description Routes data based on properties and rules
 * @module funnel/router
 */

import type {
	CanonicalData,
	DataSource,
	FeatureFlagManagerAdapter,
	PipelineUser,
} from "../pipeline/types";
import type { Route, RouteConfig } from "./types";

/**
 * Data Router
 *
 * Routes canonical data to different output channels based on:
 * - Source patterns
 * - Property conditions
 * - Tag matching
 * - Namespace filtering
 * - Feature flag gates
 */
export class DataRouter {
	private routingRules: RouteConfig[] = [];

	/**
	 * Add a routing rule
	 */
	addRule(rule: RouteConfig): void {
		this.routingRules.push(rule);
		// Sort by priority (highest first)
		this.routingRules.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Remove a routing rule
	 */
	removeRule(name: string): void {
		this.routingRules = this.routingRules.filter((rule) => rule.name !== name);
	}

	/**
	 * Route data to output channels based on routing rules
	 *
	 * @param data - Canonical data to route
	 * @param source - Data source that provided the data
	 * @param featureFlagManager - Optional feature flag manager for rule gating
	 * @param user - Optional user context for feature flag checks
	 * @returns Array of routes sorted by priority (highest first)
	 */
	async route(
		data: CanonicalData,
		source: DataSource,
		featureFlagManager?: FeatureFlagManagerAdapter,
		user?: PipelineUser,
	): Promise<Route[]> {
		const routes: Route[] = [];

		// Check routing rules
		for (const rule of this.routingRules) {
			if (this.matches(rule, data, source)) {
				// Check feature flag if present
				if (rule.featureFlag && featureFlagManager) {
					if (!featureFlagManager.isEnabled(rule.featureFlag, user)) {
						continue;
					}
				}

				routes.push({
					target: rule.target,
					filters: rule.filters,
					aggregator: rule.aggregator,
					priority: rule.priority,
				});
			}
		}

		return routes.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Check if a rule matches the data
	 */
	private matches(
		rule: RouteConfig,
		data: CanonicalData,
		source: DataSource,
	): boolean {
		// Check source pattern
		const sources = Array.isArray(rule.source) ? rule.source : [rule.source];
		if (!sources.includes(source.id) && !sources.includes("*")) {
			return false;
		}

		// Check namespace
		if (rule.conditions.namespace) {
			if (source.namespace !== rule.conditions.namespace) {
				return false;
			}
		}

		// Check properties
		if (rule.conditions.properties) {
			for (const [key, value] of Object.entries(rule.conditions.properties)) {
				if (data.properties[key] !== value) {
					return false;
				}
			}
		}

		// Check tags (would need to be in metadata)
		if (rule.conditions.tags && rule.conditions.tags.length > 0) {
			const dataTags = (data.metadata?.tags as string[]) || [];
			if (!rule.conditions.tags.some((tag) => dataTags.includes(tag))) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Get all routing rules
	 */
	getRules(): RouteConfig[] {
		return [...this.routingRules];
	}

	/**
	 * Clear all rules
	 */
	clear(): void {
		this.routingRules = [];
	}
}
