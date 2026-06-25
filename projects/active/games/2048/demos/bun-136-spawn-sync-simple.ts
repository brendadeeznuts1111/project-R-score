#!/usr/bin/env bun

// Simple demonstration of Bun v1.3.6 spawnSync performance improvements
console.info("⚡ Bun v1.3.6 spawnSync Performance Demonstration");
console.info("=".repeat(55));

import { spawnSync } from "bun";

function demonstrateSpawnSyncPerformance() {
  console.info("\n🚀 Demonstrating Bun.spawnSync() performance improvements...");
  console.info("   🔧 Fixed close_range() syscall issue on Linux ARM64");
  console.info("   📈 Up to 30x faster performance improvement");
  console.info("   🌐 Consistent performance across all platforms");

  // Test 1: Basic command execution
  console.info("\n1️⃣ Basic command execution:");

  const commands = [
    {
      name: "Echo command",
      cmd:
        process.platform === "win32"
          ? ["cmd", "/c", "echo", "hello"]
          : ["echo", "hello"],
    },
    {
      name: "Directory listing",
      cmd: process.platform === "win32" ? ["cmd", "/c", "dir"] : ["ls"],
    },
    {
      name: "Process info",
      cmd: process.platform === "win32" ? ["cmd", "/c", "tasklist"] : ["ps"],
    },
  ];

  commands.forEach(({ name, cmd }) => {
    const start = globalThis.performance.now();
    const result = spawnSync(cmd);
    const duration = globalThis.performance.now() - start;

    console.info(
      `   ✅ ${name}: ${duration.toFixed(2)}ms (exit code: ${result.exitCode})`,
    );
  });

  // Test 2: Performance comparison with multiple executions
  console.info("\n2️⃣ Performance comparison (multiple executions):");

  const iterations = 20;
  const testCommand =
    process.platform === "win32"
      ? ["cmd", "/c", "echo", "test"]
      : ["echo", "test"];

  console.info(
    `   Running ${iterations} executions of: ${testCommand.join(" ")}`,
  );

  const totalTimeStart = globalThis.performance.now();
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = globalThis.performance.now();
    const result = spawnSync(testCommand);
    const duration = globalThis.performance.now() - start;

    if (result.exitCode === 0) successCount++;

    if (i < 5) {
      // Show first 5 executions
      console.info(`     Execution ${i + 1}: ${duration.toFixed(2)}ms`);
    }
  }

  const totalTime = globalThis.performance.now() - totalTimeStart;
  const avgTime = totalTime / iterations;

  console.info(`   📊 Results:`);
  console.info(`      Total time: ${totalTime.toFixed(2)}ms`);
  console.info(`      Average time: ${avgTime.toFixed(2)}ms`);
  console.info(
    `      Success rate: ${successCount}/${iterations} (${((successCount / iterations) * 100).toFixed(1)}%)`,
  );

  // Performance classification
  let performance = "Needs optimization";
  if (avgTime < 1)
    performance = "🚀 Excellent (Linux ARM64 with close_range())";
  else if (avgTime < 5) performance = "⚡ Good";
  else if (avgTime < 10) performance = "✅ Acceptable";

  console.info(`      Performance: ${performance}`);

  // Test 3: Demonstrate the close_range() fix impact
  console.info("\n3️⃣ close_range() syscall fix impact:");

  console.info("   🔧 Before v1.3.6:");
  console.info("      - close_range() syscall not defined on older glibc");
  console.info("      - Fell back to iterating 65K file descriptors");
  console.info("      - ~13ms per spawn with default ulimit");

  console.info("   🚀 After v1.3.6:");
  console.info("      - Proper close_range() syscall support");
  console.info("      - Efficient file descriptor cleanup");
  console.info("      - ~0.4ms per spawn (30x faster!)");

  // Test 4: Cross-platform considerations
  console.info("\n4️⃣ Cross-platform performance:");

  const platformInfo = {
    "Linux ARM64": "🚀 30x improvement with close_range() fix",
    "Linux x64": "✅ Consistent performance across glibc versions",
    macOS: "✅ Improved spawnSync reliability",
    Windows: "✅ Better process spawning compatibility",
  };

  Object.entries(platformInfo).forEach(([platform, benefit]) => {
    console.info(`   🖥️  ${platform}: ${benefit}`);
  });

  // Test 5: Real-world usage scenarios
  console.info("\n5️⃣ Real-world usage scenarios:");

  const scenarios = [
    {
      name: "Build scripts",
      description: "Multiple tool executions (TypeScript, bundlers, etc.)",
      impact: "Significantly faster build times",
    },
    {
      name: "CI/CD pipelines",
      description: "Frequent process spawning for testing and deployment",
      impact: "Reduced pipeline execution time",
    },
    {
      name: "Development tools",
      description: "Code generators, linters, formatters",
      impact: "More responsive development experience",
    },
    {
      name: "Server applications",
      description: "External process execution and monitoring",
      impact: "Lower latency and better resource usage",
    },
  ];

  scenarios.forEach((scenario) => {
    console.info(`   📋 ${scenario.name}:`);
    console.info(`      ${scenario.description}`);
    console.info(`      💡 Impact: ${scenario.impact}`);
  });
}

function demonstrateGrepFlag() {
  console.info("\n🧪 --grep flag demonstration:");

  console.info("   ✅ bun test now supports --grep flag");
  console.info("   🎯 Alias for --test-name-pattern (Jest/Mocha compatible)");

  const examples = [
    'bun test --grep "crc32"',
    'bun test --grep "performance"',
    'bun test --grep "sqlite"',
    'bun test -t "specific test"', // Short form
  ];

  console.info("   📋 Usage examples:");
  examples.forEach((example) => {
    console.info(`      ${example}`);
  });

  console.info("   🚀 Benefits:");
  console.info("      • Familiar syntax for Jest/Mocha users");
  console.info("      • Easier test filtering and debugging");
  console.info("      • Better developer experience");
}

function demonstrateFakeTimers() {
  console.info("\n⏰ Fake timers improvement:");

  console.info("   ✅ Fixed jest.useFakeTimers() with @testing-library/react");
  console.info("   🔧 setTimeout.clock = true when fake timers enabled");
  console.info("   ⚡ advanceTimersByTime(0) fires immediate timers");

  console.info("   🎯 Impact:");
  console.info("      • Tests no longer hang indefinitely");
  console.info("      • user.click() works with fake timers");
  console.info("      • Better React component testing");
}

// Main demonstration
async function main() {
  try {
    demonstrateSpawnSyncPerformance();
    demonstrateGrepFlag();
    demonstrateFakeTimers();

    console.info("\n🎯 Summary of Bun v1.3.6 spawnSync & Testing Improvements:");
    console.info(
      "   ⚡ spawnSync: 30x faster on Linux ARM64 with close_range() fix",
    );
    console.info("   🧪 Testing: --grep flag for Jest/Mocha compatibility");
    console.info(
      "   ⏰ Fake Timers: Fixed @testing-library/react compatibility",
    );
    console.info("   🌐 Cross-Platform: Consistent performance across systems");
    console.info("   🚀 Developer Experience: Faster builds and better testing");

    console.info(
      "\n💨 These improvements make Bun significantly faster for development workflows!",
    );
  } catch (error) {
    console.error("❌ Demonstration failed:", error);
  }
}

if (import.meta.main) {
  main();
}

export { main as demonstrateSpawnSyncAndTesting };
