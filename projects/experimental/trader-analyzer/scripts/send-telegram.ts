#!/usr/bin/env bun
/**
 * Send message to Telegram supergroup
 * Uses TelegramBotApi from the codebase
 */

// Import TelegramBotApi class
let TelegramBotApi: any = null;
try {
	const module = await import("../src/api/telegram-ws.js");
	TelegramBotApi = module.TelegramBotApi;
} catch {
	// Fallback: direct API call if import fails
}

// Try to get credentials from environment or Bun.secrets
let botToken = process.env.TELEGRAM_BOT_TOKEN;
let chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_SUPERGROUP_ID;
let threadId = process.env.TELEGRAM_LIVE_TOPIC_ID
	? parseInt(process.env.TELEGRAM_LIVE_TOPIC_ID)
	: undefined;

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

if (!threadId) {
	try {
		const threadIdStr = await Bun.secrets.get({ service: "nexus", name: "telegram.liveTopicId" });
		if (threadIdStr) {
			threadId = parseInt(threadIdStr, 10);
		}
	}
	catch {
		// Ignore
	}
}

if (!botToken) {
	console.error("❌ TELEGRAM_BOT_TOKEN not set");
	console.error("   Set it with: export TELEGRAM_BOT_TOKEN=your_token");
	process.exit(1);
}

if (!chatId) {
	console.error("❌ TELEGRAM_CHAT_ID or TELEGRAM_SUPERGROUP_ID not set");
	console.error("   Set it with: export TELEGRAM_CHAT_ID=your_chat_id");
	process.exit(1);
}

// Parse arguments: [message] [--topic threadId] [--pin]
let message = process.argv[2] || "";
let topicId: number | undefined;
let pin = false;

for (let i = 2; i < process.argv.length; i++) {
	if (process.argv[i] === "--topic" && process.argv[i + 1]) {
		topicId = parseInt(process.argv[i + 1], 10);
		i++;
	} else if (process.argv[i] === "--pin") {
		pin = true;
	} else if (!message && process.argv[i] && !process.argv[i].startsWith("--")) {
		message = process.argv[i];
	}
}

if (!message) {
	message = `🚀 NEXUS Dashboard Update

✅ MCP Tools working perfectly!
✅ tooling-diagnostics executed successfully
✅ 11 tools available (5 Bun Tooling + 6 Bun Shell)

Dashboard running with live tool execution examples.
Run: bun run dashboard`;
}

// Use topicId from args if provided, otherwise use threadId from env/secrets
const targetThreadId = topicId || threadId;

console.log(`📤 Sending message to Telegram...`);
console.log(`   Chat ID: ${chatId}`);
if (targetThreadId) console.log(`   Thread ID: ${targetThreadId}`);
if (pin) console.log(`   Pin: Yes`);
console.log(`   Message: ${message.substring(0, 60)}...\n`);

// Use TelegramBotApi if available, otherwise direct API call
if (TelegramBotApi) {
	try {
		const telegramApi = new TelegramBotApi(botToken);
		let result;
		
		if (pin && targetThreadId) {
			// Send and pin
			result = await telegramApi.sendAndPin(chatId, message, targetThreadId);
		} else {
			// Just send
			result = await telegramApi.sendMessage(chatId, message, targetThreadId);
		}

		if (result.ok) {
			console.log("✅ Message sent successfully!");
			console.log(`   Message ID: ${result.result?.message_id || "N/A"}`);
		} else {
			console.error("❌ Failed to send message:");
			console.error(`   Error: ${result.description || "Unknown error"}`);
			console.error(`   Error Code: ${result.error_code || "N/A"}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
} else {
	// Fallback: direct API call
	const params = new URLSearchParams({
		chat_id: String(chatId),
		text: message,
		parse_mode: "HTML",
	});

	if (targetThreadId) {
		params.set("message_thread_id", String(targetThreadId));
	}

	const url = `https://api.telegram.org/bot${botToken}/sendMessage?${params}`;

	try {
		const response = await fetch(url);
		const result = await response.json();

		if (result.ok) {
			console.log("✅ Message sent successfully!");
			console.log(`   Message ID: ${result.result?.message_id || "N/A"}`);
		} else {
			console.error("❌ Failed to send message:");
			console.error(`   Error: ${result.description || "Unknown error"}`);
			console.error(`   Error Code: ${result.error_code || "N/A"}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Network error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
}
