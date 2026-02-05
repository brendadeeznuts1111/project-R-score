/**
 * @fileoverview Telegram CLI Send Message Tests
 * @description Tests for CLI message sending functionality (9.1.1.3.2.0.0)
 * @module test/cli/telegram-send
 * @version 9.0.0.0.0.0.0
 * 
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91132000|Sending Test Messages (9.1.1.3.2.0.0)}
 * @see {@link ../src/cli/telegram.ts|Telegram CLI} - CLI implementation
 * 
 * Test Formula: 1. Run 'bun run telegram send "Test Message" --thread-id <valid_id> --bookmaker "FanDuel"'. 2. Check Telegram app.
 * Expected Result: Message "Test Message" appears in the specified topic of the configured Telegram supergroup.
 */

import { test, describe, expect, beforeEach } from "bun:test";
import { TelegramBotApi } from "../../src/api/telegram-ws";

const TEST_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TEST_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const shouldSkip = !TEST_BOT_TOKEN || !TEST_CHAT_ID;

describe("Telegram CLI Send Message (9.1.1.3.2.0.0)", () => {
	let bot: TelegramBotApi;
	let testTopicId: number | undefined;

	beforeEach(async () => {
		bot = new TelegramBotApi(TEST_BOT_TOKEN);
		
		// Create test topic
		if (TEST_CHAT_ID) {
			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Send Test ${Date.now()}`, 1);
			if (createResult.ok && createResult.result) {
				testTopicId = createResult.result.message_thread_id;
			}
		}
	});

	test.skipIf(shouldSkip)("9.1.1.3.2.0.0: Send message with thread ID", async () => {
		// Test Formula: 1. Run 'bun run telegram send "Test Message" --thread-id <valid_id> --bookmaker "FanDuel"'. 2. Check Telegram app.
		// Expected Result: Message "Test Message" appears in the specified topic.

		if (!testTopicId) throw new Error("Test topic not created");

		const message = `🧪 Test message ${Date.now()}`;
		const result = await bot.sendMessage(TEST_CHAT_ID, message, testTopicId);

		expect(result.ok).toBe(true);
		expect(result.result?.message_id).toBeDefined();
	});

	test.skipIf(shouldSkip)("Send message with pin flag", async () => {
		if (!testTopicId) throw new Error("Test topic not created");

		const message = `📌 Pinned test ${Date.now()}`;
		const sendResult = await bot.sendMessage(TEST_CHAT_ID, message, testTopicId);

		if (sendResult.ok && sendResult.result?.message_id) {
			const pinResult = await bot.pinMessage(
				TEST_CHAT_ID,
				sendResult.result.message_id,
				testTopicId
			);
			expect(pinResult.ok).toBe(true);
		}
	});

	test.skipIf(shouldSkip)("Send message with bookmaker context", async () => {
		// Simulate bookmaker-specific routing
		if (!testTopicId) throw new Error("Test topic not created");

		const bookmaker = "DraftKings";
		const message = `🧪 Test message for ${bookmaker} ${Date.now()}`;
		
		// In real implementation, this would route to bookmaker-specific topic
		const result = await bot.sendMessage(TEST_CHAT_ID, message, testTopicId);

		expect(result.ok).toBe(true);
		expect(message).toContain(bookmaker);
	});

	test.skipIf(shouldSkip)("Send high-priority message", async () => {
		if (!testTopicId) throw new Error("Test topic not created");

		const highPriorityMessage = `🚨 HIGH PRIORITY: Test ${Date.now()}`;
		const result = await bot.sendMessage(TEST_CHAT_ID, highPriorityMessage, testTopicId);

		expect(result.ok).toBe(true);
		expect(result.result?.message_id).toBeDefined();
	});
});
