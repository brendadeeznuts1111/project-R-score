#!/usr/bin/env bun
/**
 * Tests for Tier-1380 OMEGA Commit Flow utilities
 */

import { describe, expect, it } from "bun:test";
import {
	assertCol89,
	calculateHash,
	checkBunVersion,
	colorize,
	renderBox,
	renderProgress,
	Timer,
	wrapCol89,
} from "../lib/utils";

describe("Col-89 enforcement", () => {
	it("should pass for text under 89 chars", () => {
		const text = "a".repeat(80);
		expect(assertCol89(text)).toBe(true);
	});

	it("should fail for text over 89 chars", () => {
		const text = "a".repeat(100);
		expect(assertCol89(text)).toBe(false);
	});

	it("should handle ANSI codes correctly", () => {
		const text = `\x1b[32m${"a".repeat(80)}\x1b[0m`;
		expect(assertCol89(text)).toBe(true);
	});
});

describe("Text wrapping", () => {
	it("should wrap text to 89 chars", () => {
		const text = "a ".repeat(100);
		const wrapped = wrapCol89(text);
		const lines = wrapped.split("\n");
		for (const line of lines) {
			expect(Bun.stringWidth(line, { countAnsiEscapeCodes: false })).toBeLessThanOrEqual(
				89,
			);
		}
	});
});

describe("Hash calculation", () => {
	it("should calculate consistent hash", () => {
		const data = "test data";
		const hash1 = calculateHash(data);
		const hash2 = calculateHash(data);
		expect(hash1).toBe(hash2);
		expect(hash1).toMatch(/^[0-9a-f]+$/);
	});

	it("should handle Uint8Array", () => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const hash = calculateHash(data);
		expect(hash).toMatch(/^[0-9a-f]+$/);
	});
});

describe("Timer", () => {
	it("should measure elapsed time", async () => {
		const timer = new Timer();
		await Bun.sleep(10);
		const elapsed = timer.elapsed();
		expect(elapsed).toBeGreaterThanOrEqual(5);
		expect(elapsed).toBeLessThan(100);
	});

	it("should reset correctly", async () => {
		const timer = new Timer();
		await Bun.sleep(10);
		timer.reset();
		const elapsed = timer.elapsed();
		expect(elapsed).toBeLessThan(50);
	});
});

describe("Progress bar", () => {
	it("should render progress correctly", () => {
		const bar = renderProgress(50, 100);
		expect(bar).toContain("50%");
		expect(bar).toContain("[");
		expect(bar).toContain("]");
	});

	it("should handle 0%", () => {
		const bar = renderProgress(0, 100);
		expect(bar).toContain("0%");
	});

	it("should handle 100%", () => {
		const bar = renderProgress(100, 100);
		expect(bar).toContain("100%");
	});
});

describe("Box rendering", () => {
	it("should render box with title", () => {
		const box = renderBox("Test", ["Line 1", "Line 2"]);
		expect(box).toContain("Test");
		expect(box).toContain("╔");
		expect(box).toContain("╗");
		expect(box).toContain("╚");
		expect(box).toContain("╝");
	});
});

describe("Bun version check", () => {
	it("should accept current version", () => {
		expect(checkBunVersion(">=1.0.0")).toBe(true);
	});

	it("should reject future version", () => {
		expect(checkBunVersion(">=99.0.0")).toBe(false);
	});
});

describe("Colorize", () => {
	it("should wrap text with ANSI codes", () => {
		const colored = colorize("test", "green");
		expect(colored).toContain("test");
		expect(colored).toContain("\x1b[");
	});
});
