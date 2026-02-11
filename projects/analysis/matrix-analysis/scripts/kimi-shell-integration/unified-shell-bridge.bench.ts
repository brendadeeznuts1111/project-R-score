#!/usr/bin/env bun
/**
 * Unified Shell Bridge Benchmark Suite
 * 
 * Comprehensive benchmarks for:
 * - Signal handling performance
 * - Command execution throughput
 * - Memory usage
 * - Startup/shutdown times
 * - Bun-native vs Node.js patterns
 * 
 * @bun >= 1.3.0
 */

import { $ } from "bun";
import { executeCommand, getHealthStatus } from "./unified-shell-bridge";

// ============================================================================
// Benchmark Utilities
// ============================================================================

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  opsPerSecond: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const times: number[] = [];
  
  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    await fn();
  }
  
  // Actual benchmark
  const totalStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const totalMs = performance.now() - totalStart;
  
  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const opsPerSecond = (iterations / totalMs) * 1000;
  
  return {
    name,
    iterations,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    opsPerSecond,
  };
}

function printResult(result: BenchmarkResult): void {
  console.log(`\n  ${result.name}`);
  console.log(`    Iterations: ${result.iterations.toLocaleString()}`);
  console.log(`    Total: ${result.totalMs.toFixed(2)}ms`);
  console.log(`    Average: ${result.avgMs.toFixed(4)}ms`);
  console.log(`    Min: ${result.minMs.toFixed(4)}ms`);
  console.log(`    Max: ${result.maxMs.toFixed(4)}ms`);
  console.log(`    Ops/sec: ${result.opsPerSecond.toFixed(0)}`);
}

// ============================================================================
// Benchmark Groups
// ============================================================================

async function runSignalBenchmarks(): Promise<void> {
  console.log("\n📡 Signal Handling Benchmarks");
  console.log("==============================");
  
  // Signal handler registration
  const regResult = await benchmark(
    "Register/Remove SIGINT handler",
    () => {
      const handler = () => {};
      process.on("SIGINT", handler);
      process.removeListener("SIGINT", handler);
    },
    10000
  );
  printResult(regResult);
  
  // Listener count check
  const countResult = await benchmark(
    "Check listener count",
    () => {
      process.listenerCount("SIGINT");
    },
    100000
  );
  printResult(countResult);
}

async function runCommandBenchmarks(): Promise<void> {
  console.log("\n⚡ Command Execution Benchmarks");
  console.log("===============================");
  
  // Simple command
  const simpleResult = await benchmark(
    "Simple echo command",
    async () => {
      await $`echo hello`.nothrow();
    },
    100
  );
  printResult(simpleResult);
  
  // Command with env
  const envResult = await benchmark(
    "Command with env var",
    async () => {
      await $`echo $TEST_VAR`.env({ TEST_VAR: "test" }).nothrow();
    },
    100
  );
  printResult(envResult);
  
  // Command with cwd
  const cwdResult = await benchmark(
    "Command with cwd",
    async () => {
      await $`pwd`.cwd("/tmp").nothrow();
    },
    100
  );
  printResult(cwdResult);
  
  // Via executeCommand
  const execResult = await benchmark(
    "executeCommand wrapper",
    async () => {
      await executeCommand("echo test");
    },
    50
  );
  printResult(execResult);
}

async function runBunApiBenchmarks(): Promise<void> {
  console.log("\n🔥 Bun Native API Benchmarks");
  console.log("=============================");
  
  // Bun.sleep
  const sleepResult = await benchmark(
    "Bun.sleep (1ms)",
    async () => {
      await Bun.sleep(1);
    },
    100
  );
  printResult(sleepResult);
  
  // setTimeout comparison
  const timeoutResult = await benchmark(
    "setTimeout (1ms)",
    async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
    },
    100
  );
  printResult(timeoutResult);
  
  // Bun.spawn
  const spawnResult = await benchmark(
    "Bun.spawn (simple)",
    async () => {
      const proc = Bun.spawn(["echo", "hello"], { stdout: "pipe" });
      await proc.exited;
    },
    100
  );
  printResult(spawnResult);
  
  // $ template literal
  const templateResult = await benchmark(
    "$ template literal",
    async () => {
      await $`echo hello`.nothrow();
    },
    100
  );
  printResult(templateResult);
  
  // JSON operations
  const jsonResult = await benchmark(
    "JSON parse/stringify",
    () => {
      const data = { test: "data", number: 123, bool: true };
      const str = JSON.stringify(data);
      JSON.parse(str);
    },
    100000
  );
  printResult(jsonResult);
}

async function runMcpBenchmarks(): Promise<void> {
  console.log("\n🔌 MCP Protocol Benchmarks");
  console.log("===========================");
  
  // JSON-RPC request parse
  const parseResult = await benchmark(
    "JSON-RPC parse/serialize",
    () => {
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "shell_execute",
          arguments: { command: "echo test" },
        },
      };
      const str = JSON.stringify(request);
      JSON.parse(str);
    },
    100000
  );
  printResult(parseResult);
  
  // Tool dispatch simulation
  const toolResult = await benchmark(
    "Tool dispatch simulation",
    () => {
      const tools: Record<string, Function> = {
        shell_execute: () => ({ stdout: "", stderr: "", exitCode: 0 }),
        openclaw_status: () => ({ running: true }),
        profile_list: () => ({ profiles: [] }),
        bridge_health: () => ({ status: "healthy" }),
      };
      
      const toolName = "shell_execute";
      const handler = tools[toolName];
      if (handler) handler();
    },
    100000
  );
  printResult(toolResult);
  
  // Health check
  const healthResult = await benchmark(
    "Health check",
    async () => {
      await getHealthStatus();
    },
    10000
  );
  printResult(healthResult);
}

async function runThroughputBenchmarks(): Promise<void> {
  console.log("\n📊 Throughput Benchmarks");
  console.log("========================");
  
  // JSON-RPC throughput
  const iterations = 50000;
  const start = performance.now();
  
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "test", arguments: {} },
  };
  
  for (let i = 0; i < iterations; i++) {
    const str = JSON.stringify(request);
    JSON.parse(str);
  }
  
  const duration = performance.now() - start;
  const perSecond = (iterations / duration) * 1000;
  
  console.log(`\n  JSON-RPC messages`);
  console.log(`    Iterations: ${iterations.toLocaleString()}`);
  console.log(`    Duration: ${duration.toFixed(2)}ms`);
  console.log(`    Messages/sec: ${perSecond.toFixed(0)}`);
}

async function runRealWorldBenchmarks(): Promise<void> {
  console.log("\n🌍 Real-World Scenario Benchmarks");
  console.log("==================================");
  
  // Typical workflow
  const workflowResult = await benchmark(
    "Typical shell workflow",
    async () => {
      await getHealthStatus();
      await executeCommand("echo test");
      await getHealthStatus();
    },
    20
  );
  printResult(workflowResult);
  
  // Concurrent commands
  const concurrentResult = await benchmark(
    "Concurrent commands (10)",
    async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push($`echo ${i}`.nothrow());
      }
      await Promise.all(promises);
    },
    20
  );
  printResult(concurrentResult);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("🔥 Unified Shell Bridge Benchmark Suite");
  console.log("========================================\n");
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`PID: ${process.pid}`);
  
  const startTime = performance.now();
  
  await runSignalBenchmarks();
  await runCommandBenchmarks();
  await runBunApiBenchmarks();
  await runMcpBenchmarks();
  await runThroughputBenchmarks();
  await runRealWorldBenchmarks();
  
  const totalTime = performance.now() - startTime;
  
  console.log("\n" + "=".repeat(50));
  console.log(`✅ All benchmarks complete in ${totalTime.toFixed(0)}ms`);
  console.log("=".repeat(50) + "\n");
}

if (import.meta.main) {
  main().catch(console.error);
}
