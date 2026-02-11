#!/usr/bin/env bun
/**
 * Performance Optimization for bun run --parallel and --sequential
 * 
 * Demonstrates performance benchmarking, optimization strategies,
 * resource management, and parallel execution tuning.
 */

import { spawn } from "bun";
import { performance } from "perf_hooks";

console.log("⚡ Performance Optimization Strategies\n");
console.log("=".repeat(70));

// ============================================================================
// Strategy 1: Performance Benchmarking
// ============================================================================

interface BenchmarkResult {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  stdDev: number;
  iterations: number;
}

async function benchmarkScriptExecution(
  name: string,
  command: string[],
  iterations: number = 10
): Promise<BenchmarkResult> {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const proc = spawn({
      cmd: command,
      stdout: "pipe",
      stderr: "pipe",
    });
    
    await proc.exited;
    const end = performance.now();
    
    times.push(end - start);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  // Calculate standard deviation
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    name,
    avgTime,
    minTime,
    maxTime,
    stdDev,
    iterations,
  };
}

console.log("\n📊 Strategy 1: Performance Benchmarking");
console.log("-".repeat(70));

console.log(`
async function benchmarkScriptExecution(
  name: string,
  command: string[],
  iterations: number = 10
): Promise<BenchmarkResult> {
  // Runs command multiple times and collects timing statistics
  // Returns average, min, max, and standard deviation
}
`);

// ============================================================================
// Strategy 2: Parallel vs Sequential Comparison
// ============================================================================

interface ComparisonResult {
  parallel: BenchmarkResult;
  sequential: BenchmarkResult;
  speedup: number;
  efficiency: number; // Speedup / number of scripts
}

async function compareExecutionStrategies(
  scripts: string[],
  iterations: number = 5
): Promise<ComparisonResult> {
  // Benchmark parallel execution
  const parallelCmd = ["bun", "run", "--parallel", ...scripts];
  const parallel = await benchmarkScriptExecution("parallel", parallelCmd, iterations);
  
  // Benchmark sequential execution
  const sequentialCmd = ["bun", "run", "--sequential", ...scripts];
  const sequential = await benchmarkScriptExecution("sequential", sequentialCmd, iterations);
  
  const speedup = sequential.avgTime / parallel.avgTime;
  const efficiency = speedup / scripts.length;
  
  return {
    parallel,
    sequential,
    speedup,
    efficiency,
  };
}

console.log("\n⚖️  Strategy 2: Parallel vs Sequential Comparison");
console.log("-".repeat(70));

console.log(`
async function compareExecutionStrategies(
  scripts: string[],
  iterations: number = 5
): Promise<ComparisonResult> {
  // Compares parallel and sequential execution
  // Calculates speedup and efficiency metrics
}
`);

console.log("\nExample output:");
console.log(`
{
  parallel: { avgTime: 1234.56, ... },
  sequential: { avgTime: 3456.78, ... },
  speedup: 2.8,
  efficiency: 0.93  // 93% efficiency (2.8x speedup with 3 scripts)
}
`);

// ============================================================================
// Strategy 3: Optimal Parallelization
// ============================================================================

interface ScriptProfile {
  name: string;
  estimatedDuration: number;
  cpuIntensive: boolean;
  ioIntensive: boolean;
  memoryIntensive: boolean;
}

function determineOptimalStrategy(profiles: ScriptProfile[]): {
  strategy: "parallel" | "sequential" | "mixed";
  grouping: string[][];
  reasoning: string;
} {
  const cpuIntensive = profiles.filter(p => p.cpuIntensive);
  const ioIntensive = profiles.filter(p => p.ioIntensive);
  const memoryIntensive = profiles.filter(p => p.memoryIntensive);
  
  // If all are I/O intensive, parallel is best
  if (ioIntensive.length === profiles.length) {
    return {
      strategy: "parallel",
      grouping: [profiles.map(p => p.name)],
      reasoning: "All scripts are I/O intensive - parallel execution maximizes throughput",
    };
  }
  
  // If all are CPU intensive, need to consider CPU cores
  if (cpuIntensive.length === profiles.length) {
    const cpuCores = navigator.hardwareConcurrency || 4;
    if (profiles.length <= cpuCores) {
      return {
        strategy: "parallel",
        grouping: [profiles.map(p => p.name)],
        reasoning: `CPU intensive scripts can run in parallel (${profiles.length} <= ${cpuCores} cores)`,
      };
    } else {
      // Group by CPU cores
      const groups: string[][] = [];
      for (let i = 0; i < profiles.length; i += cpuCores) {
        groups.push(profiles.slice(i, i + cpuCores).map(p => p.name));
      }
      return {
        strategy: "mixed",
        grouping: groups,
        reasoning: `Too many CPU intensive scripts - group into ${cpuCores} parallel batches`,
      };
    }
  }
  
  // Mixed - group by type
  const groups: string[][] = [];
  if (ioIntensive.length > 0) groups.push(ioIntensive.map(p => p.name));
  if (cpuIntensive.length > 0) groups.push(cpuIntensive.map(p => p.name));
  if (memoryIntensive.length > 0) groups.push(memoryIntensive.map(p => p.name));
  
  return {
    strategy: "mixed",
    grouping: groups,
    reasoning: "Mixed script types - group by resource usage for optimal performance",
  };
}

console.log("\n🎯 Strategy 3: Optimal Parallelization");
console.log("-".repeat(70));

const sampleProfiles: ScriptProfile[] = [
  { name: "build", estimatedDuration: 5000, cpuIntensive: true, ioIntensive: false, memoryIntensive: false },
  { name: "test", estimatedDuration: 3000, cpuIntensive: true, ioIntensive: false, memoryIntensive: false },
  { name: "lint", estimatedDuration: 1000, cpuIntensive: false, ioIntensive: true, memoryIntensive: false },
];

const optimal = determineOptimalStrategy(sampleProfiles);
console.log(`\nOptimal strategy: ${optimal.strategy}`);
console.log(`Reasoning: ${optimal.reasoning}`);
console.log(`Grouping:`);
optimal.grouping.forEach((group, i) => {
  console.log(`  Group ${i + 1}: ${group.join(", ")}`);
  console.log(`    Command: bun run --parallel ${group.join(" ")}`);
});

// ============================================================================
// Strategy 4: Resource Management
// ============================================================================

interface ResourceLimits {
  maxConcurrent: number;
  maxMemoryMB: number;
  maxCpuPercent: number;
}

class ResourceAwareOrchestrator {
  private activeScripts = 0;
  private resourceLimits: ResourceLimits;
  
  constructor(limits: ResourceLimits) {
    this.resourceLimits = limits;
  }
  
  async runWithLimits(
    scripts: string[],
    parallel: boolean = true
  ): Promise<void> {
    if (!parallel) {
      // Sequential - no resource concerns
      for (const script of scripts) {
        await this.runScript(script);
      }
      return;
    }
    
    // Parallel with resource limits
    const queue: string[] = [...scripts];
    const running: Promise<void>[] = [];
    
    while (queue.length > 0 || running.length > 0) {
      // Start new scripts if under limit
      while (
        this.activeScripts < this.resourceLimits.maxConcurrent &&
        queue.length > 0
      ) {
        const script = queue.shift()!;
        const promise = this.runScript(script).finally(() => {
          this.activeScripts--;
        });
        running.push(promise);
        this.activeScripts++;
      }
      
      // Wait for at least one to complete
      if (running.length > 0) {
        await Promise.race(running);
        running.splice(
          running.findIndex(p => p === await Promise.race(running)),
          1
        );
      }
    }
  }
  
  private async runScript(script: string): Promise<void> {
    const proc = spawn({
      cmd: ["bun", "run", script],
      stdout: "pipe",
      stderr: "pipe",
    });
    
    await proc.exited;
  }
}

console.log("\n💾 Strategy 4: Resource Management");
console.log("-".repeat(70));

console.log(`
class ResourceAwareOrchestrator {
  async runWithLimits(scripts, parallel) {
    // Limits concurrent execution based on:
    // - Max concurrent scripts
    // - Memory limits
    // - CPU limits
  }
}
`);

console.log("\nUsage:");
console.log(`
const orchestrator = new ResourceAwareOrchestrator({
  maxConcurrent: 4,
  maxMemoryMB: 2048,
  maxCpuPercent: 80
});

await orchestrator.runWithLimits(["build", "test", "lint", "coverage"], true);
`);

// ============================================================================
// Strategy 5: Caching and Incremental Execution
// ============================================================================

interface CacheStrategy {
  name: string;
  description: string;
  command: string;
  benefit: string;
}

const cacheStrategies: CacheStrategy[] = [
  {
    name: "Changed Files Only",
    description: "Run scripts only for changed packages",
    command: "bun run --parallel --filter '[HEAD^1]' build",
    benefit: "Fastest execution for large monorepos",
  },
  {
    name: "Dependency-Aware Caching",
    description: "Skip scripts if dependencies unchanged",
    command: "bun run --filter '...' build", // Respects dependencies
    benefit: "Correct execution with optimal caching",
  },
  {
    name: "Selective Execution",
    description: "Run only specific packages",
    command: "bun run --parallel --filter 'api|frontend' build",
    benefit: "Focused execution for development",
  },
];

console.log("\n💾 Strategy 5: Caching and Incremental Execution");
console.log("-".repeat(70));

cacheStrategies.forEach(strategy => {
  console.log(`\n${strategy.name}:`);
  console.log(`  Description: ${strategy.description}`);
  console.log(`  Command: ${strategy.command}`);
  console.log(`  Benefit: ${strategy.benefit}`);
});

// ============================================================================
// Strategy 6: Performance Monitoring
// ============================================================================

interface PerformanceMetrics {
  totalDuration: number;
  scriptDurations: Map<string, number>;
  parallelizationEfficiency: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
  };
}

class PerformanceMonitor {
  private startTime: number = 0;
  private scriptStarts = new Map<string, number>();
  private scriptDurations = new Map<string, number>();
  
  start(): void {
    this.startTime = performance.now();
  }
  
  startScript(script: string): void {
    this.scriptStarts.set(script, performance.now());
  }
  
  endScript(script: string): void {
    const start = this.scriptStarts.get(script);
    if (start) {
      const duration = performance.now() - start;
      this.scriptDurations.set(script, duration);
    }
  }
  
  getMetrics(): PerformanceMetrics {
    const totalDuration = performance.now() - this.startTime;
    const sequentialDuration = Array.from(this.scriptDurations.values())
      .reduce((sum, d) => sum + d, 0);
    const parallelizationEfficiency = sequentialDuration / totalDuration;
    
    return {
      totalDuration,
      scriptDurations: this.scriptDurations,
      parallelizationEfficiency,
      resourceUtilization: {
        cpu: 0, // Would need system metrics
        memory: 0, // Would need system metrics
      },
    };
  }
}

console.log("\n📈 Strategy 6: Performance Monitoring");
console.log("-".repeat(70));

console.log(`
class PerformanceMonitor {
  start() { /* Track start time */ }
  startScript(script) { /* Track script start */ }
  endScript(script) { /* Track script end */ }
  getMetrics() {
    // Returns:
    // - Total duration
    // - Per-script durations
    // - Parallelization efficiency
    // - Resource utilization
  }
}
`);

console.log("\nUsage:");
console.log(`
const monitor = new PerformanceMonitor();
monitor.start();

// Run scripts...
monitor.startScript("build");
// ... execute build ...
monitor.endScript("build");

const metrics = monitor.getMetrics();
console.log(\`Total: \${metrics.totalDuration}ms\`);
console.log(\`Efficiency: \${metrics.parallelizationEfficiency.toFixed(2)}x\`);
`);

console.log("\n✅ Performance Optimization Strategies Complete!");
console.log("\nKey Optimization Techniques:");
console.log("  • Benchmark to measure actual performance");
console.log("  • Compare parallel vs sequential for your workload");
console.log("  • Optimize based on script characteristics (CPU/IO/Memory)");
console.log("  • Manage resources to avoid overload");
console.log("  • Use caching and incremental execution");
console.log("  • Monitor performance to identify bottlenecks");
