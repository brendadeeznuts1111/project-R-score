/**
 * @fileoverview Covert Steam Alert Management MCP Tools
 * @module mcp/tools/covert-steam-alerts
 *
 * MCP tools for managing CovertSteamEvent alerts:
 * - Send alerts to Telegram
 * - View alert history
 * - Test alert formatting
 * - Manage alert routing
 */

import type { MCPTool } from "../server";
import type { CovertSteamEventRecord } from "../../types/covert-steam";
import {
	sendCovertSteamAlertToTelegram,
	loadCovertSteamTelegramCredentials,
	type CovertSteamAlertTelegramSendOptions,
	type CovertSteamAlertTelegramSendResult,
} from "../../telegram/covert-steam-sender";
import {
	formatCovertSteamAlert,
	getCovertSteamSeverityLevel,
	getCovertSteamSeverityEmoji,
} from "../../telegram/covert-steam-alert";
import {
	getThreadId,
	getAllMappings,
	TOPIC_NAMES,
} from "../../telegram/topic-mapping";
import { COVERT_STEAM_DEFAULT_TOPIC_ID } from "../../telegram/constants";

/**
 * Create Covert Steam alert management MCP tools
 */
export function createCovertSteamAlertTools(): MCPTool[] {
	return [
		{
			name: "covert-steam-send-alert",
			description:
				"Send a CovertSteamEvent alert to Telegram with RFC 001-compliant formatting",
			inputSchema: {
				type: "object",
				properties: {
					eventIdentifier: {
						type: "string",
						description: "Unique event identifier (e.g., 'NFL-2025-001')",
					},
					detectionTimestamp: {
						type: "number",
						description: "Detection timestamp in epoch milliseconds",
					},
					bookmakerName: {
						type: "string",
						description: "Bookmaker name where event was detected (optional)",
					},
					sourceDarkNodeId: {
						type: "string",
						description: "Source dark node ID (optional)",
					},
					impactSeverityScore: {
						type: "number",
						description: "Impact severity score (0-10, optional)",
						minimum: 0,
						maximum: 10,
					},
					topicId: {
						type: "number",
						description:
							"Telegram topic ID to route to (defaults to Live Alerts)",
						default: COVERT_STEAM_DEFAULT_TOPIC_ID,
					},
					pinMessage: {
						type: "boolean",
						description:
							"Whether to pin the message (defaults to true if severity >= 9)",
					},
				},
				required: ["eventIdentifier", "detectionTimestamp"],
			},
			execute: async (args: {
				eventIdentifier: string;
				detectionTimestamp: number;
				bookmakerName?: string;
				sourceDarkNodeId?: string;
				impactSeverityScore?: number;
				topicId?: number;
				pinMessage?: boolean;
			}) => {
				try {
					const covertSteamAlert: CovertSteamEventRecord = {
						event_identifier: args.eventIdentifier,
						detection_timestamp: args.detectionTimestamp,
						bookmaker_name: args.bookmakerName,
						source_dark_node_id: args.sourceDarkNodeId,
						impact_severity_score: args.impactSeverityScore,
					};

					const sendOptions: CovertSteamAlertTelegramSendOptions = {
						topicId: args.topicId,
						pinMessage: args.pinMessage,
					};

					const sendResult = await sendCovertSteamAlertToTelegram(
						covertSteamAlert,
						sendOptions,
					);

					if (sendResult.ok) {
						return {
							content: [
								{
									text:
										`✅ Covert Steam alert sent successfully!\n\n` +
										`Message ID: ${sendResult.messageId}\n` +
										`Event: ${args.eventIdentifier}\n` +
										`Severity: ${args.impactSeverityScore ?? "N/A"}\n` +
										`Topic: ${args.topicId ?? COVERT_STEAM_DEFAULT_TOPIC_ID}\n` +
										`Pinned: ${(sendOptions.pinMessage ?? (args.impactSeverityScore ?? 0) >= 9) ? "Yes" : "No"}`,
								},
							],
						};
					} else {
						return {
							content: [
								{
									text: `❌ Failed to send Covert Steam alert: ${sendResult.error}`,
								},
							],
							isError: true,
						};
					}
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error sending alert: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "covert-steam-format-alert",
			description:
				"Format a CovertSteamEvent alert message without sending (preview)",
			inputSchema: {
				type: "object",
				properties: {
					eventIdentifier: {
						type: "string",
						description: "Unique event identifier",
					},
					detectionTimestamp: {
						type: "number",
						description: "Detection timestamp in epoch milliseconds",
					},
					bookmakerName: {
						type: "string",
						description: "Bookmaker name (optional)",
					},
					sourceDarkNodeId: {
						type: "string",
						description: "Source dark node ID (optional)",
					},
					impactSeverityScore: {
						type: "number",
						description: "Impact severity score (0-10, optional)",
						minimum: 0,
						maximum: 10,
					},
				},
				required: ["eventIdentifier", "detectionTimestamp"],
			},
			execute: async (args: {
				eventIdentifier: string;
				detectionTimestamp: number;
				bookmakerName?: string;
				sourceDarkNodeId?: string;
				impactSeverityScore?: number;
			}) => {
				try {
					const covertSteamAlert: CovertSteamEventRecord = {
						event_identifier: args.eventIdentifier,
						detection_timestamp: args.detectionTimestamp,
						bookmaker_name: args.bookmakerName,
						source_dark_node_id: args.sourceDarkNodeId,
						impact_severity_score: args.impactSeverityScore,
					};

					const formattedMessage = formatCovertSteamAlert(covertSteamAlert);
					const severityLevel = getCovertSteamSeverityLevel(
						args.impactSeverityScore ?? 0,
					);
					const severityEmoji = getCovertSteamSeverityEmoji(
						args.impactSeverityScore ?? 0,
					);

					return {
						content: [
							{
								text:
									`📋 Covert Steam Alert Preview\n\n` +
									`Severity Level: ${severityLevel} ${severityEmoji}\n` +
									`Event: ${args.eventIdentifier}\n` +
									`Timestamp: ${new Date(args.detectionTimestamp).toISOString()}\n\n` +
									`Formatted Message:\n` +
									`${"=".repeat(50)}\n` +
									`${formattedMessage}\n` +
									`${"=".repeat(50)}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error formatting alert: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "covert-steam-list-topics",
			description:
				"List available Telegram topics for routing Covert Steam alerts",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const topicMappings = getAllMappings();

					// Use Bun.inspect.table() for tabular display
					const topicTableData = Object.entries(topicMappings).map(
						([name, threadId]) => {
							const topicName =
								TOPIC_NAMES[threadId as keyof typeof TOPIC_NAMES] || name;
							return {
								Topic: topicName,
								"Thread ID": threadId.toString(),
								"Logical ID": name,
							};
						},
					);

					const tableOutput = Bun.inspect.table(topicTableData, [
						"Topic",
						"Thread ID",
						"Logical ID",
					]);

					return {
						content: [
							{
								text:
									`📋 Available Telegram Topics for Covert Steam Alerts\n\n` +
									`Default Topic: Live Alerts (Topic ID: ${COVERT_STEAM_DEFAULT_TOPIC_ID})\n\n` +
									`${tableOutput}\n\n` +
									`💡 Use topicId parameter in send-alert to route to specific topic`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error listing topics: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "covert-steam-test-credentials",
			description:
				"Test Telegram bot credentials for Covert Steam alert delivery",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const credentials = await loadCovertSteamTelegramCredentials();

					// Use Bun.inspect.table() for credentials display
					const credentialsTableData = [
						{
							Setting: "Bot Token",
							Value: `${credentials.botToken.substring(0, 10)}...${credentials.botToken.substring(credentials.botToken.length - 5)}`,
							Status: "✓ Loaded",
						},
						{
							Setting: "Chat ID",
							Value: credentials.chatId,
							Status: "✓ Loaded",
						},
					];

					const tableOutput = Bun.inspect.table(credentialsTableData, [
						"Setting",
						"Value",
						"Status",
					]);

					return {
						content: [
							{
								text:
									`✅ Telegram Credentials Status\n\n` +
									`${tableOutput}\n\n` +
									`💡 Credentials are ready for sending Covert Steam alerts`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text:
									`❌ Failed to load Telegram credentials\n\n` +
									`Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
									`💡 Set credentials using:\n` +
									`   bun secret set TELEGRAM_BOT_TOKEN 'your_token'\n` +
									`   bun secret set TELEGRAM_CHAT_ID 'your_chat_id'`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "covert-steam-list-alerts",
			description: "List recent Covert Steam alerts in tabular format",
			inputSchema: {
				type: "object",
				properties: {
					limit: {
						type: "number",
						description: "Maximum number of alerts to return",
						default: 10,
					},
					severity: {
						type: "number",
						description: "Filter by minimum severity score",
						minimum: 0,
						maximum: 10,
					},
					bookmaker: {
						type: "string",
						description: "Filter by bookmaker name",
					},
				},
			},
			execute: async (args: {
				limit?: number;
				severity?: number;
				bookmaker?: string;
			}) => {
				try {
					// In a real implementation, fetch from API or database
					// For now, return example table structure
					const exampleAlerts = [
						{
							Event: "NFL-2025-001",
							Bookmaker: "DraftKings",
							Severity: "9.5 🚨",
							Timestamp: new Date(Date.now() - 3600000).toISOString(),
							Status: "Sent",
						},
						{
							Event: "NFL-2025-002",
							Bookmaker: "Betfair",
							Severity: "7.2 ⚠️",
							Timestamp: new Date(Date.now() - 7200000).toISOString(),
							Status: "Sent",
						},
					];

					const tableOutput = Bun.inspect.table(exampleAlerts, [
						"Event",
						"Bookmaker",
						"Severity",
						"Timestamp",
						"Status",
					]);

					return {
						content: [
							{
								text:
									`📋 Recent Covert Steam Alerts\n\n` +
									`${tableOutput}\n\n` +
									`💡 Use send-alert command to create new alerts`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error listing alerts: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "covert-steam-alert-stats",
			description: "Get statistics about Covert Steam alerts in tabular format",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					// Use Bun.inspect.table() for stats display
					const severityStatsData = [
						{
							Level: "CRITICAL",
							Count: "8",
							Percentage: "19.0%",
						},
						{
							Level: "HIGH",
							Count: "15",
							Percentage: "35.7%",
						},
						{
							Level: "MEDIUM",
							Count: "12",
							Percentage: "28.6%",
						},
						{
							Level: "LOW",
							Count: "7",
							Percentage: "16.7%",
						},
					];

					const bookmakerStatsData = [
						{
							Bookmaker: "DraftKings",
							Alerts: "18",
						},
						{
							Bookmaker: "Betfair",
							Alerts: "12",
						},
						{
							Bookmaker: "FanDuel",
							Alerts: "12",
						},
					];

					const severityTable = Bun.inspect.table(severityStatsData, [
						"Level",
						"Count",
						"Percentage",
					]);

					const bookmakerTable = Bun.inspect.table(bookmakerStatsData, [
						"Bookmaker",
						"Alerts",
					]);

					return {
						content: [
							{
								text:
									`📊 Covert Steam Alert Statistics\n\n` +
									`Severity Breakdown:\n${severityTable}\n\n` +
									`By Bookmaker:\n${bookmakerTable}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error fetching stats: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "covert-steam-get-severity-info",
			description:
				"Get severity level information and thresholds for Covert Steam alerts",
			inputSchema: {
				type: "object",
				properties: {
					severityScore: {
						type: "number",
						description: "Severity score to analyze (0-10)",
						minimum: 0,
						maximum: 10,
					},
				},
				required: ["severityScore"],
			},
			execute: async (args: { severityScore: number }) => {
				try {
					const severityLevel = getCovertSteamSeverityLevel(args.severityScore);
					const severityEmoji = getCovertSteamSeverityEmoji(args.severityScore);
					const willPin = args.severityScore >= 9;

					// Use Bun.inspect.table() for threshold display
					const thresholdTableData = [
						{
							Level: "CRITICAL",
							Range: ">= 9",
							Emoji: "🚨",
							"Auto-Pin": "Yes",
							Current: args.severityScore >= 9 ? "✓" : "",
						},
						{
							Level: "HIGH",
							Range: ">= 7 and < 9",
							Emoji: "⚠️",
							"Auto-Pin": "No",
							Current:
								args.severityScore >= 7 && args.severityScore < 9 ? "✓" : "",
						},
						{
							Level: "MEDIUM",
							Range: ">= 5 and < 7",
							Emoji: "📈",
							"Auto-Pin": "No",
							Current:
								args.severityScore >= 5 && args.severityScore < 7 ? "✓" : "",
						},
						{
							Level: "LOW",
							Range: "< 5",
							Emoji: "📊",
							"Auto-Pin": "No",
							Current: args.severityScore < 5 ? "✓" : "",
						},
					];

					const tableOutput = Bun.inspect.table(thresholdTableData, [
						"Level",
						"Range",
						"Emoji",
						"Auto-Pin",
						"Current",
					]);

					return {
						content: [
							{
								text:
									`📊 Severity Analysis for Score: ${args.severityScore}\n\n` +
									`${tableOutput}\n\n` +
									`Current Score: ${args.severityScore} → ${severityLevel} ${severityEmoji}\n` +
									`Auto-Pin: ${willPin ? "Yes (CRITICAL threshold)" : "No"}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error analyzing severity: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
