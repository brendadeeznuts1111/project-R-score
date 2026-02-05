/**
 * Formats CovertSteamEvent alerts for Telegram per RFC 001
 *
 * @module telegram/covert-steam-alert
 * @see {@link ../docs/rfc/001-telegram-deeplink-standard.md|RFC 001: Telegram Deep-Link Standard}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9119100|Section 9.1.1.9.1.0.0: Hyper-Bun Alert Deep-Link Standard}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9119200|Section 9.1.1.9.2.0.0: Standard Alert Format & Style Guide}
 *
 * Per section 9.1.1.9.1.7.0: RFC Example Link Generation
 * Per section 9.1.1.9.2.2.0: Message Structure (Template Example)
 */

import type {
	CovertSteamEventRecord,
	CovertSteamSeverityLevel,
} from "../types/covert-steam";
import { DeepLinkGenerator } from "../utils/deeplink-generator";
import {
	COVERT_STEAM_SEVERITY_THRESHOLDS,
	COVERT_STEAM_SEVERITY_LABELS,
	COVERT_STEAM_SEVERITY_EMOJIS,
	COVERT_STEAM_ALERT_MESSAGE_CONSTANTS,
} from "./constants";

/**
 * Formats a CovertSteamEvent alert message for Telegram delivery
 *
 * Creates an HTML-formatted Telegram message with:
 * - Severity-based emoji and header (per 9.1.1.9.2.3.0)
 * - All alert metadata fields (event ID, bookmaker, severity, timestamp, node)
 * - RFC 001-compliant deep-link to dashboard (per 9.1.1.9.1.7.0)
 * - HTML parse mode formatting (per 9.1.1.9.2.1.0)
 *
 * Message structure per 9.1.1.9.2.2.0: Standard Alert Format & Style Guide
 *
 * @param alert - The CovertSteamEventRecord containing all alert metadata
 * @returns HTML-formatted message string ready for Telegram sendMessage() API
 *
 * @example
 * ```typescript
 * const covertSteamAlert: CovertSteamEventRecord = {
 *   event_identifier: "NFL-2025-001",
 *   detection_timestamp: 1704556800000,
 *   bookmaker_name: "DraftKings",
 *   impact_severity_score: 9.5
 * };
 * const telegramMessageHtml = formatCovertSteamAlert(covertSteamAlert);
 * // Returns: "🚨 <b>CRITICAL Covert Steam Alert!</b>\n\n..."
 * ```
 */
export function formatCovertSteamAlert(alert: CovertSteamEventRecord): string {
	// Generate deep-link per 9.1.1.9.1.7.0
	const deepLinkGenerator = new DeepLinkGenerator();
	const deepLinkUrl = deepLinkGenerator.generateCovertSteamLink(alert);

	// Get severity emoji and level per 9.1.1.9.2.3.0
	const alertSeverityScore = alert.impact_severity_score ?? 0;
	const alertSeverityEmoji = getCovertSteamSeverityEmoji(alertSeverityScore);
	const alertSeverityLevel = getCovertSteamSeverityLevel(alertSeverityScore);

	// Format message per 9.1.1.9.2.2.0 using HTML parse mode (9.1.1.9.2.1.0)
	const messageParts: string[] = [];

	// Header with emoji and severity level
	const alertHeaderText = `${alertSeverityEmoji} <b>${alertSeverityLevel} ${COVERT_STEAM_ALERT_MESSAGE_CONSTANTS.ALERT_HEADER_SUFFIX}</b>`;
	messageParts.push(alertHeaderText);
	messageParts.push(""); // Empty line for visual spacing

	// Event identifier (required field per 9.1.1.9.1.4.0)
	const escapedEventIdentifier = escapeHtml(alert.event_identifier);
	messageParts.push(`<b>Event:</b> <code>${escapedEventIdentifier}</code>`);

	// Bookmaker name (optional field per 9.1.1.9.1.5.0)
	if (alert.bookmaker_name) {
		const escapedBookmakerName = escapeHtml(alert.bookmaker_name);
		messageParts.push(`<b>Bookmaker:</b> <code>${escapedBookmakerName}</code>`);
	}

	// Severity score display (optional field per 9.1.1.9.1.5.0)
	if (alert.impact_severity_score !== undefined) {
		const severityScoreDisplay = `${alert.impact_severity_score}/${COVERT_STEAM_ALERT_MESSAGE_CONSTANTS.SEVERITY_SCALE_MAXIMUM}`;
		messageParts.push(`<b>Severity:</b> <code>${severityScoreDisplay}</code>`);
	}

	// Detection timestamp (required field per 9.1.1.9.1.4.0)
	const detectionTimestampIso = new Date(
		alert.detection_timestamp,
	).toISOString();
	messageParts.push(`<b>Detected:</b> <code>${detectionTimestampIso}</code>`);

	// Source dark node ID (optional field per 9.1.1.9.1.5.0)
	if (alert.source_dark_node_id) {
		const escapedNodeId = escapeHtml(alert.source_dark_node_id);
		messageParts.push(`<b>Node:</b> <code>${escapedNodeId}</code>`);
	}

	messageParts.push(""); // Empty line before deep-link for visual separation

	// Deep-link anchor per RFC 001 Section 5.1: Telegram HTML Format
	const deepLinkAnchorHtml = `<a href="${deepLinkUrl}">${COVERT_STEAM_ALERT_MESSAGE_CONSTANTS.DEEP_LINK_ANCHOR_TEXT}</a>`;
	messageParts.push(deepLinkAnchorHtml);

	// Add Mini App link for direct TMA access (per section 9.1.1.11.0.0.0)
	const miniappBaseUrl =
		process.env.MINIAPP_URL ||
		"https://staging.factory-wager-miniapp.pages.dev";
	const miniappDeepLink = `${miniappBaseUrl}/alert/covert-steam/?${new URL(deepLinkUrl).search}`;
	messageParts.push(`<a href="${miniappDeepLink}">Open in Mini App</a>`);

	return messageParts.join("\n");
}

/**
 * Determines Covert Steam alert severity level from numeric score
 *
 * Classifies severity score into one of four levels based on thresholds:
 * - CRITICAL: >= 9 (highest priority, auto-pinned)
 * - HIGH: >= 7 and < 9 (high priority routing)
 * - MEDIUM: >= 5 and < 7 (standard routing)
 * - LOW: < 5 (low priority routing)
 *
 * @param severityScore - Numeric severity score (0-10) from CovertSteamEventRecord
 * @returns Severity level label string for message formatting
 *
 * @example
 * ```typescript
 * getCovertSteamSeverityLevel(9.5); // Returns "CRITICAL"
 * getCovertSteamSeverityLevel(7.2); // Returns "HIGH"
 * getCovertSteamSeverityLevel(5.0);  // Returns "MEDIUM"
 * getCovertSteamSeverityLevel(3.5); // Returns "LOW"
 * ```
 */
export function getCovertSteamSeverityLevel(
	severityScore: number,
): CovertSteamSeverityLevel {
	if (severityScore >= COVERT_STEAM_SEVERITY_THRESHOLDS.CRITICAL) {
		return COVERT_STEAM_SEVERITY_LABELS.CRITICAL;
	} else if (severityScore >= COVERT_STEAM_SEVERITY_THRESHOLDS.HIGH) {
		return COVERT_STEAM_SEVERITY_LABELS.HIGH;
	} else if (severityScore >= COVERT_STEAM_SEVERITY_THRESHOLDS.MEDIUM) {
		return COVERT_STEAM_SEVERITY_LABELS.MEDIUM;
	} else {
		return COVERT_STEAM_SEVERITY_LABELS.LOW;
	}
}

/**
 * Returns emoji for Covert Steam alert based on severity score
 *
 * Per section 9.1.1.9.2.3.0: Emoji Usage Guidelines
 * Maps severity score to appropriate emoji for visual alert priority indication
 *
 * @param severityScore - Numeric severity score (0-10) from CovertSteamEventRecord
 * @returns Emoji string for Telegram message header
 *
 * @example
 * ```typescript
 * getCovertSteamSeverityEmoji(9.5); // Returns "🚨" (CRITICAL)
 * getCovertSteamSeverityEmoji(7.2); // Returns "⚠️" (HIGH)
 * getCovertSteamSeverityEmoji(5.0); // Returns "📈" (MEDIUM)
 * getCovertSteamSeverityEmoji(3.5); // Returns "📊" (LOW)
 * ```
 */
export function getCovertSteamSeverityEmoji(severityScore: number): string {
	const severityLevel = getCovertSteamSeverityLevel(severityScore);
	return COVERT_STEAM_SEVERITY_EMOJIS[severityLevel];
}

/**
 * Escapes HTML special characters for safe inclusion in HTML-formatted messages
 *
 * @param text - Text to escape
 * @returns Escaped text safe for HTML
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
