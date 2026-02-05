/**
 * @fileoverview Feature Flag Configuration
 * @description Feature flag configuration types
 * @module features/config
 */

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
	id: string;
	name: string;
	enabled: boolean;
	rollout: number; // 0-100 percentage
	conditions: {
		roles?: string[];
		users?: string[];
		timeRange?: { start: number; end: number };
	};
}
