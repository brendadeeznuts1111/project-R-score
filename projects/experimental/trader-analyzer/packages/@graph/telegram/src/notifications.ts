/**
 * @fileoverview Telegram Notifications
 * @description Send notifications to Telegram supergroup topics
 * @module @graph/telegram/notifications
 */

import { normalizeError } from '../../utils/src/error-wrapper';
import { getTopicId, getTopicInfo, TELEGRAM_SUPERGROUP_ID, type PackageName } from './topics';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

interface TelegramMessage {
	chat_id: number;
	message_thread_id?: number;
	text: string;
	parse_mode?: 'Markdown' | 'HTML';
	disable_notification?: boolean;
}

/**
 * Send notification to specific Telegram topic
 */
export async function notifyTopic(
	topicId: number,
	message: string,
	options: { silent?: boolean; parseMode?: 'Markdown' | 'HTML' } = {}
): Promise<void> {
	if (!TELEGRAM_BOT_TOKEN) {
		console.warn('TELEGRAM_BOT_TOKEN not set, skipping notification');
		return;
	}

	const payload: TelegramMessage = {
		chat_id: TELEGRAM_SUPERGROUP_ID,
		message_thread_id: topicId,
		text: message,
		parse_mode: options.parseMode || 'Markdown',
		disable_notification: options.silent || false,
	};

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			}
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
		}
	} catch (error) {
		const normalized = normalizeError(error);
		console.error('Failed to send Telegram notification:', normalized.message);
		throw normalized;
	}
}

/**
 * RFC Submitted notification
 */
export async function notifyRFCSubmitted(
	packageName: string,
	rfc: { title: string; author: string; description: string }
): Promise<void> {
	const topicId = getTopicId('rfc-proposals');
	if (!topicId) throw new Error('RFC topic not found');

	const message =
		`📋 **RFC Submitted**\n\n` +
		`📦 **Package:** ${packageName}\n` +
		`👤 **Author:** ${rfc.author}\n` +
		`📄 **Title:** ${rfc.title}\n\n` +
		`📝 **Description:**\n${rfc.description}\n\n` +
		`🔗 [View in Registry](https://registry.internal.yourcompany.com/package/${encodeURIComponent(packageName)})`;

	await notifyTopic(topicId, message);
}

/**
 * Package Published notification
 */
export async function notifyPackagePublished(
	packageName: string,
	version: string,
	publishedBy: string,
	benchmark?: any
): Promise<void> {
	const topicInfo = getTopicInfo(packageName as PackageName);
	if (!topicInfo) {
		console.warn(`No topic configured for ${packageName}`);
		return;
	}

	let message =
		`🚀 **Package Published**\n\n` +
		`📦 **${packageName}**\n` +
		`🏷️ **Version:** ${version}\n` +
		`👤 **By:** ${publishedBy}\n`;

	if (benchmark) {
		message +=
			`\n📊 **Benchmark Results:**\n` +
			`⏱️ Duration: ${benchmark.avgDuration}ms\n` +
			`📈 Anomalies: ${benchmark.anomalyCount}\n`;
	}

	await notifyTopic(topicInfo.topicId, message);
}

/**
 * Incident/Hotfix notification
 */
export async function notifyIncident(
	packageName: string,
	incident: {
		severity: 'critical' | 'high' | 'medium' | 'low';
		description: string;
		action: string;
	}
): Promise<void> {
	const topicId = getTopicId('incidents');
	if (!topicId) throw new Error('Incidents topic not found');

	const severityEmoji = {
		critical: '🚨',
		high: '⚠️',
		medium: '🔍',
		low: 'ℹ️',
	};

	const message =
		`${severityEmoji[incident.severity]} **INCIDENT: ${packageName}**\n\n` +
		`📝 **Description:** ${incident.description}\n` +
		`🎯 **Action:** ${incident.action}\n\n` +
		`⏰ **Time:** ${new Date().toLocaleString()}`;

	await notifyTopic(topicId, message, { silent: incident.severity === 'low' });
}

/**
 * Benchmark regression alert
 */
export async function notifyBenchmarkRegression(
	packageName: string,
	regression: { metric: string; before: number; after: number; percentage: number }
): Promise<void> {
	const topicInfo = getTopicInfo(packageName as PackageName);
	if (!topicInfo) return;

	const message =
		`📉 **Benchmark Regression Detected**\n\n` +
		`📦 **Package:** ${packageName}\n` +
		`📊 **Metric:** ${regression.metric}\n` +
		`📈 **Change:** ${regression.before} → ${regression.after}\n` +
		`📊 **Impact:** +${regression.percentage.toFixed(2)}%\n\n` +
		`🔍 [View Details](https://registry.internal.yourcompany.com/package/${encodeURIComponent(packageName)})`;

	await notifyTopic(topicInfo.topicId, message, { silent: false });
}
