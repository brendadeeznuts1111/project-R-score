#!/usr/bin/env bun
/**
 * @fileoverview Changelog Poster for Telegram
 * @description Posts changelog updates to Telegram golden supergroup
 * @module telegram/changelog-poster
 */

import { TelegramBotApi } from "../api/telegram-ws.js";
import { TELEGRAM_ENV, TELEGRAM_SECRETS } from "./constants.js";
import { getThreadId, TOPIC_MAPPING } from "./topic-mapping.js";
import { DeepLinkGenerator } from "../utils/deeplink-generator.js";

interface ChangelogEntry {
	hash: string;
	message: string;
	date: string;
	author?: string;
	category?: string;
}

/**
 * Fetch changelog entries from git
 */
async function fetchChangelog(limit: number = 10): Promise<ChangelogEntry[]> {
	try {
		const gitLog = Bun.spawnSync({
			cmd: [
				"git",
				"log",
				"--oneline",
				"--decorate",
				`-${limit}`,
				"--date=iso",
				"--pretty=format:%h|%s|%ad|%an",
			],
			cwd: process.cwd(),
		}).stdout.toString();

		if (!gitLog || !gitLog.trim()) {
			return [];
		}

		const commits = gitLog.trim().split("\n");
		return commits
			.map((commit) => {
				const parts = commit.split("|");
				const hash = parts[0]?.trim() || "";
				const message = parts[1]?.trim() || "";
				const dateStr = parts[2]?.trim() || "";
				const author = parts[3]?.trim() || "";

				// Extract category from commit message
				const categoryMatch = message.match(
					/^(feat|fix|docs|refactor|chore|test|perf|security|style|ci|cd|build|revert)(\(.+\))?:/i,
				);
				const category = categoryMatch
					? categoryMatch[1].toLowerCase()
					: "other";

				return {
					hash,
					message,
					date: dateStr,
					author,
					category,
				};
			})
			.filter((c) => c.hash && c.message);
	} catch (error) {
		console.error("Error fetching changelog:", error);
		return [];
	}
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Format changelog entry for Telegram (HTML format)
 */
function formatChangelogEntry(entry: ChangelogEntry): string {
	const categoryEmoji: Record<string, string> = {
		feat: "✨",
		fix: "🐛",
		docs: "📚",
		refactor: "♻️",
		chore: "🔧",
		test: "🧪",
		perf: "⚡",
		security: "🔒",
		style: "💅",
		ci: "🚀",
		cd: "🚀",
		build: "🏗️",
		revert: "⏪",
		other: "📝",
	};

	const emoji = categoryEmoji[entry.category || "other"] || "📝";
	const shortHash = entry.hash.substring(0, 7);
	const date = new Date(entry.date).toLocaleDateString();
	const author = entry.author ? ` by ${escapeHtml(entry.author)}` : "";
	const category = escapeHtml(entry.category?.toUpperCase() || "OTHER");
	const message = escapeHtml(entry.message);

	// Generate deep-link using DeepLinkGenerator (RFC 001)
	const deepLinkGen = new DeepLinkGenerator();
	const commitUrl = deepLinkGen.generateCommitLink({
		hash: entry.hash,
		message: entry.message,
		date: new Date(entry.date).getTime(),
	});

	return `${emoji} <b>${category}</b>

<code>${shortHash}</code> ${message}${author}

<a href="${commitUrl}">View Commit</a>

<i>${date}</i>`;
}

/**
 * Post changelog to Telegram
 */
export async function postChangelog(options: {
	limit?: number;
	topicId?: number | string; // Can be logical ID (6), name ("changelog"), or actual thread ID (99)
	botToken?: string;
	chatId?: string;
}): Promise<void> {
	// Resolve topic ID: if it's a logical ID or name, map it to actual thread ID
	const logicalTopicId = options.topicId ?? 6;
	const actualThreadId =
		typeof logicalTopicId === "number" && logicalTopicId < 100
			? (getThreadId(logicalTopicId) ?? logicalTopicId) // Use mapping if logical ID, otherwise assume it's already a thread ID
			: typeof logicalTopicId === "string"
				? (getThreadId(logicalTopicId) ?? TOPIC_MAPPING.changelog)
				: logicalTopicId;

	const { limit = 5 } = options;

	// Load credentials
	let botToken = options.botToken || process.env[TELEGRAM_ENV.BOT_TOKEN];
	let chatId = options.chatId || process.env[TELEGRAM_ENV.CHAT_ID];

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

	if (!botToken || !chatId) {
		throw new Error("Telegram bot token and chat ID required");
	}

	const api = new TelegramBotApi(botToken);
	const entries = await fetchChangelog(limit);

	if (entries.length === 0) {
		console.log("No changelog entries found");
		return;
	}

	// Format changelog message (HTML format)
	const header = `📋 <b>Changelog Update</b>\n\n`;
	const entriesText = entries.map(formatChangelogEntry).join("\n\n");

	// Generate deep-link for full changelog (RFC 001)
	const deepLinkGen = new DeepLinkGenerator();
	const changelogUrl = deepLinkGen.generateGenericAlertLink({
		alert_id: `changelog-${Date.now()}`,
		alert_type: "changelog",
		timestamp: Date.now(),
		source: "changelog-poster",
	});

	const footer = `\n\n<a href="${changelogUrl}">View Full Changelog</a>`;
	const message = header + entriesText + footer;

	// Post to Telegram
	const result = await api.sendMessage(chatId, message, actualThreadId);

	if (result.ok) {
		console.log(
			`✅ Posted ${entries.length} changelog entries to topic ${actualThreadId} (${logicalTopicId})`,
		);
	} else {
		console.error(`❌ Failed to post changelog: ${result.description}`);
	}
}

// CLI entry point
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const limit = args[0] ? parseInt(args[0]) : 5;
	const topicId = args[1]
		? isNaN(parseInt(args[1]))
			? args[1]
			: parseInt(args[1])
		: 6;

	console.log(
		`📋 Posting changelog to topic: ${topicId} (mapped to thread ID: ${getThreadId(topicId) ?? topicId})\n`,
	);

	postChangelog({ limit, topicId }).catch((error) => {
		console.error("Error:", error);
		process.exit(1);
	});
}
