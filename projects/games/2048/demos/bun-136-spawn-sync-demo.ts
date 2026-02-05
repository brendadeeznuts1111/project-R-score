#!/usr/bin/env bun

// Demonstration of Bun v1.3.6 spawnSync, testing, and fake timers improvements
console.log("⚡ Bun v1.3.6 spawnSync, Testing & Fake Timers Improvements");
console.log("=".repeat(65));

// Test 1: Faster Bun.spawnSync() on Linux ARM64
console.log("\n1️⃣ Faster Bun.spawnSync() Performance:");

async function demonstrateSpawnSyncPerformance() {
  console.log("✅ Fixed performance regression in Bun.spawnSync():");
  console.log("   🔧 Issue: close_range() syscall not defined on older glibc");
  console.log(
    "   🐛 Before: Fell back to iterating 65K file descriptors individually",
  );
  console.log("   🚀 After: Uses proper close_range() syscall for 30x speedup");

  console.log("\n   📊 Performance comparison:");
  console.log("      Before: ~13ms per spawn with default ulimit");
  console.log("      After:  ~0.4ms per spawn (30x faster!)");

  // Demonstrate spawnSync usage
  console.log("\n   💡 Example usage patterns:");
  const spawnExamples = [
    {
      name: "Simple command execution",
      code: `const result = Bun.spawnSync(["echo", "hello"]);
console.log(result.stdout.toString()); // "hello\\n"`,
    },
    {
      name: "Command with arguments",
      code: `const result = Bun.spawnSync(["ls", "-la", "/tmp"]);
console.log(result.exitCode); // 0 for success`,
    },
    {
      name: "Error handling",
      code: `const result = Bun.spawnSync(["false"]);
console.log(result.exitCode); // 1 for failure`,
    },
  ];

  spawnExamples.forEach((example) => {
    console.log(`\n      ${example.name}:`);
    console.log(`      ${example.code}`);
  });

  // Performance test (safe commands)
  console.log("\n   🏃 Running performance test...");
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

  console.log(`   📈 Average spawnSync time: ${avgTime.toFixed(2)}ms`);
  console.log(
    `   ✅ Performance: ${avgTime < 1 ? "Excellent" : avgTime < 5 ? "Good" : "Needs optimization"}`,
  );
}

// Test 2: --grep flag for bun test
console.log("\n2️⃣ Enhanced Testing with --grep Flag:");

function demonstrateGrepFlag() {
  console.log("✅ bun test now supports --grep flag:");
  console.log("   🎯 Alias for --test-name-pattern (Jest/Mocha compatible)");

  const testCommands = [
    'bun test --grep "should handle"',
    'bun test --test-name-pattern "should handle"',
    'bun test -t "should handle"',
  ];

  console.log("\n   📋 All equivalent commands:");
  testCommands.forEach((cmd, index) => {
    console.log(`      ${index + 1}. ${cmd}`);
  });

  console.log("\n   🚀 Benefits:");
  console.log("      • Familiar syntax for Jest/Mocha users");
  console.log("      • Easier migration from other test frameworks");
  console.log("      • Consistent testing experience");

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

  console.log("\n   📝 Example test file:");
  console.log(exampleTest);
}

// Test 3: Fake Timers with @testing-library/react
console.log("\n3️⃣ Fake Timers Now Work with @testing-library/react:");

function demonstrateFakeTimers() {
  console.log("✅ Fixed jest.useFakeTimers() compatibility:");

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
    console.log(`\n   🔧 Fix ${index + 1}: ${fix.issue}`);
    console.log(`      Solution: ${fix.fix}`);
    console.log(`      Benefit: ${fix.benefit}`);
  });

  const exampleTest = `
import { jest } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("works with fake timers", async () => {
  jest.useFakeTimers();

  const { getByRole } = render(<button onClick={() => console.log("clicked")}>
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

  console.log("\n   📝 Example test with fake timers:");
  console.log(exampleTest);

  console.log("\n   🎯 Key improvements:");
  console.log("      • Tests no longer hang indefinitely");
  console.log("      • user.click() works with fake timers");
  console.log("      • Proper microtask queue handling");
  console.log("      • advanceTimersByTime(0) fires immediate timers");
}

// Test 4: JSON Serialization Improvements (recap)
console.log("\n4️⃣ JSON Serialization Improvements (Recap):");

function demonstrateJSONImprovements() {
  console.log("✅ JSON serialization now ~3x faster with FastStringifier:");

  const apis = [
    { api: "console.log with %j", use: "Faster debugging output" },
    { api: "PostgreSQL JSON/JSONB", use: "Faster database operations" },
    { api: "MySQL JSON type", use: "Faster database operations" },
    { api: "Jest %j/%o format", use: "Faster test output" },
  ];

  apis.forEach((item) => {
    console.log(`   📡 ${item.api}:`);
    console.log(`      ${item.use}`);
  });

  console.log("\n   💡 Usage examples:");
  console.log(`      console.log("%j", largeObject); // 3x faster`);
  console.log(`      // PostgreSQL queries with JSON now faster`);
  console.log(`      // Jest test output with %j/%o now faster`);
}

// Test 5: Cross-platform considerations
console.log("\n5️⃣ Cross-Platform Considerations:");

function demonstrateCrossPlatform() {
  console.log("✅ spawnSync improvements benefit all platforms:");

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
    console.log(`   🖥️  ${platform.platform}:`);
    console.log(`      ${platform.benefit}`);
    console.log(`      ${platform.status}`);
  });
}

// Test 6: Integration with existing 2048 project
console.log("\n6️⃣ Integration with 2048 Project:");

function demonstrateIntegration() {
  console.log("✅ How these improvements enhance our project:");

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
      example: "console.log('%j', gameState)",
    },
  ];

  integrations.forEach((integration) => {
    console.log(`   🎯 ${integration.feature}:`);
    console.log(`      Impact: ${integration.impact}`);
    console.log(`      Example: ${integration.example}`);
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

    console.log("\n🎯 Summary of Bun v1.3.6 spawnSync & Testing Improvements:");
    console.log(
      "   ⚡ spawnSync: 30x faster on Linux ARM64 with close_range() fix",
    );
    console.log("   🧪 Testing: --grep flag for Jest/Mocha compatibility");
    console.log(
      "   ⏰ Fake Timers: Fixed @testing-library/react compatibility",
    );
    console.log("   📡 JSON: 3x faster serialization with FastStringifier");
    console.log("   🌐 Cross-Platform: Consistent performance across systems");
    console.log("   🔗 Integration: Enhanced development workflow");

    console.log(
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
