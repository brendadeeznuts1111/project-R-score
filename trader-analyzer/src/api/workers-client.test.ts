/**
 * @fileoverview Cloudflare Workers API Client Tests
 * @module api/workers-client.test
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createWorkersClient, WorkersAPIClient } from "./workers-client";

describe("WorkersAPIClient", () => {
	let client: WorkersAPIClient;
	let mockFetch: ReturnType<typeof mock>;
	let originalFetch: typeof global.fetch;

	beforeEach(() => {
		// Store original fetch for cleanup
		originalFetch = global.fetch;

		mockFetch = mock(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "application/json",
					ETag: '"v1deee103"',
					"x-api-version": "2.0.0",
				}),
				json: async () => ({
					markets: [],
					total: 0,
				}),
			}),
		);

		global.fetch = mockFetch as unknown as typeof fetch;

		client = new WorkersAPIClient({
			baseURL: "https://test.workers.dev",
			timeout: 5000,
			enableETag: true,
		});
	});

	afterEach(() => {
		// Cleanup: restore original fetch
		if (originalFetch) {
			global.fetch = originalFetch;
		}
		// Clear any cached ETags
		if (client) {
			client.clearCache();
		}
	});

	describe("getMarkets", () => {
		it("fetches markets successfully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "application/json",
					ETag: '"v1deee103"',
				}),
				json: async () => ({
					markets: [
						{
							id: "btc-usd-perp",
							displayName: "BTC/USD Perpetual",
							category: "crypto",
							status: "active",
						},
					],
					total: 1,
				}),
			});

			const response = await client.getMarkets();

			expect(response.data).toBeDefined();
			expect(response.data.markets).toHaveLength(1);
			expect(response.cached).toBe(false);
			expect(response.version).toBe("2.0.0");
		});

		it("handles 304 Not Modified with ETag", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 304,
				headers: new Headers({
					ETag: '"v1deee103"',
					"x-api-version": "2.0.0",
				}),
			});

			// Set ETag in cache (using type assertion for test access to protected member)
			(client as unknown as { etagCache: Map<string, string> }).etagCache.set(
				"/api/markets",
				"v1deee103",
			);

			const response = await client.getMarkets();

			expect(response.cached).toBe(true);
			expect(response.data).toBeNull();
		});

		it("sends If-None-Match header when ETag cached", async () => {
			(client as unknown as { etagCache: Map<string, string> }).etagCache.set(
				"/api/markets",
				"v1deee103",
			);

			await client.getMarkets();

			const call = mockFetch.mock.calls[0];
			const headers = call[1]?.headers as Headers;

			expect(headers.get("If-None-Match")).toBe('"v1deee103"');
		});
	});

	describe("getOHLCV", () => {
		it("builds correct query parameters", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "application/json",
				}),
				json: async () => ({
					candles: [],
					marketId: "btc-usd-perp",
					timeframe: "1d",
					count: 0,
					totalAvailable: 0,
					limited: false,
					range: { start: "", end: "" },
				}),
			});

			await client.getOHLCV("btc-usd-perp", {
				timeframe: "1h",
				limit: 100,
				since: 1640995200,
			});

			const call = mockFetch.mock.calls[0];
			const url = call[0] as string;

			expect(url).toContain("/api/markets/btc-usd-perp/ohlcv");
			expect(url).toContain("timeframe=1h");
			expect(url).toContain("limit=100");
			expect(url).toContain("since=1640995200");
		});
	});

	describe("timeout handling", () => {
		it("throws timeout error after timeout duration", async () => {
			// Mock fetch to never resolve - this will trigger AbortController timeout
			mockFetch.mockImplementation((_url, options) => {
				return new Promise((_resolve, reject) => {
					// Listen for abort signal from AbortController timeout
					if (options?.signal) {
						options.signal.addEventListener("abort", () => {
							const error = new Error("The operation was aborted.");
							error.name = "AbortError";
							reject(error);
						});
					}
					// Never resolve - let AbortController timeout handle it
				});
			});

			const shortTimeoutClient = new WorkersAPIClient({
				baseURL: "https://test.workers.dev",
				timeout: 50, // Short timeout - AbortController will abort after this
			});

			await expect(shortTimeoutClient.getMarkets()).rejects.toThrow(/timeout/i);
		}, 1000); // 1 second timeout (test should complete in ~50ms)
	});

	describe("error handling", () => {
		it("throws error for non-OK responses", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				headers: new Headers(),
				json: async () => ({}),
			});

			await expect(client.getMarkets()).rejects.toThrow("HTTP 404");
		});
	});

	describe("createWorkersClient", () => {
		it("creates production client", () => {
			const prodClient = createWorkersClient("production");
			expect((prodClient as unknown as { baseURL: string }).baseURL).toBe(
				"https://trader-analyzer-markets.utahj4754.workers.dev",
			);
		});

		it("creates staging client", () => {
			const stagingClient = createWorkersClient("staging");
			expect((stagingClient as any).baseURL).toBe(
				"https://trader-analyzer-markets-staging.utahj4754.workers.dev",
			);
		});

		it("creates local client", () => {
			const localClient = createWorkersClient("local");
			expect((localClient as any).baseURL).toBe("http://localhost:3004");
		});
	});

	describe("cache management", () => {
		it("clears ETag cache", () => {
			(client as unknown as { etagCache: Map<string, string> }).etagCache.set(
				"/api/markets",
				"test-etag",
			);
			expect(client.getCachedETag("/api/markets")).toBe("test-etag");

			client.clearCache();
			expect(client.getCachedETag("/api/markets")).toBeUndefined();
		});
	});
});
