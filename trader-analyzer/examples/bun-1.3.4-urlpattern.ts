#!/usr/bin/env bun
/**
 * @fileoverview Bun 1.3.4 URLPattern API Examples
 * @description Demonstrates URLPattern usage for route matching and parameter extraction
 * @version 1.3.4.0.0.0.0
 * 
 * Bun 1.3.4+ URLPattern API Examples
 * [DoD][EXAMPLE:URLPattern][SCOPE:Routing]
 * 
 * Cross-reference: docs/BUN-1.3.4-URLPATTERN-API.md
 * Ripgrep Pattern: 1\.3\.4\.0\.0\.0\.0|URLPattern.*example|bun-1\.3\.4-urlpattern
 */

import { Hono } from "hono";

const app = new Hono();

// ============ Example 1: Basic Pattern Matching ============

console.log("=== Example 1: Basic Pattern Matching ===\n");

const userPattern = new URLPattern({ pathname: "/users/:id" });

console.log("Pattern:", userPattern.pathname);
console.log("Test '/users/123':", userPattern.test("https://example.com/users/123")); // true
console.log("Test '/posts/456':", userPattern.test("https://example.com/posts/456")); // false

const result = userPattern.exec("https://example.com/users/123");
if (result) {
	console.log("Extracted ID:", result.pathname.groups.id); // "123"
}

// ============ Example 2: Multiple Parameters ============

console.log("\n=== Example 2: Multiple Parameters ===\n");

const apiPattern = new URLPattern({
	pathname: "/api/v1/:resource/:id/:action"
});

const apiMatch = apiPattern.exec("https://api.example.com/api/v1/secrets/hyperbun/TELEGRAM_BOT_TOKEN/get");
if (apiMatch) {
	console.log("Resource:", apiMatch.pathname.groups.resource); // "secrets"
	console.log("ID:", apiMatch.pathname.groups.id); // "hyperbun"
	console.log("Action:", apiMatch.pathname.groups.action); // "TELEGRAM_BOT_TOKEN"
}

// ============ Example 3: Wildcard Matching ============

console.log("\n=== Example 3: Wildcard Matching ===\n");

const filesPattern = new URLPattern({ pathname: "/files/*" });
const fileMatch = filesPattern.exec("https://example.com/files/image.png");

if (fileMatch) {
	console.log("File path:", fileMatch.pathname.groups[0]); // "image.png"
}

// ============ Example 4: Query Parameters ============

console.log("\n=== Example 4: Query Parameters ===\n");

const searchPattern = new URLPattern({
	pathname: "/api/v1/logs",
	search: "?level=:level&limit=:limit"
});

const searchMatch = searchPattern.exec("https://api.example.com/api/v1/logs?level=INFO&limit=100");
if (searchMatch) {
	console.log("Level:", searchMatch.search.groups.level); // "INFO"
	console.log("Limit:", searchMatch.search.groups.limit); // "100"
}

// ============ Example 5: Regex Validation ============

console.log("\n=== Example 5: Regex Validation ===\n");

const numericIdPattern = new URLPattern({
	pathname: "/users/:id(\\d+)"
});

console.log("Numeric pattern test '/users/123':", numericIdPattern.test("https://example.com/users/123")); // true
console.log("Numeric pattern test '/users/abc':", numericIdPattern.test("https://example.com/users/abc")); // false
console.log("Has regex groups:", numericIdPattern.hasRegExpGroups); // true

// ============ Example 6: Hono Integration ============

console.log("\n=== Example 6: Hono Integration ===\n");

// Pre-compile patterns for performance
const routePatterns = {
	auth: new URLPattern({ pathname: "/api/v1/auth/:action" }),
	secrets: new URLPattern({ pathname: "/api/v1/secrets/:server/:type" }),
	graph: new URLPattern({ pathname: "/api/v1/graph" }),
	logs: new URLPattern({ pathname: "/api/v1/logs" })
};

// Middleware to extract route parameters using URLPattern
app.use("*", async (c, next) => {
	const url = new URL(c.req.url);
	
	// Match against known patterns
	for (const [routeType, pattern] of Object.entries(routePatterns)) {
		const match = pattern.exec(url.toString());
		if (match) {
			// Store matched groups in context
			c.set("routeType", routeType);
			c.set("routeParams", match.pathname.groups);
			break;
		}
	}
	
	await next();
});

// Example route handler using URLPattern-extracted params
app.get("/api/v1/secrets/:server/:type", async (c) => {
	const routeParams = c.get("routeParams");
	const server = routeParams?.server || c.req.param("server");
	const type = routeParams?.type || c.req.param("type");
	
	return c.json({
		message: "Secret retrieved",
		server,
		type,
		method: "URLPattern extraction"
	});
});

// ============ Example 7: Route Validation ============

console.log("\n=== Example 7: Route Validation ===\n");

const validRoutes = [
	new URLPattern({ pathname: "/api/v1/auth/:action" }),
	new URLPattern({ pathname: "/api/v1/secrets/:server/:type" }),
	new URLPattern({ pathname: "/api/v1/graph" }),
	new URLPattern({ pathname: "/api/v1/logs" })
];

function isValidRoute(url: string): boolean {
	return validRoutes.some(pattern => pattern.test(url));
}

console.log("Valid route '/api/v1/auth/login':", isValidRoute("https://api.example.com/api/v1/auth/login")); // true
console.log("Valid route '/api/v1/invalid':", isValidRoute("https://api.example.com/api/v1/invalid")); // false

// ============ Example 8: Pattern Caching ============

console.log("\n=== Example 8: Pattern Caching ===\n");

const patternCache = new Map<string, URLPattern>();

function getPattern(template: string): URLPattern {
	if (!patternCache.has(template)) {
		patternCache.set(template, new URLPattern({ pathname: template }));
	}
	return patternCache.get(template)!;
}

const cachedPattern = getPattern("/api/v1/users/:id");
console.log("Cached pattern test:", cachedPattern.test("https://api.example.com/api/v1/users/123")); // true

// ============ Example 9: Full URL Matching ============

console.log("\n=== Example 9: Full URL Matching ===\n");

const fullPattern = new URLPattern({
	protocol: "https",
	hostname: "api.example.com",
	pathname: "/api/v1/:resource/:id"
});

console.log("Full pattern match:", fullPattern.test("https://api.example.com/api/v1/users/123")); // true
console.log("Wrong protocol:", fullPattern.test("http://api.example.com/api/v1/users/123")); // false
console.log("Wrong hostname:", fullPattern.test("https://www.example.com/api/v1/users/123")); // false

// ============ Example 10: Multiple Patterns ============

console.log("\n=== Example 10: Multiple Patterns ===\n");

const versionPatterns = [
	new URLPattern({ pathname: "/api/v1/:resource" }),
	new URLPattern({ pathname: "/api/v2/:resource" })
];

function matchAnyVersion(url: string) {
	for (const pattern of versionPatterns) {
		const match = pattern.exec(url);
		if (match) {
			return {
				version: pattern.pathname.includes("v1") ? "v1" : "v2",
				resource: match.pathname.groups.resource
			};
		}
	}
	return null;
}

const versionMatch = matchAnyVersion("https://api.example.com/api/v2/users");
console.log("Version match:", versionMatch); // { version: "v2", resource: "users" }

console.log("\n=== All Examples Complete ===\n");

// Export for use in other modules
export {
	apiPattern,
	filesPattern, fullPattern, getPattern, isValidRoute, matchAnyVersion, numericIdPattern,
	routePatterns, searchPattern, userPattern
};

