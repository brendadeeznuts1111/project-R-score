#!/usr/bin/env bun
/**
 * bench/main.ts - Central CLI Hub for DUO-Automation Benchmarks
 * Use: bun bench/main.ts [category] [options]
 */

import path from "path";

const CATEGORIES = {
  core: "Core Bun/JS feature benchmarks (e.g., deep-equals, SIMD, string-width)",
  storage: "R2/S3 specific benchmarks, demos, and connectivity tests",
  urlpattern: "URLPattern API benchmarks and experiments",
  tools: "Advanced analysis (e.g., load balancer, regression detector)",
  scripts: "Infrastructure scripts (e.g., setup-check, secrets-bench)"
};

async function runBenchmark(filePath: string, args: string[] = []) {
  console.info(`\n🚀 Executing: bun ${filePath} ${args.join(" ")}`);
  console.info("=".repeat(60));
  
  const captureOutput = args.includes("--capture");
  const cleanArgs = args.filter(a => a !== "--capture");

  // Use high-performance Bun.spawn native API
  const proc = Bun.spawn(["bun", filePath, ...cleanArgs], {
    stdout: captureOutput ? "pipe" : "inherit",
    stderr: "inherit",
    env: process.env
  });

  if (captureOutput) {
    if (!proc.stdout) {
      throw new Error("Failed to capture stdout");
    }
    const output = await proc.stdout.text();
    const exitCode = await proc.exited;
    
    console.info(`\n📝 Captured Output (${output.length} bytes):`);
    console.info("-".repeat(30));
    console.info(output);
    console.info("-".repeat(30));

    if (exitCode !== 0) {
      console.error(`\n❌ Failed with exit code: ${exitCode}`);
    }
    return exitCode;
  }

  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    console.error(`\n❌ Failed with exit code: ${exitCode}`);
  }
  
  return exitCode;
}

const showHelp = () => {
  console.info(`
🌟 **DUO-Automation Benchmark Suite** 🌟
========================================
Usage: bun bench/main.ts [category] [name] [options]

Categories:
${Object.entries(CATEGORIES).map(([key, desc]) => `  • ${key.padEnd(12)} - ${desc}`).join("\n")}

Shortcuts:
  • --all        Run ultimate benchmark suite
  • --setup      Run system setup check
  • --monitor    Run real-time R2 dashboard
  • --capture    Capture and display stdout as text (uses proc.stdout.text())

Examples:
  bun bench/main.ts storage bench-r2-super.ts --monitor
  bun bench/main.ts core bench-deep-equals.ts
  bun bench/main.ts --setup
`);
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  // Handle shortcuts
  if (args.includes("--setup")) {
    await runBenchmark("bench/scripts/setup-check.ts");
    return;
  }

  if (args.includes("--all")) {
    await runBenchmark("bench/tools/ultimate-suite.ts");
    return;
  }

  if (args.includes("--monitor")) {
    await runBenchmark("bench/tools/monitor-dashboard.ts");
    return;
  }

  const [category, name, ...rest] = args;

  if (category in CATEGORIES) {
    if (!name) {
      console.error(`❌ Please specify a benchmark name for the '${category}' category.`);
      const { readdirSync } = await import("fs");
      const files = readdirSync(path.join("bench", category)).filter(f => f.endsWith(".ts"));
      console.info(`Available benchmarks in ${category}:`);
      files.forEach(f => console.info(`  • ${f}`));
      return;
    }

    const fullPath = path.join("bench", category, name);
    await runBenchmark(fullPath, rest);
  } else {
    console.error(`❌ Unknown category: ${category}`);
    showHelp();
  }
}

main().catch(console.error);
