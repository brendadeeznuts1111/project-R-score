#!/usr/bin/env bun
/**
 * Golden Supergroup Setup & Management
 *
 * Creates and configures a "golden" Telegram supergroup with:
 * - Standardized topic structure
 * - Bot permissions
 * - Logging configuration
 * - Rate limiting
 */

import { TelegramBotApi } from "../api/telegram-ws.js";
import {
	GOLDEN_SUPERGROUP_CONFIG,
	TELEGRAM_ENV,
	TELEGRAM_SECRETS,
	type GoldenSupergroupConfig,
} from "./constants.js";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION LOADING
// ═══════════════════════════════════════════════════════════════

async function loadConfig(): Promise<{
	botToken: string;
	chatId: string;
	config: GoldenSupergroupConfig;
}> {
	let botToken = process.env[TELEGRAM_ENV.BOT_TOKEN];
	let chatId =
		process.env[TELEGRAM_ENV.CHAT_ID] ||
		process.env[TELEGRAM_ENV.SUPERGROUP_ID];

	// Try Bun.secrets
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

	if (!botToken) {
		console.error(`❌ ${TELEGRAM_ENV.BOT_TOKEN} not set`);
		process.exit(1);
	}

	if (!chatId) {
		console.error(`❌ ${TELEGRAM_ENV.CHAT_ID} not set`);
		process.exit(1);
	}

	const config: GoldenSupergroupConfig = {
		...GOLDEN_SUPERGROUP_CONFIG,
		chatId,
		botToken,
	};

	return { botToken, chatId, config };
}

// ═══════════════════════════════════════════════════════════════
// SETUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function setupTopics(
	api: TelegramBotApi,
	chatId: string,
	topics: GoldenSupergroupConfig["topics"],
): Promise<void> {
	console.info(`📋 Setting up topics...\n`);

	for (const topic of topics) {
		console.info(`  Creating topic: ${topic.name} (ID: ${topic.threadId})`);

		try {
			const result = await api.createForumTopic(
				chatId,
				topic.name,
				topic.iconColor,
				topic.iconEmoji,
			);

			if (result.ok && result.result) {
				console.info(
					`    ✅ Created (Thread ID: ${result.result.message_thread_id})`,
				);

				// Send description if provided
				if (topic.description) {
					await api.sendMessage(
						chatId,
						`📝 ${topic.description}`,
						result.result.message_thread_id,
					);
				}
			} else {
				// Topic might already exist, try to verify
				console.info(`    ⚠️  ${result.description || "Unknown error"}`);
			}
		} catch (error) {
			console.info(`    ❌ Error: ${(error as Error).message}`);
		}

		// Rate limiting
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	console.info(`\n✅ Topic setup complete\n`);
}

async function verifyBotPermissions(
	api: TelegramBotApi,
	chatId: string,
): Promise<void> {
	console.info(`🔍 Verifying bot permissions...\n`);

	// Test sending a message
	const testResult = await api.sendMessage(chatId, "🔍 Permission test");

	if (!testResult.ok) {
		console.error(`❌ Cannot send messages: ${testResult.description}`);
		console.error(`   Ensure bot has 'canSendMessages' permission`);
		return;
	}

	console.info(`  ✅ Can send messages`);

	// Test pinning (try to pin the test message)
	if (testResult.result?.message_id) {
		const pinResult = await api.pinMessage(
			chatId,
			testResult.result.message_id,
		);

		if (pinResult.ok) {
			console.info(`  ✅ Can pin messages`);
			// Unpin it
			await api.unpinMessage(chatId, testResult.result.message_id);
		} else {
			console.info(`  ⚠️  Cannot pin messages: ${pinResult.description}`);
		}
	}

	// Test topic management
	const topicsResult = await api.getForumTopics(chatId);

	if (topicsResult.ok) {
		console.info(`  ✅ Can manage topics`);
	} else {
		console.info(`  ⚠️  Cannot manage topics: ${topicsResult.description}`);
	}

	console.info(`\n✅ Permission check complete\n`);
}

async function setupLogging(config: GoldenSupergroupConfig): Promise<void> {
	console.info(`📝 Setting up logging...\n`);

	if (!config.logging.enabled) {
		console.info(`  ⚠️  Logging disabled in config`);
		return;
	}

	const { existsSync, mkdirSync } = await import("fs");
	const { join } = await import("path");

	const logDir = config.logging.directory;

	if (!existsSync(logDir)) {
		mkdirSync(logDir, { recursive: true });
		console.info(`  ✅ Created log directory: ${logDir}`);
	} else {
		console.info(`  ✅ Log directory exists: ${logDir}`);
	}

	console.info(`  📊 Retention: ${config.logging.retentionDays} days`);
	console.info(`\n✅ Logging setup complete\n`);
}

async function sendWelcomeMessage(
	api: TelegramBotApi,
	chatId: string,
	config: GoldenSupergroupConfig,
): Promise<void> {
	console.info(`📤 Sending welcome message...\n`);

	const welcomeText = `🚀 **${config.name}**

✅ Golden supergroup configuration applied!

**Topics:**
${config.topics.map((t) => `  • ${t.name} (ID: ${t.threadId})`).join("\n")}

**Features:**
  • Automated logging
  • Rate limiting enabled
  • Topic management active

Use \`bun run telegram help\` for CLI commands.`;

	try {
		const result = await api.sendMessage(chatId, welcomeText);

		if (result.ok) {
			console.info(`  ✅ Welcome message sent`);
		} else {
			console.info(`  ⚠️  Failed to send welcome: ${result.description}`);
		}
	} catch (error) {
		console.info(`  ❌ Error: ${(error as Error).message}`);
	}

	console.info(`\n✅ Setup complete!\n`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMMANDS
// ═══════════════════════════════════════════════════════════════

async function cmdSetup(): Promise<void> {
	const { botToken, chatId, config } = await loadConfig();
	const api = new TelegramBotApi(botToken);

	console.info(`🏗️  Setting up Golden Supergroup\n`);
	console.info(`   Chat ID: ${chatId}`);
	console.info(`   Topics: ${config.topics.length}\n`);

	// Verify permissions first
	await verifyBotPermissions(api, chatId);

	// Setup logging
	await setupLogging(config);

	// Setup topics
	await setupTopics(api, chatId, config.topics);

	// Send welcome message
	await sendWelcomeMessage(api, chatId, config);

	console.info(`🎉 Golden supergroup setup complete!\n`);
}

async function cmdVerify(): Promise<void> {
	const { botToken, chatId } = await loadConfig();
	const api = new TelegramBotApi(botToken);

	console.info(`🔍 Verifying Golden Supergroup Configuration\n`);
	console.info(`   Chat ID: ${chatId}\n`);

	await verifyBotPermissions(api, chatId);

	// Check topics
	const topicsResult = await api.getForumTopics(chatId);

	if (topicsResult.ok && topicsResult.result?.topics) {
		console.info(`📋 Found ${topicsResult.result.topics.length} topics:\n`);

		for (const topic of topicsResult.result.topics) {
			console.info(`  • ${topic.name} (Thread ID: ${topic.message_thread_id})`);
		}
	} else {
		console.info(`⚠️  Could not fetch topics via API`);
		console.info(`   ${topicsResult.description || "Unknown error"}`);
	}

	console.info(`\n✅ Verification complete\n`);
}

function showHelp(): void {
	console.info(`
🏗️  Golden Supergroup Management

USAGE:
  bun run golden-supergroup <command>

COMMANDS:
  setup              Set up golden supergroup configuration
  verify              Verify current configuration
  help                Show this help

EXAMPLES:
  bun run golden-supergroup setup
  bun run golden-supergroup verify

ENVIRONMENT:
  ${TELEGRAM_ENV.BOT_TOKEN}          Bot token (required)
  ${TELEGRAM_ENV.CHAT_ID}             Chat/supergroup ID (required)

The golden supergroup configuration includes:
  • Standardized topic structure
  • Bot permission verification
  • Logging setup
  • Rate limiting configuration
`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
	const command = process.argv[2];

	switch (command) {
		case "setup":
			await cmdSetup();
			break;

		case "verify":
			await cmdVerify();
			break;

		case "help":
		case "--help":
		case "-h":
		default:
			showHelp();
			break;
	}
}

main().catch((error) => {
	console.error("❌ Fatal error:");
	console.error(error);
	process.exit(1);
});
