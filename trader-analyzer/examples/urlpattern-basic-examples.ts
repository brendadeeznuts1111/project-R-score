#!/usr/bin/env bun
/**
 * @fileoverview URLPattern Basic Examples
 * @description Simple examples demonstrating URLPattern API usage for route matching, parameter extraction, and pattern validation
 * @module examples/urlpattern-basic-examples
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@1.3.4.1.0.0.0;instance-id=EXAMPLE-URLPATTERN-BASIC-001;version=1.3.4.1.0.0.0}]
 * [PROPERTIES:{example={value:"URLPattern Basic Examples";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-URLPATTERN"];@version:"1.3.4.1.0.0.0"}}]
 * [CLASS:URLPatternExamples][#REF:v-1.3.4.1.0.0.0.BP.EXAMPLES.URLPATTERN.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 1.3.4.1.0.0.0
 * Ripgrep Pattern: 1\.3\.4\.1\.0\.0\.0|EXAMPLE-URLPATTERN-BASIC-001|BP-EXAMPLE@1\.3\.4\.1\.0\.0\.0|urlpattern-basic-examples
 * 
 * Demonstrates:
 * - Basic parameter extraction with exec()
 * - Wildcard matching with groups[0]
 * - Multiple parameter extraction
 * - Query parameter parsing
 * - Pattern validation with test()
 * - Pattern property access
 * - Regex validation with hasRegExpGroups
 * 
 * Web Platform Tests: Bun's URLPattern implementation passes 408 Web Platform Tests.
 * Thanks to the WebKit team for implementing this!
 * 
 * @example 1.3.4.1.0.0.0.1: Basic Parameter Extraction
 * // Test Formula:
 * // 1. Create URLPattern with pathname pattern
 * // 2. Call exec() with matching URL
 * // 3. Extract parameter from result.pathname.groups
 * // Expected Result: Parameter value extracted successfully
 * //
 * // Snippet:
 * ```typescript
 * const pattern = new URLPattern({ pathname: "/users/:id" });
 * const result = pattern.exec("https://example.com/users/123");
 * console.log(result.pathname.groups.id); // "123"
 * ```
 * 
 * @example 1.3.4.1.0.0.0.2: Wildcard Matching
 * // Test Formula:
 * // 1. Create URLPattern with wildcard pathname
 * // 2. Call exec() with matching URL
 * // 3. Extract wildcard value from groups[0]
 * // Expected Result: Wildcard path extracted successfully
 * //
 * // Snippet:
 * ```typescript
 * const filesPattern = new URLPattern({ pathname: "/files/*" });
 * const match = filesPattern.exec("https://example.com/files/image.png");
 * console.log(match.pathname.groups[0]); // "image.png"
 * ```
 * 
 * @see {@link ../docs/BUN-1.3.4-URLPATTERN-API.md Bun 1.3.4 URLPattern API Documentation}
 * @see {@link ../docs/URLPATTERN-API-REFERENCE.md URLPattern API Reference}
 * @see {@link ../test/urlpattern-api-comprehensive.test.ts URLPattern Comprehensive Tests}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URLPattern MDN URLPattern Documentation}
 * 
 * // Ripgrep: 1.3.4.1.0.0.0
 * // Ripgrep: EXAMPLE-URLPATTERN-BASIC-001
 * // Ripgrep: BP-EXAMPLE@1.3.4.1.0.0.0
 * 
 * Run: bun run examples/urlpattern-basic-examples.ts
 * 
 * @author NEXUS Team
 * @since Bun 1.3.4+
 */

// ============ Example 1: Basic Parameter Extraction ============

console.log("=== Example 1: Basic Parameter Extraction ===\n");

const pattern = new URLPattern({ pathname: "/users/:id" });
const result = pattern.exec("https://example.com/users/123");

if (result) {
	console.log("Extracted ID:", result.pathname.groups.id); // "123"
} else {
	console.log("No match found");
}

// ============ Example 2: Wildcard Matching ============

console.log("\n=== Example 2: Wildcard Matching ===\n");

const filesPattern = new URLPattern({ pathname: "/files/*" });
const match = filesPattern.exec("https://example.com/files/image.png");

if (match) {
	console.log("File path:", match.pathname.groups[0]); // "image.png"
} else {
	console.log("No match found");
}

// ============ Example 3: Multiple Parameters ============

console.log("\n=== Example 3: Multiple Parameters ===\n");

const apiPattern = new URLPattern({
	pathname: "/api/v1/:resource/:id",
});

const apiResult = apiPattern.exec("https://api.example.com/api/v1/users/123");

if (apiResult) {
	console.log("Resource:", apiResult.pathname.groups.resource); // "users"
	console.log("ID:", apiResult.pathname.groups.id); // "123"
}

// ============ Example 4: With Query Parameters ============

console.log("\n=== Example 4: With Query Parameters ===\n");

const searchPattern = new URLPattern({
	pathname: "/api/logs",
	search: "?level=:level&limit=:limit",
});

const searchResult = searchPattern.exec(
	"https://api.example.com/api/logs?level=INFO&limit=100",
);

if (searchResult) {
	console.log("Level:", searchResult.search.groups.level); // "INFO"
	console.log("Limit:", searchResult.search.groups.limit); // "100"
}

// ============ Example 5: Using test() for Validation ============

console.log("\n=== Example 5: Using test() for Validation ===\n");

const userPattern = new URLPattern({ pathname: "/users/:id" });

console.log("Test '/users/123':", userPattern.test("https://example.com/users/123")); // true
console.log("Test '/posts/456':", userPattern.test("https://example.com/posts/456")); // false

// ============ Example 6: Pattern Properties ============

console.log("\n=== Example 6: Pattern Properties ===\n");

const fullPattern = new URLPattern({
	protocol: "https",
	hostname: "api.example.com",
	pathname: "/api/v1/:resource/:id",
	search: "?filter=:filter",
});

console.log("Protocol:", fullPattern.protocol); // "https"
console.log("Hostname:", fullPattern.hostname); // "api.example.com"
console.log("Pathname:", fullPattern.pathname); // "/api/v1/:resource/:id"
console.log("Search:", fullPattern.search); // "filter=:filter" (no '?')
console.log("Has Regex:", fullPattern.hasRegExpGroups); // false

// ============ Example 7: Regex Validation ============

console.log("\n=== Example 7: Regex Validation ===\n");

const numericPattern = new URLPattern({ pathname: "/users/:id(\\d+)" });

console.log("Test '/users/123':", numericPattern.test("https://example.com/users/123")); // true
console.log("Test '/users/abc':", numericPattern.test("https://example.com/users/abc")); // false
console.log("Has Regex:", numericPattern.hasRegExpGroups); // true

console.log("\n=== All Examples Complete ===\n");
