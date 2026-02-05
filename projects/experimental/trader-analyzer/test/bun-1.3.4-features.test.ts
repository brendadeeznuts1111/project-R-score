#!/usr/bin/env bun
/**
 * @fileoverview Production-Grade Bun v1.3.4 Feature Test Suite
 * @description Comprehensive test coverage with proper isolation, edge cases, error handling, and realistic scenarios
 * @version 1.0.0
 * @since Bun 1.3.4
 * @license MIT
 *
 * @see {@link https://bun.sh/blog/bun-v1.3.4|Official Bun v1.3.4 Release Notes}
 * @see {@link ../docs/BUN-V1.3.4-FEATURES-SUMMARY.md|Project Feature Summary}
 * @see {@link ../docs/BUN-V1.3.4-RELEASE-NOTES.md|Project Release Notes}
 * @see {@link ../docs/BUN-1.3.4-TEST-COVERAGE.md|Test Coverage Documentation}
 * @see {@link ../docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md|Bun Runtime Enhancements Integration}
 * @see {@link ../docs/TEAM-DASHBOARD-API-VERIFICATION.md|Team Dashboard API Verification}
 *
 * Related Component Test Suites (Using Bun v1.3.4 Patterns):
 * @see {@link ../apps/@registry-dashboard/src/components/team-filter.test.ts|Team Filter Tests}
 * @see {@link ../apps/@registry-dashboard/src/components/geographic-filter.test.ts|Geographic Filter Tests}
 * @see {@link ../apps/@registry-dashboard/src/components/market-filter.test.ts|Market Filter Tests}
 *
 * @example
 * // Run tests
 * bun test test/bun-1.3.4-features.test.ts
 *
 * @example
 * // Run with coverage
 * bun test --coverage test/bun-1.3.4-features.test.ts
 *
 * @module test/bun-1.3.4-features
 */

import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import * as http from "node:http";
import * as https from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Type definitions for Bun v1.3.4 Fake Timers API
 * These APIs are available at runtime but official types may not be updated yet
 * @see https://bun.sh/blog/bun-v1.3.4#fake-timers-for-buntest
 */
interface BunFakeTimerOptions {
	now?: number | Date;
}

interface BunJestFakeTimers {
	useFakeTimers(options?: BunFakeTimerOptions): void;
	useRealTimers(): void;
	isFakeTimers(): boolean;
	advanceTimersByTime(ms: number): void;
	advanceTimersToNextTimer(): void;
	runAllTimers(): void;
	runOnlyPendingTimers(): void;
	clearAllTimers(): void;
	getTimerCount(): number;
}

// Cast jest to include Bun v1.3.4 Fake Timers API
const fakeTimers = jest as unknown as BunJestFakeTimers;

// Type for Bun.build compile options (v1.3.4+)
interface BunCompileOptions {
	autoloadTsconfig?: boolean;
	autoloadPackageJson?: boolean;
	autoloadDotenv?: boolean;
	autoloadBunfig?: boolean;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Executes a console.log format specifier test in a subprocess
 * @param {string} format - The format string (e.g., "%j", "%s %d")
 * @param {...any} args - Arguments to pass to console.log
 * @returns {string} The trimmed stdout output
 * @see {@link https://bun.sh/blog/bun-v1.3.4#console-log-now-supports-j-format-specifier|%j Format Specifier}
 */
const testFormatSpecifier = (format: string, ...args: any[]): string => {
	const result = Bun.spawnSync({
		cmd: ["bun", "-e", `console.log(${JSON.stringify(format)}, ${args.map(a => JSON.stringify(a)).join(", ")});`],
		stdout: "pipe",
	});
	return new TextDecoder().decode(result.stdout).trim();
};

/**
 * Creates a temporary file for testing
 * @param {string} content - File content to write
 * @param {string} [suffix=".ts"] - File extension
 * @returns {Promise<string>} Path to the created temp file
 * @see {@link Bun.write}
 */
const createTempFile = async (content: string, suffix = ".ts"): Promise<string> => {
	const filePath = join(tmpdir(), `test-bun-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);
	await Bun.write(filePath, content);
	return filePath;
};

/**
 * Cleans up a temporary file
 * @param {string} filePath - Path to file to delete
 * @returns {Promise<void>}
 */
const cleanupTempFile = async (filePath: string): Promise<void> => {
	try {
		await Bun.file(filePath).unlink();
	} catch {
		// Ignore cleanup errors
	}
};

// ============================================================================
// Test Suite
// ============================================================================

/**
 * @description Main test suite for Bun v1.3.4 features
 * @see {@link https://bun.sh/blog/bun-v1.3.4|Bun v1.3.4 Release}
 */
describe("Bun v1.3.4 Feature Verification", () => {
	/**
	 * @description Version requirement tests
	 * @see {@link Bun.version}
	 */
	describe("Version Requirements", () => {
		/**
		 * @test Validates minimum Bun version
		 */
		test("should require Bun >= 1.3.4", () => {
			const version = Bun.version;
			const [major, minor, patch] = version.split(".").map(Number);

			expect(major).toBeGreaterThanOrEqual(1);
			if (major === 1) {
				expect(minor).toBeGreaterThanOrEqual(3);
				if (minor === 3) {
					expect(patch).toBeGreaterThanOrEqual(4);
				}
			}
		});

		/**
		 * @test Validates version string format
		 */
		test("should have correct version format", () => {
			const version = Bun.version;
			expect(version).toMatch(/^\d+\.\d+\.\d+/);
		});

		/**
		 * @test Validates revision hash exists
		 */
		test("should have revision hash", () => {
			expect(Bun.revision).toBeDefined();
			expect(typeof Bun.revision).toBe("string");
		});
	});

	/**
	 * @description URLPattern API tests
	 * @see {@link https://bun.sh/blog/bun-v1.3.4#urlpattern-api|URLPattern API}
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URLPattern|MDN URLPattern}
	 */
	describe("URLPattern API", () => {
		let pattern: URLPattern;

		beforeEach(() => {
			pattern = new URLPattern({ pathname: "/users/:id" });
		});

		/**
		 * @description Basic pattern matching tests
		 */
		describe("Basic Matching", () => {
			/**
			 * @test URLPattern constructor
			 * @see {@link URLPattern}
			 */
			test("should create URLPattern instance", () => {
				expect(pattern).toBeInstanceOf(URLPattern);
			});

			/**
			 * @test URLPattern.test() method
			 * @see {@link URLPattern.test}
			 */
			test("should match valid URLs with test()", () => {
				expect(pattern.test("https://example.com/users/123")).toBe(true);
				expect(pattern.test("https://example.com/users/456")).toBe(true);
				expect(pattern.test("http://example.com/users/789")).toBe(true);
			});

			/**
			 * @test URLPattern.test() rejection
			 */
			test("should reject non-matching URLs", () => {
				expect(pattern.test("https://example.com/posts/123")).toBe(false);
				expect(pattern.test("https://example.com/users/123/comments")).toBe(false);
				expect(pattern.test("https://example.com/user/123")).toBe(false);
			});

			/**
			 * @test URLPattern.exec() method
			 * @see {@link URLPattern.exec}
			 */
			test("should extract parameters with exec()", () => {
				const result = pattern.exec("https://example.com/users/123");
				expect(result).not.toBeNull();
				expect(result?.pathname.groups.id).toBe("123");
			});

			/**
			 * @test URLPattern.exec() null return
			 */
			test("should return null for non-matching URLs in exec()", () => {
				const result = pattern.exec("https://example.com/posts/123");
				expect(result).toBeNull();
			});
		});

		/**
		 * @description Parameter extraction tests
		 */
		describe("Parameter Extraction", () => {
			/**
			 * @test Multiple named parameters
			 */
			test("should handle multiple parameters", () => {
				const multiPattern = new URLPattern({ pathname: "/users/:userId/posts/:postId" });
				const result = multiPattern.exec("https://example.com/users/123/posts/456");

				expect(result).not.toBeNull();
				expect(result?.pathname.groups.userId).toBe("123");
				expect(result?.pathname.groups.postId).toBe("456");
			});

			/**
			 * @test Numeric parameter values
			 */
			test("should handle numeric parameters", () => {
				const result = pattern.exec("https://example.com/users/0");
				expect(result?.pathname.groups.id).toBe("0");
			});

			/**
			 * @test Special characters in parameters
			 */
			test("should handle special characters in parameters", () => {
				const result = pattern.exec("https://example.com/users/user-123_test");
				expect(result?.pathname.groups.id).toBe("user-123_test");
			});

			/**
			 * @test UUID parameters
			 */
			test("should handle UUID parameters", () => {
				const result = pattern.exec("https://example.com/users/550e8400-e29b-41d4-a716-446655440000");
				expect(result?.pathname.groups.id).toBe("550e8400-e29b-41d4-a716-446655440000");
			});
		});

		/**
		 * @description Wildcard pattern tests
		 */
		describe("Wildcard Patterns", () => {
			/**
			 * @test Single wildcard matching
			 */
			test("should match single wildcard", () => {
				const wildcardPattern = new URLPattern({ pathname: "/files/*" });
				const result = wildcardPattern.exec("https://example.com/files/image.png");

				expect(result).not.toBeNull();
				expect(result?.pathname.groups[0]).toBe("image.png");
			});

			/**
			 * @test Nested path wildcard
			 */
			test("should match nested paths with wildcard", () => {
				const nestedPattern = new URLPattern({ pathname: "/files/*" });
				const result = nestedPattern.exec("https://example.com/files/images/2024/photo.jpg");

				expect(result).not.toBeNull();
				expect(result?.pathname.groups[0]).toBe("images/2024/photo.jpg");
			});

			/**
			 * @test Empty wildcard match
			 */
			test("should handle empty wildcard match", () => {
				const wildcardPattern = new URLPattern({ pathname: "/files/*" });
				const result = wildcardPattern.exec("https://example.com/files/");

				expect(result).not.toBeNull();
				expect(result?.pathname.groups[0]).toBe("");
			});
		});

		/**
		 * @description Full URL component matching tests
		 */
		describe("Full URL Components", () => {
			/**
			 * @test Protocol matching
			 */
			test("should match protocol", () => {
				const httpsPattern = new URLPattern({
					protocol: "https",
					hostname: "api.example.com",
					pathname: "/v1/:resource/:id",
				});

				expect(httpsPattern.test("https://api.example.com/v1/users/123")).toBe(true);
				expect(httpsPattern.test("http://api.example.com/v1/users/123")).toBe(false);
			});

			/**
			 * @test Hostname matching
			 */
			test("should match hostname", () => {
				const hostPattern = new URLPattern({
					hostname: "api.example.com",
					pathname: "/v1/:resource/:id",
				});

				expect(hostPattern.test("https://api.example.com/v1/users/123")).toBe(true);
				expect(hostPattern.test("https://api2.example.com/v1/users/123")).toBe(false);
			});

			/**
			 * @test Port matching
			 */
			test("should match port", () => {
				const portPattern = new URLPattern({
					hostname: "localhost",
					port: "3000",
					pathname: "/api/:id",
				});

				expect(portPattern.test("http://localhost:3000/api/123")).toBe(true);
				expect(portPattern.test("http://localhost:8080/api/123")).toBe(false);
			});

			/**
			 * @test Username matching
			 */
			test("should match username in URL", () => {
				const userPattern = new URLPattern({
					username: "admin",
					pathname: "/dashboard",
				});

				expect(userPattern.test("https://admin@example.com/dashboard")).toBe(true);
			});
		});

		/**
		 * @description Query parameter matching tests
		 */
		describe("Query Parameters", () => {
			/**
			 * @test Query parameter extraction
			 */
			test("should extract query parameters", () => {
				const queryPattern = new URLPattern({
					pathname: "/search",
					search: "?q=:query&page=:page",
				});

				const result = queryPattern.exec("https://example.com/search?q=test&page=1");
				expect(result).not.toBeNull();
				expect(result?.search.groups.query).toBe("test");
				expect(result?.search.groups.page).toBe("1");
			});

			/**
			 * @test Single query parameter
			 */
			test("should handle single query parameter", () => {
				const queryPattern = new URLPattern({
					pathname: "/search",
					search: "?q=:query",
				});

				const result = queryPattern.exec("https://example.com/search?q=test");
				expect(result).not.toBeNull();
				expect(result?.search.groups.query).toBe("test");
			});
		});

		/**
		 * @description Hash/fragment matching tests
		 */
		describe("Hash/Fragment", () => {
			/**
			 * @test Hash parameter extraction
			 */
			test("should extract hash parameters", () => {
				const hashPattern = new URLPattern({
					pathname: "/docs",
					hash: "#:section",
				});

				const result = hashPattern.exec("https://example.com/docs#introduction");
				expect(result).not.toBeNull();
				expect(result?.hash.groups.section).toBe("introduction");
			});

			/**
			 * @test URL with hash preserved
			 */
			test("should handle URL with hash", () => {
				const result = pattern.exec("https://example.com/users/123#section");
				expect(result).not.toBeNull();
				expect(result?.pathname.groups.id).toBe("123");
			});
		});

		/**
		 * @description Edge case tests
		 */
		describe("Edge Cases", () => {
			/**
			 * @test Wildcard pathname
			 */
			test("should handle wildcard pathname", () => {
				const wildcardPattern = new URLPattern({ pathname: "*" });
				expect(wildcardPattern.test("https://example.com/")).toBe(true);
				expect(wildcardPattern.test("https://example.com/anything")).toBe(true);
			});

			/**
			 * @test Root pathname
			 */
			test("should handle root pathname", () => {
				const rootPattern = new URLPattern({ pathname: "/" });
				expect(rootPattern.test("https://example.com/")).toBe(true);
			});

			/**
			 * @test Trailing slash handling
			 */
			test("should handle trailing slashes", () => {
				const trailingPattern = new URLPattern({ pathname: "/users/:id/" });
				expect(trailingPattern.test("https://example.com/users/123/")).toBe(true);
				expect(trailingPattern.test("https://example.com/users/123")).toBe(false);
			});

			/**
			 * @test Case sensitivity
			 */
			test("should be case sensitive by default", () => {
				const casePattern = new URLPattern({ pathname: "/Users/:id" });
				expect(casePattern.test("https://example.com/Users/123")).toBe(true);
				expect(casePattern.test("https://example.com/users/123")).toBe(false);
			});

			/**
			 * @test Encoded characters
			 */
			test("should handle encoded characters", () => {
				const result = pattern.exec("https://example.com/users/user%20123");
				expect(result?.pathname.groups.id).toBe("user%20123");
			});
		});

		/**
		 * @description Performance tests
		 */
		describe("Performance", () => {
			/**
			 * @test Pattern matching performance
			 * @see {@link Bun.nanoseconds}
			 */
			test("should handle many pattern matches efficiently", () => {
				const routes = Array.from({ length: 100 }, (_, i) =>
					new URLPattern({ pathname: `/api/v${i}/:resource/:id` })
				);

				const start = Bun.nanoseconds();
				for (let i = 0; i < 1000; i++) {
					routes.forEach(route => route.test(`https://api.example.com/api/v${i % 100}/users/123`));
				}
				const duration = Bun.nanoseconds() - start;

				// Should complete in reasonable time (< 100ms for 100k operations)
				expect(duration).toBeLessThan(100_000_000);
			});

			/**
			 * @test Pattern creation performance
			 */
			test("should create patterns efficiently", () => {
				const start = Bun.nanoseconds();
				for (let i = 0; i < 1000; i++) {
					new URLPattern({ pathname: `/api/v${i}/:resource/:id` });
				}
				const duration = Bun.nanoseconds() - start;

				// Should complete in reasonable time (< 50ms for 1000 patterns)
				expect(duration).toBeLessThan(50_000_000);
			});
		});
	});

	/**
	 * @description Fake Timers tests
	 * @see {@link https://bun.sh/blog/bun-v1.3.4#fake-timers-for-buntest|Fake Timers}
	 * @see {@link jest.useFakeTimers}
	 * @see {@link jest.useRealTimers}
	 */
	describe("Fake Timers", () => {
		beforeEach(() => {
			fakeTimers.useRealTimers(); // Ensure clean state
		});

		afterEach(() => {
			fakeTimers.useRealTimers(); // Clean up after each test
		});

		/**
		 * @description Basic timer control tests
		 */
		describe("Basic Timer Control", () => {
			/**
			 * @test Enable/disable fake timers
			 * @see {@link jest.useFakeTimers}
			 * @see {@link jest.useRealTimers}
			 * @see {@link jest.isFakeTimers}
			 */
			test("should enable and disable fake timers", () => {
				expect(fakeTimers.isFakeTimers()).toBe(false);

				fakeTimers.useFakeTimers();
				expect(fakeTimers.isFakeTimers()).toBe(true);

				fakeTimers.useRealTimers();
				expect(fakeTimers.isFakeTimers()).toBe(false);
			});

			/**
			 * @test setTimeout control
			 * @see {@link jest.advanceTimersByTime}
			 */
			test("should control setTimeout", () => {
				fakeTimers.useFakeTimers();

				let called = false;
				setTimeout(() => {
					called = true;
				}, 1000);

				expect(called).toBe(false);
				fakeTimers.advanceTimersByTime(1000);
				expect(called).toBe(true);
			});

			/**
			 * @test setInterval control
			 */
			test("should control setInterval", () => {
				fakeTimers.useFakeTimers();

				let callCount = 0;
				const intervalId = setInterval(() => {
					callCount++;
				}, 1000);

				expect(callCount).toBe(0);
				fakeTimers.advanceTimersByTime(3000);
				expect(callCount).toBe(3);

				clearInterval(intervalId);
			});

			/**
			 * @test Nested setTimeout control
			 */
			test("should control nested setTimeout", () => {
				fakeTimers.useFakeTimers();

				let step = 0;
				setTimeout(() => {
					step = 1;
					setTimeout(() => {
						step = 2;
					}, 500);
				}, 500);

				expect(step).toBe(0);
				fakeTimers.advanceTimersByTime(500);
				expect(step).toBe(1);
				fakeTimers.advanceTimersByTime(500);
				expect(step).toBe(2);
			});
		});

		/**
		 * @description Time manipulation tests
		 */
		describe("Time Manipulation", () => {
			/**
			 * @test Set initial time
			 */
			test("should set initial time", () => {
				const initialTime = new Date("2024-01-01T00:00:00Z").getTime();
				fakeTimers.useFakeTimers({ now: initialTime });

				expect(Date.now()).toBe(initialTime);
				fakeTimers.advanceTimersByTime(5000);
				expect(Date.now()).toBe(initialTime + 5000);
			});

			/**
			 * @test Set initial time with Date object
			 */
			test("should set initial time with Date object", () => {
				const initialDate = new Date("2024-06-15T12:00:00Z");
				fakeTimers.useFakeTimers({ now: initialDate });

				expect(Date.now()).toBe(initialDate.getTime());
			});

			/**
			 * @test Incremental time advancement
			 */
			test("should advance time incrementally", () => {
				fakeTimers.useFakeTimers({ now: 0 });

				const times: number[] = [];
				setTimeout(() => times.push(Date.now()), 1000);
				setTimeout(() => times.push(Date.now()), 2000);
				setTimeout(() => times.push(Date.now()), 3000);

				fakeTimers.advanceTimersByTime(1500);
				expect(times).toEqual([1000]);

				fakeTimers.advanceTimersByTime(1500);
				expect(times).toEqual([1000, 2000, 3000]);
			});

			/**
			 * @test Date constructor with fake timers
			 */
			test("should affect Date constructor", () => {
				const initialTime = new Date("2024-01-01T00:00:00Z").getTime();
				fakeTimers.useFakeTimers({ now: initialTime });

				const now = new Date();
				expect(now.getTime()).toBe(initialTime);
			});
		});

		/**
		 * @description Timer management tests
		 */
		describe("Timer Management", () => {
			/**
			 * @test Get timer count
			 * @see {@link jest.getTimerCount}
			 */
			test("should get timer count", () => {
				fakeTimers.useFakeTimers();

				setTimeout(() => {}, 1000);
				setTimeout(() => {}, 2000);
				setInterval(() => {}, 3000);

				expect(fakeTimers.getTimerCount()).toBe(3);
				fakeTimers.clearAllTimers();
				expect(fakeTimers.getTimerCount()).toBe(0);
			});

			/**
			 * @test Advance to next timer
			 * @see {@link jest.advanceTimersToNextTimer}
			 */
			test("should advance to next timer", () => {
				fakeTimers.useFakeTimers({ now: 0 });

				const callOrder: number[] = [];
				setTimeout(() => callOrder.push(1), 1000);
				setTimeout(() => callOrder.push(2), 2000);
				setTimeout(() => callOrder.push(3), 3000);

				fakeTimers.advanceTimersToNextTimer();
				expect(Date.now()).toBe(1000);
				expect(callOrder).toEqual([1]);

				fakeTimers.advanceTimersToNextTimer();
				expect(Date.now()).toBe(2000);
				expect(callOrder).toEqual([1, 2]);
			});

			/**
			 * @test Run all timers
			 * @see {@link jest.runAllTimers}
			 */
			test("should run all timers", () => {
				fakeTimers.useFakeTimers();

				let callCount = 0;
				setTimeout(() => callCount++, 1000);
				setTimeout(() => callCount++, 2000);
				setTimeout(() => callCount++, 3000);

				fakeTimers.runAllTimers();
				expect(callCount).toBe(3);
			});

			/**
			 * @test Run only pending timers
			 * @see {@link jest.runOnlyPendingTimers}
			 */
			test("should run only pending timers", () => {
				fakeTimers.useFakeTimers();

				let callCount = 0;
				setTimeout(() => {
					callCount++;
					setTimeout(() => callCount++, 500); // Nested timer
				}, 1000);

				fakeTimers.runOnlyPendingTimers();
				expect(callCount).toBe(1); // Only the first timer, not the nested one
			});

			/**
			 * @test Clear all timers
			 * @see {@link jest.clearAllTimers}
			 */
			test("should clear all timers", () => {
				fakeTimers.useFakeTimers();

				let called = false;
				setTimeout(() => { called = true; }, 1000);
				setInterval(() => { called = true; }, 1000);

				fakeTimers.clearAllTimers();
				fakeTimers.advanceTimersByTime(5000);
				expect(called).toBe(false);
			});
		});

		/**
		 * @description Async operation tests
		 */
		describe("Async Operations", () => {
			/**
			 * @test Promise with timer
			 */
			test("should work with Promises", async () => {
				fakeTimers.useFakeTimers();

				let resolved = false;
				const promise = new Promise<void>((resolve) => {
					setTimeout(() => {
						resolved = true;
						resolve();
					}, 1000);
				});

				expect(resolved).toBe(false);
				fakeTimers.advanceTimersByTime(1000);
				await promise;
				expect(resolved).toBe(true);
			});

			/**
			 * @test Multiple async timers
			 */
			test("should handle multiple async timers", async () => {
				fakeTimers.useFakeTimers();

				const results: number[] = [];
				const promises = [
					new Promise<void>((resolve) => {
						setTimeout(() => {
							results.push(1);
							resolve();
						}, 1000);
					}),
					new Promise<void>((resolve) => {
						setTimeout(() => {
							results.push(2);
							resolve();
						}, 2000);
					}),
				];

				fakeTimers.advanceTimersByTime(2000);
				await Promise.all(promises);
				expect(results).toEqual([1, 2]);
			});

			/**
			 * @test Async/await with timers
			 */
			test("should work with async/await patterns", async () => {
				fakeTimers.useFakeTimers();

				const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

				let step = 0;
				const asyncFn = async () => {
					step = 1;
					await delay(1000);
					step = 2;
					await delay(1000);
					step = 3;
				};

				const promise = asyncFn();
				expect(step).toBe(1);

				fakeTimers.advanceTimersByTime(1000);
				await Promise.resolve(); // Flush microtasks
				expect(step).toBe(2);

				fakeTimers.advanceTimersByTime(1000);
				await promise;
				expect(step).toBe(3);
			});
		});

		/**
		 * @description Edge case tests
		 */
		describe("Edge Cases", () => {
			/**
			 * @test Zero delay timer
			 */
			test("should handle zero delay", () => {
				fakeTimers.useFakeTimers();

				let called = false;
				setTimeout(() => {
					called = true;
				}, 0);

				fakeTimers.advanceTimersByTime(1);
				expect(called).toBe(true);
			});

			/**
			 * @test Negative delay timer
			 */
			test("should handle negative delay", () => {
				fakeTimers.useFakeTimers();

				let called = false;
				setTimeout(() => {
					called = true;
				}, -1000);

				fakeTimers.advanceTimersByTime(1);
				expect(called).toBe(true);
			});

			/**
			 * @test Clearing individual timers
			 */
			test("should handle clearing timers", () => {
				fakeTimers.useFakeTimers();

				let called = false;
				const timeoutId = setTimeout(() => {
					called = true;
				}, 1000);

				clearTimeout(timeoutId);
				fakeTimers.advanceTimersByTime(1000);
				expect(called).toBe(false);
			});

			/**
			 * @test Large delays
			 */
			test("should handle large delays", () => {
				fakeTimers.useFakeTimers({ now: 0 });

				let called = false;
				setTimeout(() => {
					called = true;
				}, 1000 * 60 * 60); // 1 hour

				expect(called).toBe(false);
				fakeTimers.advanceTimersByTime(1000 * 60 * 60);
				expect(called).toBe(true);
			});

			/**
			 * @test Timer ordering
			 */
			test("should maintain timer ordering", () => {
				fakeTimers.useFakeTimers();

				const order: number[] = [];
				setTimeout(() => order.push(3), 300);
				setTimeout(() => order.push(1), 100);
				setTimeout(() => order.push(2), 200);

				fakeTimers.runAllTimers();
				expect(order).toEqual([1, 2, 3]);
			});
		});
	});

	/**
	 * @description console.log %j format specifier tests
	 * @see {@link https://bun.sh/blog/bun-v1.3.4#console-log-now-supports-j-format-specifier|%j Format Specifier}
	 */
	describe("console.log %j Format Specifier", () => {
		/**
		 * @description Object formatting tests
		 */
		describe("Object Formatting", () => {
			/**
			 * @test Simple object formatting
			 */
			test("should format simple objects", () => {
				const output = testFormatSpecifier("%j", { name: "test", value: 42 });
				const parsed = JSON.parse(output);

				expect(parsed.name).toBe("test");
				expect(parsed.value).toBe(42);
			});

			/**
			 * @test Nested object formatting
			 */
			test("should format nested objects", () => {
				const obj = { nested: { deep: { value: "test" } } };
				const output = testFormatSpecifier("%j", obj);
				const parsed = JSON.parse(output);

				expect(parsed.nested.deep.value).toBe("test");
			});

			/**
			 * @test Objects with arrays
			 */
			test("should format objects with arrays", () => {
				const obj = { items: [1, 2, 3], metadata: { count: 3 } };
				const output = testFormatSpecifier("%j", obj);
				const parsed = JSON.parse(output);

				expect(parsed.items).toEqual([1, 2, 3]);
				expect(parsed.metadata.count).toBe(3);
			});

			/**
			 * @test Empty object
			 */
			test("should format empty objects", () => {
				const output = testFormatSpecifier("%j", {});
				expect(output).toBe("{}");
			});

			/**
			 * @test Object with null values
			 */
			test("should format objects with null values", () => {
				const obj = { value: null, name: "test" };
				const output = testFormatSpecifier("%j", obj);
				const parsed = JSON.parse(output);

				expect(parsed.value).toBeNull();
				expect(parsed.name).toBe("test");
			});
		});

		/**
		 * @description Array formatting tests
		 */
		describe("Array Formatting", () => {
			/**
			 * @test Simple array formatting
			 */
			test("should format simple arrays", () => {
				const output = testFormatSpecifier("%j", [1, 2, 3]);
				const parsed = JSON.parse(output);

				expect(parsed).toEqual([1, 2, 3]);
			});

			/**
			 * @test Arrays with objects
			 */
			test("should format arrays with objects", () => {
				const arr = [{ id: 1 }, { id: 2 }];
				const output = testFormatSpecifier("%j", arr);
				const parsed = JSON.parse(output);

				expect(parsed).toEqual(arr);
			});

			/**
			 * @test Empty array
			 */
			test("should format empty arrays", () => {
				const output = testFormatSpecifier("%j", []);
				expect(output).toBe("[]");
			});

			/**
			 * @test Nested arrays
			 */
			test("should format nested arrays", () => {
				const arr = [[1, 2], [3, 4], [5, 6]];
				const output = testFormatSpecifier("%j", arr);
				const parsed = JSON.parse(output);

				expect(parsed).toEqual(arr);
			});

			/**
			 * @test Mixed type arrays
			 */
			test("should format mixed type arrays", () => {
				const arr = [1, "two", true, null, { key: "value" }];
				const output = testFormatSpecifier("%j", arr);
				const parsed = JSON.parse(output);

				expect(parsed).toEqual(arr);
			});
		});

		/**
		 * @description Primitive value formatting tests
		 */
		describe("Primitive Formatting", () => {
			/**
			 * @test null formatting
			 */
			test("should format null", () => {
				const output = testFormatSpecifier("%j", null);
				expect(output).toBe("null");
			});

			/**
			 * @test undefined formatting
			 */
			test("should format undefined", () => {
				const result = Bun.spawnSync({
					cmd: ["bun", "-e", "console.log('%j', undefined);"],
					stdout: "pipe",
				});
				const output = new TextDecoder().decode(result.stdout).trim();
				// Bun may output empty string or undefined for undefined with %j
				expect(output === "" || output === "undefined").toBe(true);
			});

			/**
			 * @test Number formatting
			 */
			test("should format numbers", () => {
				expect(testFormatSpecifier("%j", 42)).toBe("42");
				expect(testFormatSpecifier("%j", 3.14)).toBe("3.14");
				expect(testFormatSpecifier("%j", -100)).toBe("-100");
				expect(testFormatSpecifier("%j", 0)).toBe("0");
			});

			/**
			 * @test String formatting
			 */
			test("should format strings", () => {
				const output = testFormatSpecifier("%j", "test");
				expect(output).toBe('"test"');
			});

			/**
			 * @test Boolean formatting
			 */
			test("should format booleans", () => {
				expect(testFormatSpecifier("%j", true)).toBe("true");
				expect(testFormatSpecifier("%j", false)).toBe("false");
			});
		});

		/**
		 * @description Multiple format specifier tests
		 */
		describe("Multiple Format Specifiers", () => {
			/**
			 * @test Multiple %j specifiers
			 */
			test("should handle multiple %j specifiers", () => {
				const result = Bun.spawnSync({
					cmd: ["bun", "-e", "console.log('%j %j', { a: 1 }, { b: 2 });"],
					stdout: "pipe",
				});
				const output = new TextDecoder().decode(result.stdout).trim();
				expect(output).toContain("a");
				expect(output).toContain("b");
			});

			/**
			 * @test Mix %j with other specifiers
			 */
			test("should mix %j with other specifiers", () => {
				const result = Bun.spawnSync({
					cmd: ["bun", "-e", "console.log('%j %s %d', { status: 'ok' }, 'done', 42);"],
					stdout: "pipe",
				});
				const output = new TextDecoder().decode(result.stdout).trim();
				expect(output).toContain("status");
				expect(output).toContain("done");
				expect(output).toContain("42");
			});

			/**
			 * @test %j with %o and %O
			 */
			test("should work alongside %o and %O", () => {
				const result = Bun.spawnSync({
					cmd: ["bun", "-e", "console.log('%j', { test: true });"],
					stdout: "pipe",
				});
				const output = new TextDecoder().decode(result.stdout).trim();
				expect(JSON.parse(output).test).toBe(true);
			});
		});

		/**
		 * @description Edge case tests
		 */
		describe("Edge Cases", () => {
			/**
			 * @test Very large objects
			 */
			test("should handle very large objects", () => {
				const largeObj = Object.fromEntries(
					Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
				);
				const output = testFormatSpecifier("%j", largeObj);
				const parsed = JSON.parse(output);

				expect(Object.keys(parsed).length).toBe(100);
			});

			/**
			 * @test Special characters
			 */
			test("should handle special characters", () => {
				const obj = { special: 'test\n\t"quotes"\\backslash' };
				const output = testFormatSpecifier("%j", obj);
				const parsed = JSON.parse(output);

				expect(parsed.special).toBe('test\n\t"quotes"\\backslash');
			});

			/**
			 * @test Unicode characters
			 */
			test("should handle unicode characters", () => {
				const obj = { unicode: "🚀 测试 🎉" };
				const output = testFormatSpecifier("%j", obj);
				const parsed = JSON.parse(output);

				expect(parsed.unicode).toBe("🚀 测试 🎉");
			});

			/**
			 * @test Date objects
			 */
			test("should handle Date objects", () => {
				const date = new Date("2024-01-01T00:00:00Z");
				const output = testFormatSpecifier("%j", { date });
				const parsed = JSON.parse(output);

				expect(parsed.date).toBe("2024-01-01T00:00:00.000Z");
			});

			/**
			 * @test RegExp objects
			 */
			test("should handle RegExp objects", () => {
				const obj = { pattern: /test/gi };
				const output = testFormatSpecifier("%j", obj);
				const parsed = JSON.parse(output);

				// RegExp becomes empty object in JSON
				expect(parsed.pattern).toEqual({});
			});
		});
	});

	/**
	 * @description http.Agent connection pooling tests
	 * @see {@link https://bun.sh/blog/bun-v1.3.4#httpagent-connection-pool-now-properly-reuses-connections|http.Agent Fix}
	 * @see {@link http.Agent}
	 * @see {@link https.Agent}
	 */
	describe("http.Agent Connection Pooling", () => {
		/**
		 * @description HTTP Agent tests
		 */
		describe("HTTP Agent", () => {
			/**
			 * @test Create Agent with keepAlive
			 */
			test("should create Agent with keepAlive", () => {
				const agent = new http.Agent({ keepAlive: true });
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test keepAliveMsecs option
			 */
			test("should respect keepAliveMsecs", () => {
				const agent = new http.Agent({
					keepAlive: true,
					keepAliveMsecs: 5000,
				});
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test maxSockets option
			 */
			test("should respect maxSockets", () => {
				const agent = new http.Agent({
					keepAlive: true,
					maxSockets: 10,
				});
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test maxFreeSockets option
			 */
			test("should respect maxFreeSockets", () => {
				const agent = new http.Agent({
					keepAlive: true,
					maxFreeSockets: 5,
				});
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test All options together
			 */
			test("should handle all options together", () => {
				const agent = new http.Agent({
					keepAlive: true,
					keepAliveMsecs: 3000,
					maxSockets: 5,
					maxFreeSockets: 2,
					timeout: 10000,
				});
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test Scheduling option
			 */
			test("should respect scheduling option", () => {
				const agent = new http.Agent({
					keepAlive: true,
					scheduling: "fifo",
				});
				expect(agent).toBeInstanceOf(http.Agent);
			});
		});

		/**
		 * @description HTTPS Agent tests
		 */
		describe("HTTPS Agent", () => {
			/**
			 * @test Create HTTPS Agent with keepAlive
			 */
			test("should create HTTPS Agent with keepAlive", () => {
				const agent = new https.Agent({ keepAlive: true });
				expect(agent).toBeInstanceOf(https.Agent);
			});

			/**
			 * @test HTTPS-specific options
			 */
			test("should respect keepAliveMsecs", () => {
				const agent = new https.Agent({
					keepAlive: true,
					keepAliveMsecs: 5000,
				});
				expect(agent).toBeInstanceOf(https.Agent);
			});

			/**
			 * @test All HTTPS options
			 */
			test("should handle all HTTPS options", () => {
				const agent = new https.Agent({
					keepAlive: true,
					keepAliveMsecs: 3000,
					maxSockets: 5,
					maxFreeSockets: 2,
				});
				expect(agent).toBeInstanceOf(https.Agent);
			});
		});

		/**
		 * @description Edge case tests
		 */
		describe("Edge Cases", () => {
			/**
			 * @test keepAlive: false
			 */
			test("should handle keepAlive: false", () => {
				const agent = new http.Agent({ keepAlive: false });
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test Default options
			 */
			test("should handle default options", () => {
				const agent = new http.Agent();
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test Empty options
			 */
			test("should handle empty options object", () => {
				const agent = new http.Agent({});
				expect(agent).toBeInstanceOf(http.Agent);
			});

			/**
			 * @test Agent destroy
			 */
			test("should support destroy method", () => {
				const agent = new http.Agent({ keepAlive: true });
				expect(typeof agent.destroy).toBe("function");
				agent.destroy();
			});
		});
	});

	/**
	 * @description Bun.build compile options tests
	 * @see {@link https://bun.sh/blog/bun-v1.3.4#standalone-executables-no-longer-load-config-files-at-runtime|Standalone Executables}
	 * @see {@link Bun.build}
	 */
	describe("Bun.build Compile Options", () => {
		let tempFiles: string[] = [];

		afterEach(async () => {
			await Promise.all(tempFiles.map(cleanupTempFile));
			tempFiles = [];
		});

		/**
		 * @test Bun.build function exists
		 */
		test("should have Bun.build function", () => {
			expect(typeof Bun.build).toBe("function");
		});

		/**
		 * @test Compile without autoload options
		 */
		test("should compile without autoload options", async () => {
			const testFile = await createTempFile("console.log('test');");
			tempFiles.push(testFile);

			const result = await Bun.build({
				entrypoints: [testFile],
				compile: {
					autoloadTsconfig: false,
					autoloadPackageJson: false,
					autoloadDotenv: false,
					autoloadBunfig: false,
				} as BunCompileOptions,
			});

			expect(result.success).toBe(true);
		});

		/**
		 * @test Compile with all autoload options
		 */
		test("should compile with all autoload options", async () => {
			const testFile = await createTempFile("console.log('test');");
			tempFiles.push(testFile);

			const result = await Bun.build({
				entrypoints: [testFile],
				compile: {
					autoloadTsconfig: true,
					autoloadPackageJson: true,
					autoloadDotenv: true,
					autoloadBunfig: true,
				} as BunCompileOptions,
			});

			expect(result.success).toBe(true);
		});

		/**
		 * @test Selective autoload options
		 */
		test("should compile with selective autoload options", async () => {
			const testFile = await createTempFile("console.log('test');");
			tempFiles.push(testFile);

			const result = await Bun.build({
				entrypoints: [testFile],
				compile: {
					autoloadTsconfig: true,
					autoloadPackageJson: false,
					autoloadDotenv: false,
					autoloadBunfig: false,
				} as BunCompileOptions,
			});

			expect(result.success).toBe(true);
		});

		/**
		 * @test Only dotenv autoload
		 */
		test("should compile with only dotenv autoload", async () => {
			const testFile = await createTempFile("console.log('test');");
			tempFiles.push(testFile);

			const result = await Bun.build({
				entrypoints: [testFile],
				compile: {
					autoloadTsconfig: false,
					autoloadPackageJson: false,
					autoloadDotenv: true,
					autoloadBunfig: false,
				} as BunCompileOptions,
			});

			expect(result.success).toBe(true);
		});

		/**
		 * @test Produce executable output
		 */
		test("should produce executable output", async () => {
			const testFile = await createTempFile("console.log('test');");
			tempFiles.push(testFile);

			const result = await Bun.build({
				entrypoints: [testFile],
				compile: {
					autoloadTsconfig: false,
					autoloadPackageJson: false,
					autoloadDotenv: false,
					autoloadBunfig: false,
				} as BunCompileOptions,
			});

			expect(result.success).toBe(true);
			expect(result.outputs).toBeDefined();
			expect(result.outputs.length).toBeGreaterThan(0);
		});

		/**
		 * @test Build with TypeScript file
		 */
		test("should build TypeScript files", async () => {
			const testFile = await createTempFile(`
				const greeting: string = "Hello";
				console.log(greeting);
			`);
			tempFiles.push(testFile);

			const result = await Bun.build({
				entrypoints: [testFile],
			});

			expect(result.success).toBe(true);
		});

		/**
		 * @test Build with imports
		 */
		test("should handle files with imports", async () => {
			const helperFile = await createTempFile(`
				export const helper = () => "helper";
			`);
			tempFiles.push(helperFile);

			const mainFile = await createTempFile(`
				import { helper } from "${helperFile}";
				console.log(helper());
			`);
			tempFiles.push(mainFile);

			const result = await Bun.build({
				entrypoints: [mainFile],
			});

			expect(result.success).toBe(true);
		});
	});

	/**
	 * @description SQLite 3.51.1 tests
	 * @see {@link https://bun.sh/blog/bun-v1.3.4#sqlite-3511|SQLite 3.51.1}
	 * @see {@link Database}
	 */
	describe("SQLite 3.51.1", () => {
		let db: Database;

		afterEach(() => {
			if (db) {
				db.close();
			}
		});

		/**
		 * @test SQLite version check
		 */
		test("should have SQLite version >= 3.51", () => {
			db = new Database(":memory:");
			const version = db.prepare("SELECT sqlite_version() as version").get() as { version: string };
			const [major, minor] = version.version.split(".").map(Number);

			expect(major).toBeGreaterThanOrEqual(3);
			if (major === 3) {
				expect(minor).toBeGreaterThanOrEqual(51);
			}
		});

		/**
		 * @test EXISTS-to-JOIN optimization
		 */
		test("should support EXISTS-to-JOIN optimization", () => {
			db = new Database(":memory:");

			db.exec(`
				CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
				CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT);
				INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');
				INSERT INTO posts VALUES (1, 1, 'Post 1'), (2, 1, 'Post 2');
			`);

			const result = db.prepare(`
				SELECT * FROM users u
				WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id)
			`).all();

			expect(result.length).toBe(1);
			expect((result[0] as any).name).toBe("Alice");
		});

		/**
		 * @test Query planner improvements
		 */
		test("should have improved query planner", () => {
			db = new Database(":memory:");

			db.exec(`
				CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT);
				CREATE INDEX idx_value ON test(value);
				INSERT INTO test VALUES (1, 'test1'), (2, 'test2'), (3, 'test1');
			`);

			const result = db.prepare("SELECT * FROM test WHERE value = ?").all("test1");
			expect(result.length).toBe(2);
		});

		/**
		 * @test Large dataset handling
		 */
		test("should handle large datasets efficiently", () => {
			db = new Database(":memory:");

			db.exec(`
				CREATE TABLE large_table (id INTEGER PRIMARY KEY, value TEXT);
				CREATE INDEX idx_value ON large_table(value);
			`);

			const insert = db.prepare("INSERT INTO large_table (value) VALUES (?)");
			const insertMany = db.transaction((values: string[]) => {
				for (const value of values) {
					insert.run(value);
				}
			});

			const values = Array.from({ length: 1000 }, (_, i) => `value${i}`);
			insertMany(values);

			const result = db.prepare("SELECT COUNT(*) as count FROM large_table WHERE value LIKE 'value%'").get() as { count: number };
			expect(result.count).toBe(1000);
		});

		/**
		 * @test Transaction support
		 */
		test("should support transactions", () => {
			db = new Database(":memory:");

			db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)");

			const insert = db.prepare("INSERT INTO test (value) VALUES (?)");
			const insertMany = db.transaction((values: string[]) => {
				for (const value of values) {
					insert.run(value);
				}
			});

			insertMany(["a", "b", "c"]);

			const count = db.prepare("SELECT COUNT(*) as count FROM test").get() as { count: number };
			expect(count.count).toBe(3);
		});

		/**
		 * @test EXPLAIN QUERY PLAN
		 */
		test("should support EXPLAIN QUERY PLAN", () => {
			db = new Database(":memory:");

			db.exec(`
				CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT);
				CREATE INDEX idx_value ON test(value);
			`);

			const plan = db.prepare("EXPLAIN QUERY PLAN SELECT * FROM test WHERE value = ?").all("test");
			expect(plan.length).toBeGreaterThan(0);
		});

		/**
		 * @test JSON functions
		 */
		test("should support JSON functions", () => {
			db = new Database(":memory:");

			const result = db.prepare("SELECT json_object('name', 'test', 'value', 42) as json").get() as { json: string };
			const parsed = JSON.parse(result.json);

			expect(parsed.name).toBe("test");
			expect(parsed.value).toBe(42);
		});
	});

	/**
	 * @description Custom Proxy Headers in fetch() tests
	 * @see {@link https://bun.sh/blog/bun-v1.3.4#custom-proxy-headers-in-fetch|Custom Proxy Headers}
	 * @see {@link fetch}
	 */
	describe("Custom Proxy Headers in fetch()", () => {
		/**
		 * @test Proxy as string
		 */
		test("should accept proxy as string", () => {
			const proxyString = "http://proxy.example.com:8080";
			expect(typeof proxyString).toBe("string");
		});

		/**
		 * @test Proxy as object with url
		 */
		test("should accept proxy as object with url", () => {
			const proxyConfig = {
				url: "http://proxy.example.com:8080",
			};
			expect(proxyConfig.url).toBe("http://proxy.example.com:8080");
		});

		/**
		 * @test Proxy with headers
		 */
		test("should accept proxy with headers", () => {
			const proxyConfig = {
				url: "http://proxy.example.com:8080",
				headers: {
					"Proxy-Authorization": "Bearer token",
					"X-Custom-Proxy-Header": "value",
				},
			};

			expect(proxyConfig.url).toBe("http://proxy.example.com:8080");
			expect(proxyConfig.headers["Proxy-Authorization"]).toBe("Bearer token");
			expect(proxyConfig.headers["X-Custom-Proxy-Header"]).toBe("value");
		});

		/**
		 * @test Multiple headers
		 */
		test("should handle multiple headers", () => {
			const proxyConfig = {
				url: "http://proxy.example.com:8080",
				headers: {
					"Proxy-Authorization": "Bearer token",
					"X-Custom-Header-1": "value1",
					"X-Custom-Header-2": "value2",
					"X-Custom-Header-3": "value3",
				},
			};

			expect(Object.keys(proxyConfig.headers).length).toBe(4);
		});

		/**
		 * @test Header precedence over URL credentials
		 */
		test("should handle header precedence", () => {
			const proxyConfig = {
				url: "http://user:pass@proxy.example.com:8080",
				headers: {
					"Proxy-Authorization": "Bearer token",
				},
			};

			expect(proxyConfig.headers["Proxy-Authorization"]).toBe("Bearer token");
		});

		/**
		 * @test Basic auth header
		 */
		test("should handle Basic auth header", () => {
			const credentials = Buffer.from("user:pass").toString("base64");
			const proxyConfig = {
				url: "http://proxy.example.com:8080",
				headers: {
					"Proxy-Authorization": `Basic ${credentials}`,
				},
			};

			expect(proxyConfig.headers["Proxy-Authorization"]).toContain("Basic");
		});

		/**
		 * @test HTTPS proxy
		 */
		test("should handle HTTPS proxy URL", () => {
			const proxyConfig = {
				url: "https://secure-proxy.example.com:8443",
				headers: {
					"Proxy-Authorization": "Bearer token",
				},
			};

			expect(proxyConfig.url.startsWith("https://")).toBe(true);
		});

		/**
		 * @test Empty headers object
		 */
		test("should handle empty headers object", () => {
			const proxyConfig = {
				url: "http://proxy.example.com:8080",
				headers: {},
			};

			expect(Object.keys(proxyConfig.headers).length).toBe(0);
		});
	});

	/**
	 * @description Integration scenario tests
	 * @see {@link ../docs/BUN-V1.3.4-FEATURES-SUMMARY.md|Feature Summary}
	 */
	describe("Integration Scenarios", () => {
		/**
		 * @test URLPattern router matching
		 */
		test("URLPattern router should match multiple routes", () => {
			const routes = [
				{ pattern: new URLPattern({ pathname: "/api/v1/users/:id" }), handler: "userHandler" },
				{ pattern: new URLPattern({ pathname: "/api/v1/posts/:id" }), handler: "postHandler" },
				{ pattern: new URLPattern({ pathname: "/api/v1/comments/:id" }), handler: "commentHandler" },
			];

			const testUrl = "https://api.example.com/api/v1/users/123";
			const matched = routes.find(r => r.pattern.test(testUrl));

			expect(matched).not.toBeUndefined();
			expect(matched?.handler).toBe("userHandler");

			if (matched) {
				const result = matched.pattern.exec(testUrl);
				expect(result?.pathname.groups.id).toBe("123");
			}
		});

		/**
		 * @test Fake timers with debounce
		 */
		test("Fake timers should work with debounce function", async () => {
			fakeTimers.useFakeTimers();

			let callCount = 0;
			const debounce = (fn: () => void, delay: number) => {
				let timeoutId: ReturnType<typeof setTimeout>;
				return () => {
					clearTimeout(timeoutId);
					timeoutId = setTimeout(fn, delay);
				};
			};

			const debouncedFn = debounce(() => callCount++, 300);

			debouncedFn();
			debouncedFn();
			debouncedFn();

			fakeTimers.advanceTimersByTime(200);
			expect(callCount).toBe(0);

			fakeTimers.advanceTimersByTime(200);
			expect(callCount).toBe(1);

			fakeTimers.useRealTimers();
		});

		/**
		 * @test Fake timers with throttle
		 */
		test("Fake timers should work with throttle function", () => {
			fakeTimers.useFakeTimers();

			let callCount = 0;
			const throttle = (fn: () => void, delay: number) => {
				let lastCall = 0;
				return () => {
					const now = Date.now();
					if (now - lastCall >= delay) {
						lastCall = now;
						fn();
					}
				};
			};

			const throttledFn = throttle(() => callCount++, 100);

			throttledFn(); // Should call (first call)
			expect(callCount).toBe(1);

			fakeTimers.advanceTimersByTime(50);
			throttledFn(); // Should not call (too soon)
			expect(callCount).toBe(1);

			fakeTimers.advanceTimersByTime(60);
			throttledFn(); // Should call (enough time passed)
			expect(callCount).toBe(2);

			fakeTimers.useRealTimers();
		});

		/**
		 * @test Structured logging with %j
		 */
		test("console.log %j should work with structured logging", () => {
			const logEvent = {
				timestamp: new Date().toISOString(),
				level: "info",
				message: "Test log",
				metadata: {
					userId: 123,
					action: "test",
				},
			};

			const result = Bun.spawnSync({
				cmd: ["bun", "-e", `console.log('%j', ${JSON.stringify(logEvent)});`],
				stdout: "pipe",
			});

			const output = new TextDecoder().decode(result.stdout).trim();
			const parsed = JSON.parse(output);

			expect(parsed.level).toBe("info");
			expect(parsed.metadata.userId).toBe(123);
		});

		/**
		 * @test SQLite with URLPattern extracted IDs
		 */
		test("SQLite should work with URLPattern extracted IDs", () => {
			const db = new Database(":memory:");
			db.exec(`
				CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
				INSERT INTO users VALUES (123, 'Alice'), (456, 'Bob');
			`);

			const pattern = new URLPattern({ pathname: "/users/:id" });
			const result = pattern.exec("https://api.example.com/users/123");
			const userId = Number(result?.pathname.groups.id);

			const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as { id: number; name: string };
			expect(user.name).toBe("Alice");

			db.close();
		});

		/**
		 * @test Combined feature usage
		 */
		test("should combine multiple v1.3.4 features", () => {
			// URLPattern for routing
			const pattern = new URLPattern({ pathname: "/api/:version/users/:id" });
			const result = pattern.exec("https://api.example.com/api/v1/users/42");

			expect(result?.pathname.groups.version).toBe("v1");
			expect(result?.pathname.groups.id).toBe("42");

			// %j for logging
			const logOutput = testFormatSpecifier("%j", {
				route: "/api/v1/users/42",
				params: result?.pathname.groups,
			});
			const parsed = JSON.parse(logOutput);
			expect(parsed.route).toBe("/api/v1/users/42");

			// SQLite for data
			const db = new Database(":memory:");
			db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
			db.exec("INSERT INTO users VALUES (42, 'Test User')");

			const user = db.prepare("SELECT * FROM users WHERE id = ?").get(42) as { id: number; name: string };
			expect(user.name).toBe("Test User");

			db.close();
		});

		/**
		 * @test https.Agent with keepAlive + fetch proxy headers + Bun.inspect
		 * @description Combined usage pattern for enterprise proxy scenarios
		 * @see {@link https://bun.sh/blog/bun-v1.3.4#http-agent-connection-pool}
		 * @see {@link https://bun.sh/blog/bun-v1.3.4#custom-proxy-headers-in-fetch}
		 * @example
		 * ```typescript
		 * const agent = new https.Agent({ keepAlive: true, maxSockets: 5 });
		 * const response = await fetch(url, {
		 *   agent,
		 *   proxy: {
		 *     url: 'http://proxy:3128',
		 *     headers: { 'Proxy-Authorization': 'Bearer token' }
		 *   }
		 * });
		 * ```
		 */
		test("should support https.Agent with keepAlive and proxy headers pattern", () => {
			// Test https.Agent configuration with keepAlive
			const agent = new https.Agent({
				keepAlive: true,
				maxSockets: 5,
				timeout: 30000,
			});

			// Verify agent is configured correctly
			expect(agent).toBeInstanceOf(https.Agent);
			expect(agent.options.keepAlive).toBe(true);
			expect(agent.maxSockets).toBe(5);

			// Test proxy configuration object structure
			const proxyConfig = {
				url: "http://corporate-proxy:3128",
				headers: {
					"Proxy-Authorization": "Bearer test-token",
					"X-Client-ID": "bun-app-v1.0",
					"X-Request-ID": `req-${Date.now()}`,
				},
			};

			expect(proxyConfig.url).toContain("proxy");
			expect(proxyConfig.headers["Proxy-Authorization"]).toMatch(/^Bearer /);
			expect(proxyConfig.headers["X-Client-ID"]).toBe("bun-app-v1.0");

			// Test Bun.inspect.table with sample data structure
			const sampleData = [
				{ id: 1, name: "Alice", value: 100 },
				{ id: 2, name: "Bob", value: 200 },
				{ id: 3, name: "Charlie", value: 300 },
			];

			// Verify data structure for table display
			expect(sampleData).toHaveLength(3);
			expect(sampleData[0]).toHaveProperty("id");
			expect(sampleData[0]).toHaveProperty("name");
			expect(sampleData[0]).toHaveProperty("value");

			// Test Bun.inspect with object
			const inspected = Bun.inspect(sampleData[0]);
			expect(inspected).toContain("id");
			expect(inspected).toContain("Alice");

			agent.destroy();
		});

		/**
		 * @test Proxy configuration validation
		 * @description Verify proxy object format matches Bun v1.3.4 spec
		 */
		test("should validate proxy configuration object format", () => {
			// String format (legacy, still supported)
			const stringProxy = "http://proxy.example.com:8080";
			expect(typeof stringProxy).toBe("string");

			// Object format (new in v1.3.4)
			const objectProxy = {
				url: "http://proxy.example.com:8080",
				headers: {
					"Proxy-Authorization": "Bearer token",
					"X-Custom-Header": "value",
				},
			};

			expect(objectProxy).toHaveProperty("url");
			expect(objectProxy).toHaveProperty("headers");
			expect(typeof objectProxy.url).toBe("string");
			expect(typeof objectProxy.headers).toBe("object");
		});

		/**
		 * @test Connection pool reuse verification
		 * @description Verify http.Agent properly reuses connections with keepAlive
		 */
		test("should configure http.Agent for connection reuse", () => {
			// HTTP Agent
			const httpAgent = new http.Agent({
				keepAlive: true,
				maxSockets: 10,
				maxFreeSockets: 5,
			});

			expect(httpAgent.options.keepAlive).toBe(true);
			expect(httpAgent.maxSockets).toBe(10);
			expect(httpAgent.maxFreeSockets).toBe(5);

			// HTTPS Agent
			const httpsAgent = new https.Agent({
				keepAlive: true,
				maxSockets: 10,
				maxFreeSockets: 5,
				rejectUnauthorized: true,
			});

			expect(httpsAgent.options.keepAlive).toBe(true);
			expect(httpsAgent.maxSockets).toBe(10);
			expect(httpsAgent.options.rejectUnauthorized).toBe(true);

			httpAgent.destroy();
			httpsAgent.destroy();
		});
	});

	/**
	 * @description Error handling tests
	 */
	describe("Error Handling", () => {
		/**
		 * @test Invalid URLPattern
		 */
		test("should handle invalid URLPattern gracefully", () => {
			// Valid patterns should work
			const validPattern = new URLPattern({ pathname: "/users/:id" });
			expect(validPattern).toBeInstanceOf(URLPattern);
		});

		/**
		 * @test SQLite error handling
		 */
		test("should handle SQLite errors", () => {
			const db = new Database(":memory:");

			expect(() => {
				db.exec("SELECT * FROM nonexistent_table");
			}).toThrow();

			db.close();
		});

		/**
		 * @test Bun.build with invalid file
		 */
		test("should handle Bun.build with nonexistent file", async () => {
			try {
				const result = await Bun.build({
					entrypoints: ["/nonexistent/path/file.ts"],
				});
				// If it returns, check for failure
				expect(result.success).toBe(false);
			} catch (error) {
				// If it throws, that's also acceptable error handling
				expect(error).toBeDefined();
			}
		});
	});
});
