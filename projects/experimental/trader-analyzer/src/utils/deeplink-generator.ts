/**
 * @fileoverview Deep-Link Generator for Hyper-Bun Alerts
 * @description Generates standardized deep-links for Telegram alerts per RFC 001
 * @module utils/deeplink-generator
 * @see {@link ../docs/rfc/001-telegram-deeplink-standard.md|RFC 001: Telegram Deep-Link Standard}
 *
 * Performance Note: Bun automatically uses SIMD-optimized decodeURIComponent for URL parsing
 * @see docs/BUN-SIMD-URI-DECODING.md
 * @see https://github.com/oven-sh/bun/blob/5eb2145b3104f48eadd601518904e56aaa9937bf/src/bun.js/bindings/decodeURIComponentSIMD.cpp#L21-L271
 *
 * 🔒 BUN FIX: URLSearchParams.prototype.size is now configurable: true (Web IDL spec compliance)
 * @see BUN-SECURITY-FIXES-INTEGRATION.md
 */

import type { HyperBunUIContext } from "../services/ui-context-rewriter";
import { DEEP_LINK_PATHS, DEEP_LINK_DEFAULTS } from "./rss-constants";

/**
 * Deep-Link Generator for Hyper-Bun Alerts
 *
 * Implements RFC 001: Telegram Deep-Link Standard for Hyper-Bun Alerts
 * Generates standardized deep-links that transform Telegram notifications into
 * actionable, traceable entry points into the Hyper-Bun intelligence system.
 *
 * @class DeepLinkGenerator
 * @see {@link ../docs/rfc/001-telegram-deeplink-standard.md|RFC 001}
 */
export class DeepLinkGenerator {
	private readonly dashboardBaseUrl: string;

	/**
	 * Initialize DeepLinkGenerator
	 *
	 * @param dashboardBaseUrlOrContext - Base URL for Hyper-Bun dashboard, or HyperBunUIContext instance
	 * @throws {TypeError} if dashboardBaseUrlOrContext is invalid
	 *
	 * @example
	 * ```typescript
	 * // Using explicit URL
	 * const generator = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	 *
	 * // Using HyperBunUIContext (converts API port to dashboard port)
	 * const context = await uiPolicyManager.buildUIContext(request);
	 * const generator = new DeepLinkGenerator(context);
	 * ```
	 */
	constructor(dashboardBaseUrlOrContext?: string | HyperBunUIContext) {
		if (
			typeof dashboardBaseUrlOrContext === "object" &&
			dashboardBaseUrlOrContext !== null
		) {
			// Extract dashboard URL from HyperBunUIContext
			// Convert API base URL (port 3001) to dashboard URL (port 8080)
			const apiBaseUrl =
				dashboardBaseUrlOrContext.apiBaseUrl || `http://localhost:${DEEP_LINK_DEFAULTS.API_PORT}`;
			const url = new URL(apiBaseUrl);
			url.port = DEEP_LINK_DEFAULTS.DASHBOARD_PORT;
			this.dashboardBaseUrl = url.toString().replace(/\/$/, "");
		} else {
			// Resolve dashboard base URL from:
			// 1. Constructor parameter (highest priority)
			// 2. HYPERBUN_DASHBOARD_URL environment variable
			// 3. Default: http://localhost:8080 (from DEEP_LINK_DEFAULTS)
			this.dashboardBaseUrl =
				dashboardBaseUrlOrContext ||
				process.env.HYPERBUN_DASHBOARD_URL ||
				DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV;
		}

		// Validate dashboard base URL
		try {
			new URL(this.dashboardBaseUrl);
		} catch {
			throw new TypeError(
				`Invalid dashboard base URL: ${this.dashboardBaseUrl}`,
			);
		}
	}

	/**
	 * Generates RFC-compliant deep-link for Covert Steam alerts
	 *
	 * Per RFC 001 Section 9.1.1.9.1.4.0: Mandatory parameters ensure alert tracking
	 * Per RFC 001 Section 9.1.1.9.1.5.0: Optional context parameters enable intelligent routing
	 *
	 * @param alert - The CovertSteamEventRecord instance or compatible alert data
	 * @returns RFC-compliant URL string
	 * @throws {TypeError} if required parameters are missing
	 *
	 * @example
	 * ```typescript
	 * const link = generator.generateCovertSteamLink({
	 *   event_identifier: "NFL-2025-001",
	 *   bookmaker_name: "DraftKings",
	 *   detection_timestamp: 1704556800000,
	 *   source_dark_node_id: "node_abc123",
	 *   impact_severity_score: 9.5
	 * });
	 * // Returns: {DASHBOARD_URL}/alert/covert-steam/?id=...&type=covert-steam&...
	 * ```
	 */
	generateCovertSteamLink(alert: {
		event_identifier: string;
		bookmaker_name?: string;
		detection_timestamp: number;
		source_dark_node_id?: string;
		impact_severity_score?: number;
	}): string {
		// Validate required fields (RFC 9.1.1.9.1.4.0)
		if (!alert.event_identifier || alert.detection_timestamp === undefined) {
			throw new TypeError(
				"Missing required alert fields for deep-link generation: event_identifier and detection_timestamp are required",
			);
		}

		const params = new URLSearchParams(); // Bun Fix: configurable .size property per Web IDL spec

		// Mandatory parameters (RFC 001 Section 3.1 / RFC 9.1.1.9.1.4.0)
		const alertId = `${alert.event_identifier}-${alert.detection_timestamp}`;
		params.set("id", alertId);
		params.set("type", "covert-steam");
		params.set("ts", alert.detection_timestamp.toString());

		// Optional context parameters (RFC 001 Section 3.2 / RFC 9.1.1.9.1.5.0)
		if (alert.bookmaker_name) {
			params.set("bm", alert.bookmaker_name);
		}
		if (alert.event_identifier) {
			params.set("ev", alert.event_identifier);
		}
		if (alert.source_dark_node_id) {
			params.set("node", alert.source_dark_node_id);
		}
		if (alert.impact_severity_score !== undefined) {
			params.set("severity", alert.impact_severity_score.toString());
		}

		// URL encoding is handled automatically by URLSearchParams
		return `${this.dashboardBaseUrl}${DEEP_LINK_PATHS.ALERT_COVERT_STEAM}?${params.toString()}`;
	}

	/**
	 * Generates link for performance regression alerts
	 *
	 * Per RFC 001: Follows same pattern as covert steam alerts with performance-specific parameters
	 *
	 * @param alert - PerformanceRegressionAlert instance or compatible alert data
	 * @returns RFC-compliant URL
	 * @throws {TypeError} if required parameters are missing
	 */
	generatePerfRegressionLink(alert: {
		regression_id: string;
		detected_at: number;
		endpoint?: string;
		severity?: number;
		source?: string;
	}): string {
		// Validate required fields
		if (!alert.regression_id || alert.detected_at === undefined) {
			throw new TypeError(
				"Missing required alert fields: regression_id and detected_at are required",
			);
		}

		const params = new URLSearchParams();

		// Required parameters (RFC 001 Section 3.1)
		params.set("id", alert.regression_id);
		params.set("type", "perf-regression");
		params.set("ts", alert.detected_at.toString());

		// Optional parameters (RFC 001 Section 3.2)
		if (alert.severity !== undefined) {
			params.set("severity", alert.severity.toString());
		}
		if (alert.source) {
			params.set("source", alert.source);
		}
		if (alert.endpoint) {
			params.set("endpoint", alert.endpoint);
		}

		return `${this.dashboardBaseUrl}${DEEP_LINK_PATHS.ALERT_PERF_REGRESSION}?${params.toString()}`;
	}

	/**
	 * Generate deep-link for URL Anomaly Pattern alert
	 *
	 * @param alert - URL anomaly pattern alert data
	 * @returns Deep-link URL per RFC 001
	 */
	generateUrlAnomalyLink(alert: {
		pattern_id: string;
		detected_at: number;
		bookmaker?: string;
		anomaly_type?: string;
	}): string {
		const params = new URLSearchParams();

		// Required parameters
		params.set("id", alert.pattern_id);
		params.set("type", "url-anomaly");
		params.set("ts", alert.detected_at.toString());

		// Optional parameters
		if (alert.bookmaker) {
			params.set("bm", alert.bookmaker);
		}
		if (alert.anomaly_type) {
			params.set("anomaly_type", alert.anomaly_type);
		}

		return `${this.dashboardBaseUrl}${DEEP_LINK_PATHS.AUDIT_URL_ANOMALY}?${params.toString()}`;
	}

	/**
	 * Generate deep-link for Git commit (changelog)
	 *
	 * @param commit - Git commit data
	 * @returns Deep-link URL to GitHub commit
	 */
	generateCommitLink(commit: {
		hash: string;
		message?: string;
		date?: number;
	}): string {
		// For changelog, link directly to GitHub commit
		// This is a special case - external link rather than dashboard deep-link
		return `https://github.com/brendadeeznuts1111/trader-analyzer-bun/commit/${commit.hash}`;
	}

	/**
	 * Generate deep-link for RSS feed item
	 *
	 * @param item - RSS feed item data
	 * @returns Deep-link URL per RFC 001
	 */
	generateRSSItemLink(item: {
		link: string;
		category?: string;
		pubDate?: string;
	}): string {
		// If item already has a link, use it (external link)
		// Otherwise, generate dashboard deep-link based on category
		if (item.link && item.link.startsWith("http")) {
			return item.link;
		}

		const params = new URLSearchParams();
		const itemId = item.link || `rss-${Date.now()}`;

		params.set("id", itemId);
		params.set("type", item.category || "rss-item");
		if (item.pubDate) {
			const ts = new Date(item.pubDate).getTime();
			params.set("ts", ts.toString());
		} else {
			params.set("ts", Date.now().toString());
		}

		return `${this.dashboardBaseUrl}${DEEP_LINK_PATHS.DASHBOARD}?${params.toString()}`;
	}

	/**
	 * Generate generic alert deep-link
	 *
	 * @param alert - Generic alert data
	 * @returns Deep-link URL per RFC 001
	 */
	generateGenericAlertLink(alert: {
		alert_id: string;
		alert_type: string;
		timestamp: number;
		severity?: number;
		source?: string;
		[key: string]: string | number | undefined;
	}): string {
		const params = new URLSearchParams();

		// Required parameters
		params.set("id", alert.alert_id);
		params.set("type", alert.alert_type);
		params.set("ts", alert.timestamp.toString());

		// Optional parameters
		if (alert.severity !== undefined) {
			params.set("severity", alert.severity.toString());
		}
		if (alert.source) {
			params.set("source", alert.source);
		}

		// Add any additional custom parameters
		for (const [key, value] of Object.entries(alert)) {
			if (
				key !== "alert_id" &&
				key !== "alert_type" &&
				key !== "timestamp" &&
				key !== "severity" &&
				key !== "source" &&
				value !== undefined
			) {
				params.set(key, String(value));
			}
		}

		return `${this.dashboardBaseUrl}${DEEP_LINK_PATHS.ALERT_BASE}?${params.toString()}`;
	}

	/**
	 * Get dashboard base URL
	 *
	 * @returns The configured dashboard base URL
	 */
	getDashboardBaseUrl(): string {
		return this.dashboardBaseUrl;
	}

	/**
	 * Create DeepLinkGenerator from HyperBunUIContext
	 *
	 * Convenience method to create a generator instance from UI context
	 * Automatically converts API base URL to dashboard URL
	 *
	 * @param uiContext - HyperBunUIContext instance
	 * @returns New DeepLinkGenerator instance configured with dashboard URL
	 *
	 * @example
	 * ```typescript
	 * const context = await uiPolicyManager.buildUIContext(request);
	 * const generator = DeepLinkGenerator.fromUIContext(context);
	 * ```
	 */
	static fromUIContext(uiContext: HyperBunUIContext): DeepLinkGenerator {
		return new DeepLinkGenerator(uiContext);
	}
}

/**
 * Default instance of DeepLinkGenerator
 * Uses environment variable or default localhost URL
 */
export const deepLinkGenerator = new DeepLinkGenerator();
