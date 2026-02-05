/**
 * Tension Alert Router
 * Routes market tension alerts to appropriate Telegram supergroup topics
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TELEGRAM-TENSION-ALERTS@1.3.4;instance-id=TELEGRAM-TENSION-ALERTS-001;version=1.3.4}][PROPERTIES:{tension_alerts={value:"telegram-tension-routing";@root:"20.0.0.0.0.0.0";@chain:["BP-TELEGRAM-CLIENT","BP-TENSION-DETECTOR"];@version:"1.3.4"}}][CLASS:TensionAlertRouter][#REF:v-1.3.4.BP.TELEGRAM.TENSION.ALERTS.1.0.A.1.1.DOC.1.1]]
 */

import { Database } from 'bun:sqlite';
// URLPattern is a global in Bun, no import needed
import { SubMarketTensionDetector, type TensionEvent } from '../research/tension/tension-detector.js';
import { RSS_INTERNAL, TELEGRAM_CONFIG } from '../utils/rss-constants.js';
import { EnhancedTelegramClient, getTelegramClient } from './client.js';

/**
 * Route tension alerts to appropriate Telegram supergroup topics
 */
export class TensionAlertRouter {
	private telegram: EnhancedTelegramClient;
	private tensionDetector: SubMarketTensionDetector;
	private urlPattern: URLPattern;

	constructor() {
		this.telegram = getTelegramClient();
		this.tensionDetector = new SubMarketTensionDetector();

		// Pattern match for bookmaker URLs to extract event context
		this.urlPattern = new URLPattern({
			pathname: '/markets/:bookmaker/:eventId/:period?',
		});
	}

	/**
	 * Start monitoring tension events and route to Telegram
	 */
	/**
	 * Start monitoring tension events and route to Telegram
	 * Listens for both 'tension' and 'critical_tension' events from SubMarketTensionDetector
	 */
	async startMonitoring(): Promise<void> {
		this.tensionDetector.startMonitoring(5000); // Check every 5s

		// Listen for all tension events
		this.tensionDetector.on('tension', async (event: TensionEvent) => {
			await this.routeTensionAlert(event);
		});

		// Also listen for critical tension events (severity >= 8)
		this.tensionDetector.on('critical_tension', async (event: TensionEvent) => {
			await this.routeTensionAlert(event);
		});
	}

	/**
	 * Route tension alert based on severity and bookmaker
	 */
	private async routeTensionAlert(event: TensionEvent): Promise<void> {
		const severity = this.mapSeverityToLevel(event.severity);
		const nodes = event.nodes || [];
		const bookmaker = this.extractBookmakerFromNodes(nodes);
		const eventId = event.eventId || nodes[0]?.split('/').pop() || 'unknown';

		// Determine target team
		const team = this.determineTeam(bookmaker, eventId);
		const config = TELEGRAM_CONFIG.supergroups[team];

		if (!config) {
			console.warn(`No Telegram config found for team: ${team}`);
			return;
		}

		// Route to appropriate topic
		const topicId =
			severity === 'critical'
				? config.topics.incidents
				: config.topics.general;

		// Format alert message
		const message = this.formatTensionMessage(event, bookmaker, team);

		// Send with priority routing
		try {
			const result = await this.telegram.sendMessage({
				chatId: config.id,
				threadId: topicId,
				text: message,
				pin: severity === 'critical', // Pin critical alerts
				disable_notification: severity !== 'critical', // Only notify for critical alerts
				parseMode: 'Markdown',
			});

			// Also log to RSS for audit trail
			const messageId = result.ok ? result.messageId : undefined;
			await this.logToRSS(event, team, message, messageId);

			console.log(
				`✅ Tension alert routed to ${team} topic ${topicId} (${severity})`,
			);
		} catch (error) {
			console.error('Failed to route tension alert:', error);
		}
	}

	/**
	 * Format tension message with market context
	 */
	private formatTensionMessage(
		event: TensionEvent,
		bookmaker: string,
		team: string,
	): string {
		const severity = this.mapSeverityToLevel(event.severity);
		const severityEmoji = {
			critical: '🚨',
			high: '⚠️',
			medium: '❗',
			low: 'ℹ️',
		}[severity];

		const description =
			event.snapshot?.description || 'Multiple line movements detected';

		return (
			`🌀 **Tension Alert: ${team}**\n\n` +
			`${severityEmoji} **Severity**: ${severity.toUpperCase()}\n` +
			`🏪 **Bookmaker**: ${bookmaker}\n` +
			`📍 **Nodes**: ${event.nodes.length} affected\n` +
			`🕐 **Detected**: ${new Date().toLocaleString()}\n\n` +
			`**Details**:\n${description}\n\n` +
			`🔗 [View in Dashboard](https://hyperbun.com/dashboard/${team}?tension=${event.tensionId})`
		);
	}

	/**
	 * Extract bookmaker from node URLs using URLPattern
	 */
	private extractBookmakerFromNodes(nodes: string[]): string {
		for (const node of nodes) {
			try {
				const match = this.urlPattern.exec(node);
				if (match?.pathname.groups.bookmaker) {
					return match.pathname.groups.bookmaker;
				}
			} catch {
				// Try extracting from URL string directly
				const urlMatch = node.match(/\/markets\/([^\/]+)\//);
				if (urlMatch) {
					return urlMatch[1];
				}
			}
		}
		return 'unknown';
	}

	/**
	 * Map numeric severity to level string
	 */
	private mapSeverityToLevel(severity: number): 'critical' | 'high' | 'medium' | 'low' {
		if (severity >= 8) return 'critical';
		if (severity >= 6) return 'high';
		if (severity >= 4) return 'medium';
		return 'low';
	}

	/**
	 * Determine team based on bookmaker mappings
	 */
	private determineTeam(
		bookmaker: string,
		eventId: string,
	): keyof typeof TELEGRAM_CONFIG.supergroups {
		const bookmakerLower = bookmaker.toLowerCase();
		const eventIdLower = eventId.toLowerCase();

		if (bookmakerLower.includes('dk') || eventIdLower.includes('nfl')) {
			return 'sports_correlation';
		}
		if (bookmakerLower.includes('betfair') || eventIdLower.includes('stocks')) {
			return 'market_analytics';
		}
		return 'platform_tools';
	}

	/**
	 * Log tension event to RSS for audit trail
	 */
	private async logToRSS(
		event: TensionEvent,
		team: string,
		message: string,
		messageId?: number,
	): Promise<void> {
		try {
			const db = new Database('data/registry.db');
			db.exec(`
				CREATE TABLE IF NOT EXISTS rss_items (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					feed_type TEXT,
					package_name TEXT,
					title TEXT,
					content TEXT,
					timestamp TEXT,
					severity TEXT,
					category TEXT,
					metadata TEXT
				)
			`);

			const severity = this.mapSeverityToLevel(event.severity);
			db.prepare(`
				INSERT INTO rss_items (feed_type, package_name, title, content, timestamp, severity, category, metadata)
				VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?)
			`).run(
				'telegram-alert',
				`@telegram/${team}`,
				`Alert: ${severity.toUpperCase()} - Tension Detected`,
				message.substring(0, 500), // Truncate for RSS
				severity,
				'tension',
				JSON.stringify({
					tension_id: event.tensionId,
					chat_id: TELEGRAM_CONFIG.supergroups[team as keyof typeof TELEGRAM_CONFIG.supergroups]?.id,
					message_id: messageId,
					pinned: severity === 'critical',
				}),
			);

			// Refresh RSS cache
			try {
				await fetch(`${RSS_INTERNAL.team_metrics}/refresh`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${process.env.REGISTRY_API_TOKEN || ''}`,
					},
				});
			} catch {
				// Ignore RSS refresh errors
			}
		} catch (error) {
			console.error('Failed to log tension alert to RSS:', error);
		}
	}
}
