/**
 * Bun v1.3.9 CPU Profiling Demo
 * 
 * Demonstrates the configurable profiling interval feature.
 * v1.3.9 adds --cpu-prof-interval flag for higher resolution profiling.
 * 
 * Usage:
 *   bun --cpu-prof cpu-profile-demo.ts                    # Default 1000μs
 *   bun --cpu-prof --cpu-prof-interval 500 cpu-profile-demo.ts  # 500μs resolution
 *   bun --cpu-prof --cpu-prof-interval 250 cpu-profile-demo.ts  # 250μs (high-res)
 */

import { performance } from "perf_hooks";

// Simulate different types of workloads

function cpuIntensiveTask(iterations: number): number {
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.sqrt(i) * Math.sin(i);
  }
  return sum;
}

function regexWorkload(patterns: RegExp[], text: string): number {
  let matches = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      matches++;
    }
  }
  return matches;
}

function stringManipulation(count: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`part_${i}_${"x".repeat(i % 100)}`);
  }
  return parts.join("-");
}

function asyncWorkload(delay: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function main() {
  console.info("=".repeat(60));
  console.info("Bun v1.3.9 CPU Profiling Demo");
  console.info("=".repeat(60));
  console.info(`Bun version: ${Bun.version}`);
  console.info("");
  
  // Check if profiling is active
  const isProfiling = process.env.BUN_CPU_PROF === "1";
  if (isProfiling) {
    console.info("✓ CPU profiling is ACTIVE");
    console.info("  Profile will be saved to: *.cpuprofile");
    console.info("");
  } else {
    console.info("ℹ CPU profiling not active");
    console.info("  Run with: bun --cpu-prof cpu-profile-demo.ts");
    console.info("  Or: bun --cpu-prof --cpu-prof-interval 250 cpu-profile-demo.ts");
    console.info("");
  }
  
  // Run various workloads to generate profiling data
  console.info("Running workloads for profiling...");
  console.info("-".repeat(60));
  
  const start = performance.now();
  
  // 1. CPU intensive
  console.info("1. CPU intensive task...");
  const cpuStart = performance.now();
  const cpuResult = cpuIntensiveTask(10_000_000);
  console.info(`   Result: ${cpuResult.toFixed(2)}, Time: ${(performance.now() - cpuStart).toFixed(2)}ms`);
  
  // 2. Regex patterns (JIT-optimized vs interpreter)
  console.info("2. Regex workload...");
  const regexStart = performance.now();
  const patterns = [
    /(?:abc){3}/,        // JIT-optimized (fixed-count)
    /(a+){2}b/,          // JIT-optimized (fixed-count)
    /(?:abc)+/,          // Interpreter (variable)
    /[a-z]+@[a-z]+\.com/, // Email pattern
  ];
  const testStrings = [
    "abcabcabc",
    "aaab",
    "abcabcabcabc",
    "test@example.com",
  ];
  let regexMatches = 0;
  for (let i = 0; i < 100_000; i++) {
    regexMatches += regexWorkload(patterns, testStrings[i % testStrings.length]);
  }
  console.info(`   Matches: ${regexMatches}, Time: ${(performance.now() - regexStart).toFixed(2)}ms`);
  
  // 3. String manipulation
  console.info("3. String manipulation...");
  const strStart = performance.now();
  const strResult = stringManipulation(50_000);
  console.info(`   Length: ${strResult.length}, Time: ${(performance.now() - strStart).toFixed(2)}ms`);
  
  // 4. Mixed async/sync workload
  console.info("4. Mixed async workload...");
  const asyncStart = performance.now();
  await Promise.all([
    asyncWorkload(50),
    cpuIntensiveTask(1_000_000),
    asyncWorkload(30),
    cpuIntensiveTask(500_000),
  ]);
  console.info(`   Time: ${(performance.now() - asyncStart).toFixed(2)}ms`);
  
  // 5. Memory allocation stress
  console.info("5. Memory allocation...");
  const memStart = performance.now();
  const arrays: number[][] = [];
  for (let i = 0; i < 1000; i++) {
    arrays.push(new Array(1000).fill(i));
  }
  // Force some GC pressure
  arrays.length = 0;
  console.info(`   Time: ${(performance.now() - memStart).toFixed(2)}ms`);
  
  const totalTime = performance.now() - start;
  console.info("-".repeat(60));
  console.info(`Total time: ${totalTime.toFixed(2)}ms`);
  console.info("");
  
  if (isProfiling) {
    console.info("Profiling complete! Check current directory for:");
    console.info("  - CPU.*.cpuprofile");
    console.info("");
    console.info("To analyze:");
    console.info("  1. Open Chrome DevTools");
    console.info("  2. Performance tab → Load Profile");
    console.info("  3. Or use: bun x speedscope CPU.*.cpuprofile");
  }
}

main().catch(console.error);
