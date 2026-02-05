#!/usr/bin/env bun
/**
 * @fileoverview Example Golden Channel & Supergroup Setup
 * @description Demonstrates how to create and configure a Telegram supergroup
 *              with topics following the Golden Supergroup configuration
 * @module examples/telegram-golden-setup
 * 
 * This example shows:
 * 1. Creating a Telegram supergroup (manual step)
 * 2. Setting up bot permissions
 * 3. Creating forum topics programmatically
 * 4. Configuring topic mapping
 * 5. Sending welcome messages
 * 
 * Usage:
 *   bun run examples/telegram-golden-setup.ts setup
 *   bun run examples/telegram-golden-setup.ts verify
 *   bun run examples/telegram-golden-setup.ts example-message
 */

import { TelegramBotApi } from "../src/api/telegram-ws.js";
import { GOLDEN_SUPERGROUP_CONFIG, TELEGRAM_ENV, TELEGRAM_SECRETS } from "../src/telegram/constants.js";
import { DeepLinkGenerator } from "../src/utils/deeplink-generator.js";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION LOADING
// ═══════════════════════════════════════════════════════════════

async function loadConfig() {
	let botToken = process.env[TELEGRAM_ENV.BOT_TOKEN];
	let chatId = process.env[TELEGRAM_ENV.CHAT_ID];

	// Try Bun.secrets
	if (!botToken) {
		try {
			botToken = (await Bun.secrets.get({
				service: TELEGRAM_SECRETS.SERVICE,
				name: TELEGRAM_SECRETS.BOT_TOKEN,
			})) || "";
		} catch {
			// Ignore
		}
	}

	if (!chatId) {
		try {
			chatId = (await Bun.secrets.get({
				service: TELEGRAM_SECRETS.SERVICE,
				name: TELEGRAM_SECRETS.CHAT_ID,
			})) || "";
		} catch {
			// Ignore
		}
	}

	if (!botToken) {
		throw new Error(
			`Bot token not found. Set ${TELEGRAM_ENV.BOT_TOKEN} or use:\n` +
			`  bun secret set ${TELEGRAM_SECRETS.BOT_TOKEN} "your_token_here"`
		);
	}

	if (!chatId) {
		throw new Error(
			`Chat ID not found. Set ${TELEGRAM_ENV.CHAT_ID} or use:\n` +
			`  bun secret set ${TELEGRAM_SECRETS.CHAT_ID} "your_chat_id_here"`
		);
	}

	return { botToken, chatId };
}

// ═══════════════════════════════════════════════════════════════
// SETUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Verify bot has required permissions
 */
async function verifyBotPermissions(
	api: TelegramBotApi,
	chatId: string,
	botToken: string,
): Promise<void> {
	console.log("🔍 Verifying bot permissions...\n");

	try {
		// Get bot info from token (extract bot ID from token)
		const botId = botToken.split(':')[0];
		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${botId}`
		);
		const data = await response.json();

		if (data.ok && data.result) {
			const member = data.result;
			const required = GOLDEN_SUPERGROUP_CONFIG.botPermissions;

			console.log("  Bot Status:", member.status);
			console.log("  Permissions:");
			console.log(`    Can Send Messages: ${member.can_send_messages ? "✅" : "❌"} (Required: ${required.canSendMessages})`);
			console.log(`    Can Pin Messages: ${member.can_pin_messages ? "✅" : "❌"} (Required: ${required.canPinMessages})`);
			console.log(`    Can Manage Topics: ${member.can_manage_topics ? "✅" : "❌"} (Required: ${required.canManageTopics})`);
			console.log(`    Can Delete Messages: ${member.can_delete_messages ? "✅" : "❌"} (Required: ${required.canDeleteMessages})`);

			if (
				!member.can_send_messages ||
				!member.can_pin_messages ||
				!member.can_manage_topics ||
				!member.can_delete_messages
			) {
				console.log("\n⚠️  Bot is missing required permissions!");
				console.log("   Please make the bot an admin with these permissions.\n");
			} else {
				console.log("\n✅ All required permissions granted!\n");
			}
		}
	} catch (error) {
		console.log(`❌ Error checking permissions: ${(error as Error).message}\n`);
	}
}

/**
 * Create forum topics from Golden Supergroup config
 */
async function setupTopics(
	api: TelegramBotApi,
	chatId: string,
): Promise<Map<number, number>> {
	console.log("📋 Setting up topics from Golden Supergroup config...\n");

	const topicMapping = new Map<number, number>(); // logical ID -> actual thread ID

	for (const topic of GOLDEN_SUPERGROUP_CONFIG.topics) {
		console.log(`  Creating topic: ${topic.name} (Logical ID: ${topic.threadId})`);

		try {
			const result = await api.createForumTopic(
				chatId,
				topic.name,
				topic.iconColor,
				topic.iconEmoji,
			);

			if (result.ok && result.result) {
				const actualThreadId = result.result.message_thread_id;
				topicMapping.set(topic.threadId, actualThreadId);
				console.log(`    ✅ Created (Thread ID: ${actualThreadId})`);

				// Send description if provided
				if (topic.description) {
					await api.sendMessage(
						chatId,
						`📝 ${topic.description}`,
						actualThreadId,
					);
				}
			} else {
				console.log(`    ⚠️  ${result.description || "Unknown error"}`);
				console.log(`    (Topic might already exist - use 'verify' to check)`);
			}
		} catch (error) {
			console.log(`    ❌ Error: ${(error as Error).message}`);
		}

		// Rate limiting - wait 500ms between topic creations
		await Bun.sleep(500);
	}

	console.log(`\n✅ Topic setup complete!\n`);
	console.log("📊 Topic Mapping (Logical ID → Actual Thread ID):");
	for (const [logicalId, threadId] of topicMapping) {
		const topic = GOLDEN_SUPERGROUP_CONFIG.topics.find(t => t.threadId === logicalId);
		console.log(`  ${logicalId} → ${threadId} (${topic?.name || "Unknown"})`);
	}
	console.log();

	return topicMapping;
}

/**
 * Send welcome message with deep-link example
 */
async function sendWelcomeMessage(
	api: TelegramBotApi,
	chatId: string,
	threadId?: number,
): Promise<void> {
	console.log("📨 Sending welcome message...\n");

	const deepLinkGen = new DeepLinkGenerator();
	
	// Generate example deep-link for demonstration
	const exampleDeepLink = deepLinkGen.generateCovertSteamLink({
		event_identifier: "EXAMPLE-2025-001",
		bookmaker_name: "DraftKings",
		detection_timestamp: Date.now(),
		impact_severity_score: 9.5,
	});

	const welcomeMessage = `🎉 *Welcome to ${GOLDEN_SUPERGROUP_CONFIG.name}!*

This supergroup is configured with the Golden Supergroup setup, featuring:

📋 *Topics:*
${GOLDEN_SUPERGROUP_CONFIG.topics.map(t => `  • ${t.name} (${t.category})`).join("\n")}

🔗 *Deep-Link Example:*
[View Example Alert](${exampleDeepLink})

*Features:*
• RFC 001 compliant deep-links
• Automatic topic routing
• Rate limiting and throttling
• Comprehensive logging

*Rate Limits:*
• ${GOLDEN_SUPERGROUP_CONFIG.rateLimits.messagesPerSecond} msg/sec
• ${GOLDEN_SUPERGROUP_CONFIG.rateLimits.messagesPerMinute} msg/min
• ${GOLDEN_SUPERGROUP_CONFIG.rateLimits.messagesPerHour} msg/hour

Ready to receive alerts! 🚀`;

	try {
		const result = await api.sendMessage(chatId, welcomeMessage, threadId);
		if (result.ok) {
			console.log("✅ Welcome message sent!\n");
		} else {
			console.log(`⚠️  Failed to send: ${result.description}\n`);
		}
	} catch (error) {
		console.log(`❌ Error: ${(error as Error).message}\n`);
	}
}

/**
 * Send example alert message with deep-link
 */
async function sendExampleAlert(
	api: TelegramBotApi,
	chatId: string,
	threadId?: number,
): Promise<void> {
	console.log("📨 Sending example alert message...\n");

	const deepLinkGen = new DeepLinkGenerator();
	
	// Generate deep-link for example alert
	const deepLink = deepLinkGen.generateCovertSteamLink({
		event_identifier: "NFL-2025-001",
		bookmaker_name: "DraftKings",
		detection_timestamp: Date.now(),
		source_dark_node_id: "node_example_123",
		impact_severity_score: 9.5,
	});

	const alertMessage = `🚨 *CRITICAL Covert Steam Alert!*

*Event:* \`NFL-2025-001\`
*Bookmaker:* \`DraftKings\`
*Severity:* \`9.5\` (Threshold: \`8.0\`)
*Move:* \`0.5\` points in Q1 (Lag: \`45s\`)
*Status:* \`Confirmed Sharp Money\` / \`Potential Arbitrage\`

*Deep-Link:* [View Details on Dashboard](${deepLink})

This is an example alert demonstrating RFC 001 deep-link formatting.`;

	try {
		const result = await api.sendMessage(chatId, alertMessage, threadId);
		if (result.ok) {
			console.log("✅ Example alert sent!\n");
			console.log(`   Message ID: ${result.result?.message_id}`);
			console.log(`   Deep-Link: ${deepLink}\n`);
		} else {
			console.log(`⚠️  Failed to send: ${result.description}\n`);
		}
	} catch (error) {
		console.log(`❌ Error: ${(error as Error).message}\n`);
	}
}

/**
 * Verify existing topics
 */
async function verifyTopics(
	api: TelegramBotApi,
	chatId: string,
): Promise<void> {
	console.log("🔍 Verifying existing topics...\n");

	try {
		const result = await api.getForumTopics(chatId);
		
		if (result.ok && result.result) {
			const topics = result.result.topics || [];
			
			console.log(`Found ${topics.length} topics:\n`);
			
			for (const topic of topics) {
				const configTopic = GOLDEN_SUPERGROUP_CONFIG.topics.find(
					t => t.name === topic.name
				);
				
				console.log(`  📌 ${topic.name}`);
				console.log(`     Thread ID: ${topic.message_thread_id}`);
				console.log(`     Icon Color: ${topic.icon_color ?? "N/A"}`);
				console.log(`     Icon Emoji: ${topic.icon_custom_emoji_id ?? "N/A"}`);
				if (configTopic) {
					console.log(`     ✅ Matches Golden Config (Logical ID: ${configTopic.threadId})`);
				} else {
					console.log(`     ⚠️  Not in Golden Config`);
				}
				console.log();
			}
		} else {
			console.log(`⚠️  ${result.description || "Failed to get topics"}\n`);
		}
	} catch (error) {
		console.log(`❌ Error: ${(error as Error).message}\n`);
	}
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMMANDS
// ═══════════════════════════════════════════════════════════════

async function cmdSetup(): Promise<void> {
	const { botToken, chatId } = await loadConfig();
	const api = new TelegramBotApi(botToken);

	console.log("🏗️  Setting up Golden Supergroup\n");
	console.log(`   Chat ID: ${chatId}`);
	console.log(`   Topics to create: ${GOLDEN_SUPERGROUP_CONFIG.topics.length}\n`);

	// Verify permissions first
	await verifyBotPermissions(api, chatId, botToken);

	// Setup topics
	const topicMapping = await setupTopics(api, chatId);

	// Send welcome message to General topic (if exists)
	const generalThreadId = topicMapping.get(1);
	if (generalThreadId) {
		await sendWelcomeMessage(api, chatId, generalThreadId);
	} else {
		await sendWelcomeMessage(api, chatId);
	}

	console.log("🎉 Golden supergroup setup complete!\n");
	console.log("💡 Next steps:");
	console.log("   1. Update topic-mapping.ts with actual thread IDs");
	console.log("   2. Test sending messages: bun run examples/telegram-golden-setup.ts example-message");
	console.log("   3. Verify topics: bun run examples/telegram-golden-setup.ts verify\n");
}

async function cmdVerify(): Promise<void> {
	const { botToken, chatId } = await loadConfig();
	const api = new TelegramBotApi(botToken);

	console.log("🔍 Verifying Golden Supergroup Configuration\n");
	console.log(`   Chat ID: ${chatId}\n`);

	await verifyBotPermissions(api, chatId, botToken);
	await verifyTopics(api, chatId);
}

async function cmdExampleMessage(): Promise<void> {
	const { botToken, chatId } = await loadConfig();
	const api = new TelegramBotApi(botToken);

	const args = Bun.argv.slice(2);
	const threadIdArg = args.find(arg => arg.startsWith("--thread-id="));
	const threadId = threadIdArg ? parseInt(threadIdArg.split("=")[1]) : undefined;

	console.log("📨 Sending example alert message\n");
	
	if (threadId) {
		console.log(`   Thread ID: ${threadId}\n`);
		await sendExampleAlert(api, chatId, threadId);
	} else {
		console.log("   (Sending to general chat - use --thread-id=N to send to specific topic)\n");
		await sendExampleAlert(api, chatId);
	}
}

// ═══════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════

if (import.meta.main) {
	const command = Bun.argv[2] || "help";

	switch (command) {
		case "setup":
			cmdSetup().catch(console.error);
			break;
		case "verify":
			cmdVerify().catch(console.error);
			break;
		case "example-message":
		case "example":
			cmdExampleMessage().catch(console.error);
			break;
		case "help":
		default:
			console.log(`
📋 Golden Supergroup Setup Example

Usage:
  bun run examples/telegram-golden-setup.ts <command> [options]

Commands:
  setup              Create all topics from Golden Supergroup config
  verify             Verify bot permissions and existing topics
  example-message    Send example alert message with deep-link
                     (use --thread-id=N to send to specific topic)

Examples:
  bun run examples/telegram-golden-setup.ts setup
  bun run examples/telegram-golden-setup.ts verify
  bun run examples/telegram-golden-setup.ts example-message --thread-id=2

Configuration:
  Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables,
  or use Bun.secrets:
    bun secret set telegram.botToken "your_token"
    bun secret set telegram.chatId "your_chat_id"
`);
			break;
	}
}
