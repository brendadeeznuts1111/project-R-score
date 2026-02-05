#!/usr/bin/env bun
/**
 * @fileoverview 8.2.5.0.0.0.0: UI Policy Metrics Service
 * @description Metrics tracking and observability for UIPolicyManager operations.
 *              Provides Prometheus export, real-time WebSocket updates, and summary statistics.
 * @module src/services/ui-policy-metrics
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-METRICS@8.0.0.0.0.0.0;instance-id=UI-POLICY-METRICS-001;version=8.0.0.0.0.0.0}]
 * [PROPERTIES:{metrics={value:"UIPolicyMetrics";@root:"ROOT-SERVICES";@chain:["BP-SERVICES","BP-METRICS"];@version:"8.0.0.0.0.0.0"}}]
 * [CLASS:UIPolicyMetrics][#REF:v-8.0.0.0.0.0.0.BP.SERVICES.METRICS.1.0.A.1.1.SERVICE.1.1]]
 *
 * Version: 8.0.0.0.0.0.0
 * Ripgrep Pattern: 8\.0\.0\.0\.0\.0\.0|UI-POLICY-METRICS-001|BP-METRICS@8\.0\.0\.0\.0\.0\.0
 *
 * @see 8.2.0.0.0.0.0 for UIPolicyManager service
 * @see 8.3.0.0.0.0.0 for integration with HTMLRewriter
 *
 * // Ripgrep: 8.0.0.0.0.0.0
 * // Ripgrep: UI-POLICY-METRICS-001
 * // Ripgrep: BP-METRICS@8.0.0.0.0.0
 */

/**
 * 8.2.5.1.0.0.0: Metric event types
 */
export type MetricEventType =
	| "manifest_loaded"
	| "manifest_reloaded"
	| "manifest_error"
	| "context_built"
	| "feature_flags_resolved"
	| "policies_retrieved"
	| "transformation_enabled"
	| "transformation_disabled";

/**
 * 8.2.5.1.0.0.0: Metric event structure
 */
export interface MetricEvent {
	type: MetricEventType;
	timestamp: number;
	duration?: number; // milliseconds
	metadata?: Record<string, unknown>;
	error?: string;
}

/**
 * 8.2.5.1.0.0.0: Metrics summary structure
 */
export interface MetricsSummary {
	total: {
		manifestLoads: number;
		manifestReloads: number;
		contextBuilds: number;
		featureFlagResolutions: number;
		policyRetrievals: number;
		errors: number;
	};
	averages: {
		manifestLoadTime: number; // milliseconds
		contextBuildTime: number; // milliseconds
		featureFlagResolutionTime: number; // milliseconds
	};
	recent: {
		lastManifestLoad: number | null;
		lastError: number | null;
		lastContextBuild: number | null;
	};
	health: {
		status: "healthy" | "degraded" | "unhealthy";
		errorRate: number; // 0-1
		avgLatency: number; // milliseconds
	};
}

/**
 * 8.2.5.0.0.0.0: UI Policy Metrics Service
 *
 * Tracks metrics for UIPolicyManager operations including:
 * - Manifest loading and reloading
 * - Context building
 * - Feature flag resolution
 * - Policy retrieval
 * - Error tracking
 *
 * Provides:
 * - Prometheus export format
 * - Real-time WebSocket subscriptions
 * - Time-windowed summaries (hour, day, all)
 *
 * @example 8.2.5.0.0.0.0.1: Basic Usage
 * ```typescript
 * import { policyMetrics } from './ui-policy-metrics';
 *
 * // Track a metric event
 * policyMetrics.track('manifest_loaded', { duration: 45 });
 *
 * // Get summary
 * const summary = policyMetrics.getSummary('hour');
 *
 * // Export to Prometheus
 * const prometheus = policyMetrics.exportToPrometheus();
 * ```
 */
export class UIPolicyMetrics {
	private events: MetricEvent[] = [];
	private subscribers: Set<(event: MetricEvent) => void> = new Set();
	private readonly maxEvents = 10000; // Keep last 10k events

	/**
	 * 8.2.5.2.0.0.0: Track a metric event
	 *
	 * @param type - Event type
	 * @param metadata - Optional metadata
	 * @param duration - Optional duration in milliseconds
	 * @param error - Optional error message
	 */
	track(
		type: MetricEventType,
		options: {
			duration?: number;
			metadata?: Record<string, unknown>;
			error?: string;
		} = {},
	): void {
		const event: MetricEvent = {
			type,
			timestamp: Date.now(),
			duration: options.duration,
			metadata: options.metadata,
			error: options.error,
		};

		// Add to events array
		this.events.push(event);

		// Trim if exceeds max
		if (this.events.length > this.maxEvents) {
			this.events = this.events.slice(-this.maxEvents);
		}

		// Notify subscribers
		this.notifySubscribers(event);
	}

	/**
	 * 8.2.5.2.0.0.0: Subscribe to metric events
	 *
	 * @param callback - Callback function to receive events
	 * @returns Unsubscribe function
	 */
	subscribe(callback: (event: MetricEvent) => void): () => void {
		this.subscribers.add(callback);

		return () => {
			this.subscribers.delete(callback);
		};
	}

	/**
	 * 8.2.5.2.0.0.0: Notify all subscribers of a new event
	 */
	private notifySubscribers(event: MetricEvent): void {
		for (const subscriber of this.subscribers) {
			try {
				subscriber(event);
			} catch (error) {
				console.error("[UIPolicyMetrics] Subscriber error:", error);
			}
		}
	}

	/**
	 * 8.2.5.3.0.0.0: Get metrics summary for a time window
	 *
	 * @param window - Time window: 'hour', 'day', or 'all'
	 * @returns Metrics summary
	 */
	getSummary(window: "hour" | "day" | "all" = "all"): MetricsSummary {
		const now = Date.now();
		let cutoffTime: number;

		switch (window) {
			case "hour":
				cutoffTime = now - 60 * 60 * 1000;
				break;
			case "day":
				cutoffTime = now - 24 * 60 * 60 * 1000;
				break;
			case "all":
			default:
				cutoffTime = 0;
				break;
		}

		const filteredEvents = this.events.filter((e) => e.timestamp >= cutoffTime);

		// Calculate totals
		const manifestLoads = filteredEvents.filter(
			(e) => e.type === "manifest_loaded",
		).length;
		const manifestReloads = filteredEvents.filter(
			(e) => e.type === "manifest_reloaded",
		).length;
		const contextBuilds = filteredEvents.filter(
			(e) => e.type === "context_built",
		).length;
		const featureFlagResolutions = filteredEvents.filter(
			(e) => e.type === "feature_flags_resolved",
		).length;
		const policyRetrievals = filteredEvents.filter(
			(e) => e.type === "policies_retrieved",
		).length;
		const errors = filteredEvents.filter(
			(e) => e.type === "manifest_error" || e.error,
		).length;

		// Calculate averages
		const manifestLoadTimes = filteredEvents
			.filter((e) => e.type === "manifest_loaded" && e.duration !== undefined)
			.map((e) => e.duration!);
		const avgManifestLoadTime =
			manifestLoadTimes.length > 0
				? manifestLoadTimes.reduce((a, b) => a + b, 0) /
					manifestLoadTimes.length
				: 0;

		const contextBuildTimes = filteredEvents
			.filter((e) => e.type === "context_built" && e.duration !== undefined)
			.map((e) => e.duration!);
		const avgContextBuildTime =
			contextBuildTimes.length > 0
				? contextBuildTimes.reduce((a, b) => a + b, 0) /
					contextBuildTimes.length
				: 0;

		const featureFlagResolutionTimes = filteredEvents
			.filter(
				(e) => e.type === "feature_flags_resolved" && e.duration !== undefined,
			)
			.map((e) => e.duration!);
		const avgFeatureFlagResolutionTime =
			featureFlagResolutionTimes.length > 0
				? featureFlagResolutionTimes.reduce((a, b) => a + b, 0) /
					featureFlagResolutionTimes.length
				: 0;

		// Find recent events
		const lastManifestLoad =
			filteredEvents
				.filter((e) => e.type === "manifest_loaded")
				.map((e) => e.timestamp)
				.sort((a, b) => b - a)[0] || null;

		const lastError =
			filteredEvents
				.filter((e) => e.error || e.type === "manifest_error")
				.map((e) => e.timestamp)
				.sort((a, b) => b - a)[0] || null;

		const lastContextBuild =
			filteredEvents
				.filter((e) => e.type === "context_built")
				.map((e) => e.timestamp)
				.sort((a, b) => b - a)[0] || null;

		// Calculate health
		const totalEvents = filteredEvents.length;
		const errorRate = totalEvents > 0 ? errors / totalEvents : 0;

		const allDurations = filteredEvents
			.filter((e) => e.duration !== undefined)
			.map((e) => e.duration!);
		const avgLatency =
			allDurations.length > 0
				? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
				: 0;

		let status: "healthy" | "degraded" | "unhealthy";
		if (errorRate > 0.1 || avgLatency > 1000) {
			status = "unhealthy";
		} else if (errorRate > 0.05 || avgLatency > 500) {
			status = "degraded";
		} else {
			status = "healthy";
		}

		return {
			total: {
				manifestLoads,
				manifestReloads,
				contextBuilds,
				featureFlagResolutions,
				policyRetrievals,
				errors,
			},
			averages: {
				manifestLoadTime: Math.round(avgManifestLoadTime * 100) / 100,
				contextBuildTime: Math.round(avgContextBuildTime * 100) / 100,
				featureFlagResolutionTime:
					Math.round(avgFeatureFlagResolutionTime * 100) / 100,
			},
			recent: {
				lastManifestLoad,
				lastError,
				lastContextBuild,
			},
			health: {
				status,
				errorRate: Math.round(errorRate * 10000) / 10000,
				avgLatency: Math.round(avgLatency * 100) / 100,
			},
		};
	}

	/**
	 * 8.2.5.4.0.0.0: Export metrics to Prometheus format
	 *
	 * @returns Prometheus-formatted metrics string
	 */
	exportToPrometheus(): string {
		const summary = this.getSummary("all");
		const now = Date.now() / 1000; // Prometheus uses Unix timestamp in seconds

		const lines: string[] = [
			"# HELP hyperbun_ui_policy_manifest_loads_total Total number of manifest loads",
			"# TYPE hyperbun_ui_policy_manifest_loads_total counter",
			`hyperbun_ui_policy_manifest_loads_total ${summary.total.manifestLoads} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_manifest_reloads_total Total number of manifest reloads",
			"# TYPE hyperbun_ui_policy_manifest_reloads_total counter",
			`hyperbun_ui_policy_manifest_reloads_total ${summary.total.manifestReloads} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_context_builds_total Total number of context builds",
			"# TYPE hyperbun_ui_policy_context_builds_total counter",
			`hyperbun_ui_policy_context_builds_total ${summary.total.contextBuilds} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_feature_flag_resolutions_total Total number of feature flag resolutions",
			"# TYPE hyperbun_ui_policy_feature_flag_resolutions_total counter",
			`hyperbun_ui_policy_feature_flag_resolutions_total ${summary.total.featureFlagResolutions} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_policy_retrievals_total Total number of policy retrievals",
			"# TYPE hyperbun_ui_policy_policy_retrievals_total counter",
			`hyperbun_ui_policy_policy_retrievals_total ${summary.total.policyRetrievals} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_errors_total Total number of errors",
			"# TYPE hyperbun_ui_policy_errors_total counter",
			`hyperbun_ui_policy_errors_total ${summary.total.errors} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_manifest_load_time_seconds Average manifest load time",
			"# TYPE hyperbun_ui_policy_manifest_load_time_seconds gauge",
			`hyperbun_ui_policy_manifest_load_time_seconds ${summary.averages.manifestLoadTime / 1000} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_context_build_time_seconds Average context build time",
			"# TYPE hyperbun_ui_policy_context_build_time_seconds gauge",
			`hyperbun_ui_policy_context_build_time_seconds ${summary.averages.contextBuildTime / 1000} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_feature_flag_resolution_time_seconds Average feature flag resolution time",
			"# TYPE hyperbun_ui_policy_feature_flag_resolution_time_seconds gauge",
			`hyperbun_ui_policy_feature_flag_resolution_time_seconds ${summary.averages.featureFlagResolutionTime / 1000} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_error_rate Error rate (0-1)",
			"# TYPE hyperbun_ui_policy_error_rate gauge",
			`hyperbun_ui_policy_error_rate ${summary.health.errorRate} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_avg_latency_seconds Average latency",
			"# TYPE hyperbun_ui_policy_avg_latency_seconds gauge",
			`hyperbun_ui_policy_avg_latency_seconds ${summary.health.avgLatency / 1000} ${now}`,
			"",
			"# HELP hyperbun_ui_policy_health_status Health status (0=healthy, 1=degraded, 2=unhealthy)",
			"# TYPE hyperbun_ui_policy_health_status gauge",
			`hyperbun_ui_policy_health_status ${summary.health.status === "healthy" ? 0 : summary.health.status === "degraded" ? 1 : 2} ${now}`,
		];

		return lines.join("\n");
	}

	/**
	 * 8.2.5.5.0.0.0: Get raw events for a time window
	 *
	 * @param window - Time window: 'hour', 'day', or 'all'
	 * @returns Array of metric events
	 */
	getEvents(window: "hour" | "day" | "all" = "all"): MetricEvent[] {
		const now = Date.now();
		let cutoffTime: number;

		switch (window) {
			case "hour":
				cutoffTime = now - 60 * 60 * 1000;
				break;
			case "day":
				cutoffTime = now - 24 * 60 * 60 * 1000;
				break;
			case "all":
			default:
				return [...this.events];
		}

		return this.events.filter((e) => e.timestamp >= cutoffTime);
	}

	/**
	 * 8.2.5.5.0.0.0: Clear all metrics (use with caution)
	 */
	clear(): void {
		this.events = [];
	}
}

/**
 * 8.2.5.0.0.0.0: Singleton instance of UI Policy Metrics
 */
export const policyMetrics = new UIPolicyMetrics();
