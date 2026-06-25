#!/usr/bin/env bun

// Demonstration of Bun v1.3.6 spawnSync, testing, and fake timers improvements
console.info("⚡ Bun v1.3.6 spawnSync, Testing & Fake Timers Improvements");
console.info("=".repeat(65));

// Test 1: Faster Bun.spawnSync() on Linux ARM64
console.info("\n1️⃣ Faster Bun.spawnSync() Performance:");

async function demonstrateSpawnSyncPerformance() {
  console.info("✅ Fixed performance regression in Bun.spawnSync():");
  console.info("   🔧 Issue: close_range() syscall not defined on older glibc");
  console.info(
    "   🐛 Before: Fell back to iterating 65K file descriptors individually",
  );
  console.info("   🚀 After: Uses proper close_range() syscall for 30x speedup");

  console.info("\n   📊 Performance comparison:");
  console.info("      Before: ~13ms per spawn with default ulimit");
  console.info("      After:  ~0.4ms per spawn (30x faster!)");

  // Demonstrate spawnSync usage
  console.info("\n   💡 Example usage patterns:");
  const spawnExamples = [
    {
      name: "Simple command execution",
      code: `const result = Bun.spawnSync(["echo", "hello"]);
console.info(result.stdout.toString()); // "hello\\n"`,
    },
    {
      name: "Command with arguments",
      code: `const result = Bun.spawnSync(["ls", "-la", "/tmp"]);
console.info(result.exitCode); // 0 for success`,
    },
    {
      name: "Error handling",
      code: `const result = Bun.spawnSync(["false"]);
console.info(result.exitCode); // 1 for failure`,
    },
  ];

  spawnExamples.forEach((example) => {
    console.info(`\n      ${example.name}:`);
    console.info(`      ${example.code}`);
  });

  // Performance test (safe commands)
  console.info("\n   🏃 Running performance test...");
  const iterations = 10;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    // Use safe cross-platform commands
    if (process.platform === "win32") {
      Bun.spawnSync(["cmd", "/c", "echo", "test"]);
    } else {
      Bun.spawnSync(["echo", "test"]);
    }
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.info(`   📈 Average spawnSync time: ${avgTime.toFixed(2)}ms`);
  console.info(
    `   ✅ Performance: ${avgTime < 1 ? "Excellent" : avgTime < 5 ? "Good" : "Needs optimization"}`,
  );
}

// Test 2: --grep flag for bun test
console.info("\n2️⃣ Enhanced Testing with --grep Flag:");

function demonstrateGrepFlag() {
  console.info("✅ bun test now supports --grep flag:");
  console.info("   🎯 Alias for --test-name-pattern (Jest/Mocha compatible)");

  const testCommands = [
    'bun test --grep "should handle"',
    'bun test --test-name-pattern "should handle"',
    'bun test -t "should handle"',
  ];

  console.info("\n   📋 All equivalent commands:");
  testCommands.forEach((cmd, index) => {
    console.info(`      ${index + 1}. ${cmd}`);
  });

  console.info("\n   🚀 Benefits:");
  console.info("      • Familiar syntax for Jest/Mocha users");
  console.info("      • Easier migration from other test frameworks");
  console.info("      • Consistent testing experience");

  // Example test file structure
  const exampleTest = `
// example.test.ts
import { test, expect } from "bun:test";

test("should handle user creation", () => {
  const user = createUser({ name: "John" });
  expect(user.name).toBe("John");
});

test("should validate email format", () => {
  expect(isValidEmail("test@example.com")).toBe(true);
});

test("should reject invalid emails", () => {
  expect(isValidEmail("invalid")).toBe(false);
});

// Run only email tests:
// bun test --grep "email"
  `;

  console.info("\n   📝 Example test file:");
  console.info(exampleTest);
}

// Test 3: Fake Timers with @testing-library/react
console.info("\n3️⃣ Fake Timers Now Work with @testing-library/react:");

function demonstrateFakeTimers() {
  console.info("✅ Fixed jest.useFakeTimers() compatibility:");

  const fixes = [
    {
      issue: "Fake timer detection",
      fix: "setTimeout.clock = true when fake timers enabled",
      benefit: "@testing-library/react can detect fake timers",
    },
    {
      issue: "Immediate timer handling",
      fix: "advanceTimersByTime(0) fires setTimeout(fn, 0)",
      benefit: "Proper immediate timer execution",
    },
  ];

  fixes.forEach((fix, index) => {
    console.info(`\n   🔧 Fix ${index + 1}: ${fix.issue}`);
    console.info(`      Solution: ${fix.fix}`);
    console.info(`      Benefit: ${fix.benefit}`);
  });

  const exampleTest = `
import { jest } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("works with fake timers", async () => {
  jest.useFakeTimers();

  const { getByRole } = render(<button onClick={() => console.info("clicked")}>
    Click me
  </button>);

  const user = userEvent.setup();

  // This no longer hangs! 🎉
  await user.click(getByRole("button"));

  // Timer controls work properly
  jest.advanceTimersByTime(1000);

  jest.useRealTimers();
});
  `;

  console.info("\n   📝 Example test with fake timers:");
  console.info(exampleTest);

  console.info("\n   🎯 Key improvements:");
  console.info("      • Tests no longer hang indefinitely");
  console.info("      • user.click() works with fake timers");
  console.info("      • Proper microtask queue handling");
  console.info("      • advanceTimersByTime(0) fires immediate timers");
}

// Test 4: JSON Serialization Improvements (recap)
console.info("\n4️⃣ JSON Serialization Improvements (Recap):");

function demonstrateJSONImprovements() {
  console.info("✅ JSON serialization now ~3x faster with FastStringifier:");

  const apis = [
    { api: "console.log with %j", use: "Faster debugging output" },
    { api: "PostgreSQL JSON/JSONB", use: "Faster database operations" },
    { api: "MySQL JSON type", use: "Faster database operations" },
    { api: "Jest %j/%o format", use: "Faster test output" },
  ];

  apis.forEach((item) => {
    console.info(`   📡 ${item.api}:`);
    console.info(`      ${item.use}`);
  });

  console.info("\n   💡 Usage examples:");
  console.info(`      console.info("%j", largeObject); // 3x faster`);
  console.info(`      // PostgreSQL queries with JSON now faster`);
  console.info(`      // Jest test output with %j/%o now faster`);
}

// Test 5: Cross-platform considerations
console.info("\n5️⃣ Cross-Platform Considerations:");

function demonstrateCrossPlatform() {
  console.info("✅ spawnSync improvements benefit all platforms:");

  const platforms = [
    {
      platform: "Linux ARM64",
      benefit: "30x performance improvement with close_range()",
      status: "🚀 Major improvement",
    },
    {
      platform: "Linux x64",
      benefit: "Consistent performance across glibc versions",
      status: "✅ Improved reliability",
    },
    {
      platform: "macOS",
      benefit: "Better spawnSync performance overall",
      status: "✅ Consistent behavior",
    },
    {
      platform: "Windows",
      benefit: "Improved process spawning reliability",
      status: "✅ Better compatibility",
    },
  ];

  platforms.forEach((platform) => {
    console.info(`   🖥️  ${platform.platform}:`);
    console.info(`      ${platform.benefit}`);
    console.info(`      ${platform.status}`);
  });
}

// Test 6: Integration with existing 2048 project
console.info("\n6️⃣ Integration with 2048 Project:");

function demonstrateIntegration() {
  console.info("✅ How these improvements enhance our project:");

  const integrations = [
    {
      feature: "spawnSync performance",
      impact: "Faster build scripts and tool execution",
      example: "Bun.spawnSync(['bun', 'build', ...])",
    },
    {
      feature: "--grep flag",
      impact: "Better test workflow for developers",
      example: "bun test --grep 'crc32'",
    },
    {
      feature: "Fake timers",
      impact: "More reliable React component testing",
      example: "jest.useFakeTimers() with game logic",
    },
    {
      feature: "JSON serialization",
      impact: "Faster debug output and data processing",
      example: "console.info('%j', gameState)",
    },
  ];

  integrations.forEach((integration) => {
    console.info(`   🎯 ${integration.feature}:`);
    console.info(`      Impact: ${integration.impact}`);
    console.info(`      Example: ${integration.example}`);
  });
}

// Main demonstration function
async function main() {
  try {
    await demonstrateSpawnSyncPerformance();
    demonstrateGrepFlag();
    demonstrateFakeTimers();
    demonstrateJSONImprovements();
    demonstrateCrossPlatform();
    demonstrateIntegration();

    console.info("\n🎯 Summary of Bun v1.3.6 spawnSync & Testing Improvements:");
    console.info(
      "   ⚡ spawnSync: 30x faster on Linux ARM64 with close_range() fix",
    );
    console.info("   🧪 Testing: --grep flag for Jest/Mocha compatibility");
    console.info(
      "   ⏰ Fake Timers: Fixed @testing-library/react compatibility",
    );
    console.info("   📡 JSON: 3x faster serialization with FastStringifier");
    console.info("   🌐 Cross-Platform: Consistent performance across systems");
    console.info("   🔗 Integration: Enhanced development workflow");

    console.info(
      "\n🚀 These improvements make Bun faster and more developer-friendly!",
    );
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

if (import.meta.main) {
  main();
}

export {
  demonstrateFakeTimers,
  demonstrateGrepFlag,
  main as demonstrateSpawnSyncImprovements,
  demonstrateSpawnSyncPerformance,
};
