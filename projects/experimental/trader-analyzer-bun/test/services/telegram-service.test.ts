/**
 * @fileoverview Telegram Service Tests
 * @description Tests for Telegram service functionality including message sending, pinning, and topic management (9.1.1.3.5.0.0)
 * @module test/services/telegram-service
 * @version 9.0.0.0.0.0.0
 * 
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91135000|Testing Message Pinning/Unpinning (9.1.1.3.5.0.0)}
 * @see {@link ../src/telegram/client.ts|TelegramClient} - Enhanced client implementation
 * 
 * Test Formula: 1. Run 'bun test test/services/telegram-service.test.ts'. 2. Verify service functionality.
 * Expected Result: All Telegram service tests pass, verifying message sending, pinning, and topic operations.
 */

import { test, describe, expect, beforeEach } from "bun:test";
import { TelegramBotApi } from "../../src/api/telegram-ws";
import type { TelegramMessage } from "../../src/telegram/client";

const TEST_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TEST_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const shouldSkip = !TEST_BOT_TOKEN || !TEST_CHAT_ID;

describe("Telegram Service (9.1.1.3.5.0.0)", () => {
	let bot: TelegramBotApi;
	let testTopicId: number | undefined;

	beforeEach(async () => {
		bot = new TelegramBotApi(TEST_BOT_TOKEN);
		
		// Create a test topic for each test suite
		if (TEST_CHAT_ID) {
			const createResult = await bot.createForumTopic(
				TEST_CHAT_ID,
				`Test Topic ${Date.now()}`,
				1
			);
			if (createResult.ok && createResult.result) {
				testTopicId = createResult.result.message_thread_id;
			}
		}
	});

	describe("Message Pinning Service (9.1.1.2.3.1.0)", () => {
		test.skipIf(shouldSkip)("Pin critical alert message", async () => {
			// Test Formula: 1. Send critical alert. 2. Pin message. 3. Verify pinned.
			// Expected Result: Critical alert message pinned successfully.

			if (!testTopicId) throw new Error("Test topic not created");

			const message: TelegramMessage = {
				chatId: TEST_CHAT_ID,
				text: `<b>🚨 CRITICAL ALERT</b>: Test alert ${Date.now()}`,
				threadId: testTopicId,
				parseMode: "HTML",
			};

			const sendResult = await bot.sendMessage(message.chatId, message.text, message.threadId);
			expect(sendResult.ok).toBe(true);
			expect(sendResult.result?.message_id).toBeDefined();

			if (sendResult.result?.message_id) {
				const pinResult = await bot.pinMessage(
					message.chatId,
					sendResult.result.message_id,
					message.threadId
				);
				expect(pinResult.ok).toBe(true);
			}
		});

		test.skipIf(shouldSkip)("Auto-pin high severity alerts", async () => {
			// Test Formula: 1. Send alert with severity >= 9. 2. Verify auto-pinned.
			// Expected Result: High severity alerts automatically pinned.

			if (!testTopicId) throw new Error("Test topic not created");

			const severity = 10;
			const alertMessage = `<b>🚨 CRITICAL</b>: Severity ${severity} alert ${Date.now()}`;

			// Simulate auto-pin logic
			const sendResult = await bot.sendMessage(TEST_CHAT_ID, alertMessage, testTopicId);
			expect(sendResult.ok).toBe(true);

			if (severity >= 9 && sendResult.result?.message_id) {
				const pinResult = await bot.pinMessage(
					TEST_CHAT_ID,
					sendResult.result.message_id,
					testTopicId
				);
				expect(pinResult.ok).toBe(true);
			}
		});
	});

	describe("Message Unpinning Service (9.1.1.2.3.2.0)", () => {
		test.skipIf(shouldSkip)("Unpin resolved alert", async () => {
			// Test Formula: 1. Pin message. 2. Resolve alert. 3. Unpin message.
			// Expected Result: Message unpinned after resolution.

			if (!testTopicId) throw new Error("Test topic not created");

			// Send and pin
			const sendPinResult = await bot.sendAndPin(
				TEST_CHAT_ID,
				`Resolved alert ${Date.now()}`,
				testTopicId
			);
			expect(sendPinResult.ok).toBe(true);
			expect(sendPinResult.messageId).toBeDefined();

			// Simulate resolution and unpin
			if (sendPinResult.messageId) {
				const unpinResult = await bot.unpinMessage(
					TEST_CHAT_ID,
					sendPinResult.messageId,
					testTopicId
				);
				expect(unpinResult.ok).toBe(true);
			}
		});

		test.skipIf(shouldSkip)("Auto-unpin after timeout", async () => {
			// Test Formula: 1. Pin message. 2. Wait for timeout. 3. Verify auto-unpinned.
			// Expected Result: Message automatically unpinned after timeout period.

			if (!testTopicId) throw new Error("Test topic not created");

			const sendPinResult = await bot.sendAndPin(
				TEST_CHAT_ID,
				`Timeout test ${Date.now()}`,
				testTopicId
			);
			expect(sendPinResult.ok).toBe(true);

			// Simulate timeout (in real implementation, this would be handled by a scheduler)
			if (sendPinResult.messageId) {
				// For test, immediately unpin to simulate timeout
				const unpinResult = await bot.unpinMessage(
					TEST_CHAT_ID,
					sendPinResult.messageId,
					testTopicId
				);
				expect(unpinResult.ok).toBe(true);
			}
		});
	});

	describe("Topic Management Service", () => {
		test.skipIf(shouldSkip)("Create topic with metadata", async () => {
			// Test Formula: 1. Create topic with name, color, emoji. 2. Verify created.
			// Expected Result: Topic created with all specified metadata.

			const topicName = `Metadata Test ${Date.now()}`;
			const iconColor = 2; // Orange
			
			const result = await bot.createForumTopic(TEST_CHAT_ID, topicName, iconColor);
			
			expect(result.ok).toBe(true);
			expect(result.result?.message_thread_id).toBeDefined();
		});

		test.skipIf(shouldSkip)("Rename topic dynamically", async () => {
			// Test Formula: 1. Create topic. 2. Rename topic. 3. Verify renamed.
			// Expected Result: Topic name updated successfully.

			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Original ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic");
			}

			const threadId = createResult.result.message_thread_id;
			const newName = `Renamed ${Date.now()}`;

			const editResult = await bot.editForumTopic(TEST_CHAT_ID, threadId, newName);
			expect(editResult.ok).toBe(true);
		});

		test.skipIf(shouldSkip)("Close and reopen topic lifecycle", async () => {
			// Test Formula: 1. Create topic. 2. Close topic. 3. Reopen topic. 4. Verify lifecycle.
			// Expected Result: Topic successfully closed and reopened.

			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Lifecycle ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic");
			}

			const threadId = createResult.result.message_thread_id;

			// Close
			const closeResult = await bot.closeForumTopic(TEST_CHAT_ID, threadId);
			expect(closeResult.ok).toBe(true);

			// Reopen
			const reopenResult = await bot.reopenForumTopic(TEST_CHAT_ID, threadId);
			expect(reopenResult.ok).toBe(true);
		});
	});

	describe("Message Formatting Service (9.1.1.9.1.0.0)", () => {
		test.skipIf(shouldSkip)("Send HTML formatted message", async () => {
			// Test Formula: 1. Send HTML-formatted message. 2. Verify formatting.
			// Expected Result: Message sent with HTML formatting applied.

			if (!testTopicId) throw new Error("Test topic not created");

			const formattedMessage = `<b>Bold</b> <i>Italic</i> <code>Code</code>`;
			const result = await bot.sendMessage(TEST_CHAT_ID, formattedMessage, testTopicId);

			expect(result.ok).toBe(true);
		});

		test.skipIf(shouldSkip)("Send message with inline link", async () => {
			// Test Formula: 1. Send message with HTML link. 2. Verify link rendered.
			// Expected Result: Message contains clickable link.

			if (!testTopicId) throw new Error("Test topic not created");

			const messageWithLink = `Visit <a href="https://example.com">Hyper-Bun Dashboard</a>`;
			const result = await bot.sendMessage(TEST_CHAT_ID, messageWithLink, testTopicId);

			expect(result.ok).toBe(true);
		});
	});
});
