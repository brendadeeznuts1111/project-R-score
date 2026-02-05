/**
 * Sends CovertSteamEvent alerts to Telegram per RFC 001
 *
 * @module telegram/covert-steam-sender
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9111000|Section 9.1.1.10.0.0.0: Dedicated Message Routing & Prioritization Service}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112200|Section 9.1.1.2.2.0.0: Dynamic Topic Creation & Management}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112310|Section 9.1.1.2.3.1.0: Message Pinning}
 */

import type { CovertSteamEventRecord } from "../types/covert-steam";
import { TelegramBotApi } from "../api/telegram-ws";
import { formatCovertSteamAlert } from "./covert-steam-alert";
import { getThreadId } from "./topic-mapping";
import {
	TELEGRAM_SECRETS,
	COVERT_STEAM_DEFAULT_TOPIC_ID,
	COVERT_STEAM_SEVERITY_THRESHOLDS,
} from "./constants";

/**
 * Configuration options for sending CovertSteamEvent alerts to Telegram
 *
 * Controls message routing, pinning behavior, and delivery preferences
 * for Covert Steam alert notifications
 */
export interface CovertSteamAlertTelegramSendOptions {
	/**
	 * Whether to pin the message in the Telegram topic (per 9.1.1.2.3.1.0)
	 *
	 * Defaults to true if alert severity >= CRITICAL threshold (9)
	 * Pinned messages remain visible at the top of the topic for immediate attention
	 */
	readonly pinMessage?: boolean;

	/**
	 * Telegram topic ID (logical ID) to route alert to (per 9.1.1.2.2.0.0)
	 *
	 * Defaults to Live Alerts topic (topic ID 2 → thread ID 91)
	 * Can be numeric ID (2) or string identifier ("live-alerts")
	 */
	readonly topicId?: number | string;
}

/**
 * Result of sending a CovertSteamEvent alert to Telegram
 *
 * Contains success status, message ID for tracking, and error details if failed
 */
export interface CovertSteamAlertTelegramSendResult {
	/**
	 * Whether the Telegram message was sent successfully
	 * True if message was delivered, false if error occurred
	 */
	readonly ok: boolean;

	/**
	 * Telegram message ID if sent successfully
	 * Used for message tracking, pinning, editing, or deletion operations
	 */
	readonly messageId?: number;

	/**
	 * Error description if sending failed
	 * Provides details about why the alert delivery failed (e.g., invalid credentials, topic not found)
	 */
	readonly error?: string;
}

/**
 * Telegram bot credentials loaded from secure storage
 *
 * Contains bot token and chat ID required for Telegram Bot API authentication
 * Loaded from Bun.secrets (preferred) or environment variables (fallback)
 */
interface CovertSteamTelegramBotCredentials {
	/**
	 * Telegram bot token for API authentication
	 * Obtained from @BotFather when creating the bot
	 */
	readonly botToken: string;

	/**
	 * Telegram chat ID (supergroup ID) where alerts are sent
	 * Negative number format: -1001234567890
	 */
	readonly chatId: string;
}

/**
 * Loads Telegram bot credentials for Covert Steam alert delivery
 *
 * Credential loading priority (per 9.1.1.1.1.1.0 and 9.1.1.1.1.2.0):
 * 1. Bun.secrets (preferred, secure OS-native storage)
 * 2. Environment variables (fallback for development/CI)
 *
 * @returns Telegram bot credentials (botToken and chatId)
 * @throws {Error} if credentials are not available in either source
 *
 * @example
 * ```typescript
 * const telegramCredentials = await loadCovertSteamTelegramCredentials();
 * // Returns { botToken: "123456:ABC...", chatId: "-1001234567890" }
 * ```
 */
export async function loadCovertSteamTelegramCredentials(): Promise<CovertSteamTelegramBotCredentials> {
	// Try Bun.secrets first (per 9.1.1.1.1.1.0)
	let botToken: string | undefined;
	let chatId: string | undefined;

	try {
		// Bun.secrets is async in Bun 1.3+
		if (typeof Bun !== "undefined" && Bun.secrets) {
			botToken = await Bun.secrets.get({
				service: TELEGRAM_SECRETS.SERVICE,
				name: TELEGRAM_SECRETS.BOT_TOKEN,
			});
			chatId = await Bun.secrets.get({
				service: TELEGRAM_SECRETS.SERVICE,
				name: TELEGRAM_SECRETS.CHAT_ID,
			});
		}
	} catch (error) {
		// Bun.secrets might not be available, fall back to env vars
		console.warn(
			"⚠️  Bun.secrets not available, falling back to environment variables",
		);
	}

	// Fallback to environment variables per 9.1.1.1.1.2.0
	botToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
	chatId = chatId || process.env.TELEGRAM_CHAT_ID;

	if (!botToken) {
		throw new Error(
			"TELEGRAM_BOT_TOKEN not found in Bun.secrets or environment variables. " +
				"Please set it using: bun secret set TELEGRAM_BOT_TOKEN 'your_token'",
		);
	}

	if (!chatId) {
		throw new Error(
			"TELEGRAM_CHAT_ID not found in Bun.secrets or environment variables. " +
				"Please set it using: bun secret set TELEGRAM_CHAT_ID 'your_chat_id'",
		);
	}

	return { botToken, chatId };
}

/**
 * Sends a CovertSteamEvent alert to Telegram supergroup
 *
 * Complete alert delivery pipeline:
 * 1. Formats alert message using formatCovertSteamAlert() per 9.1.1.9.2.0.0
 * 2. Routes to specified Telegram topic per 9.1.1.10.2.0.0 (defaults to Live Alerts)
 * 3. Optionally pins message if severity >= CRITICAL threshold per 9.1.1.2.3.1.0
 * 4. Returns result with message ID for tracking
 *
 * @param covertSteamAlert - The CovertSteamEventRecord containing all alert metadata
 * @param sendOptions - Optional configuration for message routing and pinning behavior
 * @returns Result indicating success/failure, message ID, and error details
 *
 * @example
 * ```typescript
 * const detectedCovertSteamEvent: CovertSteamEventRecord = {
 *   event_identifier: "NFL-2025-001",
 *   detection_timestamp: Date.now(),
 *   bookmaker_name: "DraftKings",
 *   impact_severity_score: 9.5
 * };
 *
 * const sendResult = await sendCovertSteamAlertToTelegram(detectedCovertSteamEvent, {
 *   pinMessage: true,
 *   topicId: 2 // Live Alerts topic
 * });
 *
 * if (sendResult.ok) {
 *   console.log(`Covert Steam alert sent with message ID: ${sendResult.messageId}`);
 * } else {
 *   console.error(`Failed to send alert: ${sendResult.error}`);
 * }
 * ```
 */
export async function sendCovertSteamAlertToTelegram(
	covertSteamAlert: CovertSteamEventRecord,
	sendOptions: CovertSteamAlertTelegramSendOptions = {},
): Promise<CovertSteamAlertTelegramSendResult> {
	try {
		// Load Telegram bot credentials per 9.1.1.1.1.1.0
		const telegramBotCredentials = await loadCovertSteamTelegramCredentials();

		// Format alert message per 9.1.1.9.2.0.0
		const formattedTelegramMessage = formatCovertSteamAlert(covertSteamAlert);

		// Determine target Telegram topic/thread ID per 9.1.1.2.2.0.0
		const targetTelegramTopicId =
			sendOptions.topicId ?? COVERT_STEAM_DEFAULT_TOPIC_ID;
		const targetTelegramThreadId = getThreadId(targetTelegramTopicId);

		if (targetTelegramThreadId === undefined) {
			return {
				ok: false,
				error: `Invalid Telegram topic ID: ${targetTelegramTopicId}. Topic mapping not found in topic-mapping.ts`,
			};
		}

		// Create Telegram Bot API client instance
		const telegramBotApiClient = new TelegramBotApi(
			telegramBotCredentials.botToken,
		);

		// Determine if message should be pinned per 9.1.1.2.3.1.0
		const shouldPinTelegramMessage =
			sendOptions.pinMessage !== undefined
				? sendOptions.pinMessage
				: (covertSteamAlert.impact_severity_score ?? 0) >=
					COVERT_STEAM_SEVERITY_THRESHOLDS.CRITICAL;

		// Send message to Telegram
		if (shouldPinTelegramMessage) {
			// Use sendAndPin for critical alerts per 9.1.1.2.3.1.0
			const telegramPinResult = await telegramBotApiClient.sendAndPin(
				telegramBotCredentials.chatId,
				formattedTelegramMessage,
				targetTelegramThreadId,
			);

			if (telegramPinResult.ok) {
				return {
					ok: true,
					messageId: telegramPinResult.messageId,
				};
			} else {
				return {
					ok: false,
					error:
						telegramPinResult.error ||
						"Failed to send and pin Covert Steam alert message",
				};
			}
		} else {
			// Regular send per 9.1.1.2.2.0.0
			const telegramSendResult = await telegramBotApiClient.sendMessage(
				telegramBotCredentials.chatId,
				formattedTelegramMessage,
				targetTelegramThreadId,
			);

			if (telegramSendResult.ok && telegramSendResult.result?.message_id) {
				return {
					ok: true,
					messageId: telegramSendResult.result.message_id,
				};
			} else {
				return {
					ok: false,
					error:
						telegramSendResult.description ||
						"Failed to send Covert Steam alert message",
				};
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(
			"❌ Failed to send CovertSteamEvent alert to Telegram:",
			errorMessage,
		);
		return {
			ok: false,
			error: errorMessage,
		};
	}
}

/**
 * @deprecated Use sendCovertSteamAlertToTelegram() instead
 * Legacy function name maintained for backward compatibility
 */
export const sendCovertSteamAlert = sendCovertSteamAlertToTelegram;

/**
 * @deprecated Use loadCovertSteamTelegramCredentials() instead
 * Legacy function name maintained for backward compatibility
 */
export const loadTelegramCredentials = loadCovertSteamTelegramCredentials;
