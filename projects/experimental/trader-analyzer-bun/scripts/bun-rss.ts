#!/usr/bin/env bun
/**
 * @fileoverview Bun RSS Feed Fetcher
 * @description Fetch and display Bun release announcements from bun.com/rss.xml
 * @module scripts/bun-rss
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-BUN-RSS-CLI@1.3.4.0.0.0.0;instance-id=BUN-RSS-CLI-001;version=1.3.4.0.0.0.0}]
 * [PROPERTIES:{cli={value:"bun-rss";@root:"ROOT-SCRIPTS";@chain:["BP-RSS","BP-CLI"];@version:"1.3.4.0.0.0.0"}}]
 * [CLASS:BunRSSFetcher][#REF:v-1.3.4.0.0.0.0.BP.BUN.RSS.CLI.1.0.A.1.1.SCRIPTS.1.1]]
 *
 * Version: 1.3.4.0.0.0.0
 * Ripgrep Pattern: 1\.3\.4\.0\.0\.0\.0|BUN-RSS-CLI-001|BP-BUN-RSS-CLI@1\.3\.4\.0\.0\.0\.0|bun-rss
 *
 * Usage:
 *   bun run bun:rss [limit]
 *   bun run bun:version
 *
 * @see {@link ../src/utils/rss-parser.ts RSS Parser Utility}
 * @see {@link ../docs/BUN-RSS-INTEGRATION.md Bun RSS Integration}
 * @see {@link https://bun.com/rss.xml Bun RSS Feed}
 */

import {
	fetchRSSFeed,
	getLatestRSSItems,
	getLatestBunVersion,
	BUN_RSS_URL,
	type RSSItem,
} from "../src/utils/rss-parser.js";
import { RSS_FEED_URLS, RSS_DEFAULTS } from "../src/utils/rss-constants.js";

/**
 * Format RSS item for console display
 */
function formatItem(item: RSSItem, index: number): string {
	const date = new Date(item.pubDate);
	const dateStr = date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	const description = item.description
		.substring(0, 150)
		.replace(/\n/g, " ")
		.trim();

	return `
${index + 1}. ${item.title}
   ${description}${item.description.length > 150 ? "..." : ""}
   📅 ${dateStr} | 🔗 ${item.link}
`;
}

/**
 * Display Bun RSS feed items
 */
async function displayBunRSS(limit: number = RSS_DEFAULTS.ITEM_LIMIT): Promise<void> {
	try {
		console.info("🔍 Fetching Bun RSS feed...\n");
		const feed = await fetchRSSFeed(RSS_FEED_URLS.BUN);

		console.info(`📡 ${feed.title}`);
		console.info(`🔗 ${feed.link}\n`);
		console.info(`📝 ${feed.description}\n`);
		console.info("─".repeat(70));
		console.info(`Latest ${Math.min(limit, feed.items.length)} items:\n`);

		feed.items.slice(0, limit).forEach((item, index) => {
			console.info(formatItem(item, index));
		});

		console.info("─".repeat(70));
		console.info(`\n✅ Fetched ${feed.items.length} total items`);
	} catch (error) {
		console.error("❌ Error fetching Bun RSS feed:", error);
		process.exit(1);
	}
}


// CLI entry point
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const command = args[0];

	if (command === "version" || command === "v") {
		getLatestBunVersion().then((version) => {
			if (version) {
				console.info(version);
			} else {
				console.error("Could not determine latest Bun version");
				process.exit(1);
			}
		});
	} else {
		const limit = args[0]
			? parseInt(args[0], 10)
			: RSS_DEFAULTS.ITEM_LIMIT;
		displayBunRSS(limit);
	}
}
