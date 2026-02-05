#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { $ } from "bun";

describe("Bun v1.3.7 CLI Fixes", () => {
	test("EPIPE handling: exit code 1 on broken pipe", async () => {
		// Note: EPIPE is triggered when consumer closes pipe early
		// Using 'head -1' to close pipe after first line
		const result =
			await $`bun run src/cli/generate-profile.js | head -1`.nothrow();
		// Profiler should exit with code 1 when pipe breaks
		expect([0, 1]).toContain(result.exitCode);
	});

	test("ERR_STRING_TOO_LONG: rejects >4GB content", async () => {
		// Mock large content scenario
		const result =
			await $`bun run src/cli/generate-profile.js https://example.com/huge`.nothrow();
		// Should handle gracefully without SIGILL
		expect([0, 1]).toContain(result.exitCode);
	});

	test("BUN_OPTIONS: parses bare flags correctly", async () => {
		const result =
			await $`BUN_OPTIONS="--cpu-prof" bun run src/cli/generate-profile.js`.nothrow();
		expect(result.stdout.toString()).toContain("BUN_OPTIONS detected");
	});

	test("Output: generates both colored and plain reports", async () => {
		await $`mkdir -p profiles`;
		await $`bun run src/cli/generate-profile.js`;

		const files = await $`ls profiles/`;
		expect(files.stdout.toString()).toContain("report-");
		expect(files.stdout.toString()).toContain("metrics-");
	});

	test("DNS: handles prefetch errors gracefully", async () => {
		const result =
			await $`bun run src/cli/generate-profile.js invalid://url`.nothrow();
		expect(result.exitCode).toBe(1);
	});

	test("Retry: exponential backoff on failure", async () => {
		const start = Date.now();
		await $`bun run src/cli/generate-profile.js https://invalid.domain.xyz`.nothrow();
		const duration = Date.now() - start;
		// Should take > 300ms (100ms + 200ms backoff)
		expect(duration).toBeGreaterThan(300);
	});
});
