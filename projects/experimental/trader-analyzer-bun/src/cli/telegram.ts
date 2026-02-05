#!/usr/bin/env bun
/**
 * Telegram Group Management CLI
 *
 * Comprehensive tool for managing Telegram supergroups:
 * - Topic/thread management
 * - Message sending with logging
 * - Thread ID discovery
 * - Group info and statistics
 * - Message history
 */

import { TelegramBotApi } from "../api/telegram-ws.js";
import { mkdir } from "node:fs/promises";
import { join } from "path";
import type { CovertSteamEventRecord } from "../types/covert-steam.js";
import {
	sendCovertSteamAlertToTelegram,
	type CovertSteamAlertTelegramSendOptions,
} from "../telegram/covert-steam-sender.js";
import {
	formatCovertSteamAlert,
	getCovertSteamSeverityLevel,
	getCovertSteamSeverityEmoji,
} from "../telegram/covert-steam-alert.js";
import { getAllMappings, TOPIC_NAMES } from "../telegram/topic-mapping.js";
import { COVERT_STEAM_DEFAULT_TOPIC_ID } from "../telegram/constants.js";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION & LOGGING
// ═══════════════════════════════════════════════════════════════

interface TelegramConfig {
	botToken: string;
	chatId: string;
	logDir: string;
}

interface MessageLog {
	timestamp: string;
	threadId?: number;
	messageId?: number;
	message: string;
	pinned: boolean;
	success: boolean;
	error?: string;
}

class TelegramLogger {
	private logDir: string;
	private logFile: string;

	constructor(logDir: string) {
		this.logDir = logDir;
		const today = new Date().toISOString().split("T")[0];
		this.logFile = join(logDir, `telegram-${today}.jsonl`);
	}

	async log(message: MessageLog): Promise<void> {
		// Ensure log directory exists (lazy initialization)
		const logDirFile = Bun.file(this.logDir);
		if (!(await logDirFile.exists())) {
			await mkdir(this.logDir, { recursive: true });
		}

		const line = JSON.stringify(message) + "\n";
		const file = Bun.file(this.logFile);
		await Bun.write(file, line);
	}

	async getHistory(limit = 50): Promise<MessageLog[]> {
		const logFile = Bun.file(this.logFile);
		if (!(await logFile.exists())) {
			return [];
		}

		const file = Bun.file(this.logFile);
		const text = await file.text();
		const lines = text.trim().split("\n").filter(Boolean);

		return lines
			.slice(-limit)
			.map((line) => JSON.parse(line) as MessageLog)
			.reverse();
	}

	async getThreadHistory(threadId: number, limit = 20): Promise<MessageLog[]> {
		const history = await this.getHistory(1000);
		return history.filter((log) => log.threadId === threadId).slice(0, limit);
	}
}

// ═══════════════════════════════════════════════════════════════
// CONFIG LOADING
// ═══════════════════════════════════════════════════════════════

async function loadConfig(): Promise<TelegramConfig> {
	let botToken = process.env.TELEGRAM_BOT_TOKEN;
	let chatId =
		process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_SUPERGROUP_ID;

	// Try Bun.secrets
	if (!botToken) {
		try {
			botToken =
				(await Bun.secrets.get({
					service: "nexus",
					name: "telegram.botToken",
				})) || "";
		} catch {
			// Ignore
		}
	}

	if (!chatId) {
		try {
			chatId =
				(await Bun.secrets.get({
					service: "nexus",
					name: "telegram.chatId",
				})) || "";
		} catch {
			// Ignore
		}
	}

	if (!botToken) {
		console.error("❌ TELEGRAM_BOT_TOKEN not set");
		console.error("   Set it with: export TELEGRAM_BOT_TOKEN=your_token");
		process.exit(1);
	}

	if (!chatId) {
		console.error("❌ TELEGRAM_CHAT_ID not set");
		console.error("   Set it with: export TELEGRAM_CHAT_ID=your_chat_id");
		process.exit(1);
	}

	const logDir =
		process.env.TELEGRAM_LOG_DIR ||
		join(process.cwd(), "data", "telegram-logs");

	return { botToken, chatId, logDir };
}

// ═══════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════

async function cmdSend(
	api: TelegramBotApi,
	logger: TelegramLogger,
	chatId: string,
	args: string[],
): Promise<void> {
	let message = "";
	let threadId: number | undefined;
	let pin = false;

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--topic" || args[i] === "--thread") {
			threadId = parseInt(args[++i], 10);
		} else if (args[i] === "--pin") {
			pin = true;
		} else if (!message) {
			message = args[i];
		}
	}

	if (!message) {
		console.error("❌ Message is required");
		console.error(
			'   Usage: telegram send "Your message" [--topic <id>] [--pin]',
		);
		process.exit(1);
	}

	console.log(`📤 Sending message...`);
	if (threadId) console.log(`   Topic: ${threadId}`);
	if (pin) console.log(`   Pin: Yes`);

	try {
		let result;
		let messageId: number | undefined;
		let errorMsg: string | undefined;

		if (pin && threadId) {
			result = await api.sendAndPin(chatId, message, threadId);
			if (result.ok) {
				messageId = result.messageId;
			} else {
				errorMsg = result.error;
			}
		} else {
			result = await api.sendMessage(chatId, message, threadId);
			if (result.ok) {
				messageId = result.result?.message_id;
			} else {
				errorMsg = result.description;
			}
		}

		const logEntry: MessageLog = {
			timestamp: new Date().toISOString(),
			threadId,
			messageId,
			message,
			pinned: pin && !!threadId,
			success: result.ok,
			error: errorMsg,
		};

		await logger.log(logEntry);

		if (result.ok) {
			console.log("✅ Message sent successfully!");
			if (messageId) console.log(`   Message ID: ${messageId}`);
			if (pin) console.log(`   Pinned: Yes`);
		} else {
			console.error("❌ Failed to send message:");
			console.error(`   ${logEntry.error}`);
			process.exit(1);
		}
	} catch (error) {
		const logEntry: MessageLog = {
			timestamp: new Date().toISOString(),
			threadId,
			message,
			pinned: pin && !!threadId,
			success: false,
			error: (error as Error).message,
		};
		await logger.log(logEntry);

		console.error("❌ Error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdListTopics(
	api: TelegramBotApi,
	chatId: string,
): Promise<void> {
	console.log(`📋 Fetching forum topics...\n`);

	try {
		const result = await api.getForumTopics(chatId);

		if (result.ok && result.result?.topics) {
			const topics = result.result.topics;
			console.log(`✅ Found ${topics.length} topics:\n`);

			for (const topic of topics) {
				const icon = topic.icon_custom_emoji_id ? "🎯" : "📌";
				console.log(`  ${icon} #${topic.message_thread_id} - ${topic.name}`);
			}

			console.log(`\n💡 Usage:`);
			console.log(`   telegram send "Message" --topic <thread_id>`);
		} else {
			console.warn("⚠️  Could not fetch topics via API");
			console.warn(`   ${result.description || "Unknown error"}`);
			console.warn(
				`\n💡 You can still send to topics by specifying --topic <id>`,
			);
		}
	} catch (error) {
		console.error("❌ Error fetching topics:");
		console.error(`   ${(error as Error).message}`);
	}
}

async function cmdDiscoverTopics(
	api: TelegramBotApi,
	logger: TelegramLogger,
	chatId: string,
	maxThreadId = 20,
): Promise<void> {
	console.log(`🔍 Discovering valid topics (testing 1-${maxThreadId})...\n`);

	const validTopics: number[] = [];

	for (let threadId = 1; threadId <= maxThreadId; threadId++) {
		process.stdout.write(`  Testing ${threadId}... `);

		try {
			const result = await api.sendMessage(
				chatId,
				`🔍 Topic discovery test`,
				threadId,
			);

			if (result.ok) {
				console.log("✅");
				validTopics.push(threadId);

				// Log discovery
				await logger.log({
					timestamp: new Date().toISOString(),
					threadId,
					messageId: result.result?.message_id,
					message: "Topic discovery test",
					pinned: false,
					success: true,
				});

				// Delete test message
				if (result.result?.message_id) {
					try {
						const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
						await fetch(
							`https://api.telegram.org/bot${botToken}/deleteMessage?chat_id=${chatId}&message_id=${result.result.message_id}`,
						);
					} catch {
						// Ignore delete errors
					}
				}
			} else {
				console.log("❌");
			}
		} catch {
			console.log("❌");
		}

		// Rate limiting
		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	console.log(`\n✅ Found ${validTopics.length} valid topics:`);
	for (const topicId of validTopics) {
		console.log(`   • Topic ${topicId}`);
	}
}

async function cmdHistory(
	logger: TelegramLogger,
	args: string[],
): Promise<void> {
	const limit = parseInt(
		args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "50",
		10,
	);
	const threadId = args.find((a) => a.startsWith("--topic="))?.split("=")[1];

	let history: MessageLog[];

	if (threadId) {
		history = await logger.getThreadHistory(parseInt(threadId, 10), limit);
		console.log(`📜 Message history for topic ${threadId}:\n`);
	} else {
		history = await logger.getHistory(limit);
		console.log(`📜 Recent message history:\n`);
	}

	if (history.length === 0) {
		console.log("   No messages found.");
		return;
	}

	for (const log of history) {
		const time = new Date(log.timestamp).toLocaleString();
		const status = log.success ? "✅" : "❌";
		const topic = log.threadId ? ` [Topic ${log.threadId}]` : "";
		const pinned = log.pinned ? " 📌" : "";

		console.log(`${status} ${time}${topic}${pinned}`);
		console.log(
			`   ${log.message.substring(0, 80)}${log.message.length > 80 ? "..." : ""}`,
		);
		if (log.error) {
			console.log(`   Error: ${log.error}`);
		}
		console.log("");
	}
}

async function cmdCreateTopic(
	api: TelegramBotApi,
	logger: TelegramLogger,
	chatId: string,
	args: string[],
): Promise<void> {
	const name = args[0];
	const iconColor = args.find((a) => a.startsWith("--color="))?.split("=")[1];
	const iconEmoji = args.find((a) => a.startsWith("--emoji="))?.split("=")[1];

	if (!name) {
		console.error("❌ Topic name is required");
		console.error(
			'   Usage: telegram create-topic "Topic Name" [--color=<0-5>] [--emoji=<emoji_id>]',
		);
		process.exit(1);
	}

	console.log(`📝 Creating topic: ${name}...`);

	try {
		const result = await api.createForumTopic(
			chatId,
			name,
			iconColor ? parseInt(iconColor, 10) : undefined,
			iconEmoji,
		);

		if (result.ok && result.result) {
			console.log(`✅ Topic created successfully!`);
			console.log(`   Thread ID: ${result.result.message_thread_id}`);
			console.log(`   Name: ${name}`);

			await logger.log({
				timestamp: new Date().toISOString(),
				threadId: result.result.message_thread_id,
				message: `Topic created: ${name}`,
				pinned: false,
				success: true,
			});
		} else {
			console.error("❌ Failed to create topic:");
			console.error(`   ${result.description || "Unknown error"}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdEditTopic(
	api: TelegramBotApi,
	logger: TelegramLogger,
	chatId: string,
	args: string[],
): Promise<void> {
	const threadId = parseInt(args[0], 10);
	const name = args.find((a) => !a.startsWith("--"))?.[1];
	const emoji = args.find((a) => a.startsWith("--emoji="))?.split("=")[1];

	if (!threadId || isNaN(threadId)) {
		console.error("❌ Thread ID is required");
		console.error(
			'   Usage: telegram edit-topic <thread_id> [--name="New Name"] [--emoji=<emoji_id>]',
		);
		process.exit(1);
	}

	console.log(`✏️  Editing topic ${threadId}...`);

	try {
		const result = await api.editForumTopic(chatId, threadId, name, emoji);

		if (result.ok) {
			console.log(`✅ Topic updated successfully!`);

			await logger.log({
				timestamp: new Date().toISOString(),
				threadId,
				message: `Topic edited: ${name || "name/icon updated"}`,
				pinned: false,
				success: true,
			});
		} else {
			console.error("❌ Failed to edit topic:");
			console.error(`   ${result.description || "Unknown error"}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdCloseTopic(
	api: TelegramBotApi,
	logger: TelegramLogger,
	chatId: string,
	threadId: number,
): Promise<void> {
	console.log(`🔒 Closing topic ${threadId}...`);

	try {
		const result = await api.closeForumTopic(chatId, threadId);

		if (result.ok) {
			console.log(`✅ Topic closed successfully!`);

			await logger.log({
				timestamp: new Date().toISOString(),
				threadId,
				message: "Topic closed",
				pinned: false,
				success: true,
			});
		} else {
			console.error("❌ Failed to close topic:");
			console.error(`   ${result.description || "Unknown error"}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdReopenTopic(
	api: TelegramBotApi,
	logger: TelegramLogger,
	chatId: string,
	threadId: number,
): Promise<void> {
	console.log(`🔓 Reopening topic ${threadId}...`);

	try {
		const result = await api.reopenForumTopic(chatId, threadId);

		if (result.ok) {
			console.log(`✅ Topic reopened successfully!`);

			await logger.log({
				timestamp: new Date().toISOString(),
				threadId,
				message: "Topic reopened",
				pinned: false,
				success: true,
			});
		} else {
			console.error("❌ Failed to reopen topic:");
			console.error(`   ${result.description || "Unknown error"}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdDeleteTopic(
	api: TelegramBotApi,
	logger: TelegramLogger,
	chatId: string,
	threadId: number,
): Promise<void> {
	console.log(`🗑️  Deleting topic ${threadId}...`);

	try {
		const result = await api.deleteForumTopic(chatId, threadId);

		if (result.ok) {
			console.log(`✅ Topic deleted successfully!`);

			await logger.log({
				timestamp: new Date().toISOString(),
				threadId,
				message: "Topic deleted",
				pinned: false,
				success: true,
			});
		} else {
			console.error("❌ Failed to delete topic:");
			console.error(`   ${result.description || "Unknown error"}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Error:");
		console.error(`   ${(error as Error).message}`);
		process.exit(1);
	}
}

// ═══════════════════════════════════════════════════════════════
// COVERT STEAM ALERT COMMANDS
// ═══════════════════════════════════════════════════════════════

async function cmdCovertSteam(args: string[]): Promise<void> {
	const subcommand = args[0];

	switch (subcommand) {
		case "send":
			await cmdCovertSteamSend(args.slice(1));
			break;

		case "format":
			await cmdCovertSteamFormat(args.slice(1));
			break;

		case "list-topics":
			await cmdCovertSteamListTopics();
			break;

		case "test-credentials":
			await cmdCovertSteamTestCredentials();
			break;

		case "severity-info":
			if (!args[1]) {
				console.error("❌ Severity score required");
				console.error("   Usage: telegram covert-steam severity-info <0-10>");
				process.exit(1);
			}
			await cmdCovertSteamSeverityInfo(parseFloat(args[1]));
			break;

		default:
			console.error(`❌ Unknown covert-steam command: ${subcommand || "none"}`);
			console.error(
				`   Available: send, format, list-topics, test-credentials, severity-info`,
			);
			process.exit(1);
	}
}

async function cmdCovertSteamSend(args: string[]): Promise<void> {
	const eventIdentifier = args[0];
	if (!eventIdentifier) {
		console.error("❌ Event identifier required");
		console.error("   Usage: telegram covert-steam send <event_id> [options]");
		process.exit(1);
	}

	let detectionTimestamp = Date.now();
	let bookmakerName: string | undefined;
	let sourceDarkNodeId: string | undefined;
	let impactSeverityScore: number | undefined;
	let topicId: number | undefined;
	let pinMessage: boolean | undefined;

	// Parse arguments
	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--timestamp=")) {
			detectionTimestamp = parseInt(arg.split("=")[1], 10);
		} else if (arg.startsWith("--bookmaker=")) {
			bookmakerName = arg.split("=")[1];
		} else if (arg.startsWith("--node=")) {
			sourceDarkNodeId = arg.split("=")[1];
		} else if (arg.startsWith("--severity=")) {
			impactSeverityScore = parseFloat(arg.split("=")[1]);
		} else if (arg.startsWith("--topic=")) {
			topicId = parseInt(arg.split("=")[1], 10);
		} else if (arg === "--pin") {
			pinMessage = true;
		} else if (arg === "--no-pin") {
			pinMessage = false;
		}
	}

	const covertSteamAlert: CovertSteamEventRecord = {
		event_identifier: eventIdentifier,
		detection_timestamp: detectionTimestamp,
		bookmaker_name: bookmakerName,
		source_dark_node_id: sourceDarkNodeId,
		impact_severity_score: impactSeverityScore,
	};

	const sendOptions: CovertSteamAlertTelegramSendOptions = {
		topicId,
		pinMessage,
	};

	console.log(`📤 Sending Covert Steam alert: ${eventIdentifier}...\n`);

	try {
		const result = await sendCovertSteamAlertToTelegram(
			covertSteamAlert,
			sendOptions,
		);

		if (result.ok) {
			console.log(`✅ Alert sent successfully!`);
			console.log(`   Message ID: ${result.messageId}`);
			console.log(`   Topic: ${topicId ?? COVERT_STEAM_DEFAULT_TOPIC_ID}`);
			console.log(
				`   Pinned: ${(pinMessage ?? (impactSeverityScore ?? 0) >= 9) ? "Yes" : "No"}`,
			);
		} else {
			console.error(`❌ Failed to send alert: ${result.error}`);
			process.exit(1);
		}
	} catch (error) {
		console.error(`❌ Error: ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdCovertSteamFormat(args: string[]): Promise<void> {
	const eventIdentifier = args[0];
	if (!eventIdentifier) {
		console.error("❌ Event identifier required");
		console.error(
			"   Usage: telegram covert-steam format <event_id> [options]",
		);
		process.exit(1);
	}

	let detectionTimestamp = Date.now();
	let bookmakerName: string | undefined;
	let sourceDarkNodeId: string | undefined;
	let impactSeverityScore: number | undefined;

	// Parse arguments
	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--timestamp=")) {
			detectionTimestamp = parseInt(arg.split("=")[1], 10);
		} else if (arg.startsWith("--bookmaker=")) {
			bookmakerName = arg.split("=")[1];
		} else if (arg.startsWith("--node=")) {
			sourceDarkNodeId = arg.split("=")[1];
		} else if (arg.startsWith("--severity=")) {
			impactSeverityScore = parseFloat(arg.split("=")[1]);
		}
	}

	const covertSteamAlert: CovertSteamEventRecord = {
		event_identifier: eventIdentifier,
		detection_timestamp: detectionTimestamp,
		bookmaker_name: bookmakerName,
		source_dark_node_id: sourceDarkNodeId,
		impact_severity_score: impactSeverityScore,
	};

	try {
		const formattedMessage = formatCovertSteamAlert(covertSteamAlert);
		const severityLevel = getCovertSteamSeverityLevel(impactSeverityScore ?? 0);
		const severityEmoji = getCovertSteamSeverityEmoji(impactSeverityScore ?? 0);

		console.log(`📋 Covert Steam Alert Preview\n`);
		console.log(`Severity: ${severityLevel} ${severityEmoji}`);
		console.log(`Event: ${eventIdentifier}`);
		console.log(`Timestamp: ${new Date(detectionTimestamp).toISOString()}\n`);
		console.log(`${"=".repeat(60)}`);
		console.log(formattedMessage);
		console.log(`${"=".repeat(60)}`);
	} catch (error) {
		console.error(`❌ Error formatting alert: ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdCovertSteamListTopics(): Promise<void> {
	console.log(`📋 Available Telegram Topics for Covert Steam Alerts\n`);

	try {
		const topicMappings = getAllMappings();
		console.log(
			`Default Topic: Live Alerts (Topic ID: ${COVERT_STEAM_DEFAULT_TOPIC_ID})\n`,
		);
		console.log(`Available Topics:`);

		for (const [name, threadId] of Object.entries(topicMappings)) {
			const topicName =
				TOPIC_NAMES[threadId as keyof typeof TOPIC_NAMES] || name;
			console.log(`  • ${topicName} (Thread ID: ${threadId})`);
		}

		console.log(
			`\n💡 Use --topic=<id> in send command to route to specific topic`,
		);
	} catch (error) {
		console.error(`❌ Error listing topics: ${(error as Error).message}`);
		process.exit(1);
	}
}

async function cmdCovertSteamTestCredentials(): Promise<void> {
	console.log(`🔐 Testing Telegram Credentials...\n`);

	try {
		const { loadCovertSteamTelegramCredentials } = await import(
			"../telegram/covert-steam-sender.js"
		);
		const credentials = await loadCovertSteamTelegramCredentials();

		console.log(`✅ Credentials loaded successfully!`);
		console.log(
			`   Bot Token: ${credentials.botToken.substring(0, 10)}...${credentials.botToken.substring(credentials.botToken.length - 5)}`,
		);
		console.log(`   Chat ID: ${credentials.chatId}`);
		console.log(`\n💡 Ready to send Covert Steam alerts`);
	} catch (error) {
		console.error(`❌ Failed to load credentials: ${(error as Error).message}`);
		console.error(`\n💡 Set credentials using:`);
		console.error(`   bun secret set TELEGRAM_BOT_TOKEN 'your_token'`);
		console.error(`   bun secret set TELEGRAM_CHAT_ID 'your_chat_id'`);
		process.exit(1);
	}
}

async function cmdCovertSteamSeverityInfo(
	severityScore: number,
): Promise<void> {
	if (severityScore < 0 || severityScore > 10) {
		console.error(`❌ Severity score must be between 0 and 10`);
		process.exit(1);
	}

	try {
		const severityLevel = getCovertSteamSeverityLevel(severityScore);
		const severityEmoji = getCovertSteamSeverityEmoji(severityScore);
		const willPin = severityScore >= 9;

		console.log(`📊 Severity Analysis for Score: ${severityScore}\n`);
		console.log(`Level: ${severityLevel} ${severityEmoji}`);
		console.log(`Auto-Pin: ${willPin ? "Yes (CRITICAL threshold)" : "No"}\n`);
		console.log(`Severity Thresholds:`);
		console.log(`  • CRITICAL: >= 9 (auto-pinned)`);
		console.log(`  • HIGH: >= 7 and < 9`);
		console.log(`  • MEDIUM: >= 5 and < 7`);
		console.log(`  • LOW: < 5`);
	} catch (error) {
		console.error(`❌ Error analyzing severity: ${(error as Error).message}`);
		process.exit(1);
	}
}

function showHelp(): void {
	console.log(`
📱 Telegram Group Management CLI

USAGE:
  bun run telegram <command> [options]

COMMANDS:
  send <message>              Send a message
    --topic <id>              Send to specific topic/thread
    --pin                     Pin the message

  list-topics                 List all forum topics

  discover-topics [--max=<n>] Discover valid topics (tests 1-N)
                              Default max: 20

  history                     Show message history
    --limit=<n>               Limit results (default: 50)
    --topic=<id>              Filter by topic

  create-topic <name>         Create a new forum topic
    --color=<0-5>             Icon color (0-5)
    --emoji=<emoji_id>        Custom emoji icon

  edit-topic <thread_id>      Edit topic name/icon
    --name="New Name"         New topic name
    --emoji=<emoji_id>        New emoji icon

  close-topic <thread_id>     Close a topic

  reopen-topic <thread_id>    Reopen a closed topic

  delete-topic <thread_id>    Delete a topic

  covert-steam                Covert Steam Alert Commands
    send <event_id>           Send Covert Steam alert
      --timestamp=<ms>        Detection timestamp (default: now)
      --bookmaker=<name>      Bookmaker name
      --node=<node_id>        Source dark node ID
      --severity=<0-10>       Impact severity score
      --topic=<id>            Topic ID (default: 2)
      --pin                   Pin message (auto if severity >= 9)
      --no-pin                Don't pin message
    format <event_id>         Format alert without sending (preview)
      --timestamp=<ms>        Detection timestamp (default: now)
      --bookmaker=<name>      Bookmaker name
      --node=<node_id>        Source dark node ID
      --severity=<0-10>       Impact severity score
    list-topics               List available topics for routing
    test-credentials          Test Telegram credentials
    severity-info <score>     Get severity level information

EXAMPLES:
  bun run telegram send "Hello!" --topic 2 --pin
  bun run telegram list-topics
  bun run telegram discover-topics --max=50
  bun run telegram history --topic=2 --limit=10
  bun run telegram create-topic "New Topic" --color=3
  bun run telegram edit-topic 5 --name="Updated Name"
  bun run telegram covert-steam send "NFL-2025-001" --severity=9.5 --bookmaker="DraftKings"
  bun run telegram covert-steam format "NFL-2025-001" --severity=7.5
  bun run telegram covert-steam severity-info 9.5

LOGGING:
  All actions are logged to: data/telegram-logs/telegram-YYYY-MM-DD.jsonl
  Set TELEGRAM_LOG_DIR to customize log directory

ENVIRONMENT:
  TELEGRAM_BOT_TOKEN          Bot token (required)
  TELEGRAM_CHAT_ID           Chat/supergroup ID (required)
  TELEGRAM_LOG_DIR            Log directory (optional)
`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
	const config = await loadConfig();
	const api = new TelegramBotApi(config.botToken);
	const logger = new TelegramLogger(config.logDir);

	const command = process.argv[2];
	const args = process.argv.slice(3);

	switch (command) {
		case "send":
			await cmdSend(api, logger, config.chatId, args);
			break;

		case "list-topics":
		case "topics":
			await cmdListTopics(api, config.chatId);
			break;

		case "discover-topics":
		case "discover":
			const maxArg = args.find((a) => a.startsWith("--max="));
			const max = maxArg ? parseInt(maxArg.split("=")[1], 10) : 20;
			await cmdDiscoverTopics(api, logger, config.chatId, max);
			break;

		case "history":
		case "logs":
			await cmdHistory(logger, args);
			break;

		case "create-topic":
		case "create":
			await cmdCreateTopic(api, logger, config.chatId, args);
			break;

		case "edit-topic":
		case "edit":
			await cmdEditTopic(api, logger, config.chatId, args);
			break;

		case "close-topic":
		case "close":
			if (!args[0]) {
				console.error("❌ Thread ID required");
				process.exit(1);
			}
			await cmdCloseTopic(api, logger, config.chatId, parseInt(args[0], 10));
			break;

		case "reopen-topic":
		case "reopen":
			if (!args[0]) {
				console.error("❌ Thread ID required");
				process.exit(1);
			}
			await cmdReopenTopic(api, logger, config.chatId, parseInt(args[0], 10));
			break;

		case "delete-topic":
		case "delete":
			if (!args[0]) {
				console.error("❌ Thread ID required");
				process.exit(1);
			}
			await cmdDeleteTopic(api, logger, config.chatId, parseInt(args[0], 10));
			break;

		case "covert-steam":
			await cmdCovertSteam(args);
			break;

		case "help":
		case "--help":
		case "-h":
			showHelp();
			break;

		default:
			if (!command) {
				showHelp();
			} else {
				console.error(`❌ Unknown command: ${command}`);
				console.error(`   Run 'bun run telegram help' for usage`);
				process.exit(1);
			}
	}
}

main().catch((error) => {
	console.error("❌ Fatal error:");
	console.error(error);
	process.exit(1);
});
