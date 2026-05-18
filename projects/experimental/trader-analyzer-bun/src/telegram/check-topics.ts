#!/usr/bin/env bun
/**
 * @fileoverview Check Topics and Pinned Messages
 * @description Check how many topics and pinned messages exist in the golden supergroup
 */

import { TelegramBotApi } from "../api/telegram-ws.js";
import { TELEGRAM_ENV, TELEGRAM_SECRETS } from "./constants.js";

async function checkTopicsAndPins(): Promise<void> {
	// Load credentials
	let botToken = process.env[TELEGRAM_ENV.BOT_TOKEN];
	let chatId = process.env[TELEGRAM_ENV.CHAT_ID];

	if (!botToken) {
		try {
			botToken =
				(await Bun.secrets.get({
					service: TELEGRAM_SECRETS.SERVICE,
					name: TELEGRAM_SECRETS.BOT_TOKEN,
				})) || "";
		} catch {
			// Ignore
		}
	}

	if (!chatId) {
		try {
			chatId =
				(await Bun.secrets.get({
					service: TELEGRAM_SECRETS.SERVICE,
					name: TELEGRAM_SECRETS.CHAT_ID,
				})) || "";
		} catch {
			// Ignore
		}
	}

	if (!botToken || !chatId) {
		console.error("❌ Telegram bot token and chat ID required");
		process.exit(1);
	}

	const api = new TelegramBotApi(botToken);

	console.info("📊 Checking Golden Supergroup Status\n");
	console.info(`Chat ID: ${chatId}\n`);

	// Get topics
	console.info("📋 Topics:");
	const topicsResult = await api.getForumTopics(chatId);

	if (topicsResult.ok && topicsResult.result?.topics) {
		const topics = topicsResult.result.topics;
		console.info(`\n✅ Found ${topics.length} topics:\n`);

		for (const topic of topics) {
			const icon =
				topic.icon_color !== undefined
					? `🎨`
					: topic.icon_custom_emoji_id
						? `🎯`
						: `📌`;
			const name = topic.name || "Unnamed";
			const threadId = topic.message_thread_id;
			const isClosed = topic.is_closed ? " 🔒" : "";
			const isGeneral = topic.is_general ? " (General)" : "";

			console.info(`  ${icon} ${name}${isGeneral}`);
			console.info(`     Thread ID: ${threadId}${isClosed}`);

			// Try to get pinned messages count for this topic
			// Note: Telegram API doesn't directly provide pinned message count
			// We'd need to check each topic's messages, which is rate-limited
			console.info();
		}

		console.info(`\n📊 Summary:`);
		console.info(`   Total Topics: ${topics.length}`);
		console.info(
			`   General Topic: ${topics.filter((t) => t.is_general).length}`,
		);
		console.info(
			`   Closed Topics: ${topics.filter((t) => t.is_closed).length}`,
		);
		console.info(`   Open Topics: ${topics.filter((t) => !t.is_closed).length}`);
	} else {
		console.info(
			`❌ Could not fetch topics: ${topicsResult.description || "Unknown error"}`,
		);
	}

	// Note: Telegram Bot API doesn't provide a direct way to count pinned messages
	// We would need to check each topic individually, which is rate-limited
	console.info(`\n📌 Pinned Messages:`);
	console.info(
		`   Note: Telegram Bot API doesn't provide direct pinned message count.`,
	);
	console.info(
		`   To check pinned messages, you would need to check each topic individually.`,
	);
	console.info(`   This is rate-limited and may take time for many topics.`);
}

if (import.meta.main) {
	checkTopicsAndPins().catch((error) => {
		console.error("Error:", error);
		process.exit(1);
	});
}
