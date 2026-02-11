#!/usr/bin/env bun
/**
 * Bun v1.3.9: Interactive Example Runner
 * 
 * Run all examples or select specific ones to demo
 */

import { join } from "node:path";

interface Example {
  name: string;
  description: string;
  file: string;
  category: string;
}

const EXAMPLES: Example[] = [
  {
    name: "Parallel & Sequential Scripts",
    description: "Run multiple scripts concurrently or sequentially",
    file: "parallel-scripts.ts",
    category: "Script Orchestration",
  },
  {
    name: "RegExp JIT Optimization",
    description: "3.9x speedup for fixed-count regex patterns",
    file: "regex-jit-demo.ts",
    category: "Performance",
  },
  {
    name: "Mock Auto-Cleanup",
    description: "Automatic mock cleanup with 'using' keyword",
    file: "mock-auto-cleanup.test.ts",
    category: "Testing",
  },
  {
    name: "ESM Bytecode Compilation",
    description: "Compile ESM to bytecode binaries",
    file: "esm-bytecode-demo.ts",
    category: "Build",
  },
  {
    name: "CPU Profiling",
    description: "Configurable CPU profiler intervals",
    file: "cpu-profiling-demo.ts",
    category: "Performance",
  },
  {
    name: "HTTP/2 Connection Upgrades",
    description: "net.Server → Http2SecureServer fix",
    file: "http2-upgrade-demo.ts",
    category: "Networking",
  },
  {
    name: "NO_PROXY Support",
    description: "Environment variable enforcement",
    file: "no-proxy-demo.ts",
    category: "Networking",
  },
  {
    name: "Performance Optimizations",
    description: "Markdown, String, Collection improvements",
    file: "performance-demo.ts",
    category: "Performance",
  },
];

function printHeader() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 Bun v1.3.9 Feature Examples");
  console.log("=".repeat(70));
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log("=".repeat(70) + "\n");
}

function printMenu() {
  console.log("Available Examples:\n");
  
  const categories = [...new Set(EXAMPLES.map(e => e.category))];
  
  for (const category of categories) {
    console.log(`📁 ${category}`);
    const categoryExamples = EXAMPLES.filter(e => e.category === category);
    categoryExamples.forEach((ex, index) => {
      const num = EXAMPLES.indexOf(ex) + 1;
      console.log(`   ${num.toString().padStart(2)}. ${ex.name}`);
      console.log(`      ${ex.description}`);
    });
    console.log("");
  }
  
  console.log("Commands:");
  console.log("  • Enter a number (1-8) to run an example");
  console.log("  • Type 'all' to run all examples");
  console.log("  • Type 'benchmarks' to run performance benchmarks");
  console.log("  • Type 'test' to run test examples");
  console.log("  • Type 'menu' to show this menu again");
  console.log("  • Type 'exit' or 'quit' to exit");
  console.log("");
}

async function runExample(example: Example) {
  console.log("\n" + "=".repeat(70));
  console.log(`🎯 Running: ${example.name}`);
  console.log("=".repeat(70));
  console.log(`Description: ${example.description}`);
  console.log("=".repeat(70) + "\n");
  
  const examplePath = join(import.meta.dir, example.file);
  
  try {
    const proc = Bun.spawn({
      cmd: ["bun", "run", examplePath],
      stdout: "inherit",
      stderr: "inherit",
    });
    
    await proc.exited;
    
    if (proc.exitCode !== 0) {
      console.log(`\n⚠️  Example exited with code ${proc.exitCode}`);
    } else {
      console.log(`\n✅ Example completed successfully`);
    }
  } catch (error) {
    console.error(`\n❌ Error running example:`, error);
  }
  
  console.log("\n" + "-".repeat(70) + "\n");
}

async function runAllExamples() {
  console.log("\n🚀 Running all examples...\n");
  
  for (const example of EXAMPLES) {
    await runExample(example);
    // Small delay between examples
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("✅ All examples completed!\n");
}

async function runBenchmarks() {
  console.log("\n" + "=".repeat(70));
  console.log("📊 Running Performance Benchmarks");
  console.log("=".repeat(70) + "\n");
  
  const benchmarks = [
    { name: "RegExp JIT", file: "benchmarks/regex-benchmark.ts" },
  ];
  
  for (const bench of benchmarks) {
    console.log(`\n▶️ Running: ${bench.name}\n`);
    const benchPath = join(import.meta.dir, bench.file);
    
    const proc = Bun.spawn({
      cmd: ["bun", "run", benchPath],
      stdout: "inherit",
      stderr: "inherit",
    });
    
    await proc.exited;
  }
}

async function runTests() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 Running Test Examples");
  console.log("=".repeat(70) + "\n");
  
  const testPath = join(import.meta.dir, "mock-auto-cleanup.test.ts");
  
  const proc = Bun.spawn({
    cmd: ["bun", "test", testPath],
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
}

async function interactive() {
  printHeader();
  printMenu();
  
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const choice = args[0].toLowerCase();
    
    if (choice === "all" || choice === "a") {
      await runAllExamples();
      return;
    }
    
    if (choice === "benchmarks" || choice === "bench" || choice === "b") {
      await runBenchmarks();
      return;
    }
    
    if (choice === "test" || choice === "tests" || choice === "t") {
      await runTests();
      return;
    }
    
    const num = parseInt(choice);
    if (!isNaN(num) && num >= 1 && num <= EXAMPLES.length) {
      await runExample(EXAMPLES[num - 1]);
      return;
    }
    
    console.log(`❌ Invalid choice: ${choice}`);
    printMenu();
    return;
  }
  
  // Simple prompt-based interface
  console.log("💡 Tip: Run with argument to skip menu:");
  console.log("   bun run runner.ts 1       # Run example 1");
  console.log("   bun run runner.ts all     # Run all examples");
  console.log("   bun run runner.ts test    # Run test examples");
  console.log("\nFor interactive mode, pass any argument.\n");
  
  await runAllExamples();
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  const arg = args[0];
  
  if (arg === "--all" || arg === "-a" || arg === "all") {
    printHeader();
    runAllExamples().then(() => process.exit(0));
  } else if (arg === "--benchmarks" || arg === "-b" || arg === "benchmarks" || arg === "bench") {
    printHeader();
    runBenchmarks().then(() => process.exit(0));
  } else if (arg === "--test" || arg === "-t" || arg === "test" || arg === "tests") {
    printHeader();
    runTests().then(() => process.exit(0));
  } else {
    const num = parseInt(arg);
    if (!isNaN(num) && num >= 1 && num <= EXAMPLES.length) {
      printHeader();
      runExample(EXAMPLES[num - 1]).then(() => process.exit(0));
    } else {
      console.log(`❌ Invalid example number: ${arg}`);
      console.log(`   Valid numbers: 1-${EXAMPLES.length}, or 'all', 'test', 'benchmarks'`);
      process.exit(1);
    }
  }
} else {
  // Run interactive mode
  interactive();
}

export { interactive, runExample, runAllExamples };
