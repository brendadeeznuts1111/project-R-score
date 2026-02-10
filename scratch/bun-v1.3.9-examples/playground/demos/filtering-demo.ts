#!/usr/bin/env bun
/**
 * Demo: Bun Test Filtering
 * 
 * https://bun.com/docs/test#test-filtering
 */

console.log("🔍 Bun Test Filtering Demo\n");
console.log("=".repeat(70));

console.log("\n📋 CLI Filtering Options:\n");

const cliExamples = `# Filter by test name pattern
bun test --test-name-pattern="auth"
bun test -t "login"

# Filter by file pattern (default)
bun test src/**/*.test.ts
bun test tests/unit

# Combine filters
bun test --test-name-pattern="API" tests/api/

# Skip tests with pattern
bun test --test-name-pattern="^(?!.*skip).*"`;

console.log(cliExamples);

console.log("\n📁 Filter in Configuration:\n");

const configExample = `// bunfig.toml
[test]
# Only run tests matching this pattern
testNamePattern = "API"

# Or in package.json
{
  "bun": {
    "test": {
      "testNamePattern": "API"
    }
  }
}`;

console.log(configExample);

console.log("\n📝 Code-Level Filtering:\n");

const codeExample = `import { test, describe } from "bun:test";

// Skip this test
test.skip("old feature", () => {
  // This won't run
});

// Only run this test (focus)
test.only("new feature", () => {
  // Only 'only' tests run
});

// Todo - mark as pending
test.todo("future feature", () => {
  // Placeholder for future test
});

// Skip/only at describe level
describe.skip("legacy module", () => {
  test("test 1", () => {});  // Skipped
});

describe.only("new module", () => {
  test("test 2", () => {});  // Only this runs
});`;

console.log(codeExample);

console.log("\n✅ Key Points:");
console.log("  • CLI: --test-name-pattern or -t for name filtering");
console.log("  • Code: test.skip(), test.only(), test.todo()");
console.log("  • describe.skip() / describe.only() for groups");
console.log("  • File patterns work as positional arguments");

console.log("\n🚀 Run examples:");
console.log("  bun test -t \"auth\"");
console.log("  bun test --test-name-pattern=\"API\"");
console.log("  bun test tests/unit/*.test.ts");
