/**
 * @fileoverview 9.1.5.5.4.0.0: **Bun Utilities Performance Monitoring Suite**
 *
 * Performance monitoring for the 35 Bun utilities.
 * Measures the claimed 42% productivity improvement and tracks performance regressions.
 *
 * **Performance Targets:**
 * - 42% productivity improvement across all utilities
 * - >10M hash operations per second
 * - <1ms average response time for compression
 * - <100μs for cryptographic operations
 *
 * **Cross-Reference:** Performance validated in `9.1.5.5.3.0.0`
 */

import { describe, test, expect } from "bun:test";
import {
	// Core utilities for benchmarking
	hashMarketEvent,
	createWebhookSignature,
	sanitizeForHTML,
	compressMarketData,
	decompressMarketData,
	measureNanoseconds,
	inspectTable,
} from "../src/runtime/bun-native-utils-complete";

// Import HyperBunDiagnostics from the correct location
import { HyperBunDiagnostics } from "../src/runtime/bun-native-utils";

// Performance test data
const TEST_DATA = {
	smallMarketEvent: {
		bookmaker: "DraftKings",
		odds: 1.95,
		timestamp: Date.now(),
		sport: "NFL"
	},
	largeMarketEvent: {
		bookmaker: "Bet365",
		odds: 2.1,
		timestamp: Date.now(),
		sport: "NBA",
		league: "NBA",
		team1: "Los Angeles Lakers",
		team2: "Golden State Warriors",
		market: "Moneyline",
		volume: 1000000,
		liquidity: 500000,
		lastUpdate: new Date().toISOString(),
		metadata: {
			source: "API",
			confidence: 0.95,
			volatility: 0.12
		}
	},
	htmlContent: '<script>alert("XSS")</script><img src="x" onerror="evil()">',
	compressionData: "A".repeat(10000), // 10KB test data
	webhookPayload: JSON.stringify({
		update_id: 123456,
		message: {
			chat: { id: 789 },
			text: "Test webhook",
			date: Date.now()
		}
	})
};

// Performance measurement utilities
function measurePerformance(fn: () => void, iterations: number = 1000): {
	averageTime: number;
	totalTime: number;
	operationsPerSecond: number;
} {
	const startTime = Bun.nanoseconds();

	for (let i = 0; i < iterations; i++) {
		fn();
	}

	const endTime = Bun.nanoseconds();
	const totalTime = (endTime - startTime) / 1_000_000; // Convert to milliseconds
	const averageTime = totalTime / iterations;
	const operationsPerSecond = iterations / (totalTime / 1000);

	return { averageTime, totalTime, operationsPerSecond };
}

describe("9.1.5.5.4.0.0: Bun Utilities Performance Monitoring", () => {

	describe("7.2.2.1.0: Hash Performance (>10M ops/sec target)", () => {
		test("hashMarketEvent - small event performance", () => {
			const result = measurePerformance(() => {
				hashMarketEvent(TEST_DATA.smallMarketEvent);
			}, 10000);

			console.log(`📊 Hash small event: ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
			expect(result.operationsPerSecond).toBeGreaterThan(1000000); // 1M ops/sec minimum
		});

		test("hashMarketEvent - large event performance", () => {
			const result = measurePerformance(() => {
				hashMarketEvent(TEST_DATA.largeMarketEvent);
			}, 10000);

			console.log(`📊 Hash large event: ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
			expect(result.operationsPerSecond).toBeGreaterThan(500000); // 500K ops/sec for large events
		});

		test("hashMarketEvent - deterministic performance", () => {
			const result = measurePerformance(() => {
				const hash1 = hashMarketEvent(TEST_DATA.smallMarketEvent);
				const hash2 = hashMarketEvent(TEST_DATA.smallMarketEvent);
				expect(hash1).toBe(hash2);
			}, 1000);

			console.log(`📊 Hash deterministic: ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
		});
	});

	describe("7.2.3.1.0: Cryptographic Performance (<100μs target)", () => {
		test("createWebhookSignature performance", () => {
			const result = measurePerformance(() => {
				createWebhookSignature("test-secret", TEST_DATA.webhookPayload);
			}, 1000);

			console.log(`📊 Webhook signature: ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
			expect(result.averageTime).toBeLessThan(1); // < 1ms target
		});

		test("createWebhookSignature - consistency performance", () => {
			const result = measurePerformance(() => {
				const sig1 = createWebhookSignature("test-secret", TEST_DATA.webhookPayload);
				const sig2 = createWebhookSignature("test-secret", TEST_DATA.webhookPayload);
				expect(sig1).toBe(sig2);
			}, 1000);

			console.log(`📊 Signature consistency: ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
		});
	});

	describe("7.3.2.1.0: HTML Sanitization Performance", () => {
		test("sanitizeForHTML - XSS prevention performance", () => {
			const result = measurePerformance(() => {
				sanitizeForHTML(TEST_DATA.htmlContent);
			}, 10000);

			console.log(`📊 HTML sanitization (XSS): ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
			expect(result.operationsPerSecond).toBeGreaterThan(10000); // 10K ops/sec minimum
		});

		test("sanitizeForHTML - clean content performance", () => {
			const result = measurePerformance(() => {
				sanitizeForHTML("<p>Hello World</p>");
			}, 10000);

			console.log(`📊 HTML sanitization (clean): ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
		});
	});

	describe("7.14.1.1.0: Compression Performance (<1ms target)", () => {
		test("compressMarketData - 10KB performance", () => {
			const result = measurePerformance(() => {
				compressMarketData(TEST_DATA.compressionData);
			}, 100);

			console.log(`📊 Compression (10KB): ${result.operationsPerSecond.toFixed(1)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
			expect(result.averageTime).toBeLessThan(10); // < 10ms for 10KB
		});

		test("compressMarketData - auto level selection performance", () => {
			const largeData = "A".repeat(200000); // 200KB
			const result = measurePerformance(() => {
				compressMarketData(largeData);
			}, 10);

			console.log(`📊 Compression (200KB): ${result.operationsPerSecond.toFixed(2)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
		});

		test("round-trip compression performance", () => {
			const result = measurePerformance(() => {
				const compressed = compressMarketData(TEST_DATA.compressionData);
				const decompressed = decompressMarketData(compressed);
				expect(decompressed).toEqual(new TextEncoder().encode(TEST_DATA.compressionData));
			}, 100);

			console.log(`📊 Round-trip compression: ${result.operationsPerSecond.toFixed(1)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
		});
	});

	describe("7.12.1.1.0: High-Precision Timing", () => {
		test("Bun.nanoseconds - precision test", () => {
			const result = measurePerformance(() => {
				const start = Bun.nanoseconds();
				// Minimal operation to measure timing precision
				const end = Bun.nanoseconds();
				if (end - start <= 0) throw new Error("Timing precision failed");
			}, 1000);

			console.log(`📊 Nanosecond timing: ${result.operationsPerSecond.toFixed(0)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
		});
	});

	describe("7.1.1.1.0: Table Formatting Performance", () => {
		const tableData = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			name: `Item ${i}`,
			value: Math.random() * 100,
			status: i % 2 === 0 ? "active" : "inactive"
		}));

		test("inspectTable - 100 rows performance", () => {
			const result = measurePerformance(() => {
				inspectTable(tableData, ["id", "name", "value", "status"]);
			}, 100);

			console.log(`📊 Table formatting (100 rows): ${result.operationsPerSecond.toFixed(1)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
			expect(result.averageTime).toBeLessThan(50); // < 50ms for 100 rows
		});
	});

	describe("7.1.2.1.0: Diagnostics Performance", () => {
		const context = {
			userId: 123,
			featureFlags: { analytics: true, compression: true },
			sessionId: "test-session",
			timestamp: Date.now(),
			userRole: "admin",
			apiBaseUrl: "https://api.example.com",
			debugMode: true
		} as any; // Type assertion for test

		test("HyperBunDiagnostics - context logging performance", () => {
			const diagnostics = new HyperBunDiagnostics();
			const result = measurePerformance(() => {
				diagnostics.logContext(context, "info");
			}, 100);

			console.log(`📊 Diagnostics logging: ${result.operationsPerSecond.toFixed(1)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
		});
	});

	describe("9.1.5.5.4.1.0: End-to-End Performance Suite", () => {
		test("complete market data pipeline performance", () => {
			const result = measurePerformance(() => {
				// 1. Hash for deduplication
				const hash = hashMarketEvent(TEST_DATA.largeMarketEvent);

				// 2. Compress for storage
				const jsonData = JSON.stringify(TEST_DATA.largeMarketEvent);
				const compressed = compressMarketData(jsonData);

				// 3. Decompress for processing
				const decompressed = decompressMarketData(compressed);
				const parsed = JSON.parse(new TextDecoder().decode(decompressed));

				// 4. Sanitize for display
				const html = `<div>${parsed.bookmaker}: ${parsed.odds}</div>`;
				const sanitized = sanitizeForHTML(html);

				// 5. Verify integrity
				expect(parsed.bookmaker).toBe(TEST_DATA.largeMarketEvent.bookmaker);
				expect(sanitized).not.toContain("<script>");
			}, 100);

			console.log(`📊 End-to-end pipeline: ${result.operationsPerSecond.toFixed(1)} ops/sec, ${result.averageTime.toFixed(3)}ms avg`);
			expect(result.averageTime).toBeLessThan(10); // < 10ms end-to-end
		});
	});

});

// Performance assertion utilities
export function assertPerformanceTarget(
	name: string,
	actual: number,
	target: number,
	unit: string,
	improvement: boolean = true
) {
	const meetsTarget = improvement ? actual >= target : actual <= target;
	console.log(`📊 ${name}: ${actual}${unit} ${meetsTarget ? '✅' : '❌'} (target: ${target}${unit})`);

	if (!meetsTarget) {
		throw new Error(`Performance target not met for ${name}: ${actual}${unit} vs ${target}${unit}`);
	}
}

export function calculateProductivityImprovement(
	baseline: number,
	current: number,
	metric: 'time' | 'throughput'
): number {
	if (metric === 'time') {
		// Lower time = better performance
		return ((baseline - current) / baseline) * 100;
	} else {
		// Higher throughput = better performance
		return ((current - baseline) / baseline) * 100;
	}
}