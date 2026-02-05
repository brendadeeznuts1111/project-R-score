/**
 * Telegram Integration Monitor
 *
 * Monitors Telegram integration health and provides real-time status
 */

import { EnhancedTelegramClient, getTelegramClient } from "./client.js";
import { TelegramBotApi } from "../api/telegram-ws.js";
import { TELEGRAM_ENV, TELEGRAM_SECRETS } from "./constants.js";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface IntegrationStatus {
	client: {
		healthy: boolean;
		message: string;
		stats: {
			totalRequests: number;
			successfulRequests: number;
			failedRequests: number;
			successRate: number;
			averageResponseTime: number;
		};
	};
	api: {
		connected: boolean;
		chatId: string | null;
		topicsCount: number;
		lastMessageTime: string | null;
	};
	configuration: {
		botTokenConfigured: boolean;
		chatIdConfigured: boolean;
		secretsConfigured: boolean;
	};
	overall: {
		status: "healthy" | "degraded" | "unhealthy";
		message: string;
		timestamp: string;
	};
}

// ═══════════════════════════════════════════════════════════════
// MONITOR
// ═══════════════════════════════════════════════════════════════

export class TelegramIntegrationMonitor {
	private client: EnhancedTelegramClient;
	private api: TelegramBotApi;
	private chatId: string | null = null;

	constructor() {
		this.client = getTelegramClient();
		this.api = this.client.getApiClient();

		// Load chat ID
		this.chatId =
			process.env[TELEGRAM_ENV.CHAT_ID] ||
			process.env[TELEGRAM_ENV.SUPERGROUP_ID] ||
			null;

		// Chat ID will be loaded async on first use if needed
	}

	/**
	 * Get comprehensive integration status
	 */
	async getStatus(): Promise<IntegrationStatus> {
		const timestamp = new Date().toISOString();

		// Check client health
		const clientHealth = await this.client.healthCheck();
		const clientStats = clientHealth.stats;
		const successRate =
			clientStats.totalRequests > 0
				? (clientStats.successfulRequests / clientStats.totalRequests) * 100
				: 100;

		// Check API connection
		let apiConnected = false;
		let topicsCount = 0;
		let lastMessageTime: string | null = null;

		if (this.chatId) {
			try {
				const topicsResult = await this.api.getForumTopics(this.chatId);
				if (topicsResult.ok && topicsResult.result?.topics) {
					apiConnected = true;
					topicsCount = topicsResult.result.topics.length;
				}
			} catch (error) {
				// API not connected
			}
		}

		// Check configuration
		const botTokenConfigured = !!process.env[TELEGRAM_ENV.BOT_TOKEN];
		const chatIdConfigured = !!this.chatId;

		// Check secrets async (simplified check)
		let secretsConfigured = false;
		try {
			// Try to get from secrets (async, but we'll just check if env is set)
			secretsConfigured = !!(
				process.env[TELEGRAM_ENV.BOT_TOKEN] || this.chatId
			);
		} catch {
			// Secrets not configured
		}

		// Determine overall status
		let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
		let overallMessage = "All systems operational";

		if (!botTokenConfigured || !chatIdConfigured) {
			overallStatus = "unhealthy";
			overallMessage = "Configuration incomplete";
		} else if (!apiConnected) {
			overallStatus = "degraded";
			overallMessage = "API connection issues";
		} else if (successRate < 80) {
			overallStatus = "degraded";
			overallMessage = `Low success rate: ${successRate.toFixed(1)}%`;
		} else if (clientStats.failedRequests > 10) {
			overallStatus = "degraded";
			overallMessage = "Multiple failed requests detected";
		}

		return {
			client: {
				healthy: clientHealth.healthy,
				message: clientHealth.message,
				stats: {
					totalRequests: clientStats.totalRequests,
					successfulRequests: clientStats.successfulRequests,
					failedRequests: clientStats.failedRequests,
					successRate: Math.round(successRate * 100) / 100,
					averageResponseTime: Math.round(clientStats.averageResponseTime),
				},
			},
			api: {
				connected: apiConnected,
				chatId: this.chatId,
				topicsCount,
				lastMessageTime,
			},
			configuration: {
				botTokenConfigured,
				chatIdConfigured,
				secretsConfigured,
			},
			overall: {
				status: overallStatus,
				message: overallMessage,
				timestamp,
			},
		};
	}

	/**
	 * Get quick health check
	 */
	async quickHealthCheck(): Promise<boolean> {
		const status = await this.getStatus();
		return status.overall.status === "healthy";
	}

	/**
	 * Monitor status continuously (for dashboard/websocket)
	 */
	async *monitorStatus(
		intervalMs = 5000,
	): AsyncGenerator<IntegrationStatus, void, unknown> {
		while (true) {
			yield await this.getStatus();
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	}
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════

let monitorInstance: TelegramIntegrationMonitor | null = null;

export function getTelegramMonitor(): TelegramIntegrationMonitor {
	if (!monitorInstance) {
		monitorInstance = new TelegramIntegrationMonitor();
	}
	return monitorInstance;
}
