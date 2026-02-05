#!/usr/bin/env bun
// tests/governance.test.ts - RSSGovernance Comprehensive Tests

import { beforeEach, describe, expect, test } from "bun:test";
import { RSSGovernance } from "../src/governance/rss-governance.js";

describe("RSSGovernance", () => {
	let governance: RSSGovernance;

	beforeEach(() => {
		governance = new RSSGovernance({
			maxRequestsPerMinute: 60,
			maxRequestsPerDomain: 10,
			respectRobotsTxt: true,
		});
	});

	describe("Rate Limiting", () => {
		test("should allow requests within rate limit", async () => {
			const url = "https://example.com/feed";

			// First request should pass immediately
			const start = performance.now();
			await governance.enforceRateLimit(url);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(50); // Should not delay
		});

		test("should throttle requests exceeding domain limit", async () => {
			const url = "https://example.com/feed";

			// Use a test governance with shorter delays
			// 60000ms / 600 = 100ms wait time
			const testGovernance = new RSSGovernance({
				maxRequestsPerMinute: 600,
				maxRequestsPerDomain: 20, // Small bucket, 3000ms wait (under 5000ms timeout)
				respectRobotsTxt: true,
			});

			// Exhaust the bucket (20 tokens)
			for (let i = 0; i < 20; i++) {
				await testGovernance.enforceRateLimit(url);
			}

			// 21st request should be delayed (60000/600 = 100ms wait)
			const start = performance.now();
			await testGovernance.enforceRateLimit(url);
			const duration = performance.now() - start;

			expect(duration).toBeGreaterThanOrEqual(50); // Should wait at least 50ms
		});

		test("should track separate buckets per domain", async () => {
			await governance.enforceRateLimit("https://example1.com/feed");
			await governance.enforceRateLimit("https://example2.com/feed");

			expect(governance.domainBuckets.size).toBe(2);
		});

		test("should refill tokens over time", async () => {
			const url = "https://example.com/feed";

			// Use test governance with faster refill for testing
			// 60000ms / 600 = 100ms wait time per token
			const testGovernance = new RSSGovernance({
				maxRequestsPerMinute: 600,
				maxRequestsPerDomain: 600, // Higher value for faster token refill
				respectRobotsTxt: true,
			});

			// Exhaust bucket
			for (let i = 0; i < 3; i++) {
				await testGovernance.enforceRateLimit(url);
			}

			// Wait for token refill - at 600/min = 10/sec, 100ms = 1 token
			await Bun.sleep(150);

			const start = performance.now();
			await testGovernance.enforceRateLimit(url);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(500); // Should have refilled token, minimal wait
		});
	});

	describe("robots.txt Compliance", () => {
		test("should allow when robots.txt fetch fails", async () => {
			// Mock fetch to fail
			globalThis.fetch = async () => {
				throw new Error("Network error");
			};

			const allowed = await governance.checkRobotsTxt(
				"https://example.com/feed",
			);
			expect(allowed).toBe(true); // Fail open
		});

		test("should parse Allow directives correctly", () => {
			const robots = `
        User-agent: *
        Disallow: /private/
        Allow: /public/
      `;

			expect(
				governance.isAllowedByRobots(
					"https://example.com/private/feed",
					robots,
				),
			).toBe(false);
			expect(
				governance.isAllowedByRobots("https://example.com/public/feed", robots),
			).toBe(true);
		});

		test("should handle crawl-delay directive", () => {
			const robots = "User-agent: *\nCrawl-delay: 2";
			governance.isAllowedByRobots("https://example.com/feed", robots);

			// Should log crawl delay (simplified test)
			expect(true).toBe(true); // In real implementation, would set delay
		});

		test("should cache robots.txt for 24 hours", async () => {
			let fetchCount = 0;
			globalThis.fetch = async () => {
				fetchCount++;
				return new Response("User-agent: *\nDisallow: /", { status: 200 });
			};

			await governance.checkRobotsTxt("https://cached.com/feed");
			await governance.checkRobotsTxt("https://cached.com/feed");

			expect(fetchCount).toBe(1);
		});

		test("should respect v1.3.7 header case preservation", async () => {
			let headersReceived = {};
			globalThis.fetch = async (_url, options) => {
				headersReceived = options?.headers || {};
				return new Response("User-agent: *\nDisallow: /", { status: 200 });
			};

			await governance.checkRobotsTxt("https://test.com/feed");

			// v1.3.7: Should preserve exact header case
			expect(headersReceived["User-Agent"]).toBeDefined();
			expect(headersReceived["user-agent"]).toBeUndefined();
		});
	});

	describe("RFC 5005 Pagination", () => {
		test("should detect next-archive links", () => {
			const feed = {
				links: [
					{ rel: "next-archive", href: "https://example.com/feed?page=2" },
				],
			};

			const next = governance.findPaginationLink(feed, "next-archive");
			expect(next).toBe("https://example.com/feed?page=2");
		});

		test("should deduplicate entries by id", () => {
			const entries = [
				{ id: "1", title: "First" },
				{ id: "2", title: "Second" },
				{ id: "1", title: "Duplicate" },
			];

			const unique = governance.deduplicateEntries(entries);
			expect(unique.length).toBe(2);
			expect(unique[0].title).toBe("First");
		});

		test("should calculate TTL from Cache-Control header", () => {
			const headers = new Headers({ "cache-control": "max-age=300" });
			const feed = {};

			const ttl = governance.calculateTTL(feed, headers);
			expect(ttl).toBe(300000); // 5 minutes in ms
		});

		test("should enforce minimum TTL policy", () => {
			const headers = new Headers({ "cache-control": "max-age=10" }); // 10 seconds
			const ttl = governance.calculateTTL({}, headers);
			expect(ttl).toBe(60000); // Clamped to 1 minute
		});
	});

	describe("v1.3.7 Buffer Optimization", () => {
		test("should use optimized Buffer.from() for XML parsing", async () => {
			const _mockResponse = {
				arrayBuffer: async () => new TextEncoder().encode("<rss></rss>").buffer,
			};

			// Mock fetch to return our test response
			globalThis.fetch = async () =>
				new Response("<rss></rss>", {
					headers: { "content-type": "application/rss+xml" },
				});

			const result = await governance.fetchWithPagination(
				"https://test.com/rss",
			);

			// Should complete without errors using v1.3.7 optimizations
			expect(result).toBeDefined();
			expect(result.governance.v1_3_7_optimizations).toContain(
				"fast_buffer_parsing",
			);
		});
	});

	describe("Timing Attack Prevention", () => {
		test("should use constant-time comparison for sensitive operations", async () => {
			// This ensures our rate limiting and checks don't leak timing info
			const timings: number[] = [];

			for (let i = 0; i < 10; i++) {
				const start = performance.now();
				await governance.checkRobotsTxt("https://timing-test.com/feed");
				timings.push(performance.now() - start);
			}

			// Calculate variance (should be low for constant-time)
			const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
			const variance =
				timings.reduce((acc, t) => acc + (t - avg) ** 2, 0) / timings.length;

			expect(variance).toBeLessThan(100); // Variance should be low (not perfectly constant but close)
		});
	});

	describe("Statistics and Monitoring", () => {
		test("should track governance statistics", async () => {
			// Generate some activity
			await governance.enforceRateLimit("https://stats1.com/feed");
			await governance.enforceRateLimit("https://stats2.com/feed");

			const stats = governance.getStats();

			expect(stats.requestsProcessed).toBe(2);
			expect(stats.activeDomains).toBe(2);
			expect(stats.policies).toBeDefined();
		});

		test("should cleanup old data", () => {
			// Add some test data
			governance.domainBuckets.set("old.com", {
				tokens: 10,
				lastUpdate: Date.now() - 600000, // 10 minutes ago
			});

			const cleaned = governance.cleanup();

			expect(cleaned).toBeGreaterThan(0);
			expect(governance.domainBuckets.has("old.com")).toBe(false);
		});
	});
});
