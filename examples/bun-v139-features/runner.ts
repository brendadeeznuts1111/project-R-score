#!/usr/bin/env bun
/**
 * Bun v1.3.9: Interactive Example Runner
 *
 * Run all examples or select specific ones to demo
 */
// @see https://bun.com/docs/runtime/child-process — Bun.spawn

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
  console.info("\n" + "=".repeat(70));
  console.info("🚀 Bun v1.3.9 Feature Examples");
  console.info("=".repeat(70));
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}`);
  console.info("=".repeat(70) + "\n");
}

function printMenu() {
  console.info("Available Examples:\n");
  
  const categories = [...new Set(EXAMPLES.map(e => e.category))];
  
  for (const category of categories) {
    console.info(`📁 ${category}`);
    const categoryExamples = EXAMPLES.filter(e => e.category === category);
    categoryExamples.forEach((ex, index) => {
      const num = EXAMPLES.indexOf(ex) + 1;
      console.info(`   ${num.toString().padStart(2)}. ${ex.name}`);
      console.info(`      ${ex.description}`);
    });
    console.info("");
  }
  
  console.info("Commands:");
  console.info("  • Enter a number (1-8) to run an example");
  console.info("  • Type 'all' to run all examples");
  console.info("  • Type 'benchmarks' to run performance benchmarks");
  console.info("  • Type 'test' to run test examples");
  console.info("  • Type 'menu' to show this menu again");
  console.info("  • Type 'exit' or 'quit' to exit");
  console.info("");
}

async function runExample(example: Example) {
  console.info("\n" + "=".repeat(70));
  console.info(`🎯 Running: ${example.name}`);
  console.info("=".repeat(70));
  console.info(`Description: ${example.description}`);
  console.info("=".repeat(70) + "\n");
  
  const examplePath = `${import.meta.dir}/${example.file}`;
  
  try {
    const proc = Bun.spawn({
      cmd: ["bun", "run", examplePath],
      stdout: "inherit",
      stderr: "inherit",
    });
    
    await proc.exited;
    
    if (proc.exitCode !== 0) {
      console.info(`\n⚠️  Example exited with code ${proc.exitCode}`);
    } else {
      console.info(`\n✅ Example completed successfully`);
    }
  } catch (error) {
    console.error(`\n❌ Error running example:`, error);
  }
  
  console.info("\n" + "-".repeat(70) + "\n");
}

async function runAllExamples() {
  console.info("\n🚀 Running all examples...\n");
  
  for (const example of EXAMPLES) {
    await runExample(example);
    // Small delay between examples
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.info("✅ All examples completed!\n");
}

async function runBenchmarks() {
  console.info("\n" + "=".repeat(70));
  console.info("📊 Running Performance Benchmarks");
  console.info("=".repeat(70) + "\n");
  
  const benchmarks = [
    { name: "RegExp JIT", file: "benchmarks/regex-benchmark.ts" },
  ];
  
  for (const bench of benchmarks) {
    console.info(`\n▶️ Running: ${bench.name}\n`);
    const benchPath = `${import.meta.dir}/${bench.file}`;
    
    const proc = Bun.spawn({
      cmd: ["bun", "run", benchPath],
      stdout: "inherit",
      stderr: "inherit",
    });
    
    await proc.exited;
  }
}

async function runTests() {
  console.info("\n" + "=".repeat(70));
  console.info("🧪 Running Test Examples");
  console.info("=".repeat(70) + "\n");
  
  const testPath = `${import.meta.dir}/mock-auto-cleanup.test.ts`;
  
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
    
    console.info(`❌ Invalid choice: ${choice}`);
    printMenu();
    return;
  }
  
  // Simple prompt-based interface
  console.info("💡 Tip: Run with argument to skip menu:");
  console.info("   bun run runner.ts 1       # Run example 1");
  console.info("   bun run runner.ts all     # Run all examples");
  console.info("   bun run runner.ts test    # Run test examples");
  console.info("\nFor interactive mode, pass any argument.\n");
  
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
      console.info(`❌ Invalid example number: ${arg}`);
      console.info(`   Valid numbers: 1-${EXAMPLES.length}, or 'all', 'test', 'benchmarks'`);
      process.exit(1);
    }
  }
} else {
  // Run interactive mode
  interactive();
}

export { interactive, runExample, runAllExamples };
