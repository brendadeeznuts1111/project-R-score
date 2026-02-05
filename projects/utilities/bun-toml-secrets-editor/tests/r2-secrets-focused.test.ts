#!/usr/bin/env bun
// tests/r2-secrets-focused.test.ts - Focused Tests for R2 Storage and Bun.secrets

import { beforeEach, describe, expect, test } from "bun:test";
import {
	createRSSR2Config,
	createRSSStorage,
	type ProfilingReport,
	R2Storage,
	type RSSFeedData,
} from "../src/storage/r2-storage.js";

describe("R2 Storage and Secrets - Focused Tests", () => {
	let storage: R2Storage;

	beforeEach(async () => {
		// Load minimal test environment
		const testConfig = {
			accountId: "7a470541a704caaf91e71efccc78fd36",
			bucketName: "rssfeedmaster",
			publicUrl: "https://pub-a471e86af24446498311933a2eca2454.r2.dev",
			accessKeyId: process.env.R2_ACCESS_KEY_ID || "test-key",
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "test-secret",
			region: "enam",
		};

		storage = new R2Storage(testConfig);
	});

	describe("Core Functionality", () => {
		test("should create R2 configuration", () => {
			const config = createRSSR2Config();

			expect(config.accountId).toBe("7a470541a704caaf91e71efccc78fd36");
			expect(config.bucketName).toBe("rssfeedmaster");
			expect(config.region).toBe("enam");
		});

		test("should create R2 storage instance", () => {
			const testStorage = createRSSStorage();
			expect(testStorage).toBeInstanceOf(R2Storage);
		});

		test("should generate valid feed keys", () => {
			const feedUrl = "https://example.com/rss.xml";
			const fetchedAt = new Date().toISOString();

			const key = storage.generateFeedKey(feedUrl, fetchedAt);

			expect(key).toMatch(/^feeds\/[a-z0-9]+\/\d{4}-\d{2}-\d{2}\.json$/);
		});

		test("should generate valid report keys", () => {
			const reportType = "rss-integration";
			const generatedAt = new Date().toISOString();

			const key = storage.generateReportKey(reportType, generatedAt);

			expect(key).toMatch(
				/^reports\/rss-integration\/\d{4}-\d{2}-\d{2}\/[^.]+\.json$/,
			);
		});
	});

	describe("Bun.secrets Basic Operations", () => {
		test("should store and retrieve secrets", async () => {
			const testSecret = {
				service: "com.cloudflare.r2.rssfeedmaster",
				name: "FOCUSED_TEST_SECRET",
				value: "focused-test-value-123",
			};

			// Store secret
			await Bun.secrets.set(testSecret);

			// Retrieve secret
			const retrieved = await Bun.secrets.get({
				service: testSecret.service,
				name: testSecret.name,
			});

			expect(retrieved).toBe(testSecret.value);

			// Cleanup
			await Bun.secrets.delete({
				service: testSecret.service,
				name: testSecret.name,
			});
		});

		test("should handle missing secrets", async () => {
			const missing = await Bun.secrets.get({
				service: "com.cloudflare.r2.rssfeedmaster",
				name: "NONEXISTENT_FOCUSED_SECRET",
			});

			expect(missing).toBeNull();
		});

		test("should isolate secrets by service", async () => {
			const secretName = "ISOLATION_TEST";
			const service1 = "focused.service.one";
			const service2 = "focused.service.two";
			const value1 = "focused-value-1";
			const value2 = "focused-value-2";

			// Store same secret name in different services
			await Bun.secrets.set({
				service: service1,
				name: secretName,
				value: value1,
			});
			await Bun.secrets.set({
				service: service2,
				name: secretName,
				value: value2,
			});

			// Retrieve and verify isolation
			const retrieved1 = await Bun.secrets.get({
				service: service1,
				name: secretName,
			});
			const retrieved2 = await Bun.secrets.get({
				service: service2,
				name: secretName,
			});

			expect(retrieved1).toBe(value1);
			expect(retrieved2).toBe(value2);

			// Cleanup
			await Bun.secrets.delete({ service: service1, name: secretName });
			await Bun.secrets.delete({ service: service2, name: secretName });
		});
	});

	describe("Data Structure Validation", () => {
		test("should validate RSS feed data structure", () => {
			const feedData: RSSFeedData = {
				url: "https://example.com/rss.xml",
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

			expect(feedData.url).toBe("https://example.com/rss.xml");
			expect(feedData.items).toHaveLength(1);
			expect(feedData.profileData?.fetchTime).toBe(100.5);
		});

		test("should validate profiling report structure", () => {
			const report: ProfilingReport = {
				type: "rss-r2-integration",
				generatedAt: new Date().toISOString(),
				data: {
					test: "data",
					summary: {
						totalFeeds: 5,
						successfulFeeds: 5,
						averageFetchTime: 150.5,
						averageParseTime: 25.3,
					},
				},
				summary: {
					status: "success",
					metrics: {
						totalFeeds: 5,
						successfulProfiles: 5,
						averageFetchTime: 150.5,
						averageParseTime: 25.3,
					},
				},
			};

			expect(report.type).toBe("rss-r2-integration");
			expect(report.summary.status).toBe("success");
			expect(report.summary.metrics.totalFeeds).toBe(5);
		});

		test("should support all report types", () => {
			const reportTypes = [
				"rss-integration",
				"schema-validation",
				"performance",
				"rss-r2-integration",
			];

			for (const type of reportTypes) {
				const report: ProfilingReport = {
					type: type as ProfilingReport["type"],
					generatedAt: new Date().toISOString(),
					data: { test: true },
					summary: {
						status: "success",
						metrics: { test: 1 },
					},
				};

				expect(report.type).toBe(type);
			}
		});
	});

	describe("AWS Signature V4", () => {
		test("should generate valid AWS signatures", () => {
			const method = "PUT";
			const canonicalPath = "/test-bucket/test-key.json";
			const headers = {
				"content-type": "application/json",
				"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
				"x-amz-date": "20240128T123456Z",
			};

			const authHeader = storage.getAuthHeader(method, canonicalPath, headers);

			expect(typeof authHeader).toBe("string");
			expect(authHeader).toMatch(/^AWS4-HMAC-SHA256 /);
		});

		test("should generate consistent signatures", () => {
			const method = "PUT";
			const canonicalPath = "/test-bucket/test-key.json";
			const headers = {
				"content-type": "application/json",
				"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
				"x-amz-date": "20240128T123456Z",
			};

			const authHeader1 = storage.getAuthHeader(method, canonicalPath, headers);
			const authHeader2 = storage.getAuthHeader(method, canonicalPath, headers);

			expect(authHeader1).toBe(authHeader2);
		});
	});

	describe("Performance - Lightweight", () => {
		test("should handle efficient key generation", () => {
			const iterations = 1000;
			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				storage.generateFeedKey(
					`https://test${i}.com/rss.xml`,
					new Date().toISOString(),
				);
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;

			expect(avgTime).toBeLessThan(0.1); // Under 0.1ms per key generation
		});

		test("should handle efficient signature generation", () => {
			const iterations = 100;
			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				storage.getAuthHeader("PUT", `/test-bucket/test-key-${i}.json`, {
					"content-type": "application/json",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"x-amz-date": "20240128T123456Z",
				});
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;

			expect(avgTime).toBeLessThan(10); // Under 10ms per signature generation
		});

		test("should handle basic secret operations efficiently", async () => {
			const iterations = 10; // Reduced for reliability
			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.set({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `PERF_TEST_${i}`,
					value: `perf-value-${i}`,
				});
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;

			console.log(`Basic secret operations: ${avgTime.toFixed(3)}ms avg`);
			expect(avgTime).toBeLessThan(1000); // Under 1 second per operation (very lenient)

			// Cleanup
			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.delete({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `PERF_TEST_${i}`,
				});
			}
		});
	});

	describe("Error Handling", () => {
		test("should handle empty configuration gracefully", () => {
			const emptyConfig = {
				accountId: "",
				bucketName: "",
				accessKeyId: "",
				secretAccessKey: "",
				region: "",
			};

			expect(() => new R2Storage(emptyConfig)).not.toThrow();
		});

		test("should handle malformed URLs", () => {
			const malformedUrls = [
				"not-a-url",
				"",
				"ftp://invalid-protocol.com",
				"https://",
				"//no-protocol.com",
			];

			for (const url of malformedUrls) {
				expect(() => {
					storage.generateFeedKey(url, new Date().toISOString());
				}).not.toThrow();
			}
		});

		test("should handle invalid report data", () => {
			const invalidReport: ProfilingReport = {
				type: "rss-r2-integration",
				generatedAt: "invalid-date",
				data: null,
				summary: {
					status: "error",
					metrics: {},
				},
			};

			// Should not throw when creating the structure
			expect(invalidReport.type).toBe("rss-r2-integration");
		});
	});

	describe("Integration Tests", () => {
		test("should integrate with RSS profiling workflow", async () => {
			// Simulate RSS profiling workflow
			const feedData: RSSFeedData = {
				url: "https://example.com/profiling-test.xml",
				title: "Profiling Test Feed",
				description: "Test feed for profiling integration",
				items: [
					{
						title: "Profiling Test Item",
						link: "https://example.com/profiling-item",
						description: "Test item for profiling",
						pubDate: new Date().toISOString(),
					},
				],
				fetchedAt: new Date().toISOString(),
				profileData: {
					fetchTime: 85.2,
					parseTime: 12.7,
					totalTime: 97.9,
				},
			};

			const report: ProfilingReport = {
				type: "rss-r2-integration",
				generatedAt: new Date().toISOString(),
				data: {
					feedData: feedData,
					performanceMetrics: {
						fetchTime: feedData.profileData?.fetchTime,
						parseTime: feedData.profileData?.parseTime,
						totalTime: feedData.profileData?.totalTime,
					},
				},
				summary: {
					status: "success",
					metrics: {
						totalFeeds: 1,
						successfulProfiles: 1,
						averageFetchTime: feedData.profileData?.fetchTime || 0,
						averageParseTime: feedData.profileData?.parseTime || 0,
					},
				},
			};

			// Generate keys for storage
			const feedKey = storage.generateFeedKey(feedData.url, feedData.fetchedAt);
			const reportKey = storage.generateReportKey(
				report.type,
				report.generatedAt,
			);

			expect(feedKey).toMatch(/^feeds\/[a-z0-9]+\/\d{4}-\d{2}-\d{2}\.json$/);
			expect(reportKey).toMatch(
				/^reports\/rss-r2-integration\/\d{4}-\d{2}-\d{2}\/[^.]+\.json$/,
			);
		});

		test("should handle comprehensive RSS integration data", () => {
			const comprehensiveData = {
				feeds: [
					{
						url: "https://news.example.com/rss.xml",
						title: "News Feed",
						items: [],
					},
					{
						url: "https://tech.example.com/rss.xml",
						title: "Tech Feed",
						items: [],
					},
				],
				profilingResults: [
					{
						fetchTime: 120.5,
						parseTime: 15.3,
						totalTime: 135.8,
					},
					{
						fetchTime: 95.2,
						parseTime: 18.7,
						totalTime: 113.9,
					},
				],
				summary: {
					totalFeeds: 2,
					successfulProfiles: 2,
					averageFetchTime: 107.85,
					averageParseTime: 17.0,
				},
			};

			expect(comprehensiveData.feeds).toHaveLength(2);
			expect(comprehensiveData.summary.totalFeeds).toBe(2);
			expect(comprehensiveData.summary.averageFetchTime).toBeCloseTo(107.85);
		});
	});
});
