#!/usr/bin/env bun
/**
 * Bun v1.3.9: CPU Profiling Demo
 * 
 * Demonstrates the new --cpu-prof-interval flag for configurable profiling
 */

import { performance } from "node:perf_hooks";

console.log("📊 Bun v1.3.9: CPU Profiling Demo\n");
console.log("=" .repeat(70));

// Demo functions to profile
function cpuIntensiveTask(duration: number): number {
  const start = performance.now();
  let count = 0;
  while (performance.now() - start < duration) {
    // Perform some work
    count += Math.sqrt(count + 1);
    if (count > 1000000) count = 0;
  }
  return count;
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function stringOperations(): string {
  let result = "";
  for (let i = 0; i < 10000; i++) {
    result += `Iteration ${i}: `;
    result = result.slice(0, 1000); // Keep it bounded
  }
  return result;
}

function arrayOperations(): number[] {
  const arr: number[] = [];
  for (let i = 0; i < 100000; i++) {
    arr.push(Math.random());
  }
  return arr.sort((a, b) => a - b);
}

// Benchmark different profiling intervals
function runWorkload() {
  console.log("Running workload for profiling...\n");
  
  const results = {
    cpu: cpuIntensiveTask(100),
    fib: fibonacci(30),
    str: stringOperations().length,
    arr: arrayOperations().length,
  };
  
  console.log("Workload complete:", results);
}

function showProfilingGuide() {
  console.log("\n" + "=".repeat(70));
  console.log("🔧 CPU Profiling Guide");
  console.log("=".repeat(70));
  console.log(`
BASIC USAGE:
────────────
# Default profiling (1000μs interval)
bun --cpu-prof your-app.ts

# Higher resolution (500μs)
bun --cpu-prof --cpu-prof-interval 500 your-app.ts

# Ultra-high resolution (250μs)
bun --cpu-prof --cpu-prof-interval 250 your-app.ts

# Markdown output format
bun --cpu-prof-md --cpu-prof-interval 500 your-app.ts

INTERVAL OPTIONS:
────────────────
Value    | Resolution  | Use Case
─────────┼─────────────┼──────────────────────────
100μs    | Very High   | Micro-optimization analysis
250μs    | High        | Detailed performance analysis  
500μs    | Medium-High | General profiling (recommended)
1000μs   | Default     | Standard profiling
2000μs   | Low         | Long-running processes
5000μs   | Very Low    | Background monitoring

OUTPUT FILES:
─────────────
• CPU.<timestamp>.<pid>.cpuprofile  - Chrome DevTools compatible
• CPU.<timestamp>.<pid>.md          - Markdown summary report

ANALYSIS TOOLS:
───────────────
# Chrome DevTools
1. Open Chrome DevTools → Performance tab
2. Click "Load Profile"
3. Select the .cpuprofile file

# Speedscope (command-line)
bun x speedscope CPU.*.cpuprofile

# Built-in analysis (if available)
bun run analyze-profile.ts CPU.*.cpuprofile
`);
}

function showProfilingExample() {
  console.log("\n" + "=".repeat(70));
  console.log("📈 Example Profiling Session");
  console.log("=".repeat(70));
  console.log(`
STEP 1: Run with profiling
──────────────────────────
$ bun --cpu-prof --cpu-prof-interval 500 cpu-profiling-demo.ts

STEP 2: Find the profile file
─────────────────────────────
$ ls -la *.cpuprofile
CPU.20250208.12345.cpuprofile

STEP 3: Analyze with speedscope
───────────────────────────────
$ bun x speedscope CPU.20250208.12345.cpuprofile

STEP 4: Interpret results
─────────────────────────
• Look for functions with high "Self Time"
• Check call trees for unexpected hot paths
• Compare profiles before/after optimization

EXAMPLE PROFILE ANALYSIS:
─────────────────────────
Hot Functions (by self time):
1. fibonacci (45%) - Recursive function, consider memoization
2. stringOperations (25%) - String concatenation in loop
3. arrayOperations (15%) - Sorting large array
4. Math.sqrt (10%) - In tight loop
5. (other) (5%)

OPTIMIZATION OPPORTUNITIES:
• Replace recursive fibonacci with iterative
• Use array join instead of string concatenation
• Consider Web Workers for heavy computation
`);
}

function showCIIntegration() {
  console.log("\n" + "=".repeat(70));
  console.log("🔄 CI/CD Integration");
  console.log("=".repeat(70));
  console.log(`
GITHUB ACTIONS EXAMPLE:
───────────────────────
name: Performance Profile

on: [push]

jobs:
  profile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Run with profiling
        run: bun --cpu-prof --cpu-prof-interval 500 benchmark.ts
      
      - name: Upload profile
        uses: actions/upload-artifact@v3
        with:
          name: cpu-profile
          path: CPU.*.cpuprofile
      
      - name: Generate markdown report
        run: |
          bun --cpu-prof-md --cpu-prof-interval 500 benchmark.ts
          cat CPU.*.md >> $GITHUB_STEP_SUMMARY

PERFORMANCE BUDGET EXAMPLE:
───────────────────────────
// profile-check.ts
import { readFileSync } from "fs";

const profile = JSON.parse(readFileSync(process.argv[2], "utf-8"));

// Check if any function exceeds budget
const BUDGET_MS = 100; // 100ms budget
const violations = [];

function checkNode(node: any, path: string[] = []) {
  const selfTime = node.selfTime || 0;
  if (selfTime > BUDGET_MS * 1000) { // Convert to microseconds
    violations.push({
      function: node.callFrame.functionName,
      time: selfTime / 1000,
      path: path.join(" > ")
    });
  }
  
  (node.children || []).forEach((child: any) => {
    checkNode(child, [...path, node.callFrame.functionName]);
  });
}

checkNode(profile.nodes[0]);

if (violations.length > 0) {
  console.error("Performance budget violations:");
  violations.forEach(v => console.error(\`  \${v.function}: \${v.time.toFixed(2)}ms\`));
  process.exit(1);
}
`);
}

// Main
async function main() {
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}\n`);

  console.log("This demo shows CPU profiling features.\n");
  console.log("To profile this script, run:");
  console.log("  bun --cpu-prof --cpu-prof-interval 500 cpu-profiling-demo.ts\n");

  // Simulate some work that would be profiled
  runWorkload();

  showProfilingGuide();
  showProfilingExample();
  showCIIntegration();

  console.log("\n✅ CPU Profiling demo complete!\n");
}

if (import.meta.main) {
  main();
}

export { main, cpuIntensiveTask, fibonacci, stringOperations, arrayOperations };
