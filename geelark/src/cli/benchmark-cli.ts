#!/usr/bin/env bun

/**
 * Dev HQ Benchmark CLI
 * Performance benchmarking command-line interface
 *
 * Usage: bun run benchmark-cli.ts [command] [options]
 */

// Using Bun's built-in CLI parsing instead of commander
import { Command } from "commander";
import { MemoryAnalyzer, PerformanceTracker } from "../core/benchmark.js";

// @ts-ignore - heapStats is available at runtime via bun:jsc
const heapStats = globalThis.heapStats || (() => {
  // Fallback if heapStats is not available
  return { heapSize: 0, heapCapacity: 0, objectCount: 0 };
});

// Mock functions for demonstration (replace with actual Dev HQ functions)
async function analyzeCodebase() {
  // Simulate codebase analysis
  await new Promise(resolve => setTimeout(resolve, 50));
  return { files: 100, lines: 10000, complexity: 0.7 };
}

async function animatedInsights(delay: number) {
  // Simulate animated insights
  await new Promise(resolve => setTimeout(resolve, delay));
  return { insights: ["Performance improved", "Memory optimized"] };
}

function blockingAnalysis(iterations: number) {
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.sqrt(i);
  }
  return sum;
}

const program = new Command()
  .name("dev-hq-bench")
  .description("Dev HQ Performance Benchmarking Suite")
  .version("1.0.0");

program
  .command("time")
  .description("Time execution of Dev HQ functions")
  .action(async () => {
    console.log("⏱️ Timing Dev HQ Functions\n");

    await PerformanceTracker.measureAsync(
      async () => await analyzeCodebase(),
      "analyzeCodebase"
    );

    await PerformanceTracker.measureAsync(
      async () => await animatedInsights(10),
      "animatedInsights (10ms steps)"
    );

    // Compare Bun.sleep vs setTimeout
    console.log("\n🔍 Comparing sleep implementations:");
    await PerformanceTracker.measureAsync(
      async () => await Bun.sleep(100),
      "Bun.sleep(100ms)"
    );

    await PerformanceTracker.measureAsync(
      async () => await new Promise(resolve => setTimeout(resolve, 100)),
      "setTimeout(100ms)"
    );
  });

program
  .command("memory")
  .description("Analyze memory usage")
  .option("--snapshot", "Take heap snapshot", false)
  .action(async (cmd) => {
    console.log("🧠 Memory Usage Analysis\n");

    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true); // Start clean

    const before = MemoryAnalyzer.snapshot("Initial State");

    // Simulate work
    for (let i = 0; i < 100; i++) {
      await analyzeCodebase();
    }

    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
    const after = MemoryAnalyzer.snapshot("After Work");

    MemoryAnalyzer.compare(before, after);

    if (cmd.snapshot) {
      try {
        // @ts-ignore - generateHeapSnapshot might be available
        const snapshot = generateHeapSnapshot?.();
        if (snapshot) {
          await Bun.write(`heap-${Date.now()}.json`, JSON.stringify(snapshot, null, 2));
          console.log("💾 Heap snapshot saved");
        } else {
          console.log("⚠️ Heap snapshot generation not available");
        }
      } catch (error) {
        console.log("⚠️ Could not generate heap snapshot:", error);
      }
    }
  });

program
  .command("stress")
  .description("Run stress tests")
  .option("--iterations <number>", "Number of iterations", "100")
  .action(async (cmd) => {
    const iterations = parseInt(cmd.iterations);
    console.log(`🔥 Stress Test - ${iterations} iterations\n`);

    const start = performance.now();
    const startMemory = heapStats().heapSize;

    const promises = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(analyzeCodebase());
    }

    await Promise.all(promises);

    const end = performance.now();
    const endMemory = heapStats().heapSize;

    console.log(`📊 Results:`);
    console.log(`  Total time: ${(end - start).toFixed(2)}ms`);
    console.log(`  Avg per iteration: ${((end - start) / iterations).toFixed(2)}ms`);
    console.log(`  Memory delta: ${((endMemory - startMemory) / 1024).toFixed(2)}KB`);
  });

program
  .command("compare")
  .description("Compare different implementations")
  .action(async () => {
    console.log("⚖️ Implementation Comparison\n");

    // Test 1: Sync vs Async analysis
    PerformanceTracker.measure(
      () => blockingAnalysis(100),
      "Sync blocking analysis"
    );

    await PerformanceTracker.measureAsync(
      async () => {
        await Bun.sleep(100);
        await analyzeCodebase();
      },
      "Async non-blocking analysis"
    );

    // Test 2: Loop styles
    console.log("\n🔄 Loop Performance:");

    const array = Array.from({ length: 10000 }, (_, i) => i);

    PerformanceTracker.measure(
      () => array.forEach(n => Math.sqrt(n)),
      "forEach"
    );

    PerformanceTracker.measure(
      () => {
        for (let i = 0; i < array.length; i++) Math.sqrt(array[i]);
      },
      "for loop"
    );

    PerformanceTracker.measure(
      () => {
        for (const n of array) Math.sqrt(n);
      },
      "for...of"
    );
  });

program
  .command("profile")
  .description("Generate CPU profile")
  .action(() => {
    console.log("📋 To generate CPU profile:");
    console.log("  bun --cpu-prof --cpu-prof-name dev-hq.cpuprofile run benchmark-cli.ts time");
    console.log("\n📋 To view in Chrome:");
    console.log("  1. Open Chrome DevTools");
    console.log("  2. Go to Performance tab");
    console.log("  3. Click 'Load profile'");
    console.log("  4. Select dev-hq.cpuprofile");
  });

program
  .command("network")
  .description("Benchmark network operations")
  .action(async () => {
    console.log("🌐 Network Performance Tests\n");

    // Test HTTP server creation
    PerformanceTracker.measure(() => {
      // @ts-ignore - Bun.serve is available at runtime
      const server = Bun.serve({
        port: 0,
        fetch() {
          return new Response("Hello World");
        },
      });
      server.stop();
      return server.port;
    }, "Bun.serve creation");

    // Test concurrent requests
    const testUrl = "https://httpbin.org/get";
    const concurrentRequests = 10;

    await PerformanceTracker.measureAsync(async () => {
      const promises = Array.from({ length: concurrentRequests }, () =>
        fetch(testUrl)
      );
      return await Promise.all(promises);
    }, `${concurrentRequests} concurrent HTTP requests`);
  });

program
  .command("transpilation")
  .description("Benchmark transpilation performance")
  .action(async () => {
    console.log("⚡ Transpilation Performance Tests\n");

    // Test TypeScript compilation simulation
    const tsCode = `
      interface User {
        id: number;
        name: string;
      }

      function getUser(id: number): User {
        return { id, name: "User " + id };
      }
    `;

    PerformanceTracker.measure(() => {
      // Simulate TypeScript parsing
      const lines = tsCode.split('\n');
      const tokens = lines.flatMap(line => line.split(/\s+/));
      return tokens.length;
    }, "TypeScript parsing simulation");

    // Test JSX transformation simulation
    const jsxCode = `<div className="container"><h1>Hello {name}</h1></div>`;

    PerformanceTracker.measure(() => {
      // Simulate JSX transformation
      return jsxCode
        .replace(/className=/g, 'class=')
        .replace(/{([^}]+)}/g, '${$1}');
    }, "JSX transformation simulation");
  });

program
  .command("configuration")
  .description("Benchmark configuration parsing")
  .action(async () => {
    console.log("📁 Configuration Performance Tests\n");

    // Test TOML parsing simulation
    const tomlContent = `
      [server]
      port = 3000
      host = "localhost"

      [database]
      url = "postgresql://localhost:5432/db"
      max_connections = 100
    `;

    PerformanceTracker.measure(() => {
      // Simulate TOML parsing
      const lines = tomlContent.split('\n').filter(line => line.trim());
      const config: any = {};

      for (const line of lines) {
        if (line.includes('[') && line.includes(']')) {
          const section = line.match(/\[(.+)\]/)?.[1];
          if (section) config[section] = {};
        } else if (line.includes('=')) {
          const [key, value] = line.split('=').map(s => s.trim());
          config[key] = value.replace(/"/g, '');
        }
      }

      return config;
    }, "TOML parsing simulation");

    // Test package.json parsing
    const packageJson = {
      name: "dev-hq",
      version: "1.0.0",
      scripts: { test: "bun test", build: "bun build" },
      dependencies: { "commander": "^11.0.0" }
    };

    PerformanceTracker.measure(() => {
      // Simulate package.json analysis
      const deps = Object.keys(packageJson.dependencies || {});
      const scripts = Object.keys(packageJson.scripts || {});
      return { dependencies: deps.length, scripts: scripts.length };
    }, "package.json analysis");
  });

program.parse();
