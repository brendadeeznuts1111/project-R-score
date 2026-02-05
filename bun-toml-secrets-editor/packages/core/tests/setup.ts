#!/usr/bin/env bun
// tests/setup.ts - Test Setup and Configuration

/**
 * Test setup file for comprehensive test suite
 * Configures global test environment and mocks
 */

// Global test configuration
globalThis.testConfig = {
	timeout: 10000,
	retry: 3,
	verbose: true,
};

// Add Bun.sleep helper for tests
if (!globalThis.Bun.sleep) {
	globalThis.Bun.sleep = (ms: number) =>
		new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock console for cleaner test output
const originalConsole = globalThis.console;
globalThis.console = {
	...originalConsole,
	log: (...args) => {
		if (process.env.VERBOSE_TESTS === "true") {
			originalConsole.log(...args);
		}
	},
	warn: (...args) => {
		if (process.env.VERBOSE_TESTS === "true") {
			originalConsole.warn(...args);
		}
	},
	error: (...args) => {
		if (process.env.VERBOSE_TESTS === "true") {
			originalConsole.error(...args);
		}
	},
};

// Setup global fetch mock for tests
globalThis.mockFetch = {
	responses: new Map(),
	setResponse(url: string, response: Response | Error) {
		this.responses.set(url, response);
	},
	clear() {
		this.responses.clear();
	},
};

// Override fetch for testing
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
	const url = typeof input === "string" ? input : input.toString();

	// Check if we have a mock response
	if (mockFetch.responses.has(url)) {
		const response = mockFetch.responses.get(url);
		if (response instanceof Error) {
			throw response;
		}
		return response;
	}

	// For integration tests, use real fetch
	if (process.env.INTEGRATION_TESTS === "true") {
		return originalFetch(input, init);
	}

	// Default mock response
	return new Response('{"mock": true}', {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};

// Test utilities
globalThis.testUtils = {
	async waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
		const start = Date.now();
		while (!condition() && Date.now() - start < timeout) {
			await Bun.sleep(10);
		}
		if (!condition()) {
			throw new Error(`Condition not met within ${timeout}ms`);
		}
	},

	createMockRSSFeed(itemCount = 5): string {
		const items = Array(itemCount)
			.fill(0)
			.map(
				(_, i) => `
    <item>
      <title>Test Item ${i + 1}</title>
      <link>https://example.com/item/${i + 1}</link>
      <description>Description for item ${i + 1}</description>
      <guid>item-${i + 1}</guid>
      <pubDate>${new Date(Date.now() - i * 3600000).toUTCString()}</pubDate>
    </item>`,
			)
			.join("");

		return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test RSS Feed</title>
    <link>https://example.com</link>
    <description>Test feed for unit testing</description>
    ${items}
  </channel>
</rss>`;
	},

	createMockRobotsTxt(
		disallowed = ["/private"],
		allowed = ["/public"],
	): string {
		return `User-agent: *
${disallowed.map((path) => `Disallow: ${path}`).join("\n")}
${allowed.map((path) => `Allow: ${path}`).join("\n")}
Crawl-delay: 1`;
	},

	measureTiming<T>(
		fn: () => Promise<T>,
	): Promise<{ result: T; duration: number }> {
		const start = performance.now();
		return fn().then((result) => ({
			result,
			duration: performance.now() - start,
		}));
	},
};

// Cleanup after tests
process.on("exit", () => {
	globalThis.console = originalConsole;
	globalThis.fetch = originalFetch;
});

export {};
