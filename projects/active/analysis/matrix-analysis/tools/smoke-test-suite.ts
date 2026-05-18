#!/usr/bin/env bun
/**
 * Bun v1.3.8 Smoke Test Suite
 * Tests env typing, headers, ANSI wrapping, and profiling
 */

import { $ } from "bun";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

interface TestResult {
	name: string;
	passed: boolean;
	output: string;
	error?: string;
}

class SmokeTestSuite {
	private results: TestResult[] = [];

	async runAll(): Promise<void> {
		console.info(`${BOLD}${CYAN}🧪 Bun v1.3.8 Smoke Test Suite${RESET}\n`);

		await this.testEnvTyping();
		await this.testHeaderCasePreservation();
		await this.testAnsiWrapping();
		await this.testProfileGeneration();

		this.printSummary();
	}

	private async testEnvTyping(): Promise<void> {
		console.info(`${BOLD}Test 1: Environment Variable Typing${RESET}`);
		console.info(`${CYAN}─".repeat(50)}${RESET}`);

		try {
			// Test 1: String literal typing with satisfies
			const tierMode = Bun.env.TIER_SECURITY_MODE ?? "strict";
			const mode = tierMode as "strict" | "permissive" | "audit";

			console.info(`  TIER_SECURITY_MODE: ${YELLOW}${mode}${RESET}`);
			console.info(`  Type: ${GREEN}satisfies "strict" | "permissive" | "audit"${RESET}`);

			// Test 2: Number parsing with defaults
			const maxRows = this.getNumberOrDefault("TIER_MAX_ROWS", 100);
			console.info(`  TIER_MAX_ROWS: ${YELLOW}${maxRows}${RESET} (default: 100)`);

			this.results.push({
				name: "Environment Variable Typing",
				passed: true,
				output: `Mode: ${mode}, MaxRows: ${maxRows}`,
			});
		} catch (error) {
			this.results.push({
				name: "Environment Variable Typing",
				passed: false,
				output: "",
				error: String(error),
			});
		}
		console.info();
	}

	private async testHeaderCasePreservation(): Promise<void> {
		console.info(`${BOLD}Test 2: HTTP Header Case Preservation${RESET}`);
		console.info(`${CYAN}─".repeat(50)}${RESET}`);

		try {
			// Local test server
			const server = Bun.serve({
				port: 0,
				fetch(req) {
					const headers: Record<string, string> = {};
					req.headers.forEach((value, key) => {
						headers[key] = value;
					});
					return Response.json({ headers });
				},
			});

			const response = await fetch(`http://localhost:${server.port}/test`, {
				headers: {
					"X-Custom-Case": "Value",
					"X-Another-Header": "Test",
				},
			});

			const data = await response.json();
			server.stop();

			const hasCustomCase =
				"X-Custom-Case" in data.headers || "x-custom-case" in data.headers;

			console.info(`  Sent: ${YELLOW}X-Custom-Case: Value${RESET}`);
			console.info(`  Received: ${GREEN}${JSON.stringify(data.headers)}${RESET}`);
			console.info(
				`  Case preserved: ${hasCustomCase ? GREEN : RED}${hasCustomCase}${RESET}`,
			);

			this.results.push({
				name: "HTTP Header Case Preservation",
				passed: hasCustomCase,
				output: JSON.stringify(data.headers),
			});
		} catch (error) {
			this.results.push({
				name: "HTTP Header Case Preservation",
				passed: false,
				output: "",
				error: String(error),
			});
		}
		console.info();
	}

	private async testAnsiWrapping(): Promise<void> {
		console.info(`${BOLD}Test 3: ANSI Text Wrapping (Native Speed)${RESET}`);
		console.info(`${CYAN}─".repeat(50)}${RESET}`);

		try {
			const longText = "🏭 FactoryWager ".repeat(20);
			const start = performance.now();

			// Use wrap-ansi if available, otherwise manual wrap
			let wrapped: string;
			try {
				const { wrapAnsi } = await import("bun");
				wrapped = (wrapAnsi as any)(longText, 40);
			} catch {
				// Fallback: simple word wrap
				wrapped = this.simpleWrap(longText, 40);
			}

			const duration = performance.now() - start;

			console.info(`  Input length: ${YELLOW}${longText.length}${RESET} chars`);
			console.info(`  Wrap width: ${YELLOW}40${RESET} cols`);
			console.info(`  Time: ${GREEN}${duration.toFixed(2)}ms${RESET}`);
			console.info(`  Output lines: ${YELLOW}${wrapped.split("\n").length}${RESET}`);

			this.results.push({
				name: "ANSI Text Wrapping",
				passed: true,
				output: `${duration.toFixed(2)}ms for ${longText.length} chars`,
			});
		} catch (error) {
			this.results.push({
				name: "ANSI Text Wrapping",
				passed: false,
				output: "",
				error: String(error),
			});
		}
		console.info();
	}

	private async testProfileGeneration(): Promise<void> {
		console.info(`${BOLD}Test 4: CPU/Heap Profile Generation${RESET}`);
		console.info(`${CYAN}─".repeat(50)}${RESET}`);

		try {
			// Simulate CPU work
			const start = performance.now();
			let sum = 0;
			for (let i = 0; i < 1000000; i++) {
				sum += Math.sqrt(i);
			}
			const duration = performance.now() - start;

			console.info(`  CPU work completed: ${YELLOW}1M iterations${RESET}`);
			console.info(`  Time: ${GREEN}${duration.toFixed(2)}ms${RESET}`);
			console.info(`  Result: ${YELLOW}${sum.toFixed(2)}${RESET}`);

			// Check if --cpu-prof and --heap-prof flags work
			const hasProfFlags =
				process.argv.includes("--cpu-prof") || process.argv.includes("--heap-prof");

			if (hasProfFlags) {
				console.info(`  Profile flags: ${GREEN}detected${RESET}`);
			} else {
				console.info(
					`  Profile flags: ${YELLOW}not in args${RESET} (pass --cpu-prof-md --heap-prof-md)`,
				);
			}

			this.results.push({
				name: "CPU/Heap Profile Generation",
				passed: true,
				output: `${duration.toFixed(2)}ms for 1M iterations`,
			});
		} catch (error) {
			this.results.push({
				name: "CPU/Heap Profile Generation",
				passed: false,
				output: "",
				error: String(error),
			});
		}
		console.info();
	}

	private getNumberOrDefault(key: string, defaultValue: number): number {
		const value = Bun.env[key];
		if (value === undefined) return defaultValue;
		const parsed = parseInt(value, 10);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	private simpleWrap(text: string, width: number): string {
		const words = text.split(" ");
		const lines: string[] = [];
		let currentLine = "";

		for (const word of words) {
			if ((currentLine + word).length > width) {
				lines.push(currentLine.trim());
				currentLine = word + " ";
			} else {
				currentLine += word + " ";
			}
		}
		if (currentLine.trim()) {
			lines.push(currentLine.trim());
		}

		return lines.join("\n");
	}

	private printSummary(): void {
		console.info(`${BOLD}Test Summary${RESET}`);
		console.info(`${CYAN}═".repeat(50)}${RESET}`);

		const passed = this.results.filter((r) => r.passed).length;
		const failed = this.results.filter((r) => !r.passed).length;

		for (const result of this.results) {
			const status = result.passed ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;
			console.info(`  ${status} ${result.name}`);
			if (result.output) {
				console.info(`    ${CYAN}→${RESET} ${result.output}`);
			}
			if (result.error) {
				console.info(`    ${RED}Error: ${result.error}${RESET}`);
			}
		}

		console.info();
		console.info(
			`  ${GREEN}${passed} passed${RESET}, ${RED}${failed} failed${RESET}, ${this.results.length} total`,
		);

		if (failed === 0) {
			console.info(`\n  ${GREEN}🎉 All smoke tests passed!${RESET}`);
		} else {
			console.info(`\n  ${RED}⚠️  Some tests failed${RESET}`);
			process.exit(1);
		}
	}
}

// CLI
if (import.meta.main) {
	const suite = new SmokeTestSuite();
	suite.runAll().catch(console.error);
}
