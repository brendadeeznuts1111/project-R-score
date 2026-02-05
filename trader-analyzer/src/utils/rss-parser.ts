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

import { CircuitBreaker, retryWithBackoff, type RetryOptions } from "./enterprise-retry.js";
import {
	RSS_BUN_VERSION_PATHS,
	RSS_DEFAULTS,
	RSS_FEED_URLS,
	RSS_REGEX_PATTERNS,
	RSS_USER_AGENTS,
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
 * Only matches elements that are direct children (not nested inside <item> tags)
 */
function extractText(xml: string, tagName: string): string | null {
	// Try CDATA format first: <tag><![CDATA[content]]></tag>
	// Use a more specific pattern that avoids matching inside <item> tags
	const cdataMatch = xml.match(
		new RegExp(`<${tagName}><!\\[CDATA\\[(.*?)\\]\\]></${tagName}>`, "i"),
	);
	if (cdataMatch) {
		// Check if this match is before any <item> tag (to avoid matching item titles)
		const matchIndex = cdataMatch.index!;
		const itemIndex = xml.indexOf("<item>");
		if (itemIndex === -1 || matchIndex < itemIndex) {
			return cdataMatch[1].trim();
		}
	}

	// Try plain text format: <tag>content</tag>
	const plainMatch = xml.match(
		new RegExp(`<${tagName}>(.*?)</${tagName}>`, "is"),
	);
	if (plainMatch) {
		// Check if this match is before any <item> tag (to avoid matching item titles)
		const matchIndex = plainMatch.index!;
		const itemIndex = xml.indexOf("<item>");
		if (itemIndex === -1 || matchIndex < itemIndex) {
			// Decode HTML entities
			return decodeHtmlEntities(plainMatch[1].trim());
		}
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
 * Default timeout for RSS feed requests (15 seconds)
 * RSS feeds can be slower than API endpoints
 */
const DEFAULT_RSS_TIMEOUT_MS = 15000;

/**
 * Circuit breaker instance for RSS feed requests
 * Prevents cascading failures when RSS feeds are down
 * Configured with 3 failure threshold, 30s reset timeout, 2 half-open attempts
 */
const rssFeedCircuitBreaker = new CircuitBreaker();

/**
 * Fetch RSS feed from URL with retry logic, circuit breaker, and timeout protection
 * 
 * Features:
 * - Automatic retry with exponential backoff (3 attempts)
 * - Circuit breaker prevents cascading failures
 * - Timeout protection (15 seconds default)
 * - Improved error messages with context
 * 
 * @param url - RSS feed URL to fetch
 * @param options - Optional retry and timeout configuration
 * @returns Parsed RSS feed
 * @throws Error if feed cannot be fetched after retries or circuit breaker is open
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const feed = await fetchRSSFeed('https://example.com/feed.xml');
 * 
 * // With custom retry options
 * const feed = await fetchRSSFeed('https://example.com/feed.xml', {
 *   maxAttempts: 5,
 *   initialDelayMs: 1000
 * });
 * ```
 */
export async function fetchRSSFeed(
	url: string,
	options?: RetryOptions & { timeoutMs?: number },
): Promise<RSSFeed> {
	const timeoutMs = options?.timeoutMs ?? DEFAULT_RSS_TIMEOUT_MS;

	// Use circuit breaker to execute the fetch with retry logic
	return await rssFeedCircuitBreaker.execute(async () => {
		const result = await retryWithBackoff(
			async () => {
				try {
					// Set up timeout signal
					const timeoutSignal = AbortSignal.timeout(timeoutMs);
					
					const response = await fetch(url, {
						headers: {
							"User-Agent": RSS_USER_AGENTS.PARSER,
							"Accept": "application/rss+xml, application/xml, text/xml, */*",
						},
						signal: timeoutSignal,
					});

					if (!response.ok) {
						const error = new Error(
							`RSS feed ${url} returned ${response.status}: ${response.statusText}`,
						);
						(error as any).status = response.status;
						(error as any).statusText = response.statusText;
						throw error;
					}

					const xml = await response.text();
					
					if (!xml || xml.trim().length === 0) {
						throw new Error(`RSS feed ${url} returned empty response`);
					}

					return parseRSSXML(xml);
				} catch (error) {
					// Re-throw with enhanced context
					if (error instanceof Error) {
						if (error.name === "AbortError" || error.message.includes("timeout")) {
							throw new Error(
								`RSS feed ${url} request timed out after ${timeoutMs}ms`,
							);
						}
						if (error.message.includes("fetch failed")) {
							throw new Error(
								`RSS feed ${url} network error: ${error.message}`,
							);
						}
					}
					throw error;
				}
			},
			{
				maxAttempts: options?.maxAttempts ?? 3,
				initialDelayMs: options?.initialDelayMs ?? 500,
				maxDelayMs: options?.maxDelayMs ?? 5000,
				retryableErrors: options?.retryableErrors ?? [408, 429, 500, 502, 503, 504],
				onRetry: options?.onRetry ?? ((attempt, error) => {
					console.warn(
						`RSS feed fetch retry ${attempt} for ${url}:`,
						error instanceof Error ? error.message : String(error),
					);
				}),
			},
		);

		if (!result.success) {
			const errorMessage = result.error instanceof Error
				? result.error.message
				: String(result.error);
			throw new Error(
				`Failed to fetch RSS feed ${url} after ${result.attempts} attempts: ${errorMessage}`,
			);
		}

		return result.result!;
	});
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
		if (await bunVersionFile.exists()) {
			const content = (await bunVersionFile.text()).trim();
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
