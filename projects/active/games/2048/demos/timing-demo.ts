#!/usr/bin/env bun

// Comprehensive Bun.nanoseconds() timing demo
import { colourKit, pad } from "./quantum-toolkit-patch.ts";

console.info(
  colourKit(0.8).ansi + "⏱️ Comprehensive Bun Timing Demo" + "\x1b[0m"
);
console.info("=".repeat(50));

// Basic timing functions
function displayTimingInfo() {
  console.info(
    colourKit(0.6).ansi + "\n🕐 Basic Timing Information" + "\x1b[0m"
  );

  const nanoseconds = Bun.nanoseconds();
  const microseconds = nanoseconds / 1_000;
  const milliseconds = nanoseconds / 1_000_000;
  const seconds = nanoseconds / 1_000_000_000;

  console.info(`📊 Raw nanoseconds: ${nanoseconds.toLocaleString()}`);
  console.info(`⚡ Microseconds: ${microseconds.toFixed(3)}`);
  console.info(`🕒 Milliseconds: ${milliseconds.toFixed(6)}`);
  console.info(`⏰ Seconds: ${seconds.toFixed(9)}`);
  console.info(`🕰️ Formatted: ${formatUptime(seconds)}`);
}

// Format uptime nicely
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}.${ms.toString().padStart(3, "0")}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}.${ms.toString().padStart(3, "0")}s`;
  } else {
    return `${secs}.${ms.toString().padStart(3, "0")}s`;
  }
}

// Performance benchmarking
async function performanceBenchmarks() {
  console.info(colourKit(0.7).ansi + "\n🚀 Performance Benchmarks" + "\x1b[0m");

  // Test 1: String operations
  console.info("\n📝 String Operations:");
  const start1 = Bun.nanoseconds();
  let result = "";
  for (let i = 0; i < 10000; i++) {
    result += `test${i}`;
  }
  const end1 = Bun.nanoseconds();
  console.info(
    `  String concatenation (10k ops): ${(end1 - start1) / 1_000_000}ms`
  );

  // Test 2: Math operations
  console.info("\n🔢 Math Operations:");
  const start2 = Bun.nanoseconds();
  let mathResult = 0;
  for (let i = 0; i < 1000000; i++) {
    mathResult += Math.sqrt(i) * Math.sin(i);
  }
  const end2 = Bun.nanoseconds();
  console.info(`  Math calculations (1M ops): ${(end2 - start2) / 1_000_000}ms`);

  // Test 3: Array operations
  console.info("\n📋 Array Operations:");
  const start3 = Bun.nanoseconds();
  const arr = Array.from({ length: 100000 }, (_, i) => i);
  const filtered = arr.filter((x) => x % 2 === 0).map((x) => x * 2);
  const end3 = Bun.nanoseconds();
  console.info(
    `  Array filter+map (100k items): ${(end3 - start3) / 1_000_000}ms`
  );

  // Test 4: File operations
  console.info("\n💾 File Operations:");
  const testData = "x".repeat(10000);
  const start4 = Bun.nanoseconds();
  await Bun.write("/tmp/timing-test.txt", testData);
  const readData = await Bun.file("/tmp/timing-test.txt").text();
  const end4 = Bun.nanoseconds();
  console.info(`  File write+read (10KB): ${(end4 - start4) / 1_000_000}ms`);

  // Cleanup
  await Bun.write("/tmp/timing-test.txt", "");
}

// Real-time monitoring
function realTimeMonitoring() {
  console.info(colourKit(0.5).ansi + "\n📊 Real-time Monitoring" + "\x1b[0m");
  console.info("Monitoring uptime for 5 seconds...\n");

  let iterations = 0;
  const startTime = Bun.nanoseconds();

  const interval = setInterval(() => {
    const current = Bun.nanoseconds();
    const elapsed = (current - startTime) / 1_000_000_000;

    iterations++;
    const color = colourKit(Math.min(elapsed / 5, 1)).ansi;
    console.info(
      `${color}Iteration ${iterations}: ${formatUptime(elapsed)}\x1b[0m`
    );

    if (elapsed >= 5) {
      clearInterval(interval);
      console.info("\n✅ Monitoring complete");
    }
  }, 1000);
}

// Comparative timing
async function comparativeTiming() {
  console.info(colourKit(0.4).ansi + "\n🔄 Comparative Timing" + "\x1b[0m");

  // Compare different ways to do the same thing
  const testArray = Array.from({ length: 10000 }, (_, i) => i);

  // Method 1: for loop
  const start1 = Bun.nanoseconds();
  let sum1 = 0;
  for (let i = 0; i < testArray.length; i++) {
    sum1 += testArray[i];
  }
  const end1 = Bun.nanoseconds();

  // Method 2: forEach
  const start2 = Bun.nanoseconds();
  let sum2 = 0;
  testArray.forEach((x) => (sum2 += x));
  const end2 = Bun.nanoseconds();

  // Method 3: reduce
  const start3 = Bun.nanoseconds();
  const sum3 = testArray.reduce((a, b) => a + b, 0);
  const end3 = Bun.nanoseconds();

  console.info("┌─────────────┬────────────┬──────────┐");
  console.info("│ Method      │ Time (ms)  │ Result   │");
  console.info("├─────────────┼────────────┼──────────┤");
  console.info(
    `│ for loop    │ ${pad(
      ((end1 - start1) / 1_000_000).toFixed(3),
      10
    )} │ ${sum1.toString().padEnd(8)} │`
  );
  console.info(
    `│ forEach     │ ${pad(
      ((end2 - start2) / 1_000_000).toFixed(3),
      10
    )} │ ${sum2.toString().padEnd(8)} │`
  );
  console.info(
    `│ reduce      │ ${pad(
      ((end3 - start3) / 1_000_000).toFixed(3),
      10
    )} │ ${sum3.toString().padEnd(8)} │`
  );
  console.info("└─────────────┴────────────┴──────────┘");

  const fastest = Math.min(end1 - start1, end2 - start2, end3 - start3);
  const fastestMethod =
    fastest === end1 - start1
      ? "for loop"
      : fastest === end2 - start2
      ? "forEach"
      : "reduce";
  console.info(`🏆 Fastest method: ${fastestMethod}`);
}

// Precision testing
function precisionTesting() {
  console.info(colourKit(0.8).ansi + "\n🎯 Precision Testing" + "\x1b[0m");

  console.info("Testing nanosecond precision...\n");

  const measurements: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = Bun.nanoseconds();
    // Very small operation
    const x = Math.random() * 1000;
    const end = Bun.nanoseconds();
    measurements.push(end - start);
  }

  const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
  const min = Math.min(...measurements);
  const max = Math.max(...measurements);

  console.info(`📊 Precision measurements (nanoseconds):`);
  console.info(`  Average: ${avg.toFixed(0)}ns`);
  console.info(`  Minimum: ${min.toFixed(0)}ns`);
  console.info(`  Maximum: ${max.toFixed(0)}ns`);
  console.info(`  Range: ${(max - min).toFixed(0)}ns`);
  console.info(`  In microseconds: ${(avg / 1000).toFixed(3)}μs`);
}

// Memory and timing correlation
async function memoryTimingCorrelation() {
  console.info(
    colourKit(0.6).ansi + "\n💾 Memory & Timing Correlation" + "\x1b[0m"
  );

  const sizes = [1000, 10000, 100000, 1000000];

  console.info("┌─────────────┬────────────┬──────────┐");
  console.info("│ Array Size │ Time (ms)  │ Memory   │");
  console.info("├─────────────┼────────────┼──────────┤");

  for (const size of sizes) {
    const start = Bun.nanoseconds();
    const arr = Array.from({ length: size }, (_, i) => i);
    const processed = arr.map((x) => x * 2).filter((x) => x % 4 === 0);
    const end = Bun.nanoseconds();

    const memUsage = process.memoryUsage();
    const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);

    console.info(
      `│ ${size.toString().padEnd(11)} │ ${pad(
        ((end - start) / 1_000_000).toFixed(3),
        10
      )} │ ${heapUsed.padEnd(8)}MB │`
    );
  }

  console.info("└─────────────┴────────────┴──────────┘");
}

// Main execution
async function main() {
  console.info("🎯 This demo showcases Bun.nanoseconds() capabilities:");
  console.info("  • High-precision timing");
  console.info("  • Performance benchmarking");
  console.info("  • Real-time monitoring");
  console.info("  • Comparative analysis");
  console.info("  • Precision testing");
  console.info("  • Memory correlation");

  displayTimingInfo();
  await performanceBenchmarks();
  await realTimeMonitoring();
  await new Promise((resolve) => setTimeout(resolve, 6000)); // Wait for monitoring
  await comparativeTiming();
  precisionTesting();
  await memoryTimingCorrelation();

  console.info(
    "\n" + colourKit(0.2).ansi + "🎉 Timing Demo Complete!" + "\x1b[0m"
  );
  console.info(
    `⏱️ Total demo runtime: ${formatUptime(Bun.nanoseconds() / 1_000_000_000)}`
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 Timing demo interrupted gracefully!");
  console.info(
    `⏱️ Final uptime: ${formatUptime(Bun.nanoseconds() / 1_000_000_000)}`
  );
  process.exit(0);
});

// Start the demo
main().catch(console.error);
