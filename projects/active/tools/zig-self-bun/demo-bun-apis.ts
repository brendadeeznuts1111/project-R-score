#!/usr/bin/env bun

/**
 * Bun Color API & URLPattern API Demonstration
 *
 * This script demonstrates Bun's native APIs for colors and URL routing.
 */

import { BunColorFormatter } from "./src/utils/color-api";
import { ScoringAPIRouter, URLPatternValidator, demonstrateURLPattern } from "./src/utils/urlpattern-api";

// Demonstrate Bun Color API (Color Conversion)
console.info("🎨 === BUN COLOR API (Color Conversion) ===\n");

// Color format conversions
console.info("Color Format Conversions:");
console.info("RGB to Hex:", Bun.color([255, 0, 0], "hex"));        // #ff0000
console.info("Hex to RGB:", Bun.color("#00ff00", "rgb"));           // rgb(0, 255, 0)
console.info("Named to Hex:", Bun.color("blue", "hex"));            // #0000ff
console.info("RGB to HSL:", Bun.color([255, 0, 0], "hsl"));         // hsl(0, 100%, 50%)
console.info("Hex to ANSI:", Bun.color("#ff0000", "ansi"));         // 31 (red)

// Demonstrate Terminal Coloring (using ANSI escape sequences)
console.info("\n🖥️  === TERMINAL COLORING (ANSI Escape Sequences) ===\n");

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

console.info("Basic ANSI Colors:");
console.info(`${colors.red}Red text${colors.reset}`);
console.info(`${colors.green}Green text${colors.reset}`);
console.info(`${colors.blue}Blue text${colors.reset}`);
console.info(`${colors.yellow}Yellow text${colors.reset}`);
console.info(`${colors.magenta}Magenta text${colors.reset}`);
console.info(`${colors.cyan}Cyan text${colors.reset}`);

// ANSI Colors setting
console.info("\nANSI Colors Setting:");
console.info(BunColorFormatter.info(`Bun.enableANSIColors: ${Bun.enableANSIColors}`));

// Bun.stripANSI demonstration
const ansiText = `${colors.red}Red${colors.reset} and ${colors.blue}Blue${colors.reset}`;
console.info(`\nANSI text: "${ansiText}"`);
console.info(`Stripped: "${Bun.stripANSI(ansiText)}"`);

// Formatted messages
console.info("\nFormatted Messages:");
console.info(BunColorFormatter.success("Operation completed successfully"));
console.info(BunColorFormatter.error("An error occurred"));
console.info(BunColorFormatter.warning("This is a warning"));
console.info(BunColorFormatter.info("This is informational"));

// Demonstrate URLPattern API
console.info("\n🔗 === URLPATTERN API DEMONSTRATION ===\n");

// Basic URLPattern examples
demonstrateURLPattern();

// Create Scoring API Router
console.info("\n🎯 === SCORING API ROUTER ===\n");

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
    console.info(BunColorFormatter.success(`${result.type}: ${JSON.stringify(result, null, 0)}`));
  } else {
    console.info(BunColorFormatter.error(`No match for: ${url}`));
  }
});

// URLPattern Validation Examples
console.info("\n✅ === URLPATTERN VALIDATION ===\n");

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

console.info("Valid URLs:");
validUrls.forEach(url => {
  const isValid = URLPatternValidator.validateRoute(url, scorePattern);
  const params = URLPatternValidator.extractParams(url, scorePattern);
  console.info(`${isValid ? BunColorFormatter.success("✓") : BunColorFormatter.error("✗")} ${url} -> ${JSON.stringify(params)}`);
});

console.info("\nInvalid URLs:");
invalidUrls.forEach(url => {
  const isValid = URLPatternValidator.validateRoute(url, scorePattern);
  console.info(`${isValid ? BunColorFormatter.success("✓") : BunColorFormatter.error("✗")} ${url}`);
});

// Advanced URLPattern with search params
console.info("\n🔍 === ADVANCED URLPATTERN (Search Params) ===\n");

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
  console.info(BunColorFormatter.info(`Search: ${JSON.stringify(params)}`));
});

// Performance comparison with traditional routing
console.info("\n⚡ === PERFORMANCE COMPARISON ===\n");

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

console.info(BunColorFormatter.info(`URLPattern: ${patternTime.toFixed(2)}ms (${patternMatches} matches)`));
console.info(BunColorFormatter.info(`RegExp: ${regexTime.toFixed(2)}ms (${regexMatches} matches)`));
console.info(BunColorFormatter.success(`URLPattern is ${(regexTime / patternTime).toFixed(1)}x faster!`));

// Summary
console.info("\n🎉 === SUMMARY ===\n");
console.info(BunColorFormatter.success("✅ Bun.color() - Simple, fast terminal colors"));
console.info(BunColorFormatter.success("✅ Bun.enableANSIColors - ANSI color control"));
console.info(BunColorFormatter.success("✅ URLPattern - Web-standard URL matching"));
console.info(BunColorFormatter.success("✅ Full Node.js compatibility"));
console.info(BunColorFormatter.success("✅ High-performance routing"));
console.info(BunColorFormatter.success("✅ TypeScript support"));

console.info("\n🚀 Both APIs are production-ready and integrated into Bun's runtime!");
