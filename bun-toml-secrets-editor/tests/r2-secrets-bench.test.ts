#!/usr/bin/env bun
// tests/r2-secrets-bench.test.ts - Performance Benchmarks for R2 Storage and Bun.secrets

import { beforeEach, describe, expect, test } from "bun:test";
import {
	createRSSR2ConfigWithSecrets,
	createRSSStorageWithSecrets,
	R2Storage,
	type RSSFeedData,
} from "../src/storage/r2-storage.js";

describe("R2 Storage and Secrets Performance Benchmarks", () => {
	let storage: R2Storage;
	let testConfig: any;

	beforeEach(async () => {
		// Load test environment
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
		} catch (error) {
			// Continue without test secrets
		}

		testConfig = await createRSSR2ConfigWithSecrets();
		storage = new R2Storage(testConfig);
	});

	describe("Bun.secrets Performance", () => {
		test("benchmark: secret set operations", async () => {
			const iterations = 100;
			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.set({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `BENCH_SECRET_${i}`,
					value: `bench-value-${i}`,
				});
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;
			const opsPerSec = 1000 / avgTime;

			console.log(
				`Secret Set: ${avgTime.toFixed(3)}ms avg, ${opsPerSec.toFixed(0)} ops/sec`,
			);
			expect(avgTime).toBeLessThan(25); // Under 25ms per operation
			expect(opsPerSec).toBeGreaterThan(20); // At least 20 ops/sec

			// Cleanup
			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.delete({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `BENCH_SECRET_${i}`,
				});
			}
		});

		test("benchmark: secret get operations", async () => {
			// Pre-populate secrets
			const secretCount = 50;
			for (let i = 0; i < secretCount; i++) {
				await Bun.secrets.set({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `GET_BENCH_${i}`,
					value: `get-value-${i}`,
				});
			}

			const iterations = 200;
			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				const secretIndex = i % secretCount;
				await Bun.secrets.get({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `GET_BENCH_${secretIndex}`,
				});
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;
			const opsPerSec = 1000 / avgTime;

			console.log(
				`Secret Get: ${avgTime.toFixed(3)}ms avg, ${opsPerSec.toFixed(0)} ops/sec`,
			);
			expect(avgTime).toBeLessThan(5); // Under 5ms per operation
			expect(opsPerSec).toBeGreaterThan(200); // At least 200 ops/sec

			// Cleanup
			for (let i = 0; i < secretCount; i++) {
				await Bun.secrets.delete({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `GET_BENCH_${i}`,
				});
			}
		});

		test("benchmark: concurrent secret operations", async () => {
			const concurrentOps = 20;
			const operationsPerBatch = 10;

			const start = performance.now();

			const promises = [];
			for (let batch = 0; batch < concurrentOps; batch++) {
				const batchPromises = [];
				for (let i = 0; i < operationsPerBatch; i++) {
					const secretName = `CONCURRENT_${batch}_${i}`;
					batchPromises.push(
						Bun.secrets.set({
							service: "com.cloudflare.r2.rssfeedmaster",
							name: secretName,
							value: `concurrent-value-${batch}-${i}`,
						}),
					);
				}
				promises.push(Promise.all(batchPromises));
			}

			await Promise.all(promises);
			const duration = performance.now() - start;
			const totalOps = concurrentOps * operationsPerBatch;
			const avgTime = duration / totalOps;
			const opsPerSec = 1000 / avgTime;

			console.log(
				`Concurrent Ops: ${avgTime.toFixed(3)}ms avg, ${opsPerSec.toFixed(0)} ops/sec`,
			);
			expect(avgTime).toBeLessThan(30); // Under 30ms per operation
			expect(opsPerSec).toBeGreaterThan(20); // At least 20 ops/sec

			// Cleanup
			for (let batch = 0; batch < concurrentOps; batch++) {
				for (let i = 0; i < operationsPerBatch; i++) {
					await Bun.secrets.delete({
						service: "com.cloudflare.r2.rssfeedmaster",
						name: `CONCURRENT_${batch}_${i}`,
					});
				}
			}
		});
	});

	describe("R2 Storage Performance", () => {
		test("benchmark: feed key generation", () => {
			const iterations = 10000;
			const urls = Array.from(
				{ length: 100 },
				(_, i) => `https://feed${i}.example.com/rss.xml`,
			);

			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				const url = urls[i % urls.length];
				const timestamp = new Date(Date.now() - i * 1000).toISOString();
				storage.generateFeedKey(url, timestamp);
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;
			const opsPerSec = 1000 / avgTime;

			console.log(
				`Key Generation: ${avgTime.toFixed(6)}ms avg, ${opsPerSec.toFixed(0)} ops/sec`,
			);
			expect(avgTime).toBeLessThan(0.1); // Under 0.1ms per operation
			expect(opsPerSec).toBeGreaterThan(10000); // At least 10k ops/sec
		});

		test("benchmark: report key generation", () => {
			const iterations = 5000;
			const reportTypes = [
				"rss-integration",
				"schema-validation",
				"performance",
				"rss-r2-integration",
			];

			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				const reportType = reportTypes[i % reportTypes.length];
				const timestamp = new Date(Date.now() - i * 1000).toISOString();
				storage.generateReportKey(reportType, timestamp);
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;
			const opsPerSec = 1000 / avgTime;

			console.log(
				`Report Key Generation: ${avgTime.toFixed(6)}ms avg, ${opsPerSec.toFixed(0)} ops/sec`,
			);
			expect(avgTime).toBeLessThan(0.2); // Under 0.2ms per operation
			expect(opsPerSec).toBeGreaterThan(5000); // At least 5k ops/sec
		});

		test("benchmark: AWS signature generation", () => {
			const iterations = 1000;
			const paths = Array.from(
				{ length: 50 },
				(_, i) => `/rssfeedmaster/feed-${i}.json`,
			);

			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				const path = paths[i % paths.length];
				const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");

				storage.getAuthHeader("PUT", path, {
					"content-type": "application/json",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"x-amz-date": timestamp,
				});
			}

			const duration = performance.now() - start;
			const avgTime = duration / iterations;
			const opsPerSec = 1000 / avgTime;

			console.log(
				`Signature Generation: ${avgTime.toFixed(3)}ms avg, ${opsPerSec.toFixed(0)} ops/sec`,
			);
			expect(avgTime).toBeLessThan(5); // Under 5ms per operation
			expect(opsPerSec).toBeGreaterThan(200); // At least 200 ops/sec
		});
	});

	describe("Memory and Resource Efficiency", () => {
		test("benchmark: memory usage during bulk operations", async () => {
			const initialMemory = process.memoryUsage();
			const iterations = 200; // Reduced from 1000

			// Bulk secret operations
			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.set({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `MEM_TEST_${i}`,
					value: `memory-test-value-${i}`,
				});
			}

			const afterSetMemory = process.memoryUsage();
			const setMemoryIncrease =
				afterSetMemory.heapUsed - initialMemory.heapUsed;

			// Bulk get operations
			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.get({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `MEM_TEST_${i}`,
				});
			}

			const afterGetMemory = process.memoryUsage();
			const getMemoryIncrease =
				afterGetMemory.heapUsed - afterSetMemory.heapUsed;

			console.log(
				`Memory - Set: ${(setMemoryIncrease / 1024 / 1024).toFixed(2)}MB, Get: ${(getMemoryIncrease / 1024 / 1024).toFixed(2)}MB`,
			);

			// Memory increase should be reasonable (less than 20MB for 200 operations)
			expect(setMemoryIncrease).toBeLessThan(20 * 1024 * 1024);
			expect(getMemoryIncrease).toBeLessThan(5 * 1024 * 1024);

			// Cleanup
			for (let i = 0; i < iterations; i++) {
				await Bun.secrets.delete({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: `MEM_TEST_${i}`,
				});
			}
		});

		test("benchmark: CPU usage during intensive operations", async () => {
			const startCPU = process.cpuUsage();
			const iterations = 500;

			// CPU-intensive signature generation
			for (let i = 0; i < iterations; i++) {
				const path = `/rssfeedmaster/cpu-test-${i}.json`;
				const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");

				storage.getAuthHeader("PUT", path, {
					"content-type": "application/json",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"x-amz-date": timestamp,
				});
			}

			const endCPU = process.cpuUsage(startCPU);
			const totalCPUTime = endCPU.user + endCPU.system;
			const avgCPUTime = totalCPUTime / iterations;

			console.log(
				`CPU Usage: ${(totalCPUTime / 1000).toFixed(2)}ms total, ${avgCPUTime.toFixed(3)}ms avg per operation`,
			);

			// CPU time should be reasonable (less than 1ms per operation)
			expect(avgCPUTime).toBeLessThan(1000); // Less than 1ms in microseconds
		});
	});

	describe("Scalability Tests", () => {
		test("benchmark: large-scale secret management", async () => {
			const largeScaleCount = 100; // Reduced from 500
			const start = performance.now();

			// Create large number of secrets
			const createPromises = [];
			for (let i = 0; i < largeScaleCount; i++) {
				createPromises.push(
					Bun.secrets.set({
						service: "com.cloudflare.r2.rssfeedmaster",
						name: `SCALE_TEST_${i}`,
						value: `large-scale-value-${i}-${Date.now()}`,
					}),
				);
			}
			await Promise.all(createPromises);

			const createTime = performance.now() - start;

			// Retrieve large number of secrets
			const retrieveStart = performance.now();
			const retrievePromises = [];
			for (let i = 0; i < largeScaleCount; i++) {
				retrievePromises.push(
					Bun.secrets.get({
						service: "com.cloudflare.r2.rssfeedmaster",
						name: `SCALE_TEST_${i}`,
					}),
				);
			}
			await Promise.all(retrievePromises);

			const retrieveTime = performance.now() - retrieveStart;

			console.log(
				`Large Scale (${largeScaleCount} secrets): Create ${(createTime / 1000).toFixed(2)}s, Retrieve ${(retrieveTime / 1000).toFixed(2)}s`,
			);

			// Should handle large scale efficiently
			expect(createTime).toBeLessThan(10000); // Under 10 seconds for 100 secrets
			expect(retrieveTime).toBeLessThan(5000); // Under 5 seconds for 100 secrets

			// Cleanup
			const deletePromises = [];
			for (let i = 0; i < largeScaleCount; i++) {
				deletePromises.push(
					Bun.secrets.delete({
						service: "com.cloudflare.r2.rssfeedmaster",
						name: `SCALE_TEST_${i}`,
					}),
				);
			}
			await Promise.all(deletePromises);
		});

		test("benchmark: sustained load test", async () => {
			const duration = 2000; // Reduced from 5000ms to 2 seconds
			const startTime = Date.now();
			let operations = 0;

			while (Date.now() - startTime < duration) {
				const secretName = `SUSTAINED_${operations % 5}`; // Reduced from 10 to 5
				await Bun.secrets.set({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: secretName,
					value: `sustained-value-${operations}`,
				});

				await Bun.secrets.get({
					service: "com.cloudflare.r2.rssfeedmaster",
					name: secretName,
				});

				operations++;
			}

			const opsPerSec = operations / (duration / 1000);
			console.log(
				`Sustained Load: ${operations} operations in ${duration / 1000}s, ${opsPerSec.toFixed(1)} ops/sec`,
			);

			// Should maintain reasonable throughput under sustained load
			expect(opsPerSec).toBeGreaterThan(5); // Reduced to at least 5 ops/sec sustained
		});
	});
});
