#!/usr/bin/env bun
/**
 * List all Telegram forum topics
 */

// Try to get credentials from environment or Bun.secrets
let botToken = process.env.TELEGRAM_BOT_TOKEN;
let chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_SUPERGROUP_ID;

// Check Bun.secrets if env vars not set
if (!botToken) {
	try {
		botToken = (await Bun.secrets.get({ service: "nexus", name: "telegram.botToken" })) || null;
	}
	catch {
		// Ignore
	}
}

if (!chatId) {
	try {
		chatId = (await Bun.secrets.get({ service: "nexus", name: "telegram.chatId" })) || null;
	}
	catch {
		// Ignore
	}
}

if (!botToken) {
	console.error("❌ TELEGRAM_BOT_TOKEN not set");
	process.exit(1);
}

if (!chatId) {
	console.error("❌ TELEGRAM_CHAT_ID not set");
	process.exit(1);
}

const url = `https://api.telegram.org/bot${botToken}/getForumTopics?chat_id=${chatId}`;

console.log(`📋 Fetching forum topics for chat ${chatId}...\n`);

try {
	const response = await fetch(url);
	const result = await response.json();

	if (result.ok && result.result?.topics) {
		const topics = result.result.topics;
		console.log(`✅ Found ${topics.length} topics:\n`);

		for (const topic of topics) {
			const icon = topic.icon_custom_emoji_id 
				? `🎯` 
				: `📌`;
			console.log(`  ${icon} #${topic.message_thread_id} - ${topic.name}`);
		}

		console.log(`\n💡 To send to a topic:`);
		console.log(`   bun run send-telegram "Your message" --topic <thread_id>`);
		console.log(`   bun run send-telegram "Your message" --topic ${topics[0]?.message_thread_id || "THREAD_ID"} --pin`);
	} else {
		console.error("❌ Failed to get topics:");
		console.error(`   ${result.description || "Unknown error"}`);
		if (result.error_code) {
			console.error(`   Error Code: ${result.error_code}`);
		}
		process.exit(1);
	}
} catch (error) {
	console.error("❌ Network error:");
	console.error(`   ${(error as Error).message}`);
	process.exit(1);
}
