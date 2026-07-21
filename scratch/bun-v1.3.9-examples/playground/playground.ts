#!/usr/bin/env bun
/**
 * Bun v1.3.9 Interactive Playground
 *
 * Showcases all features and implementations from Bun v1.3.9
 */
// @see https://bun.com/docs/runtime/child-process — Bun.spawn

const DEMOS_DIR = `${import.meta.dir}/demos`;

interface Demo {
  name: string;
  description: string;
  file: string;
  category: string;
}

const DEMOS: Demo[] = [
  {
    name: "Parallel & Sequential Scripts",
    description: "Run multiple scripts concurrently or sequentially with prefixed output",
    file: "parallel-scripts.ts",
    category: "Script Orchestration"
  },
  {
    name: "HTTP/2 Connection Upgrades",
    description: "net.Server → Http2SecureServer connection upgrade pattern",
    file: "http2-upgrade.ts",
    category: "Networking"
  },
  {
    name: "Mock Auto-Cleanup (Symbol.dispose)",
    description: "Automatic mock restoration with 'using' keyword",
    file: "mock-dispose.ts",
    category: "Testing"
  },
  {
    name: "NO_PROXY Environment Variable",
    description: "NO_PROXY now respected even with explicit proxy options",
    file: "no-proxy.ts",
    category: "Networking"
  },
  {
    name: "CPU Profiling Interval",
    description: "Configurable CPU profiler sampling interval",
    file: "cpu-profiling.ts",
    category: "Performance"
  },
  {
    name: "ESM Bytecode Compilation",
    description: "ESM bytecode support in --compile",
    file: "esm-bytecode.ts",
    category: "Build"
  },
  {
    name: "Performance Optimizations",
    description: "RegExp JIT, Markdown, String optimizations",
    file: "performance.ts",
    category: "Performance"
  },
];

function printHeader() {
  console.info("\n" + "=".repeat(70));
  console.info("🚀 Bun v1.3.9 Interactive Playground");
  console.info("=".repeat(70));
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}`);
  console.info("=".repeat(70) + "\n");
}

function printMenu() {
  console.info("Available Demos:\n");
  
  const categories = [...new Set(DEMOS.map(d => d.category))];
  
  for (const category of categories) {
    console.info(`📁 ${category}`);
    const categoryDemos = DEMOS.filter(d => d.category === category);
    categoryDemos.forEach((demo, index) => {
      const num = DEMOS.indexOf(demo) + 1;
      console.info(`   ${num.toString().padStart(2)}. ${demo.name}`);
      console.info(`      ${demo.description}`);
    });
    console.info("");
  }
  
  console.info("Commands:");
  console.info("  • Enter a number (1-7) to run a demo");
  console.info("  • Type 'all' to run all demos");
  console.info("  • Type 'menu' to show this menu again");
  console.info("  • Type 'exit' or 'quit' to exit");
  console.info("");
}

async function runDemo(demo: Demo) {
  console.info("\n" + "=".repeat(70));
  console.info(`🎯 Running: ${demo.name}`);
  console.info("=".repeat(70));
  console.info(`Description: ${demo.description}`);
  console.info("=".repeat(70) + "\n");
  
  const demoPath = `${DEMOS_DIR}/${demo.file}`;
  
  try {
    const proc = Bun.spawn({
      cmd: ["bun", "run", demoPath],
      stdout: "inherit",
      stderr: "inherit",
    });
    
    await proc.exited;
    
    if (proc.exitCode !== 0) {
      console.info(`\n⚠️  Demo exited with code ${proc.exitCode}`);
    } else {
      console.info(`\n✅ Demo completed successfully`);
    }
  } catch (error) {
    console.error(`\n❌ Error running demo:`, error);
  }
  
  console.info("\n" + "-".repeat(70) + "\n");
}

async function runAllDemos() {
  console.info("\n🚀 Running all demos...\n");
  
  for (const demo of DEMOS) {
    await runDemo(demo);
    // Small delay between demos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.info("✅ All demos completed!\n");
}

async function interactive() {
  printHeader();
  printMenu();
  
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const choice = args[0].toLowerCase();
    
    if (choice === "all" || choice === "a") {
      await runAllDemos();
      return;
    }
    
    const num = parseInt(choice);
    if (!isNaN(num) && num >= 1 && num <= DEMOS.length) {
      await runDemo(DEMOS[num - 1]);
      return;
    }
    
    console.info(`❌ Invalid choice: ${choice}`);
    printMenu();
    return;
  }
  
  // Simple prompt-based interface
  console.info("💡 Tip: Run with argument to skip menu:");
  console.info("   bun start 1    # Run demo 1");
  console.info("   bun start all  # Run all demos");
  console.info("\nFor interactive mode, use: bun start <number>");
  console.info("\nRunning all demos by default...\n");
  
  await runAllDemos();
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  const arg = args[0];
  
  if (arg === "--all" || arg === "-a" || arg === "all") {
    printHeader();
    await runAllDemos();
    process.exit(0);
  }
  
  const num = parseInt(arg);
  if (!isNaN(num) && num >= 1 && num <= DEMOS.length) {
    printHeader();
    await runDemo(DEMOS[num - 1]);
    process.exit(0);
  }
  
  console.info(`❌ Invalid demo number: ${arg}`);
  console.info(`   Valid numbers: 1-${DEMOS.length}, or 'all'`);
  process.exit(1);
}

// Run interactive mode
await interactive();
