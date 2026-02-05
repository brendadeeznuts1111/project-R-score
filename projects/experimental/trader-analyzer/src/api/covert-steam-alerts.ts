/**
 * Covert Steam Alert API Endpoints for Telegram Mini App
 *
 * @module api/covert-steam-alerts
 * @see {@link ../docs/rfc/001-telegram-deeplink-standard.md|RFC 001: Telegram Deep-Link Standard}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9111100|Section 9.1.1.11.0.0.0: Telegram Mini App (TMA)}
 */

import type { Context } from "hono";

import { COVERT_STEAM_DEFAULT_TOPIC_ID } from "../telegram/constants";
import { sendCovertSteamAlertToTelegram } from "../telegram/covert-steam-sender";
import type { CovertSteamEventRecord } from "../types/covert-steam";
import type { TMAAlertListResponse } from "../types/tma";
import { DeepLinkGenerator } from "../utils/deeplink-generator";

/**
 * In-memory alert storage for TMA (in production, use database)
 */
const alertStorage = new Map<
	string,
	CovertSteamEventRecord & { sentAt: number; messageId?: number }
>();

/**
 * GET /api/miniapp/alerts/covert-steam
 * Get list of Covert Steam alerts for TMA display
 *
 * Per section 9.1.1.11.2.3.0: Dynamic Alert Management & Action
 */
export async function getCovertSteamAlertsForTMA(
	c: Context,
): Promise<Response> {
	try {
		const severityFilter = c.req.query("severity")
			? parseFloat(c.req.query("severity") || "0")
			: undefined;
		const bookmakerFilter = c.req.query("bookmaker");
		const limit = c.req.query("limit")
			? parseInt(c.req.query("limit") || "50", 10)
			: 50;
		const _acknowledged = c.req.query("acknowledged") === "true"; // TODO: Implement acknowledgment filtering

		const deepLinkGenerator = new DeepLinkGenerator();
		const alerts = Array.from(alertStorage.values())
			.filter((alert) => {
				if (
					severityFilter !== undefined &&
					(alert.impact_severity_score ?? 0) < severityFilter
				) {
					return false;
				}
				if (bookmakerFilter && alert.bookmaker_name !== bookmakerFilter) {
					return false;
				}
				return true;
			})
			.sort((a, b) => b.detection_timestamp - a.detection_timestamp)
			.slice(0, limit)
			.map((alert) => {
				const deepLink = deepLinkGenerator.generateCovertSteamLink(alert);
				return {
					id: `${alert.event_identifier}-${alert.detection_timestamp}`,
					type: "covert-steam" as const,
					severity: alert.impact_severity_score ?? 0,
					title: `Covert Steam Alert: ${alert.event_identifier}`,
					description: `Detected on ${alert.bookmaker_name || "Unknown"} at ${new Date(alert.detection_timestamp).toISOString()}`,
					bookmaker: alert.bookmaker_name,
					event_identifier: alert.event_identifier,
					market_node_id: alert.source_dark_node_id,
					timestamp: alert.detection_timestamp,
					acknowledged: false, // TODO: Implement acknowledgment tracking
					deep_link: deepLink,
				};
			});

		const response: TMAAlertListResponse = {
			alerts,
			total: alerts.length,
			filters: {
				severity: severityFilter,
				bookmaker: bookmakerFilter,
				type: "covert-steam",
			},
		};

		return c.json(response);
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to fetch alerts",
			},
			500,
		);
	}
}

/**
 * POST /api/miniapp/alerts/covert-steam
 * Create and send a new Covert Steam alert
 */
export async function createCovertSteamAlertForTMA(
	c: Context,
): Promise<Response> {
	try {
		const body = await c.req.json();
		const {
			event_identifier,
			detection_timestamp,
			bookmaker_name,
			source_dark_node_id,
			impact_severity_score,
			topicId,
			pinMessage,
		} = body;

		if (!event_identifier || !detection_timestamp) {
			return c.json(
				{
					error:
						"Missing required fields: event_identifier and detection_timestamp are required",
				},
				400,
			);
		}

		const covertSteamAlert: CovertSteamEventRecord = {
			event_identifier,
			detection_timestamp,
			bookmaker_name,
			source_dark_node_id,
			impact_severity_score,
		};

		// Send to Telegram
		const sendResult = await sendCovertSteamAlertToTelegram(covertSteamAlert, {
			topicId: topicId ?? COVERT_STEAM_DEFAULT_TOPIC_ID,
			pinMessage,
		});

		if (!sendResult.ok) {
			return c.json(
				{
					error: sendResult.error || "Failed to send alert",
				},
				500,
			);
		}

		// Store alert
		const alertId = `${event_identifier}-${detection_timestamp}`;
		alertStorage.set(alertId, {
			...covertSteamAlert,
			sentAt: Date.now(),
			messageId: sendResult.messageId,
		});

		return c.json({
			success: true,
			alert: {
				id: alertId,
				messageId: sendResult.messageId,
				deepLink: new DeepLinkGenerator().generateCovertSteamLink(
					covertSteamAlert,
				),
			},
		});
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to create alert",
			},
			500,
		);
	}
}

/**
 * GET /api/miniapp/alerts/covert-steam/:id
 * Get a specific Covert Steam alert by ID
 */
export async function getCovertSteamAlertById(c: Context): Promise<Response> {
	try {
		const alertId = c.req.param("id");
		const alert = alertStorage.get(alertId);

		if (!alert) {
			return c.json(
				{
					error: "Alert not found",
				},
				404,
			);
		}

		const deepLinkGenerator = new DeepLinkGenerator();
		const deepLink = deepLinkGenerator.generateCovertSteamLink(alert);

		return c.json({
			alert: {
				...alert,
				id: alertId,
				deepLink,
			},
		});
	} catch (error) {
		return c.json(
			{
				error: error instanceof Error ? error.message : "Failed to fetch alert",
			},
			500,
		);
	}
}

/**
 * GET /api/miniapp/alerts/covert-steam/stats
 * Get statistics about Covert Steam alerts
 */
export async function getCovertSteamAlertStats(c: Context): Promise<Response> {
	try {
		const alerts = Array.from(alertStorage.values());
		const totalAlerts = alerts.length;
		const criticalAlerts = alerts.filter(
			(a) => (a.impact_severity_score ?? 0) >= 9,
		).length;
		const highAlerts = alerts.filter((a) => {
			const score = a.impact_severity_score ?? 0;
			return score >= 7 && score < 9;
		}).length;
		const byBookmaker = new Map<string, number>();

		for (const alert of alerts) {
			const bookmaker = alert.bookmaker_name || "Unknown";
			byBookmaker.set(bookmaker, (byBookmaker.get(bookmaker) || 0) + 1);
		}

		return c.json({
			total: totalAlerts,
			bySeverity: {
				critical: criticalAlerts,
				high: highAlerts,
				medium: alerts.filter((a) => {
					const score = a.impact_severity_score ?? 0;
					return score >= 5 && score < 7;
				}).length,
				low: alerts.filter((a) => (a.impact_severity_score ?? 0) < 5).length,
			},
			byBookmaker: Object.fromEntries(byBookmaker),
			recentAlerts: alerts
				.sort((a, b) => b.detection_timestamp - a.detection_timestamp)
				.slice(0, 10)
				.map((a) => ({
					id: `${a.event_identifier}-${a.detection_timestamp}`,
					event_identifier: a.event_identifier,
					bookmaker_name: a.bookmaker_name,
					severity: a.impact_severity_score ?? 0,
					timestamp: a.detection_timestamp,
				})),
		});
	} catch (error) {
		return c.json(
			{
				error: error instanceof Error ? error.message : "Failed to fetch stats",
			},
			500,
		);
	}
}
