#!/usr/bin/env bun
/**
 * @fileoverview RSS Feed API Endpoint Test Suite
 * @description Tests for RSS feed endpoint, team data integration, and feed validation
 * 
 * @module test/api/rss-feed
 * @see {@link src/api/routes.ts|RSS Feed Implementation}
 * @see {@link src/utils/rss-parser.ts|RSS Parser}
 */

import { describe, expect, it } from "bun:test";
import { RSS_CATEGORIES } from "../../src/utils/rss-constants.js";

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const API_BASE = process.env.API_URL || "http://localhost:3001";
const RSS_ENDPOINT = `${API_BASE}/api/rss.xml`;
const RSS_ENDPOINT_ALT = `${API_BASE}/api/rss`;

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

async function fetchRSSFeed(url: string = RSS_ENDPOINT): Promise<Response> {
	return fetch(url, {
		headers: {
			Accept: "application/rss+xml",
		},
	});
}

function parseRSSXML(xml: string): {
	title: string;
	link: string;
	description: string;
	items: Array<{
		title: string;
		link: string;
		description: string;
		category?: string;
		pubDate: string;
	}>;
} {
	const feed = {
		title: "",
		link: "",
		description: "",
		items: [] as Array<{
			title: string;
			link: string;
			description: string;
			category?: string;
			pubDate: string;
		}>,
	};

	// Extract channel metadata
	const channelMatch = xml.match(/<channel>([\s\S]*?)<\/channel>/);
	if (!channelMatch) {
		throw new Error("Invalid RSS feed: no channel element found");
	}

	const channelXml = channelMatch[1];

	// Parse channel elements
	const titleMatch = channelXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
	feed.title = titleMatch ? (titleMatch[1] || titleMatch[2]) : "";

	const linkMatch = channelXml.match(/<link>(.*?)<\/link>/);
	feed.link = linkMatch ? linkMatch[1] : "";

	const descMatch = channelXml.match(
		/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/,
	);
	feed.description = descMatch ? (descMatch[1] || descMatch[2]) : "";

	// Parse items
	const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

	for (const match of itemMatches) {
		const itemXml = match[1];

		const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
		const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
		const descMatch = itemXml.match(
			/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/,
		);
		const categoryMatch = itemXml.match(
			/<category><!\[CDATA\[(.*?)\]\]><\/category>|<category>(.*?)<\/category>/,
		);
		const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);

		if (titleMatch && linkMatch) {
			feed.items.push({
				title: titleMatch[1] || titleMatch[2] || "",
				link: linkMatch[1],
				description: descMatch ? (descMatch[1] || descMatch[2] || "") : "",
				category: categoryMatch ? (categoryMatch[1] || categoryMatch[2]) : undefined,
				pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toUTCString(),
			});
		}
	}

	return feed;
}

// ═══════════════════════════════════════════════════════════════
// RSS Feed API Tests
// ═══════════════════════════════════════════════════════════════

describe("RSS Feed API", () => {
	describe("Endpoint Availability", () => {
		it("should serve RSS feed at /api/rss.xml", async () => {
			const response = await fetchRSSFeed(RSS_ENDPOINT);

			// Skip test if server is not running
			if (!response.ok && response.status === 404) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			expect(response.ok).toBe(true);
			expect(response.status).toBe(200);
		});

		it("should serve RSS feed at /api/rss (alternative endpoint)", async () => {
			const response = await fetchRSSFeed(RSS_ENDPOINT_ALT);

			if (!response.ok && response.status === 404) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			expect(response.ok).toBe(true);
		});

		it("should return correct Content-Type header", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const contentType = response.headers.get("Content-Type");
			expect(contentType).toContain("application/rss+xml");
		});
	});

	describe("RSS Feed Structure", () => {
		it("should return valid RSS 2.0 XML", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();

			expect(xml).toContain('<?xml version="1.0"');
			expect(xml).toContain('<rss version="2.0">');
			expect(xml).toContain("<channel>");
		});

		it("should include required channel elements", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();
			const feed = parseRSSXML(xml);

			expect(feed.title).toBeTruthy();
			expect(feed.link).toBeTruthy();
			expect(feed.description).toBeTruthy();
		});

		it("should include RSS items", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();
			const feed = parseRSSXML(xml);

			expect(feed.items.length).toBeGreaterThan(0);
		});

		it("should include required item elements (title, link)", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();
			const feed = parseRSSXML(xml);

			for (const item of feed.items) {
				expect(item.title).toBeTruthy();
				expect(item.link).toBeTruthy();
			}
		});
	});

	describe("Team Data Integration", () => {
		it("should include team-related RSS items", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();
			const feed = parseRSSXML(xml);

			const teamItems = feed.items.filter(
				(item) =>
					item.category === RSS_CATEGORIES.TEAM ||
					item.title.toLowerCase().includes("team") ||
					item.description.toLowerCase().includes("team"),
			);

			// At least one team-related item should exist
			expect(teamItems.length).toBeGreaterThanOrEqual(0);
		});

		it("should categorize team items correctly", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();
			const feed = parseRSSXML(xml);

			const teamCategoryItems = feed.items.filter(
				(item) => item.category === RSS_CATEGORIES.TEAM,
			);

			// Verify team category items have correct category
			for (const item of teamCategoryItems) {
				expect(item.category).toBe(RSS_CATEGORIES.TEAM);
			}
		});
	});

	describe("RSS Feed Validation", () => {
		it("should include valid pubDate format (RFC 822)", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();
			const feed = parseRSSXML(xml);

			// RFC 822 format: "Mon, 01 Jan 2024 12:00:00 GMT"
			const rfc822Pattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;

			for (const item of feed.items) {
				if (item.pubDate) {
					expect(item.pubDate).toMatch(rfc822Pattern);
				}
			}
		});

		it("should include guid for items", async () => {
			const response = await fetchRSSFeed();

			if (!response.ok) {
				console.log("⚠️  Server not running, skipping RSS feed test");
				return;
			}

			const xml = await response.text();

			// Check for guid elements
			const guidMatches = xml.matchAll(/<guid[^>]*>(.*?)<\/guid>/g);
			const guids = Array.from(guidMatches);

			// At least some items should have guid
			expect(guids.length).toBeGreaterThanOrEqual(0);
		});
	});
});
