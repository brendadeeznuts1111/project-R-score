#!/usr/bin/env bun
/**
 * @fileoverview Complete Test Suite: URLPattern API & Fake Timers in Bun v1.3.4
 * @description Comprehensive tests demonstrating Fake Timers with URLPattern patterns
 * @version 1.0.0
 * @since Bun 1.3.4
 *
 * @see {@link https://bun.sh/blog/bun-v1.3.4#fake-timers-for-buntest|Fake Timers}
 * @see {@link ./bun-1.3.4-urlpattern-faketimers-complete.ts|Example Implementation}
 *
 * Run: bun test examples/bun-1.3.4-urlpattern-faketimers-complete.test.ts
 *
 * @module examples/bun-1.3.4-urlpattern-faketimers-complete.test
 */

import { afterEach, describe, expect, jest, test } from "bun:test";
import { EventEmitter } from "events";
import {
    debounce,
    MockAPI,
    RateLimiter,
    throttle,
    URLPatternRouter,
} from "./bun-1.3.4-urlpattern-faketimers-complete";

/**
 * Bun v1.3.4 Fake Timers API Type Definitions
 * @see https://bun.sh/blog/bun-v1.3.4#fake-timers-for-buntest
 */
interface BunFakeTimerOptions {
	now?: number | Date;
	doNotFake?: string[];
	timerLimit?: number;
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

const fakeTimers = jest as unknown as BunJestFakeTimers;

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Basic Fake Timer Usage
// ═══════════════════════════════════════════════════════════════

describe("Fake Timers - Basic Usage", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test Basic setTimeout control
	 */
	test("should control setTimeout execution", () => {
		fakeTimers.useFakeTimers();

		let value = 0;
		setTimeout(() => {
			value = 100;
		}, 1000);

		// Time hasn't advanced
		expect(value).toBe(0);

		// Advance time by 500ms
		fakeTimers.advanceTimersByTime(500);
		expect(value).toBe(0); // Still not called

		// Advance another 500ms
		fakeTimers.advanceTimersByTime(500);
		expect(value).toBe(100); // Now called!
	});

	/**
	 * @test setInterval control
	 */
	test("should control setInterval execution", () => {
		fakeTimers.useFakeTimers();

		let count = 0;
		const intervalId = setInterval(() => {
			count++;
			if (count >= 3) clearInterval(intervalId);
		}, 100);

		expect(count).toBe(0);

		fakeTimers.advanceTimersByTime(100);
		expect(count).toBe(1);

		fakeTimers.advanceTimersByTime(100);
		expect(count).toBe(2);

		fakeTimers.advanceTimersByTime(100);
		expect(count).toBe(3);

		// Interval should be cleared
		fakeTimers.advanceTimersByTime(100);
		expect(count).toBe(3);
	});

	/**
	 * @test Timer count tracking
	 */
	test("should track timer count", () => {
		fakeTimers.useFakeTimers();

		expect(fakeTimers.getTimerCount()).toBe(0);

		setTimeout(() => {}, 100);
		setTimeout(() => {}, 200);
		setInterval(() => {}, 50);

		expect(fakeTimers.getTimerCount()).toBe(3);

		fakeTimers.clearAllTimers();
		expect(fakeTimers.getTimerCount()).toBe(0);
	});

	/**
	 * @test Advance to next timer
	 */
	test("should advance to next timer", () => {
		fakeTimers.useFakeTimers();

		const calls: string[] = [];

		setTimeout(() => calls.push("first"), 100);
		setTimeout(() => calls.push("second"), 200);
		setTimeout(() => calls.push("third"), 300);

		fakeTimers.advanceTimersToNextTimer();
		expect(calls).toEqual(["first"]);

		fakeTimers.advanceTimersToNextTimer();
		expect(calls).toEqual(["first", "second"]);

		fakeTimers.advanceTimersToNextTimer();
		expect(calls).toEqual(["first", "second", "third"]);
	});

	/**
	 * @test Run all timers
	 */
	test("should run all timers", () => {
		fakeTimers.useFakeTimers();

		const calls: number[] = [];

		setTimeout(() => calls.push(1), 100);
		setTimeout(() => calls.push(2), 200);
		setTimeout(() => calls.push(3), 300);

		fakeTimers.runAllTimers();
		expect(calls).toEqual([1, 2, 3]);
	});

	/**
	 * @test Check if fake timers are active
	 */
	test("should report fake timer status", () => {
		expect(fakeTimers.isFakeTimers()).toBe(false);

		fakeTimers.useFakeTimers();
		expect(fakeTimers.isFakeTimers()).toBe(true);

		fakeTimers.useRealTimers();
		expect(fakeTimers.isFakeTimers()).toBe(false);
	});

	/**
	 * @test Initialize with specific time
	 */
	test("should initialize with specific time", () => {
		fakeTimers.useFakeTimers({ now: new Date("2024-01-01T00:00:00Z") });

		expect(Date.now()).toBe(new Date("2024-01-01T00:00:00Z").getTime());

		fakeTimers.advanceTimersByTime(1000);
		expect(Date.now()).toBe(new Date("2024-01-01T00:00:01Z").getTime());
	});
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Testing Debounce Function
// ═══════════════════════════════════════════════════════════════

describe("Fake Timers - Debounce Function", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test Debounce delays execution
	 */
	test("should delay execution until inactivity", () => {
		fakeTimers.useFakeTimers();

		let callCount = 0;
		const debouncedFn = debounce(() => {
			callCount++;
		}, 100);

		// Call multiple times quickly
		debouncedFn();
		debouncedFn();
		debouncedFn();

		expect(callCount).toBe(0); // Not called yet

		// Advance less than delay
		fakeTimers.advanceTimersByTime(50);
		expect(callCount).toBe(0);

		// Advance to trigger
		fakeTimers.advanceTimersByTime(50);
		expect(callCount).toBe(1); // Only called once
	});

	/**
	 * @test Debounce resets on new calls
	 */
	test("should reset timer on new calls", () => {
		fakeTimers.useFakeTimers();

		let callCount = 0;
		const debouncedFn = debounce(() => {
			callCount++;
		}, 100);

		debouncedFn();
		fakeTimers.advanceTimersByTime(80);
		expect(callCount).toBe(0);

		// Reset by calling again
		debouncedFn();
		fakeTimers.advanceTimersByTime(80);
		expect(callCount).toBe(0); // Still waiting

		fakeTimers.advanceTimersByTime(20);
		expect(callCount).toBe(1);
	});
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Testing Throttle Function
// ═══════════════════════════════════════════════════════════════

describe("Fake Timers - Throttle Function", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test Throttle executes immediately first time
	 */
	test("should execute immediately on first call", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		let callCount = 0;
		const throttledFn = throttle(() => {
			callCount++;
		}, 100);

		throttledFn();
		expect(callCount).toBe(1);
	});

	/**
	 * @test Throttle limits subsequent calls
	 */
	test("should throttle subsequent calls", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		let callCount = 0;
		const throttledFn = throttle(() => {
			callCount++;
		}, 100);

		throttledFn(); // Executes immediately
		expect(callCount).toBe(1);

		throttledFn(); // Should be throttled
		expect(callCount).toBe(1);

		fakeTimers.advanceTimersByTime(100);
		expect(callCount).toBe(2); // Now executes
	});

	/**
	 * @test Throttle allows calls after delay
	 */
	test("should allow calls after delay period", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		let callCount = 0;
		const throttledFn = throttle(() => {
			callCount++;
		}, 100);

		throttledFn();
		expect(callCount).toBe(1);

		fakeTimers.advanceTimersByTime(100);
		throttledFn();
		expect(callCount).toBe(2);

		fakeTimers.advanceTimersByTime(100);
		throttledFn();
		expect(callCount).toBe(3);
	});
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Testing Rate Limiter
// ═══════════════════════════════════════════════════════════════

describe("Fake Timers - Rate Limiter", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test Rate limiter allows requests within limit
	 */
	test("should allow requests within limit", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		const limiter = new RateLimiter(5, 60000); // 5 requests per minute

		// Make 5 requests
		for (let i = 0; i < 5; i++) {
			expect(limiter.canRequest()).toBe(true);
			limiter.recordRequest();
			fakeTimers.advanceTimersByTime(1000);
		}

		// 6th request should be blocked
		expect(limiter.canRequest()).toBe(false);
	});

	/**
	 * @test Rate limiter resets after window
	 */
	test("should reset after time window", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		const limiter = new RateLimiter(3, 60000);

		// Exhaust limit
		for (let i = 0; i < 3; i++) {
			limiter.recordRequest();
		}
		expect(limiter.canRequest()).toBe(false);

		// Advance past the window
		fakeTimers.advanceTimersByTime(60001);

		// Should be able to request again
		expect(limiter.canRequest()).toBe(true);
	});

	/**
	 * @test Rate limiter sliding window
	 */
	test("should use sliding window", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		const limiter = new RateLimiter(3, 60000);

		// Make requests spread out
		limiter.recordRequest(); // t=0
		fakeTimers.advanceTimersByTime(20000);

		limiter.recordRequest(); // t=20s
		fakeTimers.advanceTimersByTime(20000);

		limiter.recordRequest(); // t=40s
		expect(limiter.canRequest()).toBe(false);

		// At t=60s, first request expires
		fakeTimers.advanceTimersByTime(20001);
		expect(limiter.canRequest()).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Testing Promise Timeouts
// ═══════════════════════════════════════════════════════════════

describe("Fake Timers - Promise Timeouts", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test Promise resolves before timeout
	 */
	test("should resolve before timeout", async () => {
		fakeTimers.useFakeTimers();

		async function fetchWithTimeout(delay: number, timeout: number): Promise<string> {
			return new Promise((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					reject(new Error(`Timeout after ${timeout}ms`));
				}, timeout);

				setTimeout(() => {
					clearTimeout(timeoutId);
					resolve("success");
				}, delay);
			});
		}

		const promise = fetchWithTimeout(50, 100);

		fakeTimers.advanceTimersByTime(50);

		await expect(promise).resolves.toBe("success");
	});

	/**
	 * @test Promise rejects on timeout
	 */
	test("should reject on timeout", async () => {
		fakeTimers.useFakeTimers();

		async function slowFetch(delay: number, timeout: number): Promise<string> {
			return new Promise((resolve, reject) => {
				setTimeout(() => resolve("slow response"), delay);
				setTimeout(() => reject(new Error("Timeout")), timeout);
			});
		}

		const promise = slowFetch(200, 100);

		fakeTimers.advanceTimersByTime(150);

		await expect(promise).rejects.toThrow("Timeout");
	});
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: Testing Event Emitters with Delays
// ═══════════════════════════════════════════════════════════════

describe("Fake Timers - Event Emitters", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test Delayed event emission
	 */
	test("should handle delayed event emission", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		const emitter = new EventEmitter();
		const events: Array<{ type: string; value: unknown; time: number }> = [];

		emitter.on("data", (value: unknown) => {
			events.push({ type: "data", value, time: Date.now() });
		});

		emitter.on("error", (error: string) => {
			events.push({ type: "error", value: error, time: Date.now() });
		});

		// Schedule events
		setTimeout(() => emitter.emit("data", "first"), 100);
		setTimeout(() => emitter.emit("data", "second"), 200);
		setTimeout(() => emitter.emit("error", "timeout"), 300);

		// No events yet
		expect(events.length).toBe(0);

		// Advance to first event
		fakeTimers.advanceTimersToNextTimer();
		expect(events).toEqual([{ type: "data", value: "first", time: 100 }]);

		// Run all remaining
		fakeTimers.runAllTimers();
		expect(events.length).toBe(3);
		expect(events[2]).toEqual({ type: "error", value: "timeout", time: 300 });
	});
});

// ═══════════════════════════════════════════════════════════════
// SECTION 7: URLPattern + Fake Timers Integration
// ═══════════════════════════════════════════════════════════════

describe("URLPattern + Fake Timers Integration", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test URLPatternRouter with timed requests
	 */
	test("should handle timed API requests with routing", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		const router = new URLPatternRouter();
		const responses: unknown[] = [];

		router.get("/users/:id", (params) => ({
			id: params.id,
			fetchedAt: Date.now(),
		}));

		router.get("/posts/:slug", (params) => ({
			slug: params.slug,
			fetchedAt: Date.now(),
		}));

		// Schedule requests
		setTimeout(() => {
			const request = new Request("https://api.example.com/users/123", { method: "GET" });
			const route = router.match(request);
			if (route) {
				responses.push(route.handler(route.params, route.match));
			}
		}, 100);

		setTimeout(() => {
			const request = new Request("https://api.example.com/posts/hello", { method: "GET" });
			const route = router.match(request);
			if (route) {
				responses.push(route.handler(route.params, route.match));
			}
		}, 200);

		expect(responses.length).toBe(0);

		fakeTimers.advanceTimersByTime(100);
		expect(responses.length).toBe(1);
		expect(responses[0]).toEqual({ id: "123", fetchedAt: 100 });

		fakeTimers.advanceTimersByTime(100);
		expect(responses.length).toBe(2);
		expect(responses[1]).toEqual({ slug: "hello", fetchedAt: 200 });
	});

	/**
	 * @test Mock API with simulated delays
	 */
	test("should simulate API delays with Mock API", async () => {
		fakeTimers.useFakeTimers();

		const api = new MockAPI();

		api.register(
			"/users/:id",
			({ id }) => ({
				id: parseInt(id),
				name: `User ${id}`,
			}),
			100
		);

		const startTime = Date.now();
		const promise = api.request("https://api.example.com/users/42");

		// Advance time to complete request
		fakeTimers.advanceTimersByTime(100);

		const result = await promise;
		expect(result).toEqual({ id: 42, name: "User 42" });
	});

	/**
	 * @test Rate-limited API with URLPattern routing
	 */
	test("should enforce rate limits on routed requests", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		const router = new URLPatternRouter();
		const limiter = new RateLimiter(3, 1000); // 3 requests per second
		const results: Array<{ success: boolean; data?: unknown }> = [];

		router.get("/api/:resource", (params) => ({
			resource: params.resource,
			timestamp: Date.now(),
		}));

		function makeRequest(url: string): void {
			if (limiter.canRequest()) {
				limiter.recordRequest();
				const request = new Request(url, { method: "GET" });
				const route = router.match(request);
				if (route) {
					results.push({ success: true, data: route.handler(route.params, route.match) });
				}
			} else {
				results.push({ success: false });
			}
		}

		// Make rapid requests
		makeRequest("https://api.example.com/api/users");
		makeRequest("https://api.example.com/api/posts");
		makeRequest("https://api.example.com/api/comments");
		makeRequest("https://api.example.com/api/likes"); // Should fail

		expect(results.filter((r) => r.success).length).toBe(3);
		expect(results[3].success).toBe(false);

		// Wait and try again
		fakeTimers.advanceTimersByTime(1001);
		makeRequest("https://api.example.com/api/likes");
		expect(results[4].success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// SECTION 8: Complex Scenarios
// ═══════════════════════════════════════════════════════════════

describe("Complex Scenarios", () => {
	afterEach(() => {
		fakeTimers.useRealTimers();
	});

	/**
	 * @test Retry logic with exponential backoff
	 */
	test("should handle retry with exponential backoff", async () => {
		fakeTimers.useFakeTimers();

		let attempts = 0;
		const maxAttempts = 3;
		const baseDelay = 100;

		async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
			while (attempts < maxAttempts) {
				try {
					return await fn();
				} catch (error) {
					attempts++;
					if (attempts >= maxAttempts) throw error;
					const delay = baseDelay * Math.pow(2, attempts - 1);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
			throw new Error("Max attempts reached");
		}

		// Simulate failing then succeeding
		let callCount = 0;
		const mockFetch = async (): Promise<string> => {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					callCount++;
					if (callCount < 3) {
						reject(new Error("Failed"));
					} else {
						resolve("Success");
					}
				}, 10);
			});
		};

		const promise = retryWithBackoff(mockFetch);

		// First attempt
		fakeTimers.advanceTimersByTime(10);
		// Wait for first retry delay (100ms)
		fakeTimers.advanceTimersByTime(100);
		// Second attempt
		fakeTimers.advanceTimersByTime(10);
		// Wait for second retry delay (200ms)
		fakeTimers.advanceTimersByTime(200);
		// Third attempt (success)
		fakeTimers.advanceTimersByTime(10);

		await expect(promise).resolves.toBe("Success");
		expect(attempts).toBe(2);
	});

	/**
	 * @test Polling with URLPattern-based endpoints
	 */
	test("should handle polling scenario", () => {
		fakeTimers.useFakeTimers({ now: 0 });

		const router = new URLPatternRouter();
		const pollResults: unknown[] = [];
		let pollCount = 0;

		router.get("/status/:jobId", (params) => ({
			jobId: params.jobId,
			status: pollCount < 3 ? "pending" : "complete",
			pollNumber: pollCount,
		}));

		function poll(jobId: string): void {
			const request = new Request(`https://api.example.com/status/${jobId}`, { method: "GET" });
			const route = router.match(request);
			if (route) {
				const result = route.handler(route.params, route.match) as { status: string };
				pollResults.push(result);
				pollCount++;

				if (result.status !== "complete") {
					setTimeout(() => poll(jobId), 1000);
				}
			}
		}

		poll("job-123");

		// First poll (pending)
		expect(pollResults.length).toBe(1);
		expect((pollResults[0] as { status: string }).status).toBe("pending");

		// Second poll
		fakeTimers.advanceTimersByTime(1000);
		expect(pollResults.length).toBe(2);

		// Third poll
		fakeTimers.advanceTimersByTime(1000);
		expect(pollResults.length).toBe(3);

		// Fourth poll (complete)
		fakeTimers.advanceTimersByTime(1000);
		expect(pollResults.length).toBe(4);
		expect((pollResults[3] as { status: string }).status).toBe("complete");

		// No more polls
		fakeTimers.advanceTimersByTime(1000);
		expect(pollResults.length).toBe(4);
	});
});
