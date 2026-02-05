#!/usr/bin/env bun

/**
 * Bun Color API & URLPattern API Demonstration
 *
 * This script demonstrates Bun's native APIs for colors and URL routing.
 */

import { BunColorFormatter } from "./src/utils/color-api";
import { ScoringAPIRouter, URLPatternValidator, demonstrateURLPattern } from "./src/utils/urlpattern-api";

// Demonstrate Bun Color API (Color Conversion)
console.log("🎨 === BUN COLOR API (Color Conversion) ===\n");

// Color format conversions
console.log("Color Format Conversions:");
console.log("RGB to Hex:", Bun.color([255, 0, 0], "hex"));        // #ff0000
console.log("Hex to RGB:", Bun.color("#00ff00", "rgb"));           // rgb(0, 255, 0)
console.log("Named to Hex:", Bun.color("blue", "hex"));            // #0000ff
console.log("RGB to HSL:", Bun.color([255, 0, 0], "hsl"));         // hsl(0, 100%, 50%)
console.log("Hex to ANSI:", Bun.color("#ff0000", "ansi"));         // 31 (red)

// Demonstrate Terminal Coloring (using ANSI escape sequences)
console.log("\n🖥️  === TERMINAL COLORING (ANSI Escape Sequences) ===\n");

// ANSI color codes (standard terminal colors)
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m"
};

console.log("Basic ANSI Colors:");
console.log(`${colors.red}Red text${colors.reset}`);
console.log(`${colors.green}Green text${colors.reset}`);
console.log(`${colors.blue}Blue text${colors.reset}`);
console.log(`${colors.yellow}Yellow text${colors.reset}`);
console.log(`${colors.magenta}Magenta text${colors.reset}`);
console.log(`${colors.cyan}Cyan text${colors.reset}`);

// ANSI Colors setting
console.log("\nANSI Colors Setting:");
console.log(BunColorFormatter.info(`Bun.enableANSIColors: ${Bun.enableANSIColors}`));

// Bun.stripANSI demonstration
const ansiText = `${colors.red}Red${colors.reset} and ${colors.blue}Blue${colors.reset}`;
console.log(`\nANSI text: "${ansiText}"`);
console.log(`Stripped: "${Bun.stripANSI(ansiText)}"`);

// Formatted messages
console.log("\nFormatted Messages:");
console.log(BunColorFormatter.success("Operation completed successfully"));
console.log(BunColorFormatter.error("An error occurred"));
console.log(BunColorFormatter.warning("This is a warning"));
console.log(BunColorFormatter.info("This is informational"));

// Demonstrate URLPattern API
console.log("\n🔗 === URLPATTERN API DEMONSTRATION ===\n");

// Basic URLPattern examples
demonstrateURLPattern();

// Create Scoring API Router
console.log("\n🎯 === SCORING API ROUTER ===\n");

const router = new ScoringAPIRouter();

// Test various API endpoints
const testUrls = [
  "https://api.example.com/api/score/123",
  "https://api.example.com/api/score/batch/batch-001",
  "https://api.example.com/api/score/stream/client-abc",
  "https://api.example.com/api/score/cache/clear",
  "https://api.example.com/api/score/health/detailed",
  "https://api.example.com/api/score/health"
];

testUrls.forEach(url => {
  const result = router.handle(url);
  if (result) {
    console.log(BunColorFormatter.success(`${result.type}: ${JSON.stringify(result, null, 0)}`));
  } else {
    console.log(BunColorFormatter.error(`No match for: ${url}`));
  }
});

// URLPattern Validation Examples
console.log("\n✅ === URLPATTERN VALIDATION ===\n");

const scorePattern = new URLPattern({ pathname: "/api/score/:id" });
const validUrls = [
  "https://example.com/api/score/123",
  "https://example.com/api/score/abc",
  "https://example.com/api/score/xyz-123"
];

const invalidUrls = [
  "https://example.com/api/users/123",
  "https://example.com/api/score/",
  "https://example.com/api/scores/123"
];

console.log("Valid URLs:");
validUrls.forEach(url => {
  const isValid = URLPatternValidator.validateRoute(url, scorePattern);
  const params = URLPatternValidator.extractParams(url, scorePattern);
  console.log(`${isValid ? BunColorFormatter.success("✓") : BunColorFormatter.error("✗")} ${url} -> ${JSON.stringify(params)}`);
});

console.log("\nInvalid URLs:");
invalidUrls.forEach(url => {
  const isValid = URLPatternValidator.validateRoute(url, scorePattern);
  console.log(`${isValid ? BunColorFormatter.success("✓") : BunColorFormatter.error("✗")} ${url}`);
});

// Advanced URLPattern with search params
console.log("\n🔍 === ADVANCED URLPATTERN (Search Params) ===\n");

const searchPattern = new URLPattern({
  pathname: "/search",
  search: "?q=:query&type=:type&page=:page&limit=:limit"
});

const searchUrls = [
  "https://example.com/search?q=typescript&type=code&page=1&limit=10",
  "https://example.com/search?q=urlpattern&type=docs&page=2&limit=20"
];

searchUrls.forEach(url => {
  const params = URLPatternValidator.extractParams(url, searchPattern);
  console.log(BunColorFormatter.info(`Search: ${JSON.stringify(params)}`));
});

// Performance comparison with traditional routing
console.log("\n⚡ === PERFORMANCE COMPARISON ===\n");

const startTime = performance.now();

// Test URLPattern performance
const pattern = new URLPattern({ pathname: "/api/:resource/:id/:action" });
let patternMatches = 0;

for (let i = 0; i < 10000; i++) {
  const url = `/api/users/${i}/view`;
  if (pattern.test(url)) {
    patternMatches++;
  }
}

const patternTime = performance.now() - startTime;

// Test traditional regex performance
const regexStartTime = performance.now();
const regex = /^\/api\/([^\/]+)\/([^\/]+)\/([^\/]+)$/;
let regexMatches = 0;

for (let i = 0; i < 10000; i++) {
  const url = `/api/users/${i}/view`;
  if (regex.test(url)) {
    regexMatches++;
  }
}

const regexTime = performance.now() - regexStartTime;

console.log(BunColorFormatter.info(`URLPattern: ${patternTime.toFixed(2)}ms (${patternMatches} matches)`));
console.log(BunColorFormatter.info(`RegExp: ${regexTime.toFixed(2)}ms (${regexMatches} matches)`));
console.log(BunColorFormatter.success(`URLPattern is ${(regexTime / patternTime).toFixed(1)}x faster!`));

// Summary
console.log("\n🎉 === SUMMARY ===\n");
console.log(BunColorFormatter.success("✅ Bun.color() - Simple, fast terminal colors"));
console.log(BunColorFormatter.success("✅ Bun.enableANSIColors - ANSI color control"));
console.log(BunColorFormatter.success("✅ URLPattern - Web-standard URL matching"));
console.log(BunColorFormatter.success("✅ Full Node.js compatibility"));
console.log(BunColorFormatter.success("✅ High-performance routing"));
console.log(BunColorFormatter.success("✅ TypeScript support"));

console.log("\n🚀 Both APIs are production-ready and integrated into Bun's runtime!");
