#!/usr/bin/env bun
/**
 * @fileoverview RSS Feed Poster for Telegram
 * @description Posts CI/CD and RSS feed updates to Telegram golden supergroup
 * @module telegram/rss-poster
 */

import { TelegramBotApi } from "../api/telegram-ws.js";
import { TELEGRAM_ENV, TELEGRAM_SECRETS } from "./constants.js";
import { getThreadId, TOPIC_MAPPING } from "./topic-mapping.js";
import { DeepLinkGenerator } from "../utils/deeplink-generator.js";

interface RSSItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
	category?: string;
	author?: string;
}

/**
 * Fetch RSS feed from API endpoint
 */
async function fetchRSSFeed(): Promise<RSSItem[]> {
	try {
		const baseUrl = process.env.API_URL || "http://localhost:3001";
		const response = await fetch(`${baseUrl}/api/rss.xml`);

		if (!response.ok) {
			throw new Error(`RSS feed returned ${response.status}`);
		}

		const xml = await response.text();
		return parseRSSXML(xml);
	} catch (error) {
		console.error("Error fetching RSS feed:", error);
		return [];
	}
}

/**
 * Parse RSS XML into items
 */
function parseRSSXML(xml: string): RSSItem[] {
	const items: RSSItem[] = [];

	// Simple XML parsing (for production, use a proper XML parser)
	const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

	for (const match of itemMatches) {
		const itemXml = match[1];

		const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
		const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
		const descMatch = itemXml.match(
			/<description><!\[CDATA\[(.*?)\]\]><\/description>/,
		);
		const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
		const categoryMatch = itemXml.match(
			/<category><!\[CDATA\[(.*?)\]\]><\/category>/,
		);
		const authorMatch = itemXml.match(/<author>(.*?)<\/author>/);

		if (titleMatch && linkMatch) {
			items.push({
				title: titleMatch[1],
				link: linkMatch[1],
				description: descMatch ? descMatch[1] : "",
				pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toUTCString(),
				category: categoryMatch ? categoryMatch[1] : undefined,
				author: authorMatch ? authorMatch[1] : undefined,
			});
		}
	}

	return items;
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
 * Format RSS item for Telegram (HTML format)
 */
function formatRSSItem(item: RSSItem): string {
	const categoryEmoji: Record<string, string> = {
		system: "⚙️",
		documentation: "📚",
		registry: "📋",
		team: "👥",
		process: "🔄",
		organization: "🏢",
		tooling: "🔧",
		feature: "✨",
		development: "💻",
		ci: "🚀",
		cd: "🚀",
		deployment: "🚀",
		other: "📢",
	};

	const emoji = categoryEmoji[item.category || "other"] || "📢";
	const date = new Date(item.pubDate).toLocaleDateString();
	const author = item.author ? ` by ${escapeHtml(item.author)}` : "";
	const title = escapeHtml(item.title);

	let message = `${emoji} <b>${title}</b>${author}\n\n`;

	if (item.description) {
		// Strip HTML tags but keep basic formatting, then escape for Telegram HTML
		const cleanDesc = item.description
			.replace(/<[^>]*>/g, "")
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.substring(0, 200);
		const escapedDesc = escapeHtml(cleanDesc);
		message += `${escapedDesc}${cleanDesc.length >= 200 ? "..." : ""}\n\n`;
	}

	// Generate deep-link using DeepLinkGenerator (RFC 001)
	const deepLinkGen = new DeepLinkGenerator();
	const deepLink = deepLinkGen.generateRSSItemLink({
		link: item.link,
		category: item.category,
		pubDate: item.pubDate,
	});

	message += `<a href="${deepLink}">Read More</a>\n`;
	message += `<i>${date}</i>`;

	return message;
}

/**
 * Post RSS feed updates to Telegram
 */
export async function postRSSFeed(options: {
	limit?: number;
	topicId?: number | string; // Can be logical ID (7), name ("ci-cd-rss"), or actual thread ID (101)
	botToken?: string;
	chatId?: string;
	filterCategory?: string;
}): Promise<void> {
	// Resolve topic ID: if it's a logical ID or name, map it to actual thread ID
	const logicalTopicId = options.topicId ?? 7;
	const actualThreadId =
		typeof logicalTopicId === "number" && logicalTopicId < 100
			? (getThreadId(logicalTopicId) ?? logicalTopicId) // Use mapping if logical ID, otherwise assume it's already a thread ID
			: typeof logicalTopicId === "string"
				? (getThreadId(logicalTopicId) ?? TOPIC_MAPPING["ci-cd-rss"])
				: logicalTopicId;

	const { limit = 5, filterCategory } = options;

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
	let items = await fetchRSSFeed();

	// Filter by category if specified
	if (filterCategory) {
		items = items.filter(
			(item) => item.category?.toLowerCase() === filterCategory.toLowerCase(),
		);
	}

	// Limit items
	items = items.slice(0, limit);

	if (items.length === 0) {
		console.log("No RSS feed items found");
		return;
	}

	// Post each item to Telegram
	let posted = 0;
	for (const item of items) {
		const message = formatRSSItem(item);
		const result = await api.sendMessage(chatId, message, actualThreadId);

		if (result.ok) {
			posted++;
			console.log(`✅ Posted: ${item.title.substring(0, 50)}...`);
		} else {
			// Handle rate limiting
			if (result.description?.includes("Too Many Requests")) {
				const retryAfter = result.description.match(/retry after (\d+)/)?.[1];
				if (retryAfter) {
					const waitSeconds = parseInt(retryAfter);
					console.log(`⏳ Rate limited. Waiting ${waitSeconds} seconds...`);
					await Bun.sleep(waitSeconds * 1000);
					// Retry once
					const retryResult = await api.sendMessage(
						chatId,
						message,
						actualThreadId,
					);
					if (retryResult.ok) {
						posted++;
						console.log(`✅ Posted (retry): ${item.title.substring(0, 50)}...`);
					} else {
						console.error(
							`❌ Failed to post after retry: ${retryResult.description}`,
						);
					}
				} else {
					console.error(`❌ Failed to post: ${result.description}`);
				}
			} else {
				console.error(`❌ Failed to post: ${result.description}`);
			}
		}

		// Rate limiting between posts (2 seconds to avoid hitting limits)
		await Bun.sleep(2000);
	}

	console.log(
		`\n✅ Posted ${posted}/${items.length} RSS feed items to topic ${actualThreadId} (${logicalTopicId})`,
	);
}

// CLI entry point
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const limit = args[0] ? parseInt(args[0]) : 5;
	const topicId = args[1]
		? isNaN(parseInt(args[1]))
			? args[1]
			: parseInt(args[1])
		: 7;
	const filterCategory = args[2] || undefined;

	console.log(
		`📢 Posting RSS feed to topic: ${topicId} (mapped to thread ID: ${getThreadId(topicId) ?? topicId})\n`,
	);

	postRSSFeed({ limit, topicId, filterCategory }).catch((error) => {
		console.error("Error:", error);
		process.exit(1);
	});
}
