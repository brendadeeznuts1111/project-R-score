#!/usr/bin/env bun
/**
 * Covert Steam Alert Interactive Console CLI
 *
 * Interactive console interface for managing CovertSteamEvent alerts:
 * - Send alerts interactively
 * - Preview formatted messages
 * - Test credentials
 * - View severity information
 * - Manage alert routing
 *
 * Uses Bun's console AsyncIterable for interactive input
 */

import type { CovertSteamEventRecord } from "../types/covert-steam.js";
import {
	makeInspectable,
	InspectableCovertSteamSendResult,
} from "../types/covert-steam-inspectable.js";
import {
	sendCovertSteamAlertToTelegram,
	loadCovertSteamTelegramCredentials,
	type CovertSteamAlertTelegramSendOptions,
} from "../telegram/covert-steam-sender.js";
import {
	formatCovertSteamAlert,
	getCovertSteamSeverityLevel,
	getCovertSteamSeverityEmoji,
} from "../telegram/covert-steam-alert.js";
import { getAllMappings, TOPIC_NAMES } from "../telegram/topic-mapping.js";
import { COVERT_STEAM_DEFAULT_TOPIC_ID } from "../telegram/constants.js";
import {
	displayAlertsTable,
	displaySeverityThresholdsTable,
	displayTopicsTable,
	displayAlertStatsTable,
} from "./covert-steam-table.js";

// ═══════════════════════════════════════════════════════════════
// TABULAR DATA DISPLAY USING Bun.inspect.table()
// ═══════════════════════════════════════════════════════════════

interface AlertTableRow {
	Event: string;
	Bookmaker: string;
	Severity: string;
	Timestamp: string;
	Status: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSOLE UI HELPERS
// ═══════════════════════════════════════════════════════════════

function printHeader(): void {
	console.log("\n" + "=".repeat(60));
	console.log("🚨 Covert Steam Alert Management Console");
	console.log("=".repeat(60) + "\n");
}

function printPrompt(): void {
	console.write("covert-steam> ");
}

function printHelp(): void {
	console.log(`
Available Commands:
  send <event_id>              Send Covert Steam alert
    [--severity=<0-10>]        Impact severity score
    [--bookmaker=<name>]       Bookmaker name
    [--node=<node_id>]         Source dark node ID
    [--topic=<id>]             Topic ID (default: 2)
    [--pin]                    Pin message
    [--no-pin]                 Don't pin message

  format <event_id>            Format alert preview
    [--severity=<0-10>]        Impact severity score
    [--bookmaker=<name>]       Bookmaker name
    [--node=<node_id>]         Source dark node ID

  topics                       List available topics (table format)
  credentials                  Test Telegram credentials
  severity <score>             Get severity level info (table format)
  list, alerts                 List recent alerts (table format)
    [--limit=<n>]              Limit results (default: 10)
    [--severity=<0-10>]        Filter by minimum severity
    [--bookmaker=<name>]       Filter by bookmaker
  stats                        Show alert statistics (table format)
  help                        Show this help message
  exit, quit                   Exit console

Examples:
  send NFL-2025-001 --severity=9.5 --bookmaker=DraftKings
  format NFL-2025-001 --severity=7.5
  severity 9.5
`);
}

function printError(message: string): void {
	console.error(`❌ Error: ${message}\n`);
}

function printSuccess(message: string): void {
	console.log(`✅ ${message}\n`);
}

function printInfo(message: string): void {
	console.log(`ℹ️  ${message}\n`);
}

// ═══════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleSend(args: string[]): Promise<void> {
	const eventIdentifier = args[0];
	if (!eventIdentifier) {
		printError("Event identifier required");
		console.log("Usage: send <event_id> [options]");
		return;
	}

	let detectionTimestamp = Date.now();
	let bookmakerName: string | undefined;
	let sourceDarkNodeId: string | undefined;
	let impactSeverityScore: number | undefined;
	let topicId: number | undefined;
	let pinMessage: boolean | undefined;

	// Parse options
	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--severity=")) {
			impactSeverityScore = parseFloat(arg.split("=")[1]);
		} else if (arg.startsWith("--bookmaker=")) {
			bookmakerName = arg.split("=")[1];
		} else if (arg.startsWith("--node=")) {
			sourceDarkNodeId = arg.split("=")[1];
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

	try {
		console.log(`📤 Sending alert: ${eventIdentifier}...`);

		// Use inspectable wrapper for better console output
		const inspectableAlert = makeInspectable(covertSteamAlert);
		console.log(`\n${Bun.inspect(inspectableAlert)}\n`);

		const result = await sendCovertSteamAlertToTelegram(
			covertSteamAlert,
			sendOptions,
		);
		const inspectableResult = new InspectableCovertSteamSendResult(result);

		if (result.ok) {
			printSuccess(`Alert sent successfully!`);
			console.log(`${Bun.inspect(inspectableResult)}`);
			console.log(`   Topic: ${topicId ?? COVERT_STEAM_DEFAULT_TOPIC_ID}`);
			console.log(
				`   Pinned: ${(pinMessage ?? (impactSeverityScore ?? 0) >= 9) ? "Yes" : "No"}\n`,
			);
		} else {
			printError(`Failed to send: ${result.error}`);
			console.log(`${Bun.inspect(inspectableResult)}\n`);
		}
	} catch (error) {
		printError((error as Error).message);
	}
}

async function handleFormat(args: string[]): Promise<void> {
	const eventIdentifier = args[0];
	if (!eventIdentifier) {
		printError("Event identifier required");
		console.log("Usage: format <event_id> [options]");
		return;
	}

	let detectionTimestamp = Date.now();
	let bookmakerName: string | undefined;
	let sourceDarkNodeId: string | undefined;
	let impactSeverityScore: number | undefined;

	// Parse options
	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--severity=")) {
			impactSeverityScore = parseFloat(arg.split("=")[1]);
		} else if (arg.startsWith("--bookmaker=")) {
			bookmakerName = arg.split("=")[1];
		} else if (arg.startsWith("--node=")) {
			sourceDarkNodeId = arg.split("=")[1];
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
		// Use inspectable wrapper for better console output
		const inspectableAlert = makeInspectable(covertSteamAlert);
		const formattedMessage = formatCovertSteamAlert(covertSteamAlert);
		const severityLevel = getCovertSteamSeverityLevel(impactSeverityScore ?? 0);
		const severityEmoji = getCovertSteamSeverityEmoji(impactSeverityScore ?? 0);

		console.log(`\n📋 Alert Preview\n`);
		console.log(`${Bun.inspect(inspectableAlert)}\n`);
		console.log("─".repeat(60));
		console.log(formattedMessage);
		console.log("─".repeat(60) + "\n");
	} catch (error) {
		printError((error as Error).message);
	}
}

async function handleTopics(): Promise<void> {
	console.log(`\n📋 Available Telegram Topics\n`);

	try {
		// Use Bun.inspect.table() for tabular display
		await displayTopicsTable();
		console.log(
			`\n💡 Use --topic=<id> in send command to route to specific topic\n`,
		);
	} catch (error) {
		printError((error as Error).message);
	}
}

async function handleCredentials(): Promise<void> {
	console.log(`\n🔐 Testing Telegram Credentials...\n`);

	try {
		const credentials = await loadCovertSteamTelegramCredentials();

		printSuccess("Credentials loaded successfully!");
		console.log(
			`   Bot Token: ${credentials.botToken.substring(0, 10)}...${credentials.botToken.substring(credentials.botToken.length - 5)}`,
		);
		console.log(`   Chat ID: ${credentials.chatId}\n`);
		console.log(`💡 Ready to send Covert Steam alerts\n`);
	} catch (error) {
		printError((error as Error).message);
		console.log(`💡 Set credentials using:`);
		console.log(`   bun secret set TELEGRAM_BOT_TOKEN 'your_token'`);
		console.log(`   bun secret set TELEGRAM_CHAT_ID 'your_chat_id'\n`);
	}
}

function handleSeverity(args: string[]): void {
	const scoreStr = args[0];
	if (!scoreStr) {
		printError("Severity score required");
		console.log("Usage: severity <0-10>");
		return;
	}

	const severityScore = parseFloat(scoreStr);
	if (isNaN(severityScore) || severityScore < 0 || severityScore > 10) {
		printError("Severity score must be between 0 and 10");
		return;
	}

	try {
		const severityLevel = getCovertSteamSeverityLevel(severityScore);
		const severityEmoji = getCovertSteamSeverityEmoji(severityScore);
		const willPin = severityScore >= 9;

		console.log(`\n📊 Severity Analysis for Score: ${severityScore}\n`);

		// Use Bun.inspect.table() for threshold display
		const thresholdTableData = [
			{
				Level: "CRITICAL",
				Range: ">= 9",
				Emoji: "🚨",
				"Auto-Pin": "Yes",
				Current: severityScore >= 9 ? "✓" : "",
			},
			{
				Level: "HIGH",
				Range: ">= 7 and < 9",
				Emoji: "⚠️",
				"Auto-Pin": "No",
				Current: severityScore >= 7 && severityScore < 9 ? "✓" : "",
			},
			{
				Level: "MEDIUM",
				Range: ">= 5 and < 7",
				Emoji: "📈",
				"Auto-Pin": "No",
				Current: severityScore >= 5 && severityScore < 7 ? "✓" : "",
			},
			{
				Level: "LOW",
				Range: "< 5",
				Emoji: "📊",
				"Auto-Pin": "No",
				Current: severityScore < 5 ? "✓" : "",
			},
		];

		console.log(
			Bun.inspect.table(
				thresholdTableData,
				["Level", "Range", "Emoji", "Auto-Pin", "Current"],
				{
					colors: true,
				},
			),
		);

		console.log(
			`\nCurrent Score: ${severityScore} → ${severityLevel} ${severityEmoji}`,
		);
		console.log(`Auto-Pin: ${willPin ? "Yes (CRITICAL threshold)" : "No"}\n`);
	} catch (error) {
		printError((error as Error).message);
	}
}

async function handleListAlerts(args: string[]): Promise<void> {
	let limit = 10;
	let severityFilter: number | undefined;
	let bookmakerFilter: string | undefined;

	// Parse options
	for (const arg of args) {
		if (arg.startsWith("--limit=")) {
			limit = parseInt(arg.split("=")[1], 10);
		} else if (arg.startsWith("--severity=")) {
			severityFilter = parseFloat(arg.split("=")[1]);
		} else if (arg.startsWith("--bookmaker=")) {
			bookmakerFilter = arg.split("=")[1];
		}
	}

	try {
		// In a real implementation, fetch from API or database
		// For now, show example table structure
		const exampleAlerts: CovertSteamEventRecord[] = [
			{
				event_identifier: "NFL-2025-001",
				detection_timestamp: Date.now() - 3600000,
				bookmaker_name: "DraftKings",
				impact_severity_score: 9.5,
			},
			{
				event_identifier: "NFL-2025-002",
				detection_timestamp: Date.now() - 7200000,
				bookmaker_name: "Betfair",
				impact_severity_score: 7.2,
			},
		];

		console.log(`\n📋 Recent Covert Steam Alerts\n`);

		if (exampleAlerts.length === 0) {
			console.log("No alerts found.\n");
			return;
		}

		// Use Bun.inspect.table() for tabular display
		displayAlertsTable(exampleAlerts, { limit });

		console.log(`\n💡 Use 'send' command to create new alerts\n`);
	} catch (error) {
		printError((error as Error).message);
	}
}

async function handleStats(): Promise<void> {
	try {
		// In a real implementation, fetch from API
		// For now, show example stats table structure
		const exampleStats = {
			total: 42,
			bySeverity: {
				critical: 8,
				high: 15,
				medium: 12,
				low: 7,
			},
			byBookmaker: {
				DraftKings: 18,
				Betfair: 12,
				FanDuel: 12,
			},
		};

		console.log(`\n📊 Covert Steam Alert Statistics\n`);

		// Use Bun.inspect.table() for stats display
		displayAlertStatsTable(exampleStats);

		console.log();
	} catch (error) {
		printError((error as Error).message);
	}
}

// ═══════════════════════════════════════════════════════════════
// MAIN INTERACTIVE LOOP
// ═══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
	printHeader();
	printHelp();

	// Handle Ctrl+C gracefully
	process.on("SIGINT", () => {
		console.log("\n\n👋 Goodbye!\n");
		process.exit(0);
	});

	printPrompt();

	// Use Bun's console AsyncIterable to read from stdin
	for await (const line of console) {
		const trimmed = line.trim();

		// Skip empty lines
		if (!trimmed) {
			printPrompt();
			continue;
		}

		// Parse command
		const parts = trimmed.split(/\s+/);
		const command = parts[0].toLowerCase();
		const args = parts.slice(1);

		switch (command) {
			case "send":
				await handleSend(args);
				break;

			case "format":
				await handleFormat(args);
				break;

			case "topics":
				await handleTopics();
				break;

			case "credentials":
			case "creds":
				await handleCredentials();
				break;

			case "severity":
				handleSeverity(args);
				break;

			case "list":
			case "alerts":
				await handleListAlerts(args);
				break;

			case "stats":
				await handleStats();
				break;

			case "help":
			case "?":
				printHelp();
				break;

			case "exit":
			case "quit":
			case "q":
				console.log("\n👋 Goodbye!\n");
				process.exit(0);

			default:
				printError(`Unknown command: ${command}`);
				console.log(`Type 'help' for available commands\n`);
		}

		printPrompt();
	}
}

// Run if executed directly
if (import.meta.main) {
	main().catch((error) => {
		console.error("\n❌ Fatal error:");
		console.error(error);
		process.exit(1);
	});
}
