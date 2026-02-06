#!/usr/bin/env bun

/**
 * Integration Test Suite
 *
 * Comprehensive test of all integration components.
 * Run with: bun scripts/test-integration.ts
 */

import { $ } from "bun";
import { parse } from "yaml";
import { readTextFile } from "./lib/bytes.ts";
import { getContrastRatio, getHexColor, getRGBA } from "./lib/color.ts";
import { createPerformanceSnapshot, getMemoryUsage } from "./lib/jsc-monitor.ts";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
};

interface TestResult {
	name: string;
	passed: boolean;
	message?: string;
}

const results: TestResult[] = [];

function test(
	name: string,
	fn: () => boolean | Promise<boolean>,
	message?: string,
): void {
	try {
		const result = fn();
		if (result instanceof Promise) {
			result
				.then((passed) => {
					results.push({ name, passed, message: passed ? undefined : message });
				})
				.catch(() => {
					results.push({ name, passed: false, message: message || "Exception thrown" });
				});
		} else {
			results.push({ name, passed: result, message: result ? undefined : message });
		}
	} catch (e) {
		results.push({ name, passed: false, message: String(e) });
	}
}

async function runTests() {
	console.log(`${COLORS.bold}${COLORS.cyan}`);
	console.log("╔══════════════════════════════════════════════════════════════════╗");
	console.log("║     INTEGRATION TEST SUITE                                     ║");
	console.log("║     Tier-1380 OpenClaw v1.0.0                                  ║");
	console.log("╚══════════════════════════════════════════════════════════════════╝");
	console.log(`${COLORS.reset}\n`);

	// ===== CONFIGURATION TESTS =====
	console.log(`${COLORS.bold}Configuration Tests${COLORS.reset}`);
	console.log("─".repeat(60));

	test("telegram-topics.yaml exists", () => {
		return readTextFile(`${import.meta.dir}/../config/telegram-topics.yaml`) !== null;
	});

	test("project-topics.yaml exists", () => {
		return readTextFile(`${import.meta.dir}/../config/project-topics.yaml`) !== null;
	});

	test("telegram-topics.yaml is valid YAML", async () => {
		const content = await readTextFile(
			`${import.meta.dir}/../config/telegram-topics.yaml`,
		);
		if (!content) return false;
		try {
			const parsed = parse(content);
			return parsed && parsed.topics && Object.keys(parsed.topics).length === 4;
		} catch {
			return false;
		}
	});

	test("project-topics.yaml has 3 projects", async () => {
		const content = await readTextFile(
			`${import.meta.dir}/../config/project-topics.yaml`,
		);
		if (!content) return false;
		try {
			const parsed = parse(content);
			return parsed && parsed.projects && Object.keys(parsed.projects).length === 3;
		} catch {
			return false;
		}
	});

	// ===== BYTES UTILITIES TESTS =====
	console.log(`\n${COLORS.bold}Bytes Utilities Tests${COLORS.reset}`);
	console.log("─".repeat(60));

	test("formatBytes formats correctly", async () => {
		const { formatBytes } = await import("./lib/bytes.ts");
		return formatBytes(1024) === "1 KB" && formatBytes(1024 * 1024) === "1 MB";
	});

	test("readTextFile handles missing files", async () => {
		const result = await readTextFile("/nonexistent/file.txt");
		return result === null;
	});

	test("readTextFile reads existing files", async () => {
		const result = await readTextFile(
			`${import.meta.dir}/../config/telegram-topics.yaml`,
		);
		return result !== null && result.length > 0;
	});

	// ===== COLOR UTILITIES TESTS =====
	console.log(`\n${COLORS.bold}Color Utilities Tests${COLORS.reset}`);
	console.log("─".repeat(60));

	test("getRGBA extracts channels", () => {
		const rgba = getRGBA("#4CAF50");
		return (
			rgba !== null && rgba.r === 76 && rgba.g === 175 && rgba.b === 80 && rgba.a === 1
		);
	});

	test("getHexColor converts to hex", () => {
		const hex = getHexColor("red");
		return hex === "#ff0000";
	});

	test("getContrastRatio calculates WCAG", () => {
		const ratio = getContrastRatio("white", "black");
		return ratio !== null && ratio >= 20;
	});

	test("Color handles invalid inputs", () => {
		const result = getRGBA("not-a-color");
		return result === null;
	});

	// ===== JSC MONITOR TESTS =====
	console.log(`\n${COLORS.bold}JSC Monitor Tests${COLORS.reset}`);
	console.log("─".repeat(60));

	test("getMemoryUsage returns stats", () => {
		const mem = getMemoryUsage();
		return mem && typeof mem.heapUsed === "number" && mem.heapUsed > 0;
	});

	test("createPerformanceSnapshot works", () => {
		const snapshot = createPerformanceSnapshot();
		return snapshot && snapshot.timestamp && snapshot.memory && snapshot.vm;
	});

	// ===== GIT HOOKS TESTS =====
	console.log(`\n${COLORS.bold}Git Hooks Tests${COLORS.reset}`);
	console.log("─".repeat(60));

	test("Git hooks installed for nolarose-mcp-config", async () => {
		const hook1 = await Bun.file(
			`${process.env.HOME}/.git/hooks/post-commit-topic`,
		).exists();
		const hook2 = await Bun.file(
			`${process.env.HOME}/.git/hooks/post-merge-topic`,
		).exists();
		return hook1 && hook2;
	});

	test("Git hooks installed for openclaw", async () => {
		const hook1 = await Bun.file(
			`${process.env.HOME}/openclaw/.git/hooks/post-commit-topic`,
		).exists();
		const hook2 = await Bun.file(
			`${process.env.HOME}/openclaw/.git/hooks/post-merge-topic`,
		).exists();
		return hook1 && hook2;
	});

	test("Git hooks installed for matrix-agent", async () => {
		const hook1 = await Bun.file(
			`${process.env.HOME}/matrix-agent/.git/hooks/post-commit-topic`,
		).exists();
		const hook2 = await Bun.file(
			`${process.env.HOME}/matrix-agent/.git/hooks/post-merge-topic`,
		).exists();
		return hook1 && hook2;
	});

	// ===== CLI INTEGRATION TESTS =====
	console.log(`\n${COLORS.bold}CLI Integration Tests${COLORS.reset}`);
	console.log("─".repeat(60));

	test("topic-manager.ts executes", async () => {
		const result = await $`bun ${import.meta.dir}/topic-manager.ts list`
			.quiet()
			.nothrow();
		return result.exitCode === 0;
	});

	test("project-integration.ts executes", async () => {
		const result = await $`bun ${import.meta.dir}/project-integration.ts list`
			.quiet()
			.nothrow();
		return result.exitCode === 0;
	});

	test("integration-status.ts executes", async () => {
		const result = await $`bun ${import.meta.dir}/integration-status.ts`
			.quiet()
			.nothrow();
		return result.exitCode === 0;
	});

	test("notification-manager.ts executes", async () => {
		const result = await $`bun ${import.meta.dir}/notification-manager.ts rules`
			.quiet()
			.nothrow();
		return result.exitCode === 0;
	});

	test("topic-git-hooks.ts executes", async () => {
		const result = await $`bun ${import.meta.dir}/topic-git-hooks.ts list`
			.quiet()
			.nothrow();
		return result.exitCode === 0;
	});

	test("project-watch.ts executes", async () => {
		const result = await $`bun ${import.meta.dir}/project-watch.ts status`
			.quiet()
			.nothrow();
		return result.exitCode === 0;
	});

	// ===== BUN API TESTS =====
	console.log(`\n${COLORS.bold}Bun API Tests${COLORS.reset}`);
	console.log("─".repeat(60));

	test("Bun.color API available", () => {
		// @ts-expect-error
		return typeof Bun !== "undefined" && typeof Bun.color === "function";
	});

	test("Bun.file API works", async () => {
		const file = Bun.file(`${import.meta.dir}/../config/telegram-topics.yaml`);
		const exists = await file.exists();
		return exists;
	});

	test("Bun.write API works", async () => {
		const testFile = `/tmp/bun-test-${Date.now()}.txt`;
		try {
			await Bun.write(testFile, "test");
			const content = await Bun.file(testFile).text();
			await Bun.file(testFile).delete();
			return content === "test";
		} catch {
			return false;
		}
	});

	// Wait for async tests
	await new Promise((resolve) => setTimeout(resolve, 500));

	// ===== PRINT RESULTS =====
	console.log(`\n${COLORS.bold}Test Results${COLORS.reset}`);
	console.log("=".repeat(60));

	let passed = 0;
	let failed = 0;

	for (const result of results) {
		if (result.passed) {
			passed++;
			console.log(`  ${COLORS.green}✅${COLORS.reset} ${result.name}`);
		} else {
			failed++;
			console.log(`  ${COLORS.red}❌${COLORS.reset} ${result.name}`);
			if (result.message) {
				console.log(`     ${COLORS.gray}${result.message}${COLORS.reset}`);
			}
		}
	}

	console.log("\n" + "=".repeat(60));
	console.log(
		`${COLORS.bold}Summary:${COLORS.reset} ${passed} passed, ${failed} failed, ${results.length} total`,
	);

	if (failed === 0) {
		console.log(`\n${COLORS.green}${COLORS.bold}✅ ALL TESTS PASSED${COLORS.reset}`);
		process.exit(0);
	} else {
		console.log(`\n${COLORS.red}${COLORS.bold}❌ SOME TESTS FAILED${COLORS.reset}`);
		process.exit(1);
	}
}

runTests().catch((e) => {
	console.error("Test suite failed:", e);
	process.exit(1);
});
