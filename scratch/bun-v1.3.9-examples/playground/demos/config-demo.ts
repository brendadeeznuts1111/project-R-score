#!/usr/bin/env bun
/**
 * Demo: Bun Test Configuration
 * 
 * https://bun.com/docs/test/configuration#configuration-file
 */

console.log("⚙️  Bun Test Configuration Demo\n");
console.log("=".repeat(70));

console.log("\n📁 Configuration File Options:\n");

const configExample = `// bunfig.toml
[test]
# Test file patterns
preload = ["./setup.ts"]

# Coverage settings
coverage = true
coverageThreshold = 0.8

# Test timeout (milliseconds)
timeout = 10000

# Test environment
# "node" | "jsdom" | "happy-dom"
environment = "node"

# Module format
# "esm" | "cjs"
module = "esm"

// OR package.json
{
  "bun": {
    "test": {
      "preload": ["./setup.ts"],
      "coverage": true,
      "timeout": 10000
    }
  }
}`;

console.log(configExample);

console.log("\n📋 Common Configuration Options:\n");
console.log("-".repeat(70));
console.log("preload          Files to load before tests");
console.log("coverage         Enable coverage reporting");
console.log("coverageThreshold Minimum coverage percentage");
console.log("timeout          Default test timeout (ms)");
console.log("environment      Test environment (node/jsdom/happy-dom)");
console.log("module           Module format (esm/cjs)");

console.log("\n✅ Key Points:");
console.log("  • Config in bunfig.toml or package.json");
console.log("  • Preload setup files for test environment");
console.log("  • Coverage built-in (no external tools needed)");
console.log("  • Environment option for DOM testing");

console.log("\n🚀 Run tests with config:");
console.log("  bun test");
console.log("  bun test --coverage");
console.log("  bun test --timeout 5000");
