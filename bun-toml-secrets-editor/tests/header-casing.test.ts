#!/usr/bin/env bun
// tests/header-casing.test.ts - Critical Header Case Preservation Tests

import { describe, expect, mock, test } from "bun:test";

describe("Bun v1.3.7 Header Casing Preservation", () => {
	test("should preserve Authorization casing (not authorization)", async () => {
		// Mock server that validates header casing
		let receivedHeaders: Record<string, string> = {};

		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as any;

		await fetch("https://api.example.com/feed", {
			headers: {
				Authorization: "Bearer token123", // Must stay "Authorization"
				"Content-Type": "application/json", // Must stay "Content-Type"
			},
		});

		// Restore original fetch
		globalThis.fetch = originalFetch;

		// v1.3.7: Verify exact casing preserved
		expect(receivedHeaders.Authorization).toBe("Bearer token123");
		expect(receivedHeaders.authorization).toBeUndefined();
		expect(receivedHeaders["Content-Type"]).toBe("application/json");
		expect(receivedHeaders["content-type"]).toBeUndefined();
	});

	test("should work with Headers object preserving casing", () => {
		const headers = new Headers();
		headers.set("X-API-Key", "secret"); // Set as "X-API-Key"

		// v1.3.7: get() returns the value, but internal casing is preserved
		expect(headers.get("X-API-Key")).toBe("secret");
		expect(headers.get("x-api-key")).toBe("secret"); // Still accessible (case-insensitive lookup)

		// But when sent over wire, it's "X-API-Key" exactly
	});

	test("legacy RSS servers require User-Agent not user-agent", async () => {
		const strictServer = (headers: Headers) => {
			// Legacy PHP script that checks $_SERVER['HTTP_User-Agent'] specifically
			const headerArray: string[] = [];
			headers.forEach((value, key) => {
				headerArray.push(`${key}: ${value}`);
			});
			const headerStr = headerArray.join("\n");
			return (
				headerStr.includes("User-Agent") && !headerStr.includes("user-agent")
			);
		};

		const headers = new Headers({
			"User-Agent": "RSS-Bot/1.0", // v1.3.7 preserves this exactly
			Accept: "application/rss+xml",
		});

		expect(strictServer(headers)).toBe(true);
	});

	test("RSSFetcherV137 preserves critical headers", async () => {
		const { RSSFetcherV137 } = await import(
			"../src/services/rss-fetcher-v1.3.7.js"
		);
		const fetcher = new RSSFetcherV137();

		let sentHeaders: Record<string, string> = {};
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(async (_url, options) => {
			sentHeaders = options.headers as Record<string, string>;
			return new Response("<rss></rss>", {
				headers: { "content-type": "application/rss+xml" },
			});
		}) as any;

		await fetcher.fetchWithCasing("https://example.com/rss.xml");

		// Restore original fetch
		globalThis.fetch = originalFetch;

		// v1.3.7: Critical headers must be exact case
		expect(sentHeaders["User-Agent"]).toContain("RSS-Optimizer/1.0");
		expect(sentHeaders["user-agent"]).toBeUndefined();
		expect(sentHeaders.Accept).toContain("application/rss+xml");
		expect(sentHeaders.accept).toBeUndefined();
	});

	test("WordPress RSS compatibility with proper casing", async () => {
		// Simulate WordPress server that rejects lowercase user-agent
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(async (_url, options) => {
			const headers = options.headers as Record<string, string>;

			// WordPress checks $_SERVER['HTTP_USER_AGENT'] specifically
			if (headers["User-Agent"] && !headers["user-agent"]) {
				return new Response('<?xml version="1.0"?><rss></rss>', {
					status: 200,
					headers: { "Content-Type": "application/rss+xml" },
				});
			} else {
				return new Response("Forbidden: Invalid User-Agent", { status: 403 });
			}
		}) as any;

		// v1.3.7: This should work with proper casing
		const response = await fetch("https://wordpress-site.com/feed/", {
			headers: { "User-Agent": "RSS-Reader/1.0" },
		});

		// Restore original fetch
		globalThis.fetch = originalFetch;

		expect(response.status).toBe(200);
	});
});

describe("Header Casing Performance Impact", () => {
	test("header preservation has minimal overhead", () => {
		const start = performance.now();

		// Create many headers with exact casing
		for (let i = 0; i < 1000; i++) {
			const _headers = new Headers({
				Authorization: `Bearer token${i}`,
				"Content-Type": "application/json",
				"X-Custom-Header": `value${i}`,
			});
		}

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(50); // Should be very fast
	});

	test("case-insensitive lookup still works", () => {
		const headers = new Headers({
			"User-Agent": "RSS-Bot/1.0",
			Authorization: "Bearer token",
		});

		// v1.3.7: Case-insensitive access still works for compatibility
		expect(headers.get("user-agent")).toBe("RSS-Bot/1.0");
		expect(headers.get("User-Agent")).toBe("RSS-Bot/1.0");
		expect(headers.get("authorization")).toBe("Bearer token");
		expect(headers.get("Authorization")).toBe("Bearer token");
	});
});
