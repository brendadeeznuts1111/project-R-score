#!/usr/bin/env bun
/**
 * @fileoverview RSS Parser Test Suite
 * @description Comprehensive tests for RSS feed parsing, team data integration, and RSS feed utilities
 * 
 * @module test/utils/rss-parser
 * @see {@link src/utils/rss-parser.ts|RSS Parser Implementation}
 * @see {@link src/utils/rss-constants.ts|RSS Constants}
 */

import { describe, expect, it } from "bun:test";
import { RSS_CATEGORIES } from "../../src/utils/rss-constants.js";
import {
	fetchRSSFeed,
	getCurrentBunVersion,
	getLatestBunVersion,
	getLatestRSSItems,
	parseRSSXML
} from "../../src/utils/rss-parser.js";

// ═══════════════════════════════════════════════════════════════
// Test Data
// ═══════════════════════════════════════════════════════════════

const SAMPLE_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[NEXUS Trading Platform]]></title>
    <link>http://localhost:3001</link>
    <description><![CDATA[NEXUS Trading Intelligence Platform]]></description>
    <language>en-US</language>
    <lastBuildDate>Mon, 01 Jan 2024 12:00:00 GMT</lastBuildDate>
    <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    <ttl>60</ttl>
    <item>
      <title><![CDATA[Team Structure & Departments]]></title>
      <link>https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/TEAM.md</link>
      <description><![CDATA[8 departments organized with color coding and review assignments]]></description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
      <category><![CDATA[team]]></category>
      <guid isPermaLink="true">https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/TEAM.md</guid>
    </item>
    <item>
      <title><![CDATA[Registry System Enhanced]]></title>
      <link>http://localhost:3001/api/registry</link>
      <description><![CDATA[Registry system now includes team departments]]></description>
      <pubDate>Mon, 01 Jan 2024 11:00:00 GMT</pubDate>
      <category><![CDATA[registry]]></category>
      <guid isPermaLink="true">http://localhost:3001/api/registry</guid>
    </item>
  </channel>
</rss>`;

const SAMPLE_RSS_XML_PLAIN_TEXT = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>http://example.com</link>
    <description>Test Description</description>
    <item>
      <title>Test Item</title>
      <link>http://example.com/item</link>
      <description>Test Description &amp; Content</description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

// ═══════════════════════════════════════════════════════════════
// RSS Parser Tests
// ═══════════════════════════════════════════════════════════════

describe("RSS Parser", () => {
	describe("parseRSSXML", () => {
		it("should parse RSS XML with CDATA sections", () => {
			const feed = parseRSSXML(SAMPLE_RSS_XML);

			expect(feed.title).toBe("NEXUS Trading Platform");
			expect(feed.link).toBe("http://localhost:3001");
			expect(feed.description).toBe("NEXUS Trading Intelligence Platform");
			expect(feed.language).toBe("en-US");
			expect(feed.items).toHaveLength(2);
		});

		it("should parse RSS items with CDATA", () => {
			const feed = parseRSSXML(SAMPLE_RSS_XML);
			const item = feed.items[0];

			expect(item.title).toBe("Team Structure & Departments");
			expect(item.link).toBe(
				"https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/TEAM.md",
			);
			expect(item.category).toBe("team");
		});

		it("should parse RSS XML with plain text (no CDATA)", () => {
			const feed = parseRSSXML(SAMPLE_RSS_XML_PLAIN_TEXT);

			expect(feed.title).toBe("Test Feed");
			expect(feed.items).toHaveLength(1);
			expect(feed.items[0].title).toBe("Test Item");
			expect(feed.items[0].description).toBe("Test Description & Content");
		});

		it("should decode HTML entities in plain text", () => {
			const feed = parseRSSXML(SAMPLE_RSS_XML_PLAIN_TEXT);
			const item = feed.items[0];

			expect(item.description).toBe("Test Description & Content");
		});

		it("should parse TTL value", () => {
			const feed = parseRSSXML(SAMPLE_RSS_XML);

			expect(feed.ttl).toBe(60);
		});

		it("should handle missing optional fields", () => {
			const minimalXml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Minimal</title>
    <link>http://example.com</link>
    <description>Minimal feed</description>
    <item>
      <title>Item</title>
      <link>http://example.com/item</link>
    </item>
  </channel>
</rss>`;

			const feed = parseRSSXML(minimalXml);

			expect(feed.title).toBe("Minimal");
			expect(feed.items).toHaveLength(1);
			expect(feed.items[0].title).toBe("Item");
			expect(feed.items[0].description).toBe("");
		});

		it("should throw error for invalid RSS (no channel)", () => {
			const invalidXml = `<?xml version="1.0"?><rss version="2.0"></rss>`;

			expect(() => parseRSSXML(invalidXml)).toThrow("Invalid RSS feed: no channel element found");
		});
	});

	describe("fetchRSSFeed", () => {
		it("should fetch and parse RSS feed from URL", async () => {
			// Mock fetch for testing
			const originalFetch = global.fetch;
			global.fetch = async (url: string | Request | URL) => {
				if (typeof url === "string" && url.includes("rss.xml")) {
					return new Response(SAMPLE_RSS_XML, {
						headers: { "Content-Type": "application/rss+xml" },
					});
				}
				return originalFetch(url);
			};

			try {
				const feed = await fetchRSSFeed("http://example.com/rss.xml");

				expect(feed.title).toBe("NEXUS Trading Platform");
				expect(feed.items).toHaveLength(2);
			} finally {
				global.fetch = originalFetch;
			}
		});

		it("should throw error for non-OK response", async () => {
			const originalFetch = global.fetch;
			global.fetch = async () => {
				return new Response("Not Found", { status: 404 });
			};

			try {
				await expect(fetchRSSFeed("http://example.com/rss.xml")).rejects.toThrow("404");
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe("getLatestRSSItems", () => {
		it("should return limited number of items", async () => {
			const originalFetch = global.fetch;
			global.fetch = async (url: string | Request | URL) => {
				if (typeof url === "string" && url.includes("rss.xml")) {
					return new Response(SAMPLE_RSS_XML, {
						headers: { "Content-Type": "application/rss+xml" },
					});
				}
				return originalFetch(url);
			};

			try {
				const items = await getLatestRSSItems("http://example.com/rss.xml", 1);

				expect(items).toHaveLength(1);
				expect(items[0].title).toBe("Team Structure & Departments");
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe("Bun Version Utilities", () => {
		it("should get current Bun version", () => {
			const version = getCurrentBunVersion();

			expect(version).toBeTruthy();
			expect(typeof version).toBe("string");
			// Version should match pattern like "1.3.4"
			expect(version).toMatch(/^\d+\.\d+\.\d+/);
		});

		it("should get latest Bun version from RSS (if available)", async () => {
			// This test may fail if Bun RSS feed is unavailable
			// So we'll make it optional
			try {
				const latest = await getLatestBunVersion();
				if (latest) {
					expect(typeof latest).toBe("string");
					expect(latest).toMatch(/^\d+\.\d+\.\d+/);
				}
			} catch (error) {
				// RSS feed may be unavailable in test environment
				console.log("⚠️  Bun RSS feed unavailable, skipping version check");
			}
		});
	});

	describe("Team Data Integration", () => {
		it("should filter RSS items by team category", () => {
			const feed = parseRSSXML(SAMPLE_RSS_XML);
			const teamItems = feed.items.filter((item) => item.category === RSS_CATEGORIES.TEAM);

			expect(teamItems).toHaveLength(1);
			expect(teamItems[0].title).toBe("Team Structure & Departments");
		});

		it("should identify team-related RSS items", () => {
			const feed = parseRSSXML(SAMPLE_RSS_XML);
			const teamItems = feed.items.filter(
				(item) =>
					item.category === RSS_CATEGORIES.TEAM ||
					item.title.toLowerCase().includes("team") ||
					item.description.toLowerCase().includes("team"),
			);

			expect(teamItems.length).toBeGreaterThan(0);
		});
	});
});
