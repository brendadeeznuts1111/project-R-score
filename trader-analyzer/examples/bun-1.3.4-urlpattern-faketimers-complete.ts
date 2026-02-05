#!/usr/bin/env bun
/**
 * @fileoverview Complete Guide: URLPattern API & Fake Timers in Bun v1.3.4
 * @description Comprehensive examples demonstrating URLPattern routing and Fake Timers testing
 * @version 1.0.0
 * @since Bun 1.3.4
 *
 * @see {@link https://bun.sh/blog/bun-v1.3.4#urlpattern-api|URLPattern API}
 * @see {@link https://bun.sh/blog/bun-v1.3.4#fake-timers-for-buntest|Fake Timers}
 * @see {@link ../test/bun-1.3.4-features.test.ts|Feature Tests}
 * @see {@link ../docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md|Runtime Enhancements}
 *
 * Run: bun run examples/bun-1.3.4-urlpattern-faketimers-complete.ts
 *
 * @module examples/bun-1.3.4-urlpattern-faketimers-complete
 */

// ═══════════════════════════════════════════════════════════════
// SECTION 1: URLPattern API - Complete Usage
// ═══════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════════");
console.log("  URLPattern API - Complete Usage Guide");
console.log("═══════════════════════════════════════════════════════════════\n");

// ---------------------------------------------
// 1.1 Basic Pattern Creation
// ---------------------------------------------
console.log("1.1 Basic Pattern Creation\n");

// From pathname string
const pattern1 = new URLPattern({ pathname: "/users/:id" });
console.log("Pattern 1 (pathname):", pattern1.pathname);

// From full object
const pattern2 = new URLPattern({
	protocol: "https",
	hostname: "*.example.com",
	pathname: "/api/:version/:resource/:id?",
	search: "*",
	hash: "*",
});
console.log("Pattern 2 (full):", {
	protocol: pattern2.protocol,
	hostname: pattern2.hostname,
	pathname: pattern2.pathname,
});

// ---------------------------------------------
// 1.2 Pattern Components & Syntax
// ---------------------------------------------
console.log("\n1.2 Pattern Components & Syntax\n");

const patterns = {
	// Named segments
	namedSegment: new URLPattern({ pathname: "/users/:id" }),

	// Regex constraints
	regexConstraint: new URLPattern({ pathname: "/blog/:year(\\d{4})/:month(\\d{2})" }),

	// Wildcard segments
	wildcard: new URLPattern({ pathname: "/files/*" }),

	// File extensions
	fileExtension: new URLPattern({ pathname: "/static/*.{png,jpg,gif,webp}" }),

	// Optional segments
	optionalSegment: new URLPattern({ pathname: "/api/:version/:resource/:id?" }),

	// Versioned API
	versionedApi: new URLPattern({ pathname: "/api/v:version(\\d+)/*" }),
};

// Test patterns
const testUrls = [
	"https://example.com/users/123",
	"https://example.com/blog/2024/01",
	"https://example.com/files/documents/report.pdf",
	"https://example.com/static/image.png",
	"https://example.com/api/v2/users",
];

console.log("Pattern matching results:");
for (const [name, pattern] of Object.entries(patterns)) {
	console.log(`\n  ${name}:`);
	for (const url of testUrls) {
		const matches = pattern.test(url);
		if (matches) {
			const result = pattern.exec(url);
			console.log(`    ✓ ${url}`);
			console.log(`      groups: ${JSON.stringify(result?.pathname.groups)}`);
		}
	}
}

// ---------------------------------------------
// 1.3 Advanced Pattern Examples
// ---------------------------------------------
console.log("\n\n1.3 Advanced Pattern Examples\n");

// API versioning pattern
const apiPattern = new URLPattern({
	protocol: "https",
	hostname: "api.*.com",
	pathname: "/v:version(\\d+)/:resource/:id?",
});

// Multi-tenant pattern
const tenantPattern = new URLPattern({
	hostname: ":tenant.app.example.com",
	pathname: "/admin/:section*",
});

// Authentication callback pattern
const authPattern = new URLPattern({
	protocol: "https",
	hostname: "auth.example.com",
	pathname: "/callback/:provider(github|google|facebook)",
	search: "?code=:code&state=:state",
});

console.log("API Pattern test:");
const apiMatch = apiPattern.exec("https://api.myapp.com/v2/users/123");
if (apiMatch) {
	console.log("  Matched:", apiMatch.pathname.groups);
}

console.log("\nTenant Pattern test:");
const tenantMatch = tenantPattern.exec("https://acme.app.example.com/admin/settings/users");
if (tenantMatch) {
	console.log("  Hostname groups:", tenantMatch.hostname.groups);
	console.log("  Pathname groups:", tenantMatch.pathname.groups);
}

console.log("\nAuth Pattern test:");
const authMatch = authPattern.exec(
	"https://auth.example.com/callback/github?code=abc123&state=xyz789"
);
if (authMatch) {
	console.log("  Pathname groups:", authMatch.pathname.groups);
	console.log("  Search groups:", authMatch.search.groups);
}

// ---------------------------------------------
// 1.4 Router Implementation
// ---------------------------------------------
console.log("\n\n1.4 Router Implementation\n");

type RouteHandler<T = unknown> = (params: Record<string, string>, match: URLPatternResult) => T;

interface Route {
	method: string;
	pattern: URLPattern;
	handler: RouteHandler;
}

class URLPatternRouter {
	private routes: Route[] = [];

	add(method: string, pattern: string | URLPattern, handler: RouteHandler): void {
		this.routes.push({
			method: method.toUpperCase(),
			pattern: typeof pattern === "string" ? new URLPattern({ pathname: pattern }) : pattern,
			handler,
		});
	}

	match(
		request: Request
	): { handler: RouteHandler; params: Record<string, string>; match: URLPatternResult } | null {
		const url = new URL(request.url);

		for (const route of this.routes) {
			if (route.method !== request.method && route.method !== "ALL") {
				continue;
			}

			const match = route.pattern.exec(url);
			if (match) {
				return {
					handler: route.handler,
					params: {
						...match.pathname.groups,
						...match.search.groups,
						...match.hash.groups,
					},
					match,
				};
			}
		}

		return null;
	}

	// Convenience methods
	get(pattern: string | URLPattern, handler: RouteHandler): void {
		this.add("GET", pattern, handler);
	}
	post(pattern: string | URLPattern, handler: RouteHandler): void {
		this.add("POST", pattern, handler);
	}
	put(pattern: string | URLPattern, handler: RouteHandler): void {
		this.add("PUT", pattern, handler);
	}
	delete(pattern: string | URLPattern, handler: RouteHandler): void {
		this.add("DELETE", pattern, handler);
	}
	all(pattern: string | URLPattern, handler: RouteHandler): void {
		this.add("ALL", pattern, handler);
	}
}

// Demo the router
const router = new URLPatternRouter();

router.get("/users/:id", (params) => {
	console.log(`  GET /users/${params.id} - Fetching user`);
	return { id: params.id, name: `User ${params.id}` };
});

router.post("/api/:version/:resource", (params) => {
	console.log(`  POST /api/${params.version}/${params.resource} - Creating resource`);
	return { created: true, version: params.version, resource: params.resource };
});

router.get("/files/*", (params) => {
	console.log(`  GET /files/* - Serving file`);
	return { file: params["0"] };
});

// Test the router
const testRequests = [
	new Request("https://example.com/users/123", { method: "GET" }),
	new Request("https://example.com/api/v2/posts", { method: "POST" }),
	new Request("https://example.com/files/docs/report.pdf", { method: "GET" }),
];

console.log("Router matching:");
for (const request of testRequests) {
	const route = router.match(request);
	if (route) {
		const result = route.handler(route.params, route.match);
		console.log(`    Result: ${JSON.stringify(result)}`);
	} else {
		console.log(`  No match for ${request.url}`);
	}
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Utility Functions for Testing
// ═══════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Utility Functions (Debounce, Throttle, RateLimiter)");
console.log("═══════════════════════════════════════════════════════════════\n");

/**
 * Debounce function - delays execution until after wait period of inactivity
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;
	return function (this: unknown, ...args: Parameters<T>) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), delay);
	};
}

/**
 * Throttle function - limits execution to at most once per wait period
 * First call executes immediately, subsequent calls are throttled
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let lastCall = -Infinity; // Allow first call to execute immediately
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let pendingArgs: Parameters<T> | null = null;

	return function (this: unknown, ...args: Parameters<T>) {
		const now = Date.now();
		const remaining = delay - (now - lastCall);

		if (remaining <= 0 || lastCall === -Infinity) {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			lastCall = now;
			fn.apply(this, args);
		} else if (!timeoutId) {
			pendingArgs = args;
			timeoutId = setTimeout(() => {
				lastCall = Date.now();
				timeoutId = null;
				if (pendingArgs) {
					fn.apply(this, pendingArgs);
					pendingArgs = null;
				}
			}, remaining);
		} else {
			// Update pending args for trailing call
			pendingArgs = args;
		}
	};
}

/**
 * Rate limiter - limits requests per time window
 */
export class RateLimiter {
	private requests: number[] = [];

	constructor(
		private requestsPerWindow: number,
		private windowMs: number = 60000
	) {}

	canRequest(): boolean {
		const now = Date.now();
		const windowStart = now - this.windowMs;

		// Remove old requests
		this.requests = this.requests.filter((time) => time > windowStart);

		return this.requests.length < this.requestsPerWindow;
	}

	recordRequest(): void {
		this.requests.push(Date.now());
	}

	async waitAndRequest(): Promise<boolean> {
		if (this.canRequest()) {
			this.recordRequest();
			return true;
		}

		const oldestRequest = Math.min(...this.requests);
		const waitTime = oldestRequest + this.windowMs - Date.now();

		await new Promise((resolve) => setTimeout(resolve, waitTime + 10));
		this.recordRequest();
		return true;
	}
}

console.log("Utility functions exported:");
console.log("  - debounce(fn, delay)");
console.log("  - throttle(fn, delay)");
console.log("  - RateLimiter(requestsPerWindow, windowMs)");

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Mock API with URLPattern + Timing
// ═══════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Mock API with URLPattern + Delayed Responses");
console.log("═══════════════════════════════════════════════════════════════\n");

type EndpointHandler = (params: Record<string, string>) => unknown;

/**
 * Mock API that combines URLPattern routing with simulated response delays
 */
export class MockAPI {
	private endpoints: Map<URLPattern, { handler: EndpointHandler; delay: number }> = new Map();

	register(pattern: string, handler: EndpointHandler, delay = 0): void {
		this.endpoints.set(new URLPattern({ pathname: pattern }), { handler, delay });
	}

	async request(url: string): Promise<unknown> {
		for (const [pattern, { handler, delay }] of this.endpoints) {
			const match = pattern.exec(url);
			if (match) {
				if (delay > 0) {
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
				return handler(match.pathname.groups);
			}
		}
		throw new Error(`Endpoint not found: ${url}`);
	}
}

// Demo the Mock API
const api = new MockAPI();

api.register(
	"/users/:id",
	({ id }) => ({
		id: parseInt(id),
		name: `User ${id}`,
		createdAt: new Date().toISOString(),
	}),
	50
);

api.register(
	"/posts/:slug",
	({ slug }) => ({
		slug,
		title: `Post about ${slug}`,
		views: Math.floor(Math.random() * 1000),
	}),
	100
);

api.register(
	"/api/v:version/:resource",
	({ version, resource }) => ({
		version,
		resource,
		data: [],
	}),
	25
);

console.log("Mock API endpoints registered:");
console.log("  - GET /users/:id (50ms delay)");
console.log("  - GET /posts/:slug (100ms delay)");
console.log("  - GET /api/v:version/:resource (25ms delay)");

// Test API calls
console.log("\nMock API calls:");
const start = Bun.nanoseconds();

const results = await Promise.all([
	api.request("https://example.com/users/123"),
	api.request("https://example.com/posts/bun-rocks"),
	api.request("https://example.com/api/v2/markets"),
]);

const duration = (Bun.nanoseconds() - start) / 1_000_000;
console.log(`  Completed in ${duration.toFixed(2)}ms`);
console.log("  Results:");
results.forEach((result, i) => {
	console.log(`    ${i + 1}: ${JSON.stringify(result)}`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Export for Testing
// ═══════════════════════════════════════════════════════════════

export { MockAPI as MockAPIClass, URLPatternRouter };

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Examples Complete!");
console.log("═══════════════════════════════════════════════════════════════");
console.log("\nSee test file for Fake Timer examples:");
console.log("  bun test examples/bun-1.3.4-urlpattern-faketimers-complete.test.ts\n");
