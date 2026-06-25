/**
 * Bun v1.3.9 High-Resolution Profiling Example
 * 
 * Run with:
 *   bun --cpu-prof --cpu-prof-interval 250 benchmark.ts
 * 
 * Then analyze:
 *   bun x speedscope CPU.*.cpuprofile
 */

import { performance } from "perf_hooks";

// Simulate different workloads

function cpuIntensive(iterations: number): number {
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.sqrt(i) * Math.sin(i);
  }
  return sum;
}

function regexWorkload(patterns: RegExp[], text: string): number {
  let matches = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) matches++;
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

async function asyncWorkload(delay: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function main() {
  console.info("=".repeat(60));
  console.info("Bun v1.3.9 CPU Profiling Demo");
  console.info("=".repeat(60));
  console.info("Run with: bun --cpu-prof --cpu-prof-interval 250 benchmark.ts");
  console.info("=".repeat(60));
  console.info();
  
  const start = performance.now();
  
  // 1. CPU intensive
  console.info("1. CPU intensive...");
  const cpuStart = performance.now();
  cpuIntensive(10_000_000);
  console.info(`   Time: ${(performance.now() - cpuStart).toFixed(2)}ms`);
  
  // 2. Regex patterns (JIT vs Interpreter)
  console.info("2. Regex workload...");
  const regexStart = performance.now();
  const patterns = [
    /(?:abc){3}/,  // JIT
    /(?:abc)+/,    // Interpreter
    /(a+){2}b/,    // JIT
    /(a+)*b/,      // Interpreter
  ];
  for (let i = 0; i < 100_000; i++) {
    regexWorkload(patterns, "abcabcabc");
  }
  console.info(`   Time: ${(performance.now() - regexStart).toFixed(2)}ms`);
  
  // 3. String manipulation
  console.info("3. String manipulation...");
  const strStart = performance.now();
  stringManipulation(50_000);
  console.info(`   Time: ${(performance.now() - strStart).toFixed(2)}ms`);
  
  // 4. Mixed async/sync
  console.info("4. Mixed workload...");
  const mixStart = performance.now();
  await Promise.all([
    asyncWorkload(50),
    cpuIntensive(1_000_000),
    asyncWorkload(30),
  ]);
  console.info(`   Time: ${(performance.now() - mixStart).toFixed(2)}ms`);
  
  // 5. Memory allocation
  console.info("5. Memory allocation...");
  const memStart = performance.now();
  const arrays: number[][] = [];
  for (let i = 0; i < 1000; i++) {
    arrays.push(new Array(1000).fill(i));
  }
  arrays.length = 0; // Clear
  console.info(`   Time: ${(performance.now() - memStart).toFixed(2)}ms`);
  
  const total = performance.now() - start;
  console.info();
  console.info(`Total: ${total.toFixed(2)}ms`);
  console.info();
  console.info("Check for *.cpuprofile files in current directory");
  console.info("View with: bun x speedscope CPU.*.cpuprofile");
}

main().catch(console.error);
