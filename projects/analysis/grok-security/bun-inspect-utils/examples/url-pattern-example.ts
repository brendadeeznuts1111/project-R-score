/**
 * [EXAMPLE][URL-PATTERN][USAGE]{BUN-NATIVE}
 * URLPattern matching and routing examples
 * Run with: bun examples/url-pattern-example.ts
 */

import {
  URLPatternMatcher,
  URLPatterns,
  URLPatternValidator,
} from "../src/networking/url-pattern";

console.log("\n🌐 [1.0.0.0] URLPattern Examples\n");

// [1.1.0.0] Basic Pattern Matching
console.log("📋 [1.1.0.0] Basic Pattern Matching");
console.log("─".repeat(50));

const apiMatcher = new URLPatternMatcher({
  pathname: "/api/:version/:resource/:id?",
});

const testUrls = [
  "/api/v1/users",
  "/api/v1/users/123",
  "/api/v2/posts/456",
  "/admin/users",
];

for (const url of testUrls) {
  const matches = apiMatcher.test(url);
  const status = matches ? "✅" : "❌";
  console.log(`  ${status} ${url}`);
}

// [1.2.0.0] Extract Matched Groups
console.log("\n📊 [1.2.0.0] Extract Matched Groups");
console.log("─".repeat(50));

const result = apiMatcher.exec("/api/v1/users/123");
if (result) {
  console.log(`  URL: /api/v1/users/123`);
  console.log(`  version: ${result.pathname.groups.version}`);
  console.log(`  resource: ${result.pathname.groups.resource}`);
  console.log(`  id: ${result.pathname.groups.id}`);
}

// [1.3.0.0] Protocol Matching
console.log("\n🔒 [1.3.0.0] Protocol Matching");
console.log("─".repeat(50));

const secureMatcher = new URLPatternMatcher({
  protocol: "https",
  hostname: "api.example.com",
  pathname: "/v1/:resource",
});

const protocolTests = [
  "https://api.example.com/v1/users",
  "http://api.example.com/v1/users",
  "https://api.example.com/v2/users",
];

for (const url of protocolTests) {
  const matches = secureMatcher.test(url);
  const status = matches ? "✅" : "❌";
  console.log(`  ${status} ${url}`);
}

// [1.4.0.0] Preset Patterns
console.log("\n🎯 [1.4.0.0] Preset Patterns");
console.log("─".repeat(50));

const restMatcher = URLPatterns.restAPI("/api");
const fileMatcher = URLPatterns.fileDownload("/downloads");
const hashMatcher = URLPatterns.hashRouting();

console.log("  REST API:");
console.log(`    ✅ /api/v1/users/123: ${restMatcher.test("/api/v1/users/123")}`);

console.log("  File Download:");
console.log(`    ✅ /downloads/file.pdf: ${fileMatcher.test("/downloads/file.pdf")}`);

console.log("  Hash Routing:");
console.log(`    ✅ /#/dashboard: ${hashMatcher.test("/#/dashboard")}`);

// [1.5.0.0] Pattern Validator
console.log("\n🔍 [1.5.0.0] Pattern Validator");
console.log("─".repeat(50));

const validator = new URLPatternValidator();
validator.register("api", URLPatterns.restAPI("/api"));
validator.register("files", URLPatterns.fileDownload("/downloads"));
validator.register("hash", URLPatterns.hashRouting());

const testUrl = "/api/v1/users/123";
const matches = validator.testAll(testUrl);
console.log(`  URL: ${testUrl}`);
console.log(`  Matching patterns: ${matches.join(", ") || "none"}`);

const firstMatch = validator.findFirst(testUrl);
console.log(`  First match: ${firstMatch}`);

// [1.6.0.0] Extract from Validator
console.log("\n📤 [1.6.0.0] Extract from Validator");
console.log("─".repeat(50));

const extracted = validator.extractFirst("/api/v2/posts/789");
if (extracted) {
  console.log(`  URL: /api/v2/posts/789`);
  console.log(`  Pattern: api`);
  console.log(`  Groups:`, extracted.pathname.groups);
}

// [1.7.0.0] Query Parameter Matching
console.log("\n🔎 [1.7.0.0] Query Parameter Matching");
console.log("─".repeat(50));

const searchMatcher = new URLPatternMatcher({
  pathname: "/search",
  search: "?q=:query&limit=:limit?",
});

const searchTests = [
  "/search?q=typescript&limit=10",
  "/search?q=javascript",
  "/search?q=rust&limit=20",
];

for (const url of searchTests) {
  const matches = searchMatcher.test(url);
  const status = matches ? "✅" : "❌";
  console.log(`  ${status} ${url}`);
}

// [1.8.0.0] Subdomain Routing
console.log("\n🌍 [1.8.0.0] Subdomain Routing");
console.log("─".repeat(50));

const subdomainMatcher = new URLPatternMatcher({
  hostname: ":subdomain.example.com",
  pathname: "/*",
});

const subdomainTests = [
  "https://api.example.com/users",
  "https://admin.example.com/dashboard",
  "https://example.com/home",
];

for (const url of subdomainTests) {
  const matches = subdomainMatcher.test(url);
  const status = matches ? "✅" : "❌";
  console.log(`  ${status} ${url}`);
}

// [1.9.0.0] Performance Metrics
console.log("\n⏱️  [1.9.0.0] Performance Metrics");
console.log("─".repeat(50));

const iterations = 10000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  apiMatcher.test("/api/v1/users/123");
  secureMatcher.test("https://api.example.com/v1/users");
  validator.testAll("/api/v1/users/123");
}

const end = performance.now();
const duration = end - start;

console.log(`  Iterations: ${iterations * 3}`);
console.log(`  Duration: ${duration.toFixed(2)}ms`);
console.log(`  Per-op: ${(duration / (iterations * 3)).toFixed(4)}ms`);
console.log(`  Throughput: ${((iterations * 3) / (duration / 1000)).toFixed(0)} ops/sec`);

console.log("\n✅ URLPattern examples complete!\n");

