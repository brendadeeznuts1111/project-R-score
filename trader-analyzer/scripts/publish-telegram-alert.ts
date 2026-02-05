#!/usr/bin/env bun
/**
 * Publish Telegram Alert to RSS
 * Publishes Telegram alerts to RSS feed for audit trail
 * 
 * Usage: bun run scripts/publish-telegram-alert.ts --team <teamId> --severity <severity> --title <title> --message <message>
 */

import { Database } from 'bun:sqlite';
import { getTelegramClient } from '../src/telegram/client.js';
import { RSS_INTERNAL, TELEGRAM_CONFIG } from '../src/utils/rss-constants.js';

interface TelegramAlert {
	severity: 'critical' | 'high' | 'medium' | 'low';
	title: string;
	message: string;
	teamId: keyof typeof TELEGRAM_CONFIG.supergroups;
	threadId?: number;
	messageId?: number;
	pinned?: boolean;
}

/**
 * Publish Telegram alert to RSS for audit trail
 */
export async function publishTelegramAlertToRSS(
	alert: TelegramAlert,
): Promise<void> {
	const team = TELEGRAM_CONFIG.supergroups[alert.teamId];
	if (!team) {
		throw new Error(`Invalid team ID: ${alert.teamId}`);
	}

	// Save to registry DB
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

	const rowId = db
		.prepare(`
		INSERT INTO rss_items (feed_type, package_name, title, content, timestamp, severity, category, metadata)
		VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?)
	`)
		.run(
			'telegram-alert',
			`@telegram/${alert.teamId}`,
			`Alert: ${alert.severity.toUpperCase()} - ${alert.title}`,
			alert.message,
			alert.severity,
			'security',
			JSON.stringify({
				chat_id: team.id,
				thread_id: alert.threadId,
				message_id: alert.messageId,
				pinned: alert.pinned || false,
			}),
		).lastInsertRowId;

	console.log(`✅ Alert published to RSS with ID: ${rowId}`);

	// Notify Telegram topic
	try {
		const telegram = getTelegramClient();
		await telegram.sendMessage({
			chatId: team.id,
			threadId: alert.threadId || team.topics.general,
			text: `📤 Alert published to RSS: ${alert.title}\n\n🔗 [View RSS Item](/rss/${alert.teamId}/alerts/${rowId})`,
			parseMode: 'Markdown',
		});
	} catch (error) {
		console.warn('Failed to notify Telegram:', error);
	}

	// Refresh RSS cache
	try {
		await fetch(`${RSS_INTERNAL.team_metrics}/refresh`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.REGISTRY_API_TOKEN || ''}`,
			},
		});
		console.log('✅ RSS cache refreshed');
	} catch (error) {
		console.warn('Failed to refresh RSS cache:', error);
	}
}

// CLI usage
if (import.meta.main) {
	const args = process.argv.slice(2);
	const teamId = args.find((a) => a.startsWith('--team='))?.split('=')[1] as
		| keyof typeof TELEGRAM_CONFIG.supergroups
		| undefined;
	const severity = args
		.find((a) => a.startsWith('--severity='))
		?.split('=')[1] as 'critical' | 'high' | 'medium' | 'low' | undefined;
	const title = args.find((a) => a.startsWith('--title='))?.split('=')[1];
	const message = args.find((a) => a.startsWith('--message='))?.split('=')[1];

	if (!teamId || !severity || !title || !message) {
		console.error(
			'Usage: bun run scripts/publish-telegram-alert.ts --team=<teamId> --severity=<severity> --title=<title> --message=<message>',
		);
		process.exit(1);
	}

	await publishTelegramAlertToRSS({
		teamId,
		severity,
		title,
		message,
	});
}



