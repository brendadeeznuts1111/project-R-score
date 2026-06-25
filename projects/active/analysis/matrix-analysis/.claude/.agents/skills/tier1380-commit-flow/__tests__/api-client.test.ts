#!/usr/bin/env bun
/**
 * Tests for API client
 */

import { describe, expect, it, mock } from "bun:test";
import { DEFAULT_CONFIG, loadWidthData, submitWidthViolation } from "../lib/api-client";

describe("API Client", () => {
	it("should have default config", () => {
		expect(DEFAULT_CONFIG.baseUrl).toBe("http://localhost:3335");
		expect(DEFAULT_CONFIG.timeout).toBe(5000);
	});

	it("should merge config options", async () => {
		// Mock fetch
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ files: [], stats: {} }),
			} as Response),
		);

		await loadWidthData({
			baseUrl: "http://custom:8080",
			headers: { "X-Custom": "true" },
		});

		// Restore
		globalThis.fetch = originalFetch;
	});

	it("should throw on HTTP error", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: false,
				status: 404,
				statusText: "Not Found",
			} as Response),
		);

		await expect(loadWidthData()).rejects.toThrow("HTTP 404");

		globalThis.fetch = originalFetch;
	});

	it("should submit violation successfully", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
			} as Response),
		);

		const result = await submitWidthViolation({
			file: "test.ts",
			line: 10,
			content: "const x = 'test';",
			width: 95,
		});

		expect(result.success).toBe(true);

		globalThis.fetch = originalFetch;
	});
});
