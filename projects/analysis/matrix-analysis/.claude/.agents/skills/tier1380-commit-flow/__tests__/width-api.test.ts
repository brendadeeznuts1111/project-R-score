#!/usr/bin/env bun
/**
 * Tests for width API
 */

import { describe, expect, it, mock } from "bun:test";
import { batchCheck, checkCol89, loadWidthData } from "../lib/width-api";

describe("loadWidthData", () => {
	it("should load data successfully", async () => {
		const mockData = {
			files: [],
			stats: {
				totalFiles: 0,
				totalLines: 0,
				violationCount: 0,
				complianceRate: 100,
			},
			meta: { generatedAt: new Date().toISOString(), tier: 1380 },
		};

		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockData),
			} as Response),
		);

		const data = await loadWidthData();
		expect(data.stats.complianceRate).toBe(100);

		globalThis.fetch = originalFetch;
	});

	it("should retry on failure", async () => {
		const originalFetch = globalThis.fetch;
		let attempts = 0;
		globalThis.fetch = mock(() => {
			attempts++;
			if (attempts < 2) {
				return Promise.reject(new Error("Network error"));
			}
			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						files: [],
						stats: {
							totalFiles: 1,
							totalLines: 10,
							violationCount: 0,
							complianceRate: 100,
						},
						meta: { generatedAt: "2026-01-01", tier: 1380 },
					}),
			} as Response);
		});

		const data = await loadWidthData({ retryCount: 3, retryDelay: 10 });
		expect(attempts).toBe(2);
		expect(data.stats.totalFiles).toBe(1);

		globalThis.fetch = originalFetch;
	});

	it("should throw after max retries", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() => Promise.reject(new Error("Network error")));

		await expect(loadWidthData({ retryCount: 2, retryDelay: 10 })).rejects.toThrow(
			"Failed to load width data after 2 attempts",
		);

		globalThis.fetch = originalFetch;
	});
});

describe("checkCol89", () => {
	it("should pass for short lines", () => {
		const result = checkCol89("const x = 1;");
		expect(result.valid).toBe(true);
		expect(result.width).toBeLessThanOrEqual(89);
	});

	it("should fail for long lines", () => {
		const result = checkCol89("a".repeat(100));
		expect(result.valid).toBe(false);
		expect(result.width).toBe(100);
	});

	it("should handle ANSI codes", () => {
		const result = checkCol89(`\x1b[32m${"a".repeat(80)}\x1b[0m`);
		expect(result.valid).toBe(true);
		expect(result.width).toBe(80);
	});
});

describe("batchCheck", () => {
	it("should check files in batches", async () => {
		const files = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"];
		const checker = mock(() => Promise.resolve([]));

		const results = await batchCheck(files, checker);

		expect(results.size).toBe(6);
		expect(checker).toHaveBeenCalledTimes(6);
	});
});
