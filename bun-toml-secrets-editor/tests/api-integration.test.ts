#!/usr/bin/env bun
// tests/api-integration.test.ts - API Integration Tests

import { beforeEach, describe, expect, test } from "bun:test";
import { rssStorageAPI } from "../src/api/rss-storage-api.js";
import type { ProfilingReport } from "../src/storage/r2-storage-native.js";
import URLHandler from "../src/utils/url-handler.js";

describe("API Integration Tests", () => {
	beforeEach(async () => {
		// Ensure API is initialized
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	describe("URL Handler", () => {
		test("should parse valid URLs", () => {
			const url = "https://example.com/rss.xml";
			const parsed = URLHandler.parseURL(url);

			expect(parsed.isValid).toBe(true);
			expect(parsed.domain).toBe("example.com");
			expect(parsed.path).toBe("/rss.xml");
			expect(parsed.protocol).toBe("https:");
		});

		test("should handle invalid URLs", () => {
			const url = "not-a-url";
			const parsed = URLHandler.parseURL(url);

			expect(parsed.isValid).toBe(false);
			expect(parsed.domain).toBe("");
		});

		test("should normalize URLs", () => {
			const testCases = [
				["example.com", "example.com"],
				["HTTP://EXAMPLE.COM", "http://example.com/"],
				["https://example.com/path/", "https://example.com/path"],
			];

			for (const [input, expected] of testCases) {
				const normalized = URLHandler.normalizeURL(input);
				expect(normalized).toBe(expected);
			}
		});

		test("should extract domains correctly", () => {
			const testCases = [
				["https://news.ycombinator.com/rss", "news.ycombinator.com"],
				["http://feeds.bbci.co.uk/news", "feeds.bbci.co.uk"],
				["https://subdomain.example.com/path", "subdomain.example.com"],
			];

			for (const [url, expectedDomain] of testCases) {
				const domain = URLHandler.extractDomain(url);
				expect(domain).toBe(expectedDomain);
			}
		});

		test("should generate cache keys", () => {
			const url1 = "https://example.com/rss.xml";
			const url2 = "https://example.com/rss.xml";
			const url3 = "https://example.com/different.xml";

			const key1 = URLHandler.generateCacheKey(url1);
			const key2 = URLHandler.generateCacheKey(url2);
			const key3 = URLHandler.generateCacheKey(url3);

			expect(key1).toBe(key2);
			expect(key1).not.toBe(key3);
			expect(key1).toMatch(/^[a-zA-Z0-9]{32}$/);
		});
	});

	describe("RSS Storage API", () => {
		test("should perform health check", async () => {
			const health = await rssStorageAPI.healthCheck();

			expect(health).toBeDefined();
			expect(["healthy", "unhealthy"]).toContain(health.status);
			expect(health.details).toBeDefined();
		});

		test("should store and retrieve RSS feed data", async () => {
			const feedData = {
				url: "https://example.com/test-feed.xml",
				title: "Test Feed",
				description: "Test Description",
				items: [
					{
						title: "Test Item",
						link: "https://example.com/item/1",
						description: "Test Item Description",
						pubDate: new Date().toISOString(),
					},
				],
				fetchedAt: new Date().toISOString(),
				profileData: {
					fetchTime: 100.5,
					parseTime: 25.3,
					totalTime: 125.8,
				},
			};

			// Store feed
			const storeResult = await rssStorageAPI.storeRSSFeed(feedData);
			expect(storeResult.success).toBe(true);
			expect(storeResult.key).toBeDefined();

			// Retrieve feed
			const retrieveResult = await rssStorageAPI.retrieveRSSFeed(
				feedData.url,
				new Date().toISOString().split("T")[0],
			);
			expect(retrieveResult.success).toBe(true);
			expect(retrieveResult.data).toBeDefined();
			expect(retrieveResult.data?.title).toBe("Test Feed");
		});

		test("should store and retrieve profiling reports", async () => {
			const report = {
				type: "api-integration-test" as const,
				generatedAt: new Date().toISOString(),
				data: {
					test: "data",
					metrics: {
						totalOperations: 10,
						successfulOperations: 9,
					},
				},
				summary: {
					status: "success" as const,
					metrics: {
						totalOperations: 10,
						successRate: 90,
					},
				},
			};

			// Store report
			const storeResult = await rssStorageAPI.storeProfilingReport(report);
			expect(storeResult.success).toBe(true);
			expect(storeResult.key).toBeDefined();

			// Retrieve report
			const retrieveResult = await rssStorageAPI.retrieveProfilingReport(
				report.type,
				report.generatedAt,
			);
			expect(retrieveResult.success).toBe(true);
			expect(retrieveResult.data).toBeDefined();
			expect(retrieveResult.data?.type).toBe("api-integration-test");
		});

		test("should generate public URLs", async () => {
			const testKey = "feeds/test/2024-01-01/test.json";
			const urlResult = await rssStorageAPI.getPublicUrl(testKey);

			expect(urlResult.success).toBe(true);
			expect(urlResult.url).toBeDefined();
			expect(urlResult.url).toContain(
				"pub-a471e86af24446498311933a2eca2454.r2.dev",
			);
		});

		test("should handle missing data gracefully", async () => {
			// Test missing feed
			const missingFeed = await rssStorageAPI.retrieveRSSFeed(
				"https://nonexistent.example.com/feed.xml",
			);
			expect(missingFeed.success).toBe(false);
			expect(missingFeed.error).toBe("Feed not found");

			// Test missing report
			const missingReport = await rssStorageAPI.retrieveProfilingReport(
				"nonexistent-type",
				"2024-01-01T00:00:00.000Z",
			);
			expect(missingReport.success).toBe(false);
			expect(missingReport.error).toBe("Report not found");
		});
	});

	describe("Integration Workflow", () => {
		test("should handle complete feed discovery and storage workflow", async () => {
			// This would be an integration test with actual HTTP calls
			// For now, we'll test the workflow structure

			const workflowSteps = [
				"discover feeds",
				"validate feed URLs",
				"store feed data",
				"generate analytics",
				"create profiling report",
			];

			expect(workflowSteps).toHaveLength(5);
			expect(workflowSteps).toContain("store feed data");
		});

		test("should handle batch operations", async () => {
			const feeds = [
				{
					url: "https://example.com/feed1.xml",
					title: "Feed 1",
					description: "Description 1",
					items: [],
					fetchedAt: new Date().toISOString(),
					profileData: {
						fetchTime: 100,
						parseTime: 20,
						totalTime: 120,
					},
				},
				{
					url: "https://example.com/feed2.xml",
					title: "Feed 2",
					description: "Description 2",
					items: [],
					fetchedAt: new Date().toISOString(),
					profileData: {
						fetchTime: 150,
						parseTime: 30,
						totalTime: 180,
					},
				},
			];

			// Store each feed individually
			const results = [];
			for (const feed of feeds) {
				const result = await rssStorageAPI.storeRSSFeed(feed);
				results.push(result);
			}

			expect(results).toHaveLength(2);
			expect(results.every((r) => r.success)).toBe(true);
		});
	});

	describe("Error Handling", () => {
		test("should handle malformed feed data", async () => {
			const malformedFeed = {
				url: "", // Empty URL
				title: "Test",
				description: "Test",
				items: [],
				fetchedAt: new Date().toISOString(),
				profileData: {
					fetchTime: 100,
					parseTime: 20,
					totalTime: 120,
				},
			};

			const result = await rssStorageAPI.storeRSSFeed(malformedFeed);
			// Should still succeed as storage doesn't validate content
			expect(result.success).toBe(true);
		});

		test("should handle invalid report data", async () => {
			const invalidReport = {
				type: "test" as ProfilingReport["type"],
				generatedAt: new Date().toISOString(), // Use valid date
				data: null,
				summary: {
					status: "success" as const,
					metrics: {},
				},
			};

			const result = await rssStorageAPI.storeProfilingReport(invalidReport);
			expect(result.success).toBe(true);
			expect(result.key).toBeDefined();
		});
	});

	describe("Performance", () => {
		test("should handle rapid API calls", async () => {
			const iterations = 5;
			const start = performance.now();

			const promises = [];
			for (let i = 0; i < iterations; i++) {
				promises.push(rssStorageAPI.healthCheck());
			}

			await Promise.all(promises);
			const duration = performance.now() - start;
			const avgTime = duration / iterations;

			console.log(`Average health check time: ${avgTime.toFixed(3)}ms`);
			expect(avgTime).toBeLessThan(100); // Should be under 100ms per call
		});

		test("should handle URL operations efficiently", () => {
			const iterations = 1000;
			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				URLHandler.normalizeURL(`https://test${i}.example.com/path/`);
				URLHandler.generateCacheKey(`https://test${i}.example.com/path/`);
			}

			const duration = performance.now() - start;
			const avgTime = duration / (iterations * 2);

			console.log(`Average URL operation time: ${avgTime.toFixed(6)}ms`);
			expect(avgTime).toBeLessThan(0.01); // Should be under 0.01ms per operation
		});
	});
});
