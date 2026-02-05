/**
 * Inspectable wrapper classes for Covert Steam types
 *
 * Provides custom Bun.inspect.custom implementations for better debugging
 * and console display of Covert Steam alert objects
 *
 * @module types/covert-steam-inspectable
 */

import type {
	CovertSteamEventRecord,
	CovertSteamSeverityLevel,
} from "./covert-steam";
import {
	getCovertSteamSeverityLevel,
	getCovertSteamSeverityEmoji,
} from "../telegram/covert-steam-alert";

/**
 * Inspectable wrapper for CovertSteamEventRecord
 *
 * Provides custom Bun.inspect.custom implementation for beautiful console output
 *
 * @example
 * ```typescript
 * const alert = new InspectableCovertSteamAlert({
 *   event_identifier: "NFL-2025-001",
 *   detection_timestamp: Date.now(),
 *   bookmaker_name: "DraftKings",
 *   impact_severity_score: 9.5,
 * });
 *
 * console.log(alert);
 * // => CovertSteamAlert {
 * //      event: "NFL-2025-001",
 * //      severity: "9.5 🚨 CRITICAL",
 * //      bookmaker: "DraftKings",
 * //      detected: "2025-01-06T12:00:00.000Z"
 * //    }
 * ```
 */
export class InspectableCovertSteamAlert implements CovertSteamEventRecord {
	readonly event_identifier: string;
	readonly detection_timestamp: number;
	readonly bookmaker_name?: string;
	readonly source_dark_node_id?: string;
	readonly impact_severity_score?: number;

	constructor(alert: CovertSteamEventRecord) {
		this.event_identifier = alert.event_identifier;
		this.detection_timestamp = alert.detection_timestamp;
		this.bookmaker_name = alert.bookmaker_name;
		this.source_dark_node_id = alert.source_dark_node_id;
		this.impact_severity_score = alert.impact_severity_score;
	}

	/**
	 * Custom inspect implementation for Bun.inspect()
	 *
	 * Provides a clean, readable representation of the alert
	 */
	[Bun.inspect.custom](depth: number, options: any): string {
		const severityScore = this.impact_severity_score ?? 0;
		const severityLevel = getCovertSteamSeverityLevel(severityScore);
		const severityEmoji = getCovertSteamSeverityEmoji(severityScore);
		const detectedDate = new Date(this.detection_timestamp).toISOString();

		const parts: string[] = [];
		parts.push(`CovertSteamAlert {`);
		parts.push(`  event: "${this.event_identifier}"`);

		if (this.bookmaker_name) {
			parts.push(`  bookmaker: "${this.bookmaker_name}"`);
		}

		parts.push(
			`  severity: "${severityScore.toFixed(1)} ${severityEmoji} ${severityLevel}"`,
		);
		parts.push(`  detected: "${detectedDate}"`);

		if (this.source_dark_node_id) {
			parts.push(`  node: "${this.source_dark_node_id}"`);
		}

		parts.push(`}`);

		return parts.join("\n");
	}

	/**
	 * Convert back to plain object
	 */
	toJSON(): CovertSteamEventRecord {
		return {
			event_identifier: this.event_identifier,
			detection_timestamp: this.detection_timestamp,
			bookmaker_name: this.bookmaker_name,
			source_dark_node_id: this.source_dark_node_id,
			impact_severity_score: this.impact_severity_score,
		};
	}
}

/**
 * Helper function to create an inspectable alert from a plain record
 *
 * @param alert - Plain CovertSteamEventRecord
 * @returns InspectableCovertSteamAlert with custom inspect
 *
 * @example
 * ```typescript
 * const alert = makeInspectable({
 *   event_identifier: "NFL-2025-001",
 *   detection_timestamp: Date.now(),
 * });
 * console.log(alert); // Uses custom inspect
 * ```
 */
export function makeInspectable(
	alert: CovertSteamEventRecord,
): InspectableCovertSteamAlert {
	return new InspectableCovertSteamAlert(alert);
}

/**
 * Inspectable wrapper for alert send result
 *
 * Provides custom inspect for CovertSteamAlertTelegramSendResult
 */
export class InspectableCovertSteamSendResult {
	readonly ok: boolean;
	readonly messageId?: number;
	readonly error?: string;

	constructor(result: { ok: boolean; messageId?: number; error?: string }) {
		this.ok = result.ok;
		this.messageId = result.messageId;
		this.error = result.error;
	}

	[Bun.inspect.custom](depth: number, options: any): string {
		const parts: string[] = [];
		parts.push(`CovertSteamSendResult {`);
		parts.push(`  ok: ${this.ok}`);

		if (this.ok && this.messageId) {
			parts.push(`  messageId: ${this.messageId}`);
		}

		if (!this.ok && this.error) {
			parts.push(`  error: "${this.error}"`);
		}

		parts.push(`}`);

		return parts.join("\n");
	}
}
