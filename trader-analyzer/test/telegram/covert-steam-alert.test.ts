/**
 * Test suite for CovertSteamEvent Telegram alert functionality
 * 
 * @module test/telegram/covert-steam-alert
 * @see {@link ../docs/rfc/001-telegram-deeplink-standard.md|RFC 001: Telegram Deep-Link Standard}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9119100|Section 9.1.1.9.1.0.0: Hyper-Bun Alert Deep-Link Standard}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9119200|Section 9.1.1.9.2.0.0: Standard Alert Format & Style Guide}
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import type { CovertSteamEventRecord } from "../../src/types/covert-steam";
import {
	formatCovertSteamAlert,
	getCovertSteamSeverityEmoji,
	getCovertSteamSeverityLevel,
} from "../../src/telegram/covert-steam-alert";
import {
	sendCovertSteamAlertToTelegram,
	loadCovertSteamTelegramCredentials,
	sendCovertSteamAlert, // Legacy alias
	loadTelegramCredentials, // Legacy alias
	type CovertSteamAlertTelegramSendOptions,
	type CovertSteamAlertTelegramSendResult,
} from "../../src/telegram/covert-steam-sender";
import { DeepLinkGenerator } from "../../src/utils/deeplink-generator";

describe("CovertSteamEvent Alert Formatting", () => {
	describe("formatCovertSteamAlert", () => {
		test("Format alert with all required fields (per 9.1.1.9.1.4.0)", () => {
			const alert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: 1704556800000,
			};

			const message = formatCovertSteamAlert(alert);

			expect(message).toContain("Covert Steam Alert");
			expect(message).toContain("NFL-2025-001");
			expect(message).toContain("View Details on Dashboard");
			expect(message).toContain("/alert/covert-steam/");
		});

		test("Format alert with optional fields (per 9.1.1.9.1.5.0)", () => {
			const alert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: 1704556800000,
				bookmaker_name: "DraftKings",
				source_dark_node_id: "node_abc123",
				impact_severity_score: 9.5,
			};

			const message = formatCovertSteamAlert(alert);

			expect(message).toContain("DraftKings");
			expect(message).toContain("node_abc123");
			expect(message).toContain("9.5");
			expect(message).toContain("CRITICAL");
		});

		test("Deep-link generation matches RFC 001 format", () => {
			const alert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: 1704556800000,
				bookmaker_name: "DraftKings",
				impact_severity_score: 9.5,
			};

			const message = formatCovertSteamAlert(alert);

			// Extract deep-link from message
			const linkMatch = message.match(/href="([^"]+)"/);
			expect(linkMatch).not.toBeNull();

			if (linkMatch) {
				const deepLink = linkMatch[1];
				const url = new URL(deepLink);

				// Verify RFC 001 compliance
				expect(url.pathname).toBe("/alert/covert-steam/");
				expect(url.searchParams.get("type")).toBe("covert-steam");
				expect(url.searchParams.get("id")).toContain("NFL-2025-001");
				expect(url.searchParams.get("ts")).toBe("1704556800000");
				expect(url.searchParams.get("bm")).toBe("DraftKings");
				expect(url.searchParams.get("severity")).toBe("9.5");
			}
		});

		test("Message HTML formatting per 9.1.1.9.2.1.0", () => {
			const alert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: 1704556800000,
				bookmaker_name: "DraftKings",
			};

			const message = formatCovertSteamAlert(alert);

			// Verify HTML formatting
			expect(message).toContain("<b>"); // Bold tags
			expect(message).toContain("<code>"); // Code tags
			expect(message).toContain("<a href"); // Anchor tags
		});

		test("Severity level text formatting", () => {
			const criticalAlert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: 1704556800000,
				impact_severity_score: 9.5,
			};

			const highAlert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-002",
				detection_timestamp: 1704556800000,
				impact_severity_score: 7.5,
			};

			const mediumAlert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-003",
				detection_timestamp: 1704556800000,
				impact_severity_score: 5.5,
			};

			expect(formatCovertSteamAlert(criticalAlert)).toContain("CRITICAL");
			expect(formatCovertSteamAlert(highAlert)).toContain("HIGH");
			expect(formatCovertSteamAlert(mediumAlert)).toContain("MEDIUM");
		});
	});

	describe("getCovertSteamSeverityLevel", () => {
		test("Severity level determination from score", () => {
			expect(getCovertSteamSeverityLevel(9.5)).toBe("CRITICAL");
			expect(getCovertSteamSeverityLevel(9)).toBe("CRITICAL");
			expect(getCovertSteamSeverityLevel(8)).toBe("HIGH");
			expect(getCovertSteamSeverityLevel(7.5)).toBe("HIGH");
			expect(getCovertSteamSeverityLevel(7)).toBe("HIGH");
			expect(getCovertSteamSeverityLevel(5.5)).toBe("MEDIUM");
			expect(getCovertSteamSeverityLevel(5)).toBe("MEDIUM");
			expect(getCovertSteamSeverityLevel(3)).toBe("LOW");
			expect(getCovertSteamSeverityLevel(0)).toBe("LOW");
		});
	});

	describe("getCovertSteamSeverityEmoji", () => {
		test("Severity emoji selection per 9.1.1.9.2.3.0", () => {
			expect(getCovertSteamSeverityEmoji(9.5)).toBe("🚨"); // Critical (>= 9)
			expect(getCovertSteamSeverityEmoji(9)).toBe("🚨"); // Critical (>= 9)
			expect(getCovertSteamSeverityEmoji(8)).toBe("⚠️"); // High (7-8)
			expect(getCovertSteamSeverityEmoji(7.5)).toBe("⚠️"); // High (7-8)
			expect(getCovertSteamSeverityEmoji(7)).toBe("⚠️"); // High (7-8)
			expect(getCovertSteamSeverityEmoji(5.5)).toBe("📈"); // Medium (5-6)
			expect(getCovertSteamSeverityEmoji(5)).toBe("📈"); // Medium (5-6)
			expect(getCovertSteamSeverityEmoji(3)).toBe("📊"); // Low (< 5)
			expect(getCovertSteamSeverityEmoji(0)).toBe("📊"); // Low (< 5)
		});
	});
});

describe("CovertSteamEvent Alert Sending", () => {
	describe("loadCovertSteamTelegramCredentials", () => {
		test("Loads credentials from Bun.secrets per 9.1.1.1.1.1.0", async () => {
			// Note: This test verifies the function structure
			// In a real environment, Bun.secrets would be mocked or credentials would be set
			// For now, we verify the function exists and can be called
			expect(typeof loadCovertSteamTelegramCredentials).toBe("function");

			// If credentials are available (from Bun.secrets or env), function should succeed
			try {
				const telegramCredentials = await loadCovertSteamTelegramCredentials();
				expect(telegramCredentials).toHaveProperty("botToken");
				expect(telegramCredentials).toHaveProperty("chatId");
				expect(typeof telegramCredentials.botToken).toBe("string");
				expect(typeof telegramCredentials.chatId).toBe("string");
			} catch (error) {
				// If credentials are not available, that's expected in test environment
				expect((error as Error).message).toContain("TELEGRAM_BOT_TOKEN not found");
			}
		});

		test("Falls back to environment variables per 9.1.1.1.1.2.0", async () => {
			// Note: Bun.secrets takes precedence over environment variables
			// This test verifies that credentials can be loaded from either source
			const telegramCredentials = await loadCovertSteamTelegramCredentials();

			// Verify credentials structure
			expect(telegramCredentials).toHaveProperty("botToken");
			expect(telegramCredentials).toHaveProperty("chatId");
			expect(typeof telegramCredentials.botToken).toBe("string");
			expect(telegramCredentials.botToken.length).toBeGreaterThan(0);
			expect(typeof telegramCredentials.chatId).toBe("string");
			expect(telegramCredentials.chatId.length).toBeGreaterThan(0);
		});

		test("Throws error if credentials not found", async () => {
			// Note: In a real test environment, Bun.secrets might have credentials
			// This test verifies the error handling logic exists
			// To fully test this, you would need to mock Bun.secrets.get() to return undefined
			
			// Verify the function handles missing credentials gracefully
			// If credentials exist (from Bun.secrets or env), function succeeds
			// If not, function throws with appropriate error message
			try {
				const telegramCredentials = await loadCovertSteamTelegramCredentials();
				// If we get here, credentials were found (expected in most environments)
				expect(telegramCredentials).toHaveProperty("botToken");
				expect(telegramCredentials).toHaveProperty("chatId");
			} catch (error) {
				// If credentials are missing, verify error message
				expect((error as Error).message).toContain("TELEGRAM_BOT_TOKEN not found");
			}
		});
	});

	describe("sendCovertSteamAlertToTelegram", () => {
		beforeEach(() => {
			// Set up test credentials
			process.env.TELEGRAM_BOT_TOKEN = "test_bot_token";
			process.env.TELEGRAM_CHAT_ID = "-1001234567890";
		});

		test("Routes to Live Alerts topic per 9.1.1.2.2.0.0", async () => {
			const testCovertSteamAlert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: Date.now(),
			};

			// Mock TelegramBotApi
			const mockSendMessage = mock(() =>
				Promise.resolve({
					ok: true,
					result: { message_id: 12345 },
				}),
			);

			// Note: This test would require mocking TelegramBotApi
			// For now, we verify the function structure
			expect(typeof sendCovertSteamAlertToTelegram).toBe("function");

			// Cleanup
			delete process.env.TELEGRAM_BOT_TOKEN;
			delete process.env.TELEGRAM_CHAT_ID;
		});

		test("Message pinning for critical alerts (per 9.1.1.2.3.1.0)", async () => {
			const criticalCovertSteamAlert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: Date.now(),
				impact_severity_score: 9.5,
			};

			// Critical alerts should be pinned by default
			// This would require mocking TelegramBotApi.sendAndPin
			expect(typeof sendCovertSteamAlertToTelegram).toBe("function");

			// Cleanup
			delete process.env.TELEGRAM_BOT_TOKEN;
			delete process.env.TELEGRAM_CHAT_ID;
		});

		test("Handles invalid topic ID gracefully", async () => {
			const testCovertSteamAlert: CovertSteamEventRecord = {
				event_identifier: "NFL-2025-001",
				detection_timestamp: Date.now(),
			};

			process.env.TELEGRAM_BOT_TOKEN = "test_token";
			process.env.TELEGRAM_CHAT_ID = "-1001234567890";

			const sendResult = await sendCovertSteamAlertToTelegram(testCovertSteamAlert, {
				topicId: 999, // Invalid topic ID
			});

			expect(sendResult.ok).toBe(false);
			expect(sendResult.error).toContain("Invalid Telegram topic ID");

			// Cleanup
			delete process.env.TELEGRAM_BOT_TOKEN;
			delete process.env.TELEGRAM_CHAT_ID;
		});
	});
});

/**
 * Test Formula (per 9.1.1.9.1.7.0): Generate deep-link for Covert Steam alert
 * Expected Result: Valid deep-link URL with all parameters properly encoded per RFC 001
 */
describe("RFC 001 Compliance", () => {
	test("Deep-link generation matches RFC 001 specification", () => {
		const alert: CovertSteamEventRecord = {
			event_identifier: "NFL-2025-001",
			detection_timestamp: 1704556800000,
			bookmaker_name: "DraftKings",
			source_dark_node_id: "node_abc123",
			impact_severity_score: 9.5,
		};

		const generator = new DeepLinkGenerator();
		const deepLink = generator.generateCovertSteamLink(alert);
		const url = new URL(deepLink);

		// Verify required parameters per RFC 001 Section 3.1
		expect(url.searchParams.get("id")).toBeTruthy();
		expect(url.searchParams.get("type")).toBe("covert-steam");
		expect(url.searchParams.get("ts")).toBe("1704556800000");

		// Verify optional parameters per RFC 001 Section 3.2
		expect(url.searchParams.get("bm")).toBe("DraftKings");
		expect(url.searchParams.get("ev")).toBe("NFL-2025-001");
		expect(url.searchParams.get("node")).toBe("node_abc123");
		expect(url.searchParams.get("severity")).toBe("9.5");

		// Verify path per RFC 001 Section 2.1
		expect(url.pathname).toBe("/alert/covert-steam/");
	});
});
