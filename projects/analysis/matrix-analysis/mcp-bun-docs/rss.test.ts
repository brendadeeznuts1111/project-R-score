#!/usr/bin/env bun
/**
 * RSS parser tests — parseRSS (Bun-safe, no DOMParser).
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { parseRSS, type RSSFeed, type RSSItem, safeRSSPreview } from "./rss.ts";

let fetchSpy: ReturnType<typeof spyOn> | null = null;

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
  <title>Test Feed</title>
  <description>Test</description>
  <link>https://example.com</link>
  <lastBuildDate>Mon, 01 Jan 2024 00:00:00 GMT</lastBuildDate>
  <item>
    <title>Bun v99.0.0</title>
    <link>https://bun.com/blog/bun-v99</link>
    <pubDate>Thu, 29 Jan 2025 12:00:00 GMT</pubDate>
    <description>Release notes</description>
  </item>
  <item>
    <title>Bun v98.0.0</title>
    <link>https://bun.com/blog/bun-v98</link>
    <pubDate>Tue, 27 Jan 2025 10:00:00 GMT</pubDate>
  </item>
</channel>
</rss>`;

describe("parseRSS", () => {
	beforeEach(() => {
		fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(SAMPLE_RSS),
		) as ReturnType<typeof spyOn>;
	});
	afterEach(() => {
		if (fetchSpy) fetchSpy.mockRestore();
	});

	it("returns RSSFeedResult with feed and audit", async () => {
		const result = await parseRSS("https://example.com/feed.xml");
		expect(result).toHaveProperty("feed");
		expect(result).toHaveProperty("audit");
		expect(result.audit).toHaveProperty("fetchTimeMs");
		expect(result.audit).toHaveProperty("sizeBytes");
		expect(result.audit).toHaveProperty("parseTimeMs");
		const feed = result.feed;
		expect(feed).toHaveProperty("title", "Test Feed");
		expect(feed).toHaveProperty("description", "Test");
		expect(feed).toHaveProperty("link", "https://example.com");
		expect(Array.isArray(feed.items)).toBe(true);
		expect(feed.items.length).toBe(2);
	});

	it("parses item title, link, pubDate, description", async () => {
		const { feed } = await parseRSS("https://example.com/feed.xml");
		const first = feed.items[0];
		expect(first.title).toBe("Bun v99.0.0");
		expect(first.link).toBe("https://bun.com/blog/bun-v99");
		expect(first.pubDate).toContain("2025");
		expect(first.description).toBe("Release notes");
	});

	it("throws on non-ok response", async () => {
		fetchSpy!.mockResolvedValueOnce(new Response("", { status: 404 }));
		await expect(parseRSS("https://example.com/feed.xml")).rejects.toThrow(
			"RSS fetch failed: 404",
		);
	});

	it("calls onAudit with audit metadata", async () => {
		let captured: { fetchTimeMs: number; sizeBytes: number } | null = null;
		await parseRSS("https://example.com/feed.xml", {
			onAudit: (a) => {
				captured = a;
			},
		});
		expect(captured).not.toBeNull();
		expect(captured!.fetchTimeMs).toBeGreaterThanOrEqual(0);
		expect(captured!.sizeBytes).toBeGreaterThan(0);
	});

	it("throws when response contains parsererror", async () => {
		fetchSpy!.mockResolvedValueOnce(
			new Response("<xml><parsererror>bad</parsererror></xml>"),
		);
		await expect(parseRSS("https://example.com/feed.xml")).rejects.toThrow(
			"parsererror",
		);
	});
});

describe("safeRSSPreview", () => {
	it("returns escaped string when within maxCols", () => {
		const short = "Bun v1.3.7";
		expect(safeRSSPreview(short)).toBe(Bun.escapeHTML(short));
	});

	it("truncates and appends ellipsis when over maxCols", () => {
		const long =
			"Bun v1.3.7: GB9c Indic fix, stringWidth table reduced 27%, zero-width handling improved and more release notes here";
		expect(Bun.stringWidth(long, { countAnsiEscapeCodes: false })).toBeGreaterThan(89);
		const out = safeRSSPreview(long, { maxCols: 89, reserve: 3 });
		expect(out).toEndWith("…");
		expect(out).not.toContain(long);
		const inner = out.slice(0, -1);
		expect(Bun.stringWidth(inner, { countAnsiEscapeCodes: false })).toBeLessThanOrEqual(
			86,
		);
	});

	it("respects word boundaries when wordAware is true", () => {
		const long = "One two three four five six seven eight nine ten";
		const out = safeRSSPreview(long, { maxCols: 20, reserve: 3, wordAware: true });
		expect(out).toEndWith("…");
		const inner = out.slice(0, -1);
		expect(Bun.stringWidth(inner, { countAnsiEscapeCodes: false })).toBeLessThanOrEqual(
			17,
		);
		expect(inner.trimEnd()).toBe(inner); // no trailing space from word break
	});

	it("escapes HTML to prevent XSS", () => {
		const xss = "<script>alert(1)</script>";
		expect(safeRSSPreview(xss)).toBe(Bun.escapeHTML(xss));
	});

	it("calls onViolation when truncation occurs", () => {
		const violations: { width: number; maxCols: number }[] = [];
		safeRSSPreview("x".repeat(200), {
			maxCols: 89,
			onViolation: (d) => violations.push({ width: d.width, maxCols: d.maxCols }),
		});
		expect(violations.length).toBe(1);
		expect(violations[0].width).toBeLessThanOrEqual(89);
		expect(violations[0].maxCols).toBe(89);
	});

	it("does not call onViolation when within limit", () => {
		let called = false;
		safeRSSPreview("short", {
			onViolation: () => {
				called = true;
			},
		});
		expect(called).toBe(false);
	});

	it("custom maxCols and reserve", () => {
		const long = "A".repeat(100);
		const out = safeRSSPreview(long, { maxCols: 40, reserve: 2 });
		expect(out).toEndWith("…");
		const inner = out.slice(0, -1);
		expect(Bun.stringWidth(inner, { countAnsiEscapeCodes: false })).toBeLessThanOrEqual(
			38,
		);
	});
});
