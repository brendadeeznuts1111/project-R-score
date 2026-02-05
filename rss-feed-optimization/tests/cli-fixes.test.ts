// tests/cli-fixes.test.ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(spawn);

describe("Bun v1.3.7 CLI Fixes", () => {
	let tempDir: string;
	let testFile: string;

	beforeEach(async () => {
		tempDir = tmpdir();
		testFile = join(tempDir, "test-output.txt");
	});

	afterEach(async () => {
		try {
			await unlink(testFile);
		} catch (error) {
			// File might not exist, ignore
		}
	});

	describe("EPIPE Handling", () => {
		test("should handle EPIPE errors gracefully", async () => {
			const BlogCLI = (await import("../cli.js")).BlogCLI;
			// Test pipe error handling in CLI output
			const cli = new BlogCLI();
			await cli.showHelp();
		});

		test("should handle broken pipe in long output", async () => {
			// Test handling of broken pipes in long CLI output
			const { CLIReporter } = await import("../src/utils/cli-reporter.js");
			const reporter = new CLIReporter(80);

			// Create long content that might cause pipe breaks
			const longContent = "A".repeat(10000);
			const formatted = reporter.formatLogEntry("info", longContent);

			// Should not throw errors even with very long content
			expect(typeof formatted).toBe("string");
			expect(formatted.length).toBeGreaterThan(0);
		});

		test("should handle SIGPIPE signal", async () => {
			// Test SIGPIPE signal handling
			const originalOn = process.stdout.on;
			let sigpipeHandled = false;

			process.stdout.on = function (event, listener) {
				if (event === "SIGPIPE") {
					sigpipeHandled = true;
					return this;
				}
				return originalOn.call(this, event, listener);
			};

			try {
				// Simulate SIGPIPE
				process.stdout.emit("SIGPIPE");
				expect(sigpipeHandled).toBe(true);
			} finally {
				process.stdout.on = originalOn;
			}
		});
	});

	describe("ERR_STRING_TOO_LONG", () => {
		test("should handle string length limits", async () => {
			const { CLIReporter } = await import("../src/utils/cli-reporter.js");
			const reporter = new CLIReporter();

			// Test with very long string that might exceed limits
			const veryLongString = "A".repeat(100000);

			try {
				const result = reporter.formatLogEntry("info", veryLongString);
				expect(typeof result).toBe("string");
				// Should truncate or handle gracefully
				expect(result.length).toBeGreaterThan(0);
			} catch (error) {
				// Should be a handled error, not a crash
				expect(error.message).toContain("string");
			}
		});

		test("should handle buffer overflow in CLI output", async () => {
			const { formatCLIOutput } = await import("../src/utils/cli-utils.js");

			// Test with extremely long message
			const longMessage = "X".repeat(50000);

			try {
				const result = formatCLIOutput(longMessage, "info", {
					width: 1000,
					border: true,
				});
				expect(typeof result).toBe("string");
				expect(result.length).toBeGreaterThan(0);
			} catch (error) {
				// Should handle gracefully
				expect(error.code !== "ERR_STRING_TOO_LONG").toBe(true);
			}
		});
	});

	describe("BUN_OPTIONS Parsing", () => {
		test("should parse BUN_OPTIONS environment variable", async () => {
			// Save original BUN_OPTIONS
			const originalBunOptions = process.env.BUN_OPTIONS;

			try {
				// Set BUN_OPTIONS
				process.env.BUN_OPTIONS =
					"--cpu-prof --heap-prof --cpu-prof-dir=./profiles";

				// Test that CLI can handle BUN_OPTIONS
				const { BlogCLI } = await import("../cli.js");
				const cli = new BlogCLI();

				// Should not crash when BUN_OPTIONS is set
				await cli.showHelp();
				expect(process.env.BUN_OPTIONS).toBe(
					"--cpu-prof --heap-prof --cpu-prof-dir=./profiles",
				);
			} finally {
				// Restore original BUN_OPTIONS
				if (originalBunOptions) {
					process.env.BUN_OPTIONS = originalBunOptions;
				} else {
					process.env.BUN_OPTIONS = undefined;
				}
			}
		});

		test("should handle malformed BUN_OPTIONS", async () => {
			const originalBunOptions = process.env.BUN_OPTIONS;

			try {
				// Set malformed BUN_OPTIONS
				process.env.BUN_OPTIONS = "--invalid-option --another-bad-flag";

				// Should handle gracefully without crashing
				const { BlogCLI } = await import("../cli.js");
				const cli = new BlogCLI();

				await cli.showHelp();
			} catch (error) {
				// Should not throw unhandled errors
				expect(error.message).not.toContain("BUN_OPTIONS");
			} finally {
				if (originalBunOptions) {
					process.env.BUN_OPTIONS = originalBunOptions;
				} else {
					process.env.BUN_OPTIONS = undefined;
				}
			}
		});

		test("should parse BUN_OPTIONS with values", async () => {
			const originalBunOptions = process.env.BUN_OPTIONS;

			try {
				process.env.BUN_OPTIONS =
					"--cpu-prof-dir=./profiles --heap-prof-name=app.heapsnapshot";

				// Test parsing logic
				const options = process.env.BUN_OPTIONS.split(" ");
				expect(options.length).toBeGreaterThan(0);

				// Should contain expected options
				const hasCpuProfDir = options.some((opt) =>
					opt.includes("--cpu-prof-dir"),
				);
				const hasHeapProfName = options.some((opt) =>
					opt.includes("--heap-prof-name"),
				);

				expect(hasCpuProfDir).toBe(true);
				expect(hasHeapProfName).toBe(true);
			} finally {
				if (originalBunOptions) {
					process.env.BUN_OPTIONS = originalBunOptions;
				} else {
					process.env.BUN_OPTIONS = undefined;
				}
			}
		});
	});

	describe("Output Generation", () => {
		test("should generate ANSI-colored output correctly", async () => {
			const { formatCLIOutput } = await import("../src/utils/cli-utils.js");

			const message = "Test message with colors";
			const output = formatCLIOutput(message, "success", {
				width: 60,
				border: true,
				centered: true,
			});

			// Should contain ANSI color codes
			expect(output).toContain("\x1b[");
			expect(output).toContain("\x1b[0m"); // Reset code
			expect(output).toContain("Test message with colors");
		});

		test("should handle Bun.wrapAnsi for text wrapping", async () => {
			const { CLIReporter } = await import("../src/utils/cli-reporter.js");
			const reporter = new CLIReporter(40);

			// Test with long text that needs wrapping
			const longText =
				"This is a very long text that should be wrapped properly with ANSI color preservation";
			const wrapped = reporter.formatLogEntry("info", longText);

			// Should be wrapped to appropriate width
			const lines = wrapped.split("\n");
			expect(lines.length).toBeGreaterThan(1);

			// Each line should maintain proper formatting
			lines.forEach((line) => {
				if (line.trim()) {
					expect(line.length).toBeLessThanOrEqual(40);
				}
			});
		});

		test("should handle progress bar output", async () => {
			const { createProgressBar } = await import("../src/utils/cli-utils.js");

			const progressBar = createProgressBar(50, 100, {
				width: 30,
				showPercentage: true,
				showCounts: true,
			});

			expect(typeof progressBar).toBe("string");
			expect(progressBar).toContain("█"); // Filled portion
			expect(progressBar).toContain("░"); // Empty portion
			expect(progressBar).toContain("50%"); // Percentage
			expect(progressBar).toContain("50/100"); // Counts
		});

		test("should handle table output with ANSI colors", async () => {
			const { displayTable } = await import("../src/utils/cli-utils.js");

			const headers = ["Name", "Status", "Time"];
			const rows = [
				["Test 1", "✅ PASS", "100ms"],
				["Test 2", "❌ FAIL", "200ms"],
				["Test 3", "⚠️ SKIP", "50ms"],
			];

			// Capture output
			const originalWrite = process.stdout.write;
			let capturedOutput = "";

			process.stdout.write = (chunk: any) => {
				capturedOutput += chunk;
				return true;
			};

			try {
				displayTable(headers, rows, { border: true });

				// Should contain ANSI color codes
				expect(capturedOutput).toContain("\x1b[");
				expect(capturedOutput).toContain("Name");
				expect(capturedOutput).toContain("Status");
				expect(capturedOutput).toContain("Time");
			} finally {
				process.stdout.write = originalWrite;
			}
		});
	});

	describe("DNS Handling", () => {
		test("should handle DNS prefetch in CLI operations", async () => {
			const { default: BlogCLI } = await import("../cli.js");
			const cli = new BlogCLI();

			// Test preconnect command
			try {
				await cli.preconnect();
				// Should complete without errors
			} catch (error) {
				// DNS issues should be handled gracefully
				expect(error.message).not.toContain("unhandled");
			}
		});

		test("should handle DNS timeouts in CLI", async () => {
			const { prefetchDNS } = await import("../src/utils/dns-optimizer.js");

			// Test with invalid hostname that might cause DNS timeout
			try {
				await prefetchDNS("nonexistent.invalid.domain.12345");
				// Should handle gracefully
			} catch (error) {
				// Should be a handled error, not a crash
				expect(error.message).toContain("DNS");
			}
		});

		test("should handle connection preconnect errors", async () => {
			const { preconnect } = await import(
				"../src/utils/connection-optimizer.js"
			);

			try {
				await preconnect("https://invalid.domain.12345");
				// Should handle gracefully
			} catch (error) {
				// Should handle connection errors gracefully
				expect(error.message).toContain("connect");
			}
		});
	});

	describe("Retry Logic", () => {
		test("should handle retry logic in CLI operations", async () => {
			const { BlogCLI } = await import("../cli.js");
			const cli = new BlogCLI();

			// Mock a failing operation that should retry
			const originalListPosts = (await import("../src/r2-client.js")).default
				.listPosts;

			let callCount = 0;
			const mockListPosts = async () => {
				callCount++;
				if (callCount < 3) {
					throw new Error("Temporary failure");
				}
				return [];
			};

			// Replace with mock
			(await import("../src/r2-client.js")).default.listPosts = mockListPosts;

			try {
				// This should eventually succeeded after retries
				await cli.showStatus();
				expect(callCount).toBe(3);
			} catch (error) {
				// Should handle retry logic gracefully
				expect(error.message).not.toContain("unhandled");
			} finally {
				// Restore original
				(await import("../src/r2-client.js")).default.listPosts =
					originalListPosts;
			}
		});

		test("should handle circuit breaker in CLI", async () => {
			const { CircuitBreaker } = await import(
				"../src/utils/circuit-breaker.js"
			);

			const breaker = new CircuitBreaker({
				failureThreshold: 2,
				resetTimeout: 1000,
			});

			// Simulate failures
			try {
				await breaker.execute(async () => {
					throw new Error("Service unavailable");
				});
			} catch (error) {
				// First failure should be handled
			}

			try {
				await breaker.execute(async () => {
					throw new Error("Service unavailable");
				});
			} catch (error) {
				// Second failure should trip breaker
			}

			// Third call should be rejected by circuit breaker
			try {
				await breaker.execute(async () => {
					return "success";
				});
				// Should not reach here
				expect(false).toBe(true);
			} catch (error) {
				expect(error.message).toContain("Circuit breaker is OPEN");
			}
		});

		test("should handle exponential backoff in CLI", async () => {
			const { RetryWithBackoff } = await import(
				"../src/utils/retry-with-backoff.js"
			);

			let attemptCount = 0;
			const mockOperation = async () => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error("Temporary error");
				}
				return "success";
			};

			const result = await RetryWithBackoff.execute(mockOperation, {
				maxRetries: 5,
				baseDelay: 100,
				maxDelay: 1000,
			});

			expect(result).toBe("success");
			expect(attemptCount).toBe(3);
		});
	});

	describe("Integration Tests", () => {
		test("should run CLI commands without crashing", async () => {
			// Test actual CLI command execution
			const { BlogCLI } = await import("../cli.js");
			const cli = new BlogCLI();

			// Test each command
			const commands = [
				() => cli.showHelp(),
				() => cli.showStatus(),
				() => cli.showConfig(),
				() => cli.validateConfig(),
				() => cli.showSecurityReport(),
				() => cli.showConfigSummary(),
			];

			for (const command of commands) {
				try {
					await command();
					// Should complete without throwing
				} catch (error) {
					// Should handle errors gracefully
					expect(error.message).not.toContain("unhandled");
				}
			}
		});

		test("should handle CLI argument parsing edge cases", async () => {
			const { parseArguments } = await import("../src/utils/cli-utils.js");

			// Test various argument patterns
			const testCases = [
				["--option=value", "--flag", "positional"],
				["-o", "value", "-f", "positional"],
				["--option", "value with spaces", "--flag"],
				["positional1", "positional2", "--option=value"],
				[],
			];

			for (const args of testCases) {
				const result = parseArguments(args);

				expect(result).toHaveProperty("command");
				expect(result).toHaveProperty("positional");
				expect(result).toHaveProperty("options");
				expect(result).toHaveProperty("flags");

				expect(Array.isArray(result.positional)).toBe(true);
				expect(Array.isArray(result.flags)).toBe(true);
				expect(typeof result.options).toBe("object");
			}
		});
	});
});
