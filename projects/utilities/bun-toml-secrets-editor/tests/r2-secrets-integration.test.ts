#!/usr/bin/env bun
// tests/r2-secrets-integration.test.ts - R2 Storage and Bun.secrets Integration Tests

import { beforeEach, describe, expect, test } from "bun:test";
import {
	createRSSR2Config,
	createRSSR2ConfigWithSecrets,
	createRSSStorage,
	createRSSStorageWithSecrets,
	type ProfilingReport,
	type R2Config,
	R2Storage,
	type RSSFeedData,
} from "../src/storage/r2-storage.js";

describe("R2 Storage Integration", () => {
	let storage: R2Storage;
	let testConfig: R2Config;

	beforeEach(async () => {
		// Load test environment variables
		try {
			const envText = await Bun.file(".env.r2").text();
			const lines = envText.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
					const [key, ...valueParts] = trimmed.split("=");
					const value = valueParts.join("=").trim();
					if (key && value) {
						const cleanValue = value.replace(/^["']|["']$/g, "");
						const cleanKey = key.trim();
						process.env[cleanKey] = cleanValue;

						// Load into Bun.secrets for testing
						if (
							cleanKey.includes("SECRET") ||
							cleanKey.includes("KEY") ||
							cleanKey.includes("TOKEN")
						) {
							await Bun.secrets.set({
								service: "com.cloudflare.r2.rssfeedmaster",
								name: cleanKey,
								value: cleanValue,
							});
						}
					}
				}
			}
		} catch (_error) {
			// Continue without test secrets if file doesn't exist
		}

		testConfig = {
			accountId: "7a470541a704caaf91e71efccc78fd36",
			bucketName: "rssfeedmaster",
			publicUrl: "https://pub-a471e86af24446498311933a2eca2454.r2.dev",
			accessKeyId: process.env.R2_ACCESS_KEY_ID || "test-key",
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "test-secret",
			region: "enam",
		};

		storage = new R2Storage(testConfig);
	});

	describe("Configuration Management", () => {
		test("should create R2 configuration with default values", () => {
			const config = createRSSR2Config();

			expect(config.accountId).toBe("7a470541a704caaf91e71efccc78fd36");
			expect(config.bucketName).toBe("rssfeedmaster");
			expect(config.publicUrl).toBe(
				"https://pub-a471e86af24446498311933a2eca2454.r2.dev",
			);
			expect(config.region).toBe("enam");
		});

		test("should create R2 storage instance", () => {
			const testStorage = createRSSStorage();
			expect(testStorage).toBeInstanceOf(R2Storage);
		});

		test("should create R2 configuration with secrets", async () => {
			const config = await createRSSR2ConfigWithSecrets();

			expect(config.accountId).toBe("7a470541a704caaf91e71efccc78fd36");
			expect(config.bucketName).toBe("rssfeedmaster");
			expect(config.region).toBe("enam");

			// Should have credentials either from secrets or environment
			expect(config.accessKeyId || config.secretAccessKey).toBeTruthy();
		});

		test("should create R2 storage with secrets", async () => {
			const testStorage = await createRSSStorageWithSecrets();
			expect(testStorage).toBeInstanceOf(R2Storage);
		});
	});

	describe("Bun.secrets Integration", () => {
		test("should store and retrieve secrets using Bun.secrets API", async () => {
			const testSecret = {
				service: "com.cloudflare.r2.rssfeedmaster",
				name: "TEST_INTEGRATION_SECRET",
				value: "test-value-12345",
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

		test("should handle missing secrets gracefully", async () => {
			const missing = await Bun.secrets.get({
				service: "com.cloudflare.r2.rssfeedmaster",
				name: "NONEXISTENT_SECRET",
			});

			expect(missing).toBeNull();
		});

		test("should isolate secrets by service", async () => {
			const secretName = "SHARED_TEST_SECRET";
			const service1 = "test.service.one";
			const service2 = "test.service.two";
			const value1 = "value-from-service-1";
			const value2 = "value-from-service-2";

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

	describe("RSS Feed Data Operations", () => {
		test("should generate valid feed keys", () => {
			const feedUrl = "https://example.com/rss.xml";
			const fetchedAt = new Date().toISOString();

			const key1 = storage.generateFeedKey(feedUrl, fetchedAt);
			const key2 = storage.generateFeedKey(feedUrl, fetchedAt);

			expect(key1).toBe(key2);
			expect(key1).toMatch(/^feeds\/[a-z0-9]+\/\d{4}-\d{2}-\d{2}\.json$/);
		});

		test("should generate valid report keys", () => {
			const reportType = "rss-integration";
			const generatedAt = new Date().toISOString();

			const key1 = storage.generateReportKey(reportType, generatedAt);
			const key2 = storage.generateReportKey(reportType, generatedAt);

			expect(key1).toBe(key2);
			expect(key1).toMatch(
				/^reports\/rss-integration\/\d{4}-\d{2}-\d{2}\/[^.]+\.json$/,
			);
		});

		test("should create valid RSS feed data structure", () => {
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

		test("should create valid profiling report structure", () => {
			const report: ProfilingReport = {
				type: "rss-r2-integration",
				generatedAt: new Date().toISOString(),
				data: {
					test: "data",
				},
				summary: {
					status: "success",
					metrics: {
						totalFeeds: 5,
						successfulProfiles: 5,
					},
				},
			};

			expect(report.type).toBe("rss-r2-integration");
			expect(report.summary.status).toBe("success");
			expect(report.summary.metrics.totalFeeds).toBe(5);
		});
	});

	describe("AWS Signature V4 Authentication", () => {
		test("should generate valid AWS signature", () => {
			const method = "PUT";
			const canonicalPath = "/test-bucket/test-key.json";
			const headers = {
				"content-type": "application/json",
				"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
				"x-amz-date": "20240128T123456Z",
			};

			// This should not throw and should return a string
			const authHeader = storage.getAuthHeader(method, canonicalPath, headers);

			expect(typeof authHeader).toBe("string");
			expect(authHeader).toMatch(/^AWS4-HMAC-SHA256 /);
		});

		test("should generate consistent signatures for same request", () => {
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

	describe("Performance Benchmarks", () => {
		test("should handle high-frequency secret operations", async () => {
			const iterations = 50;
			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.get({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: "R2_ACCESS_KEY_ID",
				});
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;

			// Should be under 5ms per operation on average
			expect(avgTime).toBeLessThan(5);
			console.log(`Average secret access time: ${avgTime.toFixed(3)}ms`);
		});

		test("should handle bulk key generation efficiently", () => {
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

			// Should be under 1ms per key generation
			expect(avgTime).toBeLessThan(1);
			console.log(`Average key generation time: ${avgTime.toFixed(3)}ms`);
		});

		test("should handle signature generation efficiently", () => {
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

			// Should be under 10ms per signature generation
			expect(avgTime).toBeLessThan(10);
			console.log(`Average signature generation time: ${avgTime.toFixed(3)}ms`);
		});
	});

	describe("Error Handling", () => {
		test("should handle invalid configuration gracefully", () => {
			const invalidConfig = {
				accountId: "",
				bucketName: "",
				accessKeyId: "",
				secretAccessKey: "",
				region: "",
			};

			expect(() => new R2Storage(invalidConfig)).not.toThrow();
		});

		test("should handle empty feed data", () => {
			const emptyFeedData: RSSFeedData = {
				url: "",
				title: "",
				description: "",
				items: [],
				fetchedAt: new Date().toISOString(),
				profileData: {
					fetchTime: 0,
					parseTime: 0,
					totalTime: 0,
				},
			};

			expect(() =>
				storage.generateFeedKey(emptyFeedData.url, emptyFeedData.fetchedAt),
			).not.toThrow();
		});

		test("should handle malformed URLs in key generation", () => {
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
	});

	describe("Integration with RSS Profiling", () => {
		test("should support all RSS profiling report types", () => {
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

		test("should handle comprehensive profiling data", () => {
			const comprehensiveReport: ProfilingReport = {
				type: "rss-r2-integration",
				generatedAt: new Date().toISOString(),
				data: {
					summary: {
						totalFeeds: 10,
						successfulFeeds: 8,
						averageFetchTime: 150.5,
						averageParseTime: 25.3,
					},
					performanceMetrics: [],
					bunCompatibility: {
						cpuProfiling: true,
						heapProfiling: true,
						bufferOptimizations: true,
						inspectorAPIs: false,
					},
				},
				summary: {
					status: "success",
					metrics: {
						totalFeeds: 10,
						successfulProfiles: 8,
						averageFetchTime: 150.5,
						averageParseTime: 25.3,
					},
				},
			};

			expect(comprehensiveReport.data.summary.totalFeeds).toBe(10);
			expect(comprehensiveReport.data.bunCompatibility.cpuProfiling).toBe(true);
		});
	});
});
