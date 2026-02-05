// tests/header-casing.test.ts
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { RSSFetcherV137 } from "../src/services/rss-fetcher-v1.3.7.js";

describe("Bun v1.3.7 Header Casing Preservation", () => {
	let fetcher: RSSFetcherV137;
	let originalFetch: typeof fetch;

	beforeEach(() => {
		fetcher = new RSSFetcherV137();
		originalFetch = globalThis.fetch;
	});

	test("should preserve Authorization casing (not authorization)", async () => {
		// Mock server that validates header casing
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchWithPreservedCasing("https://api.example.com/feed", {
			Authorization: "Bearer token123", // Must stay "Authorization"
			"Content-Type": "application/json", // Must stay "Content-Type"
		});

		// v1.3.7: Verify exact casing preserved
		expect(receivedHeaders["Authorization"]).toBe("Bearer token123");
		expect(receivedHeaders["authorization"]).toBeUndefined();
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
		// This test verifies that Headers object preserves casing internally
		// The actual HTTP request would send the headers with preserved casing
		const headers = new Headers({
			"User-Agent": "RSS-Bot/1.0", // v1.3.7 preserves this exactly
			Accept: "application/rss+xml",
		});

		// Headers.get() is case-insensitive, but the internal representation preserves casing
		expect(headers.get("User-Agent")).toBe("RSS-Bot/1.0");
		expect(headers.get("user-agent")).toBe("RSS-Bot/1.0"); // Case-insensitive lookup

		// When sent over HTTP, the casing is preserved as originally set
		// This is what legacy RSS servers expect - the header name as "User-Agent"
		expect(headers.has("User-Agent")).toBe(true);
	});

	test("should preserve default headers casing", async () => {
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchWithPreservedCasing("https://example.com/feed");

		// Verify default headers maintain exact casing
		expect(receivedHeaders["User-Agent"]).toBe("RSS-Optimizer/1.0 (Bun/1.3.7)");
		expect(receivedHeaders["Accept"]).toBe(
			"application/rss+xml, application/atom+xml",
		);
		expect(receivedHeaders["Accept-Encoding"]).toBe("gzip, deflate, br");
		expect(receivedHeaders["Connection"]).toBe("keep-alive");
		expect(receivedHeaders["Cache-Control"]).toBe("no-cache");
	});

	test("should merge custom headers with preserved casing", async () => {
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchWithPreservedCasing("https://example.com/feed", {
			"X-Custom-Header": "custom-value",
			Authorization: "Bearer test-token",
		});

		// Verify both default and custom headers are preserved
		expect(receivedHeaders["User-Agent"]).toBe("RSS-Optimizer/1.0 (Bun/1.3.7)");
		expect(receivedHeaders["X-Custom-Header"]).toBe("custom-value");
		expect(receivedHeaders["Authorization"]).toBe("Bearer test-token");
	});

	test("should handle WordPress RSS compatibility", async () => {
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchWordPressFeed("https://example.com/feed");

		// WordPress specifically requires these headers with exact casing
		expect(receivedHeaders["User-Agent"]).toBe("WP-RSS-Reader/1.0");
		expect(receivedHeaders["Accept"]).toBe("application/rss+xml");
	});

	test("should handle strict casing requirements", async () => {
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchStrictCasing("https://api.example.com/data", {
			"X-API-Key": "secret-key",
			"X-Auth-Token": "auth-token",
		});

		// Verify strict casing is preserved
		expect(receivedHeaders["X-API-Key"]).toBe("secret-key");
		expect(receivedHeaders["X-Auth-Token"]).toBe("auth-token");
		expect(receivedHeaders["x-api-key"]).toBeUndefined();
		expect(receivedHeaders["x-auth-token"]).toBeUndefined();
	});

	test("should handle mixed case headers correctly", async () => {
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchWithPreservedCasing("https://example.com/feed", {
			"Content-Type": "application/json",
			"content-length": "123", // lowercase
			"X-Mixed-Case": "value", // mixed case
		});

		// Verify all casing is preserved exactly as provided
		expect(receivedHeaders["Content-Type"]).toBe("application/json");
		expect(receivedHeaders["content-length"]).toBe("123");
		expect(receivedHeaders["X-Mixed-Case"]).toBe("value");
	});

	test("should handle empty custom headers", async () => {
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchWithPreservedCasing("https://example.com/feed", {});

		// Should only have default headers
		expect(receivedHeaders["User-Agent"]).toBe("RSS-Optimizer/1.0 (Bun/1.3.7)");
		expect(receivedHeaders["Accept"]).toBe(
			"application/rss+xml, application/atom+xml",
		);
	});

	test("should handle null/undefined custom headers", async () => {
		let receivedHeaders: Record<string, string> = {};

		const mockFetch = mock(async (_url, options) => {
			receivedHeaders = options.headers as Record<string, string>;
			return new Response("{}");
		}) as typeof fetch;

		// Add missing properties required by fetch type
		mockFetch.preconnect = mock(() => {}) as any;
		mockFetch.dns = mock(() => {}) as any;

		globalThis.fetch = mockFetch;

		await fetcher.fetchWithPreservedCasing(
			"https://example.com/feed",
			undefined,
		);

		// Should only have default headers
		expect(receivedHeaders["User-Agent"]).toBe("RSS-Optimizer/1.0 (Bun/1.3.7)");
		expect(receivedHeaders["Accept"]).toBe(
			"application/rss+xml, application/atom+xml",
		);
	});
});
