/**
 * @fileoverview Research Report Telegram Sender
 * @description Sends formatted research script reports to Telegram topics/threads with proper pinning
 * @module telegram/research-report-sender
 * 
 * Integrates research scripts with Telegram notification system:
 * - Routes reports to appropriate topics based on report type
 * - Pins messages that require action
 * - Formats reports with proper templates
 * - Handles multi-part messages for large reports
 */

import { TelegramBotApi } from "../api/telegram-ws";
import { DeepLinkGenerator } from "../utils/deeplink-generator";
import { loadCovertSteamTelegramCredentials } from "./covert-steam-sender";
import { getThreadId } from "./topic-mapping";

/**
 * Research report types and their corresponding Telegram topics
 */
export enum ResearchReportType {
	COVERT_STEAM_SCAN = "covert-steam-scan",
	SHADOW_MARKET_GRAPH = "shadow-market-graph",
	DECEPTIVE_LINES = "deceptive-lines",
	AUTO_TRADER = "auto-trader",
	ARBITRAGE_OPPORTUNITY = "arbitrage-opportunity",
	SYSTEM_ALERT = "system-alert",
}

/**
 * Report severity levels for pinning decisions
 */
export enum ReportSeverity {
	INFO = "info",
	WARNING = "warning",
	HIGH = "high",
	CRITICAL = "critical",
	ACTION_REQUIRED = "action-required",
}

/**
 * Topic mapping for report types
 */
const REPORT_TYPE_TO_TOPIC: Record<ResearchReportType, number | string> = {
	[ResearchReportType.COVERT_STEAM_SCAN]: "live-alerts", // Topic 2
	[ResearchReportType.SHADOW_MARKET_GRAPH]: "analytics", // Topic 4
	[ResearchReportType.DECEPTIVE_LINES]: "live-alerts", // Topic 2
	[ResearchReportType.AUTO_TRADER]: "arbitrage", // Topic 3
	[ResearchReportType.ARBITRAGE_OPPORTUNITY]: "arbitrage", // Topic 3
	[ResearchReportType.SYSTEM_ALERT]: "system-status", // Topic 5
};

/**
 * Severity-based pinning rules
 */
const SEVERITY_PIN_RULES: Record<ReportSeverity, boolean> = {
	[ReportSeverity.INFO]: false,
	[ReportSeverity.WARNING]: false,
	[ReportSeverity.HIGH]: true,
	[ReportSeverity.CRITICAL]: true,
	[ReportSeverity.ACTION_REQUIRED]: true,
};

/**
 * Research report data structure
 */
export interface ResearchReport {
	type: ResearchReportType;
	severity: ReportSeverity;
	title: string;
	summary: string;
	details?: Record<string, unknown>;
	metrics?: Record<string, number | string>;
	actionsRequired?: string[];
	timestamp: number;
	eventId?: string;
	bookmaker?: string;
}

/**
 * Telegram send result
 */
export interface ReportSendResult {
	ok: boolean;
	messageId?: number;
	threadId?: number;
	pinned?: boolean;
	error?: string;
}

/**
 * Research Report Telegram Sender
 * 
 * Handles sending formatted research reports to appropriate Telegram topics
 * with automatic pinning for actionable items
 */
export class ResearchReportSender {
	private api: TelegramBotApi;
	private chatId: string;
	private deepLinkGenerator: DeepLinkGenerator;

	constructor(api: TelegramBotApi, chatId: string) {
		this.api = api;
		this.chatId = chatId;
		this.deepLinkGenerator = new DeepLinkGenerator();
	}

	/**
	 * Send research report to Telegram
	 */
	async sendReport(report: ResearchReport): Promise<ReportSendResult> {
		try {
			// Debug logging with console depth support (see docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md)
			console.debug("Sending research report:", {
				type: report.type,
				severity: report.severity,
				title: report.title,
				eventId: report.eventId,
				bookmaker: report.bookmaker,
			});

			// Determine target topic/thread
			const topicId = REPORT_TYPE_TO_TOPIC[report.type];
			const threadId = getThreadId(topicId);

			if (!threadId) {
				console.warn("Topic not found for report type:", {
					reportType: report.type,
					topicId,
					availableTopics: Object.keys(REPORT_TYPE_TO_TOPIC),
				});
				return {
					ok: false,
					error: `Topic not found for report type: ${report.type}`,
				};
			}

			// Format report message
			const message = this.formatReport(report);

			// Determine if message should be pinned
			const shouldPin = this.shouldPinReport(report);
			console.debug("Report pinning decision:", {
				shouldPin,
				severity: report.severity,
				hasActionsRequired: (report.actionsRequired?.length ?? 0) > 0,
			});

			// Send message
			let messageId: number | undefined;
			let pinned = false;

			if (shouldPin && threadId) {
				// Send and pin in one operation
				const result = await this.api.sendAndPin(this.chatId, message, threadId);
				if (result.ok) {
					messageId = result.messageId;
					pinned = true;
				} else {
					return {
						ok: false,
						error: result.error,
					};
				}
			} else {
				// Send without pinning
				const result = await this.api.sendMessage(this.chatId, message, threadId);
				if (result.ok && result.result?.message_id) {
					messageId = result.result.message_id;
				} else {
					return {
						ok: false,
						error: result.description || "Failed to send message",
					};
				}
			}

			console.debug("Report sent successfully:", {
				messageId,
				threadId,
				pinned,
				reportType: report.type,
			});

			return {
				ok: true,
				messageId,
				threadId,
				pinned,
			};
		} catch (error) {
			// Enhanced error logging with console depth (see docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md)
			console.error("Failed to send research report:", {
				reportType: report.type,
				reportTitle: report.title,
				error: error instanceof Error ? {
					message: error.message,
					stack: error.stack,
					name: error.name,
				} : error,
			});
			return {
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Format report as Telegram message with RFC 001 compliant deep-link
	 */
	private formatReport(report: ResearchReport): string {
		const emoji = this.getSeverityEmoji(report.severity);
		const timestamp = new Date(report.timestamp).toISOString();

		// Generate RFC 001 compliant deep-link
		const reportId = `${report.type}-${report.timestamp}`;
		let deepLink: string;

		try {
			switch (report.type) {
				case ResearchReportType.SHADOW_MARKET_GRAPH:
					deepLink = this.deepLinkGenerator.generateShadowMarketGraphLink({
						report_id: reportId,
						generated_at: report.timestamp,
						event_identifier: report.eventId,
						analysis_modes: report.details?.analyze as string[] | undefined,
						arbitrage_count: report.metrics?.["Arbitrage Opportunities"] as number | undefined,
					});
					break;
				case ResearchReportType.DECEPTIVE_LINES:
					deepLink = this.deepLinkGenerator.generateDeceptiveLineLink({
						report_id: reportId,
						detected_at: report.timestamp,
						event_identifier: report.eventId,
						bookmaker: report.bookmaker,
						bait_line_count: report.metrics?.["Bait Lines"] as number | undefined,
						severity: report.metrics?.["Average Severity"] as number | undefined,
					});
					break;
				case ResearchReportType.AUTO_TRADER:
					deepLink = this.deepLinkGenerator.generateAutoTraderLink({
						execution_id: reportId,
						executed_at: report.timestamp,
						trade_mode: report.details?.trade_mode as string | undefined,
						successful_trades: report.metrics?.["Successful Trades"] as number | undefined,
						total_profit: report.metrics?.["Total Profit"] as string | undefined
							? parseFloat(String(report.metrics?.["Total Profit"]).replace(/[^0-9.-]/g, ""))
							: undefined,
						roi: report.metrics?.["ROI"] as string | undefined
							? parseFloat(String(report.metrics?.["ROI"]).replace(/[^0-9.-]/g, ""))
							: undefined,
					});
					break;
				case ResearchReportType.COVERT_STEAM_SCAN:
					// Use covert steam link generator
					deepLink = this.deepLinkGenerator.generateCovertSteamLink({
						event_identifier: report.eventId || "scan-summary",
						detection_timestamp: report.timestamp,
						bookmaker_name: report.bookmaker,
						impact_severity_score: report.metrics?.["Average Severity"] as number | undefined,
					});
					break;
				default:
					deepLink = this.deepLinkGenerator.generateResearchReportLink({
						report_id: reportId,
						generated_at: report.timestamp,
						report_type: report.type,
						event_identifier: report.eventId,
						severity: report.metrics?.["Average Severity"] as number | undefined,
					});
			}
		} catch (error) {
			// Use console depth for better error visibility (see docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md)
			console.error(`Failed to generate deep-link for report ${report.type}:`, error);
			console.debug("Deep-link generation error details:", {
				reportType: report.type,
				reportId,
				timestamp: report.timestamp,
				error: error instanceof Error ? {
					message: error.message,
					stack: error.stack,
					name: error.name,
				} : error,
			});
			// Fallback to generic research report link
			deepLink = this.deepLinkGenerator.generateResearchReportLink({
				report_id: reportId,
				generated_at: report.timestamp,
				report_type: report.type,
			});
		}

		let message = `${emoji} <b>${report.title}</b>\n`;
		message += `📅 ${timestamp}\n`;
		message += `📊 Type: ${report.type}\n\n`;
		message += `${report.summary}\n\n`;

		// Add metrics if available
		if (report.metrics && Object.keys(report.metrics).length > 0) {
			message += `**Metrics:**\n`;
			for (const [key, value] of Object.entries(report.metrics)) {
				message += `  • ${key}: ${value}\n`;
			}
			message += `\n`;
		}

		// Add details if available
		if (report.details && Object.keys(report.details).length > 0) {
			message += `**Details:**\n`;
			for (const [key, value] of Object.entries(report.details)) {
				const formattedValue =
					typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
				if (formattedValue.length > 100) {
					message += `  • ${key}: ${formattedValue.substring(0, 100)}...\n`;
				} else {
					message += `  • ${key}: ${formattedValue}\n`;
				}
			}
			message += `\n`;
		}

		// Add actions required if present
		if (report.actionsRequired && report.actionsRequired.length > 0) {
			message += `⚠️ **Actions Required:**\n`;
			for (const action of report.actionsRequired) {
				message += `  • ${action}\n`;
			}
			message += `\n`;
		}

		// Add context if available
		if (report.eventId) {
			message += `🎯 Event: ${report.eventId}\n`;
		}
		if (report.bookmaker) {
			message += `🏢 Bookmaker: ${report.bookmaker}\n`;
		}

		// Add RFC 001 compliant deep-link (per 9.1.1.9.1.0.0)
		message += `\n`;
		message += `<a href="${deepLink}">🔗 View Details on Dashboard</a>`;

		return message;
	}

	/**
	 * Get emoji for severity level
	 */
	private getSeverityEmoji(severity: ReportSeverity): string {
		switch (severity) {
			case ReportSeverity.CRITICAL:
			case ReportSeverity.ACTION_REQUIRED:
				return "🚨";
			case ReportSeverity.HIGH:
				return "⚠️";
			case ReportSeverity.WARNING:
				return "⚡";
			case ReportSeverity.INFO:
			default:
				return "ℹ️";
		}
	}

	/**
	 * Determine if report should be pinned
	 */
	private shouldPinReport(report: ResearchReport): boolean {
		// Always pin if actions are required
		if (report.actionsRequired && report.actionsRequired.length > 0) {
			return true;
		}

		// Use severity-based rules
		return SEVERITY_PIN_RULES[report.severity] ?? false;
	}

	/**
	 * Send multiple reports (for batch operations)
	 */
	async sendReports(reports: ResearchReport[]): Promise<ReportSendResult[]> {
		console.debug("Sending batch reports:", {
			count: reports.length,
			types: reports.map(r => r.type),
		});

		const results: ReportSendResult[] = [];

		for (const report of reports) {
			const result = await this.sendReport(report);
			results.push(result);

			// Small delay to avoid rate limiting
			await Bun.sleep(100);
		}

		const successCount = results.filter(r => r.ok).length;
		const failureCount = results.filter(r => !r.ok).length;
		console.debug("Batch send complete:", {
			total: results.length,
			successful: successCount,
			failed: failureCount,
		});

		return results;
	}
}

/**
 * Create ResearchReportSender instance with credentials
 */
export async function createResearchReportSender(): Promise<ResearchReportSender> {
	const credentials = await loadCovertSteamTelegramCredentials();
	const api = new TelegramBotApi(credentials.botToken);
	return new ResearchReportSender(api, credentials.chatId);
}
