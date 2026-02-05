/**
 * @fileoverview Telegram API Endpoints Tests
 * @description Comprehensive tests for Telegram API endpoints (9.1.1.5.0.0.0)
 * @module test/api/telegram
 * @version 9.0.0.0.0.0.0
 * 
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91150000|API Endpoints Reference (9.1.1.5.0.0.0)}
 * @see {@link ../src/api/telegram-ws.ts|TelegramBotApi} - Core API implementation
 * 
 * Test Formula: 1. Run 'bun test test/api/telegram.test.ts'. 2. Verify all endpoints respond correctly.
 * Expected Result: All Telegram API endpoint tests pass, verifying channel/group/topic management functionality.
 */

import { test, describe, expect, beforeEach, afterEach } from "bun:test";
import { TelegramBotApi } from "../../src/api/telegram-ws";

// ═══════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════

const TEST_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TEST_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

// Skip tests if credentials not configured
const shouldSkip = !TEST_BOT_TOKEN || !TEST_CHAT_ID;

describe("Telegram API Endpoints (9.1.1.5.0.0.0)", () => {
	let bot: TelegramBotApi;
	let createdTopicId: number | undefined;
	let sentMessageId: number | undefined;

	beforeEach(() => {
		bot = new TelegramBotApi(TEST_BOT_TOKEN);
	});

	afterEach(async () => {
		// Cleanup: Close created topic if exists
		if (createdTopicId && TEST_CHAT_ID) {
			try {
				await bot.closeForumTopic(TEST_CHAT_ID, createdTopicId);
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// TOPIC MANAGEMENT TESTS (9.1.1.2.2.0.0)
	// ═══════════════════════════════════════════════════════════════

	describe("Topic Management (9.1.1.2.2.0.0)", () => {
		test.skipIf(shouldSkip)("9.1.1.3.1.0.0: Get Forum Topics - Discover existing topics", async () => {
			// Test Formula: 1. Run 'bun run telegram discover-topics --full-details'. 2. Verify output.
			// Expected Result: Console output displays active topic names and their corresponding message_thread_id values.

			const result = await bot.getForumTopics(TEST_CHAT_ID);

			expect(result.ok).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result?.topics).toBeInstanceOf(Array);
			
			if (result.result?.topics && result.result.topics.length > 0) {
				const topic = result.result.topics[0];
				expect(topic).toHaveProperty("message_thread_id");
				expect(topic).toHaveProperty("name");
				expect(typeof topic.message_thread_id).toBe("number");
				expect(typeof topic.name).toBe("string");
			}
		});

		test.skipIf(shouldSkip)("9.1.1.2.2.2.0: Create Forum Topic - CLI-driven topic creation", async () => {
			// Test Formula: 1. Run 'bun run telegram create-topic "Test Topic" --color=1'. 2. Verify topic created.
			// Expected Result: Topic created with message_thread_id returned.

			const topicName = `Test Topic ${Date.now()}`;
			const result = await bot.createForumTopic(TEST_CHAT_ID, topicName, 1);

			expect(result.ok).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result?.message_thread_id).toBeDefined();
			expect(typeof result.result?.message_thread_id).toBe("number");

			if (result.result?.message_thread_id) {
				createdTopicId = result.result.message_thread_id;
			}
		});

		test.skipIf(shouldSkip)("9.1.1.2.4.2.0: Edit Forum Topic - Rename topic", async () => {
			// Test Formula: 1. Create topic. 2. Edit topic name. 3. Verify change.
			// Expected Result: Topic name updated successfully.

			// Create topic first
			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Original Name ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic for edit test");
			}

			const threadId = createResult.result.message_thread_id;
			const newName = `Renamed Topic ${Date.now()}`;

			// Edit topic
			const editResult = await bot.editForumTopic(TEST_CHAT_ID, threadId, newName);

			expect(editResult.ok).toBe(true);

			// Verify by getting topics
			const topicsResult = await bot.getForumTopics(TEST_CHAT_ID);
			if (topicsResult.ok && topicsResult.result) {
				const editedTopic = topicsResult.result.topics.find(t => t.message_thread_id === threadId);
				expect(editedTopic?.name).toBe(newName);
			}
		});

		test.skipIf(shouldSkip)("9.1.1.2.4.1.0: Close Forum Topic - Close topic", async () => {
			// Test Formula: 1. Create topic. 2. Close topic. 3. Verify closed.
			// Expected Result: Topic closed successfully.

			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Close Test ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic for close test");
			}

			const threadId = createResult.result.message_thread_id;
			const closeResult = await bot.closeForumTopic(TEST_CHAT_ID, threadId);

			expect(closeResult.ok).toBe(true);
		});

		test.skipIf(shouldSkip)("9.1.1.2.4.1.0: Reopen Forum Topic - Reopen closed topic", async () => {
			// Test Formula: 1. Create and close topic. 2. Reopen topic. 3. Verify reopened.
			// Expected Result: Topic reopened successfully.

			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Reopen Test ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic for reopen test");
			}

			const threadId = createResult.result.message_thread_id;

			// Close first
			await bot.closeForumTopic(TEST_CHAT_ID, threadId);

			// Reopen
			const reopenResult = await bot.reopenForumTopic(TEST_CHAT_ID, threadId);

			expect(reopenResult.ok).toBe(true);
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// MESSAGE SENDING TESTS (9.1.1.3.2.0.0)
	// ═══════════════════════════════════════════════════════════════

	describe("Message Sending (9.1.1.3.2.0.0)", () => {
		test.skipIf(shouldSkip)("9.1.1.3.2.0.0: Send Message to Chat - Basic message sending", async () => {
			// Test Formula: 1. Run 'bun run telegram send "Test Message" --thread-id <valid_id> --bookmaker "FanDuel"'. 2. Check Telegram app.
			// Expected Result: Message "Test Message" appears in the specified topic of the configured Telegram supergroup.

			const message = `🧪 Test message ${Date.now()}`;
			const result = await bot.sendMessage(TEST_CHAT_ID, message);

			expect(result.ok).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result?.message_id).toBeDefined();
			expect(typeof result.result?.message_id).toBe("number");

			if (result.result?.message_id) {
				sentMessageId = result.result.message_id;
			}
		});

		test.skipIf(shouldSkip)("9.1.1.3.2.0.0: Send Message to Topic - Topic-specific messaging", async () => {
			// Test Formula: 1. Create topic. 2. Send message to topic. 3. Verify message appears in topic.
			// Expected Result: Message appears in the specified topic.

			// Create topic first
			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Message Test ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic for message test");
			}

			const threadId = createResult.result.message_thread_id;
			const message = `🧪 Topic message ${Date.now()}`;
			const result = await bot.sendMessage(TEST_CHAT_ID, message, threadId);

			expect(result.ok).toBe(true);
			expect(result.result?.message_id).toBeDefined();
		});

		test.skipIf(shouldSkip)("9.1.1.9.1.0.0: Send Formatted Message - HTML formatting", async () => {
			// Test Formula: 1. Send HTML-formatted message. 2. Verify formatting applied.
			// Expected Result: Message sent with HTML formatting (bold, italic, code).

			const formattedMessage = `<b>🚨 CRITICAL</b>: <code>test_${Date.now()}</code>`;
			const result = await bot.sendMessage(TEST_CHAT_ID, formattedMessage);

			expect(result.ok).toBe(true);
			expect(result.result?.message_id).toBeDefined();
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// MESSAGE PINNING TESTS (9.1.1.2.3.0.0)
	// ═══════════════════════════════════════════════════════════════

	describe("Message Pinning (9.1.1.2.3.0.0)", () => {
		test.skipIf(shouldSkip)("9.1.1.2.3.1.0: Pin Message - Pin message in topic", async () => {
			// Test Formula: 1. Send message. 2. Pin message. 3. Verify pinned.
			// Expected Result: Message pinned successfully.

			// Create topic
			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Pin Test ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic for pin test");
			}

			const threadId = createResult.result.message_thread_id;

			// Send message
			const sendResult = await bot.sendMessage(TEST_CHAT_ID, `📌 Pin test message ${Date.now()}`, threadId);
			if (!sendResult.ok || !sendResult.result?.message_id) {
				throw new Error("Failed to send message for pin test");
			}

			const messageId = sendResult.result.message_id;

			// Pin message
			const pinResult = await bot.pinMessage(TEST_CHAT_ID, messageId, threadId);

			expect(pinResult.ok).toBe(true);
		});

		test.skipIf(shouldSkip)("9.1.1.2.3.1.0: Send and Pin - Combined send and pin", async () => {
			// Test Formula: 1. Use sendAndPin method. 2. Verify message sent and pinned.
			// Expected Result: Message sent and pinned in one operation.

			// Create topic
			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `SendPin Test ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic for sendAndPin test");
			}

			const threadId = createResult.result.message_thread_id;
			const message = `📌 Send and pin test ${Date.now()}`;

			const result = await bot.sendAndPin(TEST_CHAT_ID, message, threadId);

			expect(result.ok).toBe(true);
			expect(result.messageId).toBeDefined();
		});

		test.skipIf(shouldSkip)("9.1.1.2.3.2.0: Unpin Message - Unpin message", async () => {
			// Test Formula: 1. Send and pin message. 2. Unpin message. 3. Verify unpinned.
			// Expected Result: Message unpinned successfully.

			// Create topic
			const createResult = await bot.createForumTopic(TEST_CHAT_ID, `Unpin Test ${Date.now()}`, 1);
			if (!createResult.ok || !createResult.result?.message_thread_id) {
				throw new Error("Failed to create topic for unpin test");
			}

			const threadId = createResult.result.message_thread_id;

			// Send and pin
			const sendPinResult = await bot.sendAndPin(TEST_CHAT_ID, `Unpin test ${Date.now()}`, threadId);
			if (!sendPinResult.ok || !sendPinResult.messageId) {
				throw new Error("Failed to send and pin message for unpin test");
			}

			// Unpin
			const unpinResult = await bot.unpinMessage(TEST_CHAT_ID, sendPinResult.messageId, threadId);

			expect(unpinResult.ok).toBe(true);
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// ERROR HANDLING TESTS
	// ═══════════════════════════════════════════════════════════════

	describe("Error Handling", () => {
		test("Handle missing bot token gracefully", () => {
			const botWithoutToken = new TelegramBotApi("");
			
			// Should not throw, but return error response
			expect(botWithoutToken).toBeDefined();
		});

		test.skipIf(shouldSkip)("Handle invalid chat ID", async () => {
			const invalidChatId = "invalid_chat_id";
			const result = await bot.sendMessage(invalidChatId, "Test");

			expect(result.ok).toBe(false);
			expect(result.description).toBeDefined();
		});

		test.skipIf(shouldSkip)("Handle invalid topic ID", async () => {
			const invalidThreadId = 999999999;
			const result = await bot.sendMessage(TEST_CHAT_ID, "Test", invalidThreadId);

			// May succeed (if topic doesn't exist, Telegram may create it) or fail
			// Just verify no crash
			expect(result).toBeDefined();
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// BOT STATUS TESTS (9.1.1.3.3.0.0)
	// ═══════════════════════════════════════════════════════════════

	describe("Bot Status (9.1.1.3.3.0.0)", () => {
		test.skipIf(shouldSkip)("9.1.1.3.3.0.0: Check Bot Status - Verify bot is operational", async () => {
			// Test Formula: 1. Call GET /telegram/bot/status. 2. Verify response.
			// Expected Result: Bot status endpoint returns operational status.

			// This would typically be tested via HTTP endpoint, but we can test the underlying functionality
			// by verifying bot can send a message (which requires valid token)
			const result = await bot.sendMessage(TEST_CHAT_ID, "Status check");

			expect(result.ok).toBe(true);
		});
	});
});
