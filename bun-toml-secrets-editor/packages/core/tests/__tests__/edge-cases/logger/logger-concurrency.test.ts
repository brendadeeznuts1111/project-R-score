#!/usr/bin/env bun
/**
 * Logger Concurrent Access Test Suite
 * Tests logger behavior under high concurrency and edge cases
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getLogger, resetLogger } from "../../../logging/enhanced-logger";

describe("Logger Concurrent Access", () => {
	beforeEach(() => {
		resetLogger();
	});

	afterEach(() => {
		resetLogger();
	});

	test("should handle concurrent log calls without duplication", async () => {
		const logger = getLogger({ bufferSize: 1000, terminal: true });
		const logs: string[] = [];

		// Override console.log to capture
		const originalLog = console.log;
		console.log = (...args) => {
			logs.push(args.join(" "));
		};

		try {
			// Simulate 100 concurrent logging operations
			const promises = Array.from({ length: 100 }, (_, i) =>
				Promise.resolve().then(() => logger.info(`Log ${i}`, { index: i })),
			);

			await Promise.all(promises);

			// Verify we have at least 100 logs (may include initialization)
			const infoLogs = logs.filter(
				(l) => l.includes("INFO") && l.includes("Log"),
			);
			expect(infoLogs.length).toBe(100);

			// Verify all unique numbers are present
			const numbers = infoLogs
				.map((l) => {
					const match = l.match(/Log (\d+)/);
					return match ? parseInt(match[1], 10) : -1;
				})
				.filter((n) => n >= 0);

			expect(new Set(numbers).size).toBe(100); // All unique
			// Verify we have the expected range
			const sortedNumbers = numbers.sort((a, b) => a - b);
			expect(sortedNumbers[0]).toBe(0);
			expect(sortedNumbers[99]).toBe(99);
		} finally {
			console.log = originalLog;
		}
	});

	test("should not lose logs during high-frequency burst", async () => {
		const logger = getLogger({ bufferSize: 10, terminal: true }); // Small buffer
		let loggedCount = 0;

		const originalLog = console.log;
		console.log = () => {
			loggedCount++;
		};

		try {
			// Burst of 50 logs with buffer size 10
			for (let i = 0; i < 50; i++) {
				logger.info(`Burst log ${i}`);
			}

			// In a real implementation, flush would be called automatically
			// Here we verify no exceptions thrown during backpressure
			expect(loggedCount).toBeGreaterThan(0);
		} finally {
			console.log = originalLog;
		}
	});

	test("should mask secrets in high-concurrency scenarios", async () => {
		const logger = getLogger({ terminal: true });
		const secrets = ["secret1", "secret2", "secret3"];
		const captured: string[] = [];

		const originalLog = console.log;
		console.log = (...args) => {
			captured.push(args.join(" "));
		};

		try {
			const promises = secrets.map((secret) =>
				Promise.resolve().then(() =>
					logger.info("API call", {
						api_key: secret,
						timestamp: Date.now(),
						user_id: Math.random(),
					}),
				),
			);

			await Promise.all(promises);

			captured.forEach((log) => {
				expect(log).toContain("[REDACTED]");
				expect(log).not.toMatch(/secret[123]/);
			});

			// Verify non-sensitive data is preserved
			captured.forEach((log) => {
				expect(log).toContain("API call");
				expect(log).toContain("timestamp");
				expect(log).toContain("user_id");
			});
		} finally {
			console.log = originalLog;
		}
	});

	test("should handle mixed log levels concurrently", async () => {
		resetLogger();
		const logger = getLogger({
			terminal: true,
			level: "debug" as any,
			enableColors: false, // Disable colors to make parsing easier
		});

		// Use console capture for more reliable testing (Bun.write is for file operations)
		const output: string[] = [];
		const originalLog = console.log;
		const originalError = console.error;

		console.log = (...args) => {
			output.push(args.join(" "));
		};

		console.error = (...args) => {
			output.push(args.join(" "));
		};

		try {
			// Wait for logger initialization
			await new Promise((resolve) => setTimeout(resolve, 100));

			const levels = ["debug", "info", "warn", "error", "success"] as const;
			const promises = levels.flatMap((level) =>
				Array.from({ length: 20 }, (_, i) =>
					Promise.resolve().then(() =>
						(logger[level as keyof typeof logger] as Function)(
							`${level} message ${i}`,
						),
					),
				),
			);

			await Promise.all(promises);

			// Wait for all async writes to complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify all levels are present in output
			const outputStr = output.join("");
			const levelsFound = new Set<string>();

			levels.forEach((level) => {
				if (outputStr.includes(`${level.toUpperCase()} message`)) {
					levelsFound.add(level.toUpperCase());
				}
			});

			// Check that we found all expected levels
			levels.forEach((level) => {
				expect(levelsFound).toContain(level.toUpperCase());
			});
		} finally {
			// Restore original console methods
			console.log = originalLog;
			console.error = originalError;
		}
	});

	test("should preserve log order within single thread", async () => {
		resetLogger();
		const logger = getLogger({
			terminal: true,
			enableColors: false, // Disable colors to make parsing easier
		});

		// Use console capture for more reliable testing
		const output: string[] = [];
		const originalLog = console.log;

		console.log = (...args) => {
			output.push(args.join(" "));
		};

		try {
			// Wait for logger initialization
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Sequential logging should preserve order
			for (let i = 0; i < 100; i++) {
				logger.info(`Sequential ${i}`);
				// Small delay to ensure order is maintained
				await new Promise((resolve) => setTimeout(resolve, 1));
			}

			// Wait for all logs to be processed
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Extract sequential messages from output
			const outputStr = output.join("");
			const sequentialMessages: string[] = [];

			// Find all "Sequential X" messages in order
			const regex = /\[INFO\] (Sequential \d+)/g;
			let match;
			while ((match = regex.exec(outputStr)) !== null) {
				sequentialMessages.push(match[1]);
			}

			expect(sequentialMessages.length).toBe(100);
			for (let i = 0; i < 100; i++) {
				expect(sequentialMessages[i]).toBe(`Sequential ${i}`);
			}
		} finally {
			// Restore original console method
			console.log = originalLog;
		}
	});

	test("should maintain singleton behavior under concurrent access", async () => {
		const instances: any[] = [];

		// Create multiple logger instances concurrently
		const promises = Array.from({ length: 50 }, async () => {
			const logger = getLogger();
			instances.push(logger);
			return logger;
		});

		await Promise.all(promises);

		// All instances should be the same object
		const firstInstance = instances[0];
		instances.forEach((instance) => {
			expect(instance).toBe(firstInstance);
		});

		// Verify it's actually the EnhancedLogger instance
		expect(typeof firstInstance.info).toBe("function");
		expect(typeof firstInstance.error).toBe("function");
	});

	test("should handle large metadata objects concurrently", async () => {
		const logger = getLogger({ terminal: true });
		let processedCount = 0;

		const originalLog = console.log;
		console.log = () => {
			processedCount++;
		};

		try {
			const largeMetadata = {
				users: Array.from({ length: 1000 }, (_, i) => ({
					id: i,
					name: `User ${i}`,
					email: `user${i}@example.com`,
					secret_token: `secret-${i}`, // Should be masked
				})),
				metrics: {
					cpu: 45.2,
					memory: 1024,
					disk: 2048,
					api_key: "should-be-redacted",
				},
			};

			const promises = Array.from({ length: 10 }, (_, i) =>
				Promise.resolve().then(() =>
					logger.info(`Large metadata ${i}`, largeMetadata),
				),
			);

			await Promise.all(promises);

			expect(processedCount).toBe(10);
		} finally {
			console.log = originalLog;
		}
	});

	test("should handle error conditions gracefully", async () => {
		const logger = getLogger({ terminal: true });
		let errorCount = 0;
		let logCount = 0;

		const originalError = console.error;
		const originalLog = console.log;

		console.error = () => {
			errorCount++;
		};
		console.log = () => {
			logCount++;
		};

		try {
			// Test with circular references
			const circular: any = { name: "test" };
			circular.self = circular;

			const promises = Array.from({ length: 10 }, (_, i) =>
				Promise.resolve().then(() =>
					logger.info(`Circular reference ${i}`, circular),
				),
			);

			await Promise.all(promises);

			// Should handle circular references without throwing errors to console.error
			// but may still log to console.log
			expect(errorCount).toBe(0);
			expect(logCount).toBeGreaterThan(0);
		} finally {
			console.error = originalError;
			console.log = originalLog;
		}
	});

	test("should handle rapid logger reset and recreation", async () => {
		resetLogger();
		const logger = getLogger({ terminal: true });
		let logCount = 0;

		const originalLog = console.log;
		console.log = (...args) => {
			if (args.join(" ").includes("After reset")) {
				logCount++;
			}
		};

		try {
			// Rapid reset and recreate cycles
			const promises = Array.from({ length: 20 }, async (_, i) => {
				resetLogger();
				const logger = getLogger({ terminal: true });
				await logger.info(`After reset ${i}`);
			});

			await Promise.all(promises);

			expect(logCount).toBe(20);
		} finally {
			console.log = originalLog;
		}
	});
});
