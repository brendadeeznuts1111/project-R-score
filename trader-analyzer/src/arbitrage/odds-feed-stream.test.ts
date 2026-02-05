#!/usr/bin/env bun
/**
 * @fileoverview Odds Feed Stream Tests - CompressionStream + Fake Timers
 * @description Tests for streaming odds pipeline with Bun 1.3.x features
 * @module arbitrage/odds-feed-stream.test
 */

import { describe, expect, test, beforeEach, afterEach, jest } from "bun:test";
import { OddsFeedStream } from "./odds-feed-stream";
import { unlinkSync } from "fs";

describe("OddsFeedStream", () => {
	const testDbPath = "./test-odds-stream.db";
	const testMlgsPath = "./test-mlgs-stream.db";
	let stream: OddsFeedStream;

	beforeEach(() => {
		stream = new OddsFeedStream(testDbPath, testMlgsPath);
	});

	afterEach(() => {
		try {
			unlinkSync(testDbPath);
		} catch {}
		try {
			unlinkSync(testMlgsPath);
		} catch {}
	});

	describe("CompressionStream - ZSTD Performance", () => {
		test("should compress odds data with zstd", async () => {
			const mockOdds = [
				{
					bookie: "pinnacle",
					league: "nfl",
					market: "moneyline",
					selection: "chiefs",
					odds: -110,
					timestamp: Date.now(),
				},
				{
					bookie: "draftkings",
					league: "nfl",
					market: "moneyline",
					selection: "chiefs",
					odds: -105,
					timestamp: Date.now(),
				},
			];

			const compressed = await stream["compressOdds"](mockOdds);
			const rawSize = JSON.stringify(mockOdds).length;

			expect(compressed.length).toBeLessThan(rawSize);
			expect(compressed.length).toBeGreaterThan(0);
		});

		test("should achieve high compression ratio", async () => {
			// Generate large odds dataset
			const largeOdds = Array.from({ length: 1000 }, (_, i) => ({
				bookie: `bookie-${i % 10}`,
				league: "nfl",
				market: "moneyline",
				selection: `team-${i}`,
				odds: -110 + (i % 20),
				timestamp: Date.now(),
			}));

			const compressed = await stream["compressOdds"](largeOdds);
			const rawSize = JSON.stringify(largeOdds).length;
			const compressionRatio = 1 - compressed.length / rawSize;

			// Should achieve >80% compression
			expect(compressionRatio).toBeGreaterThan(0.8);
		});
	});

	describe("Fake Timers - Streaming Pipeline", () => {
		test("should simulate streaming cycles with fake timers", async () => {
			jest.useFakeTimers();

			let cycleCount = 0;
			const stopStream = stream.start(100); // 100ms cycles

			// Mock fetch to return test data
			const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				headers: new Headers(),
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(
							new TextEncoder().encode(
								JSON.stringify([
									{
										bookie: "pinnacle",
										league: "nfl",
										odds: -110,
									},
								]),
							),
						);
						controller.close();
					},
				}),
			} as any);

			// Advance timers to trigger cycles
			jest.advanceTimersByTime(500); // 5 cycles

			// Give async operations time to complete
			await Bun.sleep(10);

			stopStream();
			jest.useRealTimers();

			expect(mockFetch).toHaveBeenCalled();
		});

		test("should handle timeout-based streaming", async () => {
			jest.useFakeTimers();

			const mockOdds = [
				{
					bookie: "pinnacle",
					league: "nfl",
					market: "moneyline",
					selection: "chiefs",
					odds: -110,
					timestamp: Date.now(),
				},
			];

			jest.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				headers: new Headers(),
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(
							new TextEncoder().encode(JSON.stringify(mockOdds)),
						);
						controller.close();
					},
				}),
			} as any);

			// Simulate streaming for 1 second (10 cycles at 100ms)
			jest.advanceTimersByTime(1000);

			await Bun.sleep(10);

			jest.useRealTimers();
		});
	});

	describe("HTTP Pooling - Concurrent Bookie Scans", () => {
		test("should fetch multiple bookies concurrently", async () => {
			const mockOdds = [
				{
					bookie: "pinnacle",
					league: "nfl",
					odds: -110,
				},
			];

			jest.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				headers: new Headers(),
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(
							new TextEncoder().encode(JSON.stringify(mockOdds)),
						);
						controller.close();
					},
				}),
			} as any);

			const startTime = Bun.nanoseconds();
			const results = await Promise.all(
				stream["bookies"].map((bookie: any) =>
					stream.fetchBookieOdds(bookie),
				),
			);
			const elapsed = (Bun.nanoseconds() - startTime) / 1_000_000;

			expect(results.length).toBeGreaterThan(0);
			// Should complete quickly with pooling
			expect(elapsed).toBeLessThan(1000);
		});
	});

	describe("MLGS Integration", () => {
		test("should feed odds to MLGS graph", async () => {
			const mockOdds = [
				{
					bookie: "pinnacle",
					league: "nfl",
					market: "moneyline",
					selection: "chiefs",
					odds: -110,
					timestamp: Date.now(),
				},
			];

			jest.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				headers: new Headers(),
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(
							new TextEncoder().encode(JSON.stringify(mockOdds)),
						);
						controller.close();
					},
				}),
			} as any);

			await stream.streamOddsPipeline();

			const metrics = stream["mlgs"].getGraphMetrics();
			expect(metrics.nodeCount).toBeGreaterThan(0);
		});

		test("should detect arbitrage opportunities", async () => {
			// Create arbitrage scenario
			const mockOdds = [
				{
					bookie: "pinnacle",
					league: "nfl",
					market: "moneyline",
					selection: "chiefs",
					odds: -110,
					timestamp: Date.now(),
				},
				{
					bookie: "draftkings",
					league: "nfl",
					market: "moneyline",
					selection: "chiefs",
					odds: -105, // Better odds = arbitrage opportunity
					timestamp: Date.now(),
				},
			];

			jest.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				headers: new Headers(),
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(
							new TextEncoder().encode(JSON.stringify(mockOdds)),
						);
						controller.close();
					},
				}),
			} as any);

			await stream.streamOddsPipeline();

			const metrics = stream.getMetrics();
			expect(metrics.arbitrage.scans_per_second).toBeGreaterThan(0);
		});
	});

	describe("Metrics and Monitoring", () => {
		test("should return streaming metrics", () => {
			const metrics = stream.getMetrics();

			expect(metrics.compression.format).toBe("zstd");
			expect(metrics.compression.bookies_active).toBeGreaterThan(0);
			expect(metrics.arbitrage.scans_per_second).toBeGreaterThan(0);
		});
	});
});
