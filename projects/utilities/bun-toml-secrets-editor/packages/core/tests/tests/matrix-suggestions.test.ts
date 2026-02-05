// tests/matrix-suggestions.test.ts
// Tests for matrix command suggestions system

import { beforeEach, describe, expect, it } from "bun:test";
import {
	MatrixSuggestionEngine,
	suggestCommand,
} from "../cli/matrix-suggestions";

describe("Matrix Suggestions System", () => {
	let engine: MatrixSuggestionEngine;

	beforeEach(() => {
		engine = new MatrixSuggestionEngine({
			minSimilarity: 0.4, // Lower threshold for better test matching
			maxSuggestions: 3,
			cacheEnabled: true,
			performanceMonitoring: true,
		});
	});

	describe("Basic Suggestions", () => {
		it("should suggest commands for common typos", async () => {
			const suggestions = await engine.suggestCommands("buld");
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions[0].name).toBe("build");
		});

		it("should handle exact matches", async () => {
			const suggestions = await engine.suggestCommands("build");
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions[0].name).toBe("build");
		});

		it("should return empty for no matches", async () => {
			const suggestions = await engine.suggestCommands("xyz123");
			expect(suggestions.length).toBe(0);
		});

		it("should handle empty input", async () => {
			const suggestions = await engine.suggestCommands("");
			expect(suggestions.length).toBe(0);
		});
	});

	describe("String Operations", () => {
		it("should clean ANSI codes from input", async () => {
			const input = "\u001b[31mred\u001b[0m text";
			const cleanInput = Bun.stripANSI(input);
			expect(cleanInput).toBe("red text");

			const suggestions = await engine.suggestCommands(input);
			expect(Array.isArray(suggestions)).toBe(true);
		});

		it("should calculate string width correctly", () => {
			const text = "hello";
			const width = Bun.stringWidth(text);
			expect(width).toBe(5);

			const coloredText = "\u001b[31mhello\u001b[0m";
			const coloredWidth = Bun.stringWidth(coloredText);
			expect(coloredWidth).toBe(5);
		});
	});

	describe("Performance Monitoring", () => {
		it("should track performance statistics", async () => {
			await engine.suggestCommands("build");
			await engine.suggestCommands("test");

			const stats = engine.getPerformanceStats();
			expect(stats).toBeDefined();
			expect(Object.keys(stats).length).toBeGreaterThan(0);
		});

		it("should reset performance statistics", async () => {
			await engine.suggestCommands("build");

			let stats = engine.getPerformanceStats();
			expect(Object.keys(stats).length).toBeGreaterThan(0);

			engine.resetPerformanceStats();

			stats = engine.getPerformanceStats();
			expect(Object.keys(stats).length).toBe(0);
		});
	});

	describe("Cache Operations", () => {
		it("should cache command loading", async () => {
			// First call should load from file/built-in
			const start1 = Bun.nanoseconds();
			await engine.suggestCommands("build");
			const time1 = Bun.nanoseconds() - start1;

			// Second call should use cache
			const start2 = Bun.nanoseconds();
			await engine.suggestCommands("test");
			const time2 = Bun.nanoseconds() - start2;

			// Cache should make subsequent calls faster (or similar)
			expect(time2).toBeLessThanOrEqual(time1 * 2);
		});

		it("should clear cache", async () => {
			await engine.suggestCommands("build");

			engine.clearCache();

			// Should still work after cache clear
			const suggestions = await engine.suggestCommands("test");
			expect(Array.isArray(suggestions)).toBe(true);
		});
	});

	describe("Configuration Management", () => {
		it("should load configuration from file", async () => {
			const configFile = Bun.file("./config/matrix-commands.json");
			expect(await configFile.exists()).toBe(true);

			const config = await configFile.json();
			expect(config.commands).toBeDefined();
			expect(config.commands.length).toBeGreaterThan(0);
			expect(config.categories).toBeDefined();
		});
	});

	describe("Quick Start Function", () => {
		it("should return single best suggestion", async () => {
			const suggestion = await suggestCommand("buld");
			expect(suggestion).toBe("build");
		});

		it("should return null for no matches", async () => {
			const suggestion = await suggestCommand("xyz123");
			expect(suggestion).toBeNull();
		});
	});

	describe("Error Handling", () => {
		it("should handle null/undefined input gracefully", async () => {
			const suggestions1 = await engine.suggestCommands(null as any);
			const suggestions2 = await engine.suggestCommands(undefined as any);

			expect(Array.isArray(suggestions1)).toBe(true);
			expect(Array.isArray(suggestions2)).toBe(true);
		});

		it("should handle very long input", async () => {
			const longInput = "a".repeat(1000);
			const suggestions = await engine.suggestCommands(longInput);
			expect(Array.isArray(suggestions)).toBe(true);
		});

		it("should handle special characters", async () => {
			const specialInput = "\x00\x01\x02";
			const suggestions = await engine.suggestCommands(specialInput);
			expect(Array.isArray(suggestions)).toBe(true);
		});
	});

	describe("Formatted Output", () => {
		it("should format suggestions for display", async () => {
			const suggestions = await engine.suggestCommands("buld");
			const formatted = engine.formatSuggestions(suggestions, "buld");

			expect(formatted).toContain("Did you mean");
			expect(formatted).toContain("matrix build");
		});

		it("should return empty string for no suggestions", async () => {
			const suggestions: any[] = [];
			const formatted = engine.formatSuggestions(suggestions, "xyz");
			expect(formatted).toBe("");
		});
	});

	describe("Async Operations", () => {
		it("should handle concurrent requests", async () => {
			const promises = [
				engine.suggestCommands("build"),
				engine.suggestCommands("test"),
				engine.suggestCommands("deploy"),
			];

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			results.forEach((suggestions) => {
				expect(Array.isArray(suggestions)).toBe(true);
			});
		});
	});
});
