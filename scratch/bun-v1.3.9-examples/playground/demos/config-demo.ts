#!/usr/bin/env bun
/**
 * Demo: Bun Test Configuration
 * 
 * https://bun.com/docs/test/configuration#configuration-file
 */

console.info("⚙️  Bun Test Configuration Demo\n");
console.info("=".repeat(70));

console.info("\n📁 Configuration File Options:\n");

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

console.info(configExample);

console.info("\n📋 Common Configuration Options:\n");
console.info("-".repeat(70));
console.info("preload          Files to load before tests");
console.info("coverage         Enable coverage reporting");
console.info("coverageThreshold Minimum coverage percentage");
console.info("timeout          Default test timeout (ms)");
console.info("environment      Test environment (node/jsdom/happy-dom)");
console.info("module           Module format (esm/cjs)");

console.info("\n✅ Key Points:");
console.info("  • Config in bunfig.toml or package.json");
console.info("  • Preload setup files for test environment");
console.info("  • Coverage built-in (no external tools needed)");
console.info("  • Environment option for DOM testing");

console.info("\n🚀 Run tests with config:");
console.info("  bun test");
console.info("  bun test --coverage");
console.info("  bun test --timeout 5000");
