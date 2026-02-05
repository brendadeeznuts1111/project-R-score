#!/usr/bin/env bun
/**
 * @fileoverview Feed Monitor Service
 * @description Monitors and posts changelog and RSS feed updates to Telegram
 * @module telegram/feed-monitor
 */

import { postChangelog } from "./changelog-poster.js";
import { postRSSFeed } from "./rss-poster.js";

interface MonitorConfig {
	changelog: {
		enabled: boolean;
		intervalMinutes: number;
		limit: number;
		topicId: number;
	};
	rss: {
		enabled: boolean;
		intervalMinutes: number;
		limit: number;
		topicId: number;
		filterCategory?: string;
	};
}

const DEFAULT_CONFIG: MonitorConfig = {
	changelog: {
		enabled: true,
		intervalMinutes: 60, // Check every hour
		limit: 5,
		topicId: 6, // Changelog topic
	},
	rss: {
		enabled: true,
		intervalMinutes: 30, // Check every 30 minutes
		limit: 5,
		topicId: 7, // CI/CD & RSS Feed topic
		filterCategory: undefined, // Post all categories
	},
};

let changelogLastHash: string | null = null;
let rssLastPubDate: string | null = null;

/**
 * Check for new changelog entries
 */
async function checkChangelog(
	config: MonitorConfig["changelog"],
): Promise<void> {
	try {
		const { $ } = await import("bun");

		// Get latest commit hash
		const latestCommit = Bun.spawnSync({
			cmd: ["git", "log", "-1", "--pretty=format:%h"],
			cwd: process.cwd(),
		})
			.stdout.toString()
			.trim();

		if (latestCommit && latestCommit !== changelogLastHash) {
			console.log(`📋 New changelog entries detected (${latestCommit})`);
			await postChangelog({
				limit: config.limit,
				topicId: config.topicId,
			});
			changelogLastHash = latestCommit;
		}
	} catch (error) {
		console.error("Error checking changelog:", error);
	}
}

/**
 * Check for new RSS feed items
 */
async function checkRSSFeed(config: MonitorConfig["rss"]): Promise<void> {
	try {
		const baseUrl = process.env.API_URL || "http://localhost:3001";
		const response = await fetch(`${baseUrl}/api/rss.xml`);

		if (!response.ok) {
			throw new Error(`RSS feed returned ${response.status}`);
		}

		const xml = await response.text();

		// Extract latest pubDate
		const latestPubDateMatch = xml.match(/<pubDate>(.*?)<\/pubDate>/);
		const latestPubDate = latestPubDateMatch ? latestPubDateMatch[1] : null;

		if (latestPubDate && latestPubDate !== rssLastPubDate) {
			console.log(`📢 New RSS feed items detected (${latestPubDate})`);
			await postRSSFeed({
				limit: config.limit,
				topicId: config.topicId,
				filterCategory: config.filterCategory,
			});
			rssLastPubDate = latestPubDate;
		}
	} catch (error) {
		console.error("Error checking RSS feed:", error);
	}
}

/**
 * Start monitoring service
 */
export async function startMonitor(
	config: MonitorConfig = DEFAULT_CONFIG,
): Promise<void> {
	console.log("🚀 Starting Feed Monitor Service\n");
	console.log(
		`Changelog: ${config.changelog.enabled ? "✅" : "❌"} (every ${config.changelog.intervalMinutes}min)`,
	);
	console.log(
		`RSS Feed: ${config.rss.enabled ? "✅" : "❌"} (every ${config.rss.intervalMinutes}min)\n`,
	);

	// Initial check
	if (config.changelog.enabled) {
		await checkChangelog(config.changelog);
	}

	if (config.rss.enabled) {
		await checkRSSFeed(config.rss);
	}

	// Set up intervals
	if (config.changelog.enabled) {
		setInterval(
			() => checkChangelog(config.changelog),
			config.changelog.intervalMinutes * 60 * 1000,
		);
	}

	if (config.rss.enabled) {
		setInterval(
			() => checkRSSFeed(config.rss),
			config.rss.intervalMinutes * 60 * 1000,
		);
	}

	console.log("✅ Monitor service started. Press Ctrl+C to stop.\n");
}

// CLI entry point
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const command = args[0];

	if (command === "start" || !command) {
		startMonitor().catch((error) => {
			console.error("Error:", error);
			process.exit(1);
		});
	} else if (command === "changelog") {
		const limit = args[1] ? parseInt(args[1]) : 5;
		const topicId = args[2] ? parseInt(args[2]) : 6;
		postChangelog({ limit, topicId }).catch((error) => {
			console.error("Error:", error);
			process.exit(1);
		});
	} else if (command === "rss") {
		const limit = args[1] ? parseInt(args[1]) : 5;
		const topicId = args[2] ? parseInt(args[2]) : 7;
		const filterCategory = args[3] || undefined;
		postRSSFeed({ limit, topicId, filterCategory }).catch((error) => {
			console.error("Error:", error);
			process.exit(1);
		});
	} else {
		console.log(`
📡 Feed Monitor Service

USAGE:
  bun run feed-monitor [command] [options]

COMMANDS:
  start              Start monitoring service (default)
  changelog [limit] [topicId]  Post changelog once
  rss [limit] [topicId] [category]  Post RSS feed once

EXAMPLES:
  bun run feed-monitor start
  bun run feed-monitor changelog 10 6
  bun run feed-monitor rss 5 7 ci

ENVIRONMENT:
  TELEGRAM_BOT_TOKEN    Bot token (required)
  TELEGRAM_CHAT_ID      Chat/supergroup ID (required)
  API_URL               API base URL (default: http://localhost:3001)
`);
	}
}
