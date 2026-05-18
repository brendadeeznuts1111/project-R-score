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

console.info("\n🌐 [1.0.0.0] URLPattern Examples\n");

// [1.1.0.0] Basic Pattern Matching
console.info("📋 [1.1.0.0] Basic Pattern Matching");
console.info("─".repeat(50));

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
  console.info(`  ${status} ${url}`);
}

// [1.2.0.0] Extract Matched Groups
console.info("\n📊 [1.2.0.0] Extract Matched Groups");
console.info("─".repeat(50));

const result = apiMatcher.exec("/api/v1/users/123");
if (result) {
  console.info(`  URL: /api/v1/users/123`);
  console.info(`  version: ${result.pathname.groups.version}`);
  console.info(`  resource: ${result.pathname.groups.resource}`);
  console.info(`  id: ${result.pathname.groups.id}`);
}

// [1.3.0.0] Protocol Matching
console.info("\n🔒 [1.3.0.0] Protocol Matching");
console.info("─".repeat(50));

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
  console.info(`  ${status} ${url}`);
}

// [1.4.0.0] Preset Patterns
console.info("\n🎯 [1.4.0.0] Preset Patterns");
console.info("─".repeat(50));

const restMatcher = URLPatterns.restAPI("/api");
const fileMatcher = URLPatterns.fileDownload("/downloads");
const hashMatcher = URLPatterns.hashRouting();

console.info("  REST API:");
console.info(`    ✅ /api/v1/users/123: ${restMatcher.test("/api/v1/users/123")}`);

console.info("  File Download:");
console.info(`    ✅ /downloads/file.pdf: ${fileMatcher.test("/downloads/file.pdf")}`);

console.info("  Hash Routing:");
console.info(`    ✅ /#/dashboard: ${hashMatcher.test("/#/dashboard")}`);

// [1.5.0.0] Pattern Validator
console.info("\n🔍 [1.5.0.0] Pattern Validator");
console.info("─".repeat(50));

const validator = new URLPatternValidator();
validator.register("api", URLPatterns.restAPI("/api"));
validator.register("files", URLPatterns.fileDownload("/downloads"));
validator.register("hash", URLPatterns.hashRouting());

const testUrl = "/api/v1/users/123";
const matches = validator.testAll(testUrl);
console.info(`  URL: ${testUrl}`);
console.info(`  Matching patterns: ${matches.join(", ") || "none"}`);

const firstMatch = validator.findFirst(testUrl);
console.info(`  First match: ${firstMatch}`);

// [1.6.0.0] Extract from Validator
console.info("\n📤 [1.6.0.0] Extract from Validator");
console.info("─".repeat(50));

const extracted = validator.extractFirst("/api/v2/posts/789");
if (extracted) {
  console.info(`  URL: /api/v2/posts/789`);
  console.info(`  Pattern: api`);
  console.info(`  Groups:`, extracted.pathname.groups);
}

// [1.7.0.0] Query Parameter Matching
console.info("\n🔎 [1.7.0.0] Query Parameter Matching");
console.info("─".repeat(50));

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
  console.info(`  ${status} ${url}`);
}

// [1.8.0.0] Subdomain Routing
console.info("\n🌍 [1.8.0.0] Subdomain Routing");
console.info("─".repeat(50));

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
  console.info(`  ${status} ${url}`);
}

// [1.9.0.0] Performance Metrics
console.info("\n⏱️  [1.9.0.0] Performance Metrics");
console.info("─".repeat(50));

const iterations = 10000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  apiMatcher.test("/api/v1/users/123");
  secureMatcher.test("https://api.example.com/v1/users");
  validator.testAll("/api/v1/users/123");
}

const end = performance.now();
const duration = end - start;

console.info(`  Iterations: ${iterations * 3}`);
console.info(`  Duration: ${duration.toFixed(2)}ms`);
console.info(`  Per-op: ${(duration / (iterations * 3)).toFixed(4)}ms`);
console.info(`  Throughput: ${((iterations * 3) / (duration / 1000)).toFixed(0)} ops/sec`);

console.info("\n✅ URLPattern examples complete!\n");

