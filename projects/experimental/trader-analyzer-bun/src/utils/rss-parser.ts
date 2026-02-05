#!/usr/bin/env bun
/**
 * @fileoverview RSS Feed Parser Utility
 * @description Universal RSS 2.0 parser supporting multiple XML formats
 * @module utils/rss-parser
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-RSS-PARSER@1.3.4.0.0.0.0;instance-id=RSS-PARSER-001;version=1.3.4.0.0.0.0}]
 * [PROPERTIES:{parser={value:"rss-parser";@root:"ROOT-UTILS";@chain:["BP-RSS","BP-XML"];@version:"1.3.4.0.0.0.0"}}]
 * [CLASS:RSSParser][#REF:v-1.3.4.0.0.0.0.BP.RSS.PARSER.1.0.A.1.1.UTILS.1.1]]
 *
 * Version: 1.3.4.0.0.0.0
 * Ripgrep Pattern: 1\.3\.4\.0\.0\.0\.0|RSS-PARSER-001|BP-RSS-PARSER@1\.3\.4\.0\.0\.0\.0|rss-parser
 *
 * Features:
 * - RSS 2.0 compliant parsing
 * - CDATA and plain text format support
 * - HTML entity decoding
 * - Bun RSS feed integration
 * - Version tracking utilities
 *
 * @see {@link ../docs/BUN-RSS-INTEGRATION.md Bun RSS Integration}
 * @see {@link ../docs/BUN-WORKSPACES.md Bun Workspaces}
 * @see {@link https://bun.com/rss.xml Bun RSS Feed}
 */

import {
	RSS_FEED_URLS,
	RSS_USER_AGENTS,
	RSS_DEFAULTS,
	RSS_REGEX_PATTERNS,
	RSS_BUN_VERSION_PATHS,
} from "./rss-constants.js";

export interface RSSItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
	category?: string;
	author?: string;
	guid?: string;
}

export interface RSSFeed {
	title: string;
	link: string;
	description: string;
	language?: string;
	lastBuildDate?: string;
	pubDate?: string;
	ttl?: number;
	items: RSSItem[];
}

/**
 * Parse RSS XML into structured feed data
 * Supports both CDATA and plain text formats
 */
export function parseRSSXML(xml: string): RSSFeed {
	const feed: RSSFeed = {
		title: "",
		link: "",
		description: "",
		items: [],
	};

	// Extract channel metadata
	const channelMatch = xml.match(/<channel>([\s\S]*?)<\/channel>/);
	if (!channelMatch) {
		throw new Error("Invalid RSS feed: no channel element found");
	}

	const channelXml = channelMatch[1];

	// Parse channel elements (handle both CDATA and plain text)
	feed.title = extractText(channelXml, "title") || "";
	feed.link = extractText(channelXml, "link") || "";
	feed.description = extractText(channelXml, "description") || "";
	feed.language = extractText(channelXml, "language");
	feed.lastBuildDate = extractText(channelXml, "lastBuildDate");
	feed.pubDate = extractText(channelXml, "pubDate");
	const ttlStr = extractText(channelXml, "ttl");
	if (ttlStr) {
		feed.ttl = parseInt(ttlStr, 10);
	}

	// Parse items
	const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

	for (const match of itemMatches) {
		const itemXml = match[1];
		const item = parseRSSItem(itemXml);
		if (item) {
			feed.items.push(item);
		}
	}

	return feed;
}

/**
 * Parse a single RSS item
 */
function parseRSSItem(itemXml: string): RSSItem | null {
	const title = extractText(itemXml, "title");
	const link = extractText(itemXml, "link");

	if (!title || !link) {
		return null;
	}

	return {
		title,
		link,
		description: extractText(itemXml, "description") || "",
		pubDate: extractText(itemXml, "pubDate") || new Date().toUTCString(),
		category: extractText(itemXml, "category"),
		author: extractText(itemXml, "author"),
		guid: extractText(itemXml, "guid"),
	};
}

/**
 * Extract text from XML element, handling both CDATA and plain text
 */
function extractText(xml: string, tagName: string): string | null {
	// Try CDATA format first: <tag><![CDATA[content]]></tag>
	const cdataMatch = xml.match(
		new RegExp(`<${tagName}><!\\[CDATA\\[(.*?)\\]\\]></${tagName}>`, "i"),
	);
	if (cdataMatch) {
		return cdataMatch[1].trim();
	}

	// Try plain text format: <tag>content</tag>
	const plainMatch = xml.match(
		new RegExp(`<${tagName}>(.*?)</${tagName}>`, "is"),
	);
	if (plainMatch) {
		// Decode HTML entities
		return decodeHtmlEntities(plainMatch[1].trim());
	}

	return null;
}

/**
 * Decode common HTML entities (including numeric entities)
 */
function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
		.replace(/&nbsp;/g, " ");
}

/**
 * Fetch RSS feed from URL
 */
export async function fetchRSSFeed(url: string): Promise<RSSFeed> {
	const response = await fetch(url, {
		headers: {
			"User-Agent": RSS_USER_AGENTS.PARSER,
		},
	});

	if (!response.ok) {
		throw new Error(`RSS feed returned ${response.status}: ${response.statusText}`);
	}

	const xml = await response.text();
	return parseRSSXML(xml);
}

/**
 * Get latest items from RSS feed
 */
export async function getLatestRSSItems(
	url: string,
	limit: number = RSS_DEFAULTS.ITEM_LIMIT,
): Promise<RSSItem[]> {
	const feed = await fetchRSSFeed(url);
	return feed.items.slice(0, limit);
}

/**
 * Bun RSS feed URL
 * @deprecated Use RSS_FEED_URLS.BUN from rss-constants.ts instead
 */
export const BUN_RSS_URL = RSS_FEED_URLS.BUN;

/**
 * Get latest Bun version from RSS feed
 */
export async function getLatestBunVersion(): Promise<string | null> {
	try {
		const items = await getLatestRSSItems(
			RSS_FEED_URLS.BUN,
			RSS_DEFAULTS.VERSION_CHECK_LIMIT,
		);

		// Look for version pattern (e.g., "Bun v1.3.4")
		for (const item of items) {
			const versionMatch = item.title.match(RSS_REGEX_PATTERNS.BUN_VERSION);
			if (versionMatch) {
				return versionMatch[1];
			}
		}

		return null;
	} catch (error) {
		console.error("Error fetching latest Bun version:", error);
		return null;
	}
}

/**
 * Get current Bun version from .bun-version file or runtime
 * Checks .bun-version file first (for version manager compatibility),
 * then falls back to Bun.version runtime
 * 
 * @see {@link RSS_BUN_VERSION_PATHS.BUN_VERSION_FILE} Path to .bun-version file
 * @returns Current Bun version string (e.g., "1.3.4")
 */
export function getCurrentBunVersion(): string {
	// Try to read .bun-version file if available (for version managers like bvm/asdf)
	try {
		const bunVersionFile = Bun.file(RSS_BUN_VERSION_PATHS.BUN_VERSION_FILE);
		if (bunVersionFile.existsSync()) {
			const content = bunVersionFile.textSync().trim();
			if (content) {
				return content;
			}
		}
	} catch {
		// Fallback to runtime version if file read fails
	}
	
	// Fallback to runtime version
	return Bun.version;
}
