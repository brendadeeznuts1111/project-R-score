#!/usr/bin/env bun
/**
 * Bun v1.3.9 Interactive Playground
 * 
 * Showcases all features and implementations from Bun v1.3.9
 */

import { join } from "node:path";

const DEMOS_DIR = join(import.meta.dir, "demos");

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
  console.log("\n" + "=".repeat(70));
  console.log("🚀 Bun v1.3.9 Interactive Playground");
  console.log("=".repeat(70));
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log("=".repeat(70) + "\n");
}

function printMenu() {
  console.log("Available Demos:\n");
  
  const categories = [...new Set(DEMOS.map(d => d.category))];
  
  for (const category of categories) {
    console.log(`📁 ${category}`);
    const categoryDemos = DEMOS.filter(d => d.category === category);
    categoryDemos.forEach((demo, index) => {
      const num = DEMOS.indexOf(demo) + 1;
      console.log(`   ${num.toString().padStart(2)}. ${demo.name}`);
      console.log(`      ${demo.description}`);
    });
    console.log("");
  }
  
  console.log("Commands:");
  console.log("  • Enter a number (1-7) to run a demo");
  console.log("  • Type 'all' to run all demos");
  console.log("  • Type 'menu' to show this menu again");
  console.log("  • Type 'exit' or 'quit' to exit");
  console.log("");
}

async function runDemo(demo: Demo) {
  console.log("\n" + "=".repeat(70));
  console.log(`🎯 Running: ${demo.name}`);
  console.log("=".repeat(70));
  console.log(`Description: ${demo.description}`);
  console.log("=".repeat(70) + "\n");
  
  const demoPath = join(DEMOS_DIR, demo.file);
  
  try {
    const proc = Bun.spawn({
      cmd: ["bun", "run", demoPath],
      stdout: "inherit",
      stderr: "inherit",
    });
    
    await proc.exited;
    
    if (proc.exitCode !== 0) {
      console.log(`\n⚠️  Demo exited with code ${proc.exitCode}`);
    } else {
      console.log(`\n✅ Demo completed successfully`);
    }
  } catch (error) {
    console.error(`\n❌ Error running demo:`, error);
  }
  
  console.log("\n" + "-".repeat(70) + "\n");
}

async function runAllDemos() {
  console.log("\n🚀 Running all demos...\n");
  
  for (const demo of DEMOS) {
    await runDemo(demo);
    // Small delay between demos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("✅ All demos completed!\n");
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
    
    console.log(`❌ Invalid choice: ${choice}`);
    printMenu();
    return;
  }
  
  // Simple prompt-based interface
  console.log("💡 Tip: Run with argument to skip menu:");
  console.log("   bun start 1    # Run demo 1");
  console.log("   bun start all  # Run all demos");
  console.log("\nFor interactive mode, use: bun start <number>");
  console.log("\nRunning all demos by default...\n");
  
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
  
  console.log(`❌ Invalid demo number: ${arg}`);
  console.log(`   Valid numbers: 1-${DEMOS.length}, or 'all'`);
  process.exit(1);
}

// Run interactive mode
await interactive();
