#!/usr/bin/env bun
/**
 * Demo: Bun Test Filtering
 * 
 * https://bun.com/docs/test#test-filtering
 */

console.info("🔍 Bun Test Filtering Demo\n");
console.info("=".repeat(70));

console.info("\n📋 CLI Filtering Options:\n");

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

console.info(cliExamples);

console.info("\n📁 Filter in Configuration:\n");

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

console.info(configExample);

console.info("\n📝 Code-Level Filtering:\n");

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

console.info(codeExample);

console.info("\n✅ Key Points:");
console.info("  • CLI: --test-name-pattern or -t for name filtering");
console.info("  • Code: test.skip(), test.only(), test.todo()");
console.info("  • describe.skip() / describe.only() for groups");
console.info("  • File patterns work as positional arguments");

console.info("\n🚀 Run examples:");
console.info("  bun test -t \"auth\"");
console.info("  bun test --test-name-pattern=\"API\"");
console.info("  bun test tests/unit/*.test.ts");
