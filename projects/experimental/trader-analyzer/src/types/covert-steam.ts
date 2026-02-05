/**
 * CovertSteamEventRecord interface for Telegram alerts
 *
 * @module types/covert-steam
 * @see {@link ../docs/rfc/001-telegram-deeplink-standard.md#section-4-1|RFC 001 Section 4.1: Covert Steam Alert}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9119400|Section 9.1.1.9.1.4.0: Mandatory Query Parameters}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9119500|Section 9.1.1.9.1.5.0: Optional Context Parameters}
 */

/**
 * CovertSteamEventRecord interface matching DeepLinkGenerator expectations
 *
 * Represents a detected Covert Steam event with all metadata required for
 * Telegram alert generation and deep-link creation.
 *
 * Per section 9.1.1.9.1.4.0: Required fields ensure alert tracking and traceability
 * Per section 9.1.1.9.1.5.0: Optional fields enable intelligent routing and context preservation
 */
export interface CovertSteamEventRecord {
	/**
	 * Unique event identifier - Maps to `id` and `ev` parameters in deep-link
	 * Required per 9.1.1.9.1.4.0
	 * Example: "NFL-2025-001"
	 */
	readonly event_identifier: string;

	/**
	 * Detection timestamp (epoch milliseconds) - Maps to `ts` parameter in deep-link
	 * Required per 9.1.1.9.1.4.0
	 * Represents when the Covert Steam event was detected
	 */
	readonly detection_timestamp: number;

	/**
	 * Bookmaker name where event was detected - Maps to `bm` parameter in deep-link
	 * Optional per 9.1.1.9.1.5.0
	 * Example: "DraftKings", "Betfair", "FanDuel"
	 */
	readonly bookmaker_name?: string;

	/**
	 * Source dark node ID where event originated - Maps to `node` parameter in deep-link
	 * Optional per 9.1.1.9.1.5.0
	 * Identifies the specific market node that detected the covert steam activity
	 */
	readonly source_dark_node_id?: string;

	/**
	 * Impact severity score (0-10) - Maps to `severity` parameter in deep-link
	 * Optional per 9.1.1.9.1.5.0
	 * Determines alert priority and routing (>= 9 = CRITICAL, >= 7 = HIGH, etc.)
	 */
	readonly impact_severity_score?: number;
}

/**
 * Severity level classification for Covert Steam alerts
 * Used for message formatting, routing, and pinning decisions
 */
export type CovertSteamSeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Branded type for severity score validation (0-10 range)
 * Ensures type safety when working with severity scores
 */
export type CovertSteamSeverityScore = number & {
	readonly __brand: "CovertSteamSeverityScore";
};

/**
 * Type guard to validate Covert Steam severity score is in valid range (0-10)
 *
 * @param score - Numeric score to validate
 * @returns True if score is valid (0-10), false otherwise
 *
 * @example
 * ```typescript
 * if (isValidCovertSteamSeverityScore(9.5)) {
 *   // TypeScript knows score is CovertSteamSeverityScore
 * }
 * ```
 */
export function isValidCovertSteamSeverityScore(
	score: number,
): score is CovertSteamSeverityScore {
	return score >= 0 && score <= 10;
}
