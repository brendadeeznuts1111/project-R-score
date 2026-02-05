/**
 * Benchmark Service
 * 
 * Executes benchmarks and parses results for the enterprise-dashboard.
 * Supports three types of benchmarks:
 * - Runtime: Bun API benchmarks (CRC32, spawn, Response.json, Buffer)
 * - Route: API endpoint performance benchmarks
 * - Project: Git operation benchmarks per repository
 */

import { resolve } from "path";
import type { Benchmark, BenchmarkResult, RouteBenchmarkResult, ProjectBenchmarkResult } from "../types";
import { ROUTES } from "../features/topology";
import { scanRepo, getRepoPath } from "./git-scanner";

/**
 * Test seed generator for reproducible benchmark data
 */
export class TestSeedGenerator {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Generate a seeded random number (0-1)
   */
  random(): number {
    // Linear congruential generator (LCG) for deterministic randomness
    this.seed = (this.seed * 1664525 + 1013904223) % 2 ** 32;
    return (this.seed >>> 0) / 2 ** 32;
  }

  /**
   * Generate random integer in range [min, max)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Generate random float in range [min, max)
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Generate random string of given length
   */
  randomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[this.randomInt(0, chars.length)];
    }
    return result;
  }

  /**
   * Generate array of random numbers
   */
  randomArray(length: number, min: number = 0, max: number = 1000): number[] {
    return Array.from({ length }, () => this.randomFloat(min, max));
  }

  /**
   * Get current seed value
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Set seed value
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
}

/**
 * Generate test seed for benchmarks
 */
export function generateTestSeed(seed?: number): { seed: number; generator: TestSeedGenerator } {
  const testSeed = seed ?? Date.now();
  return {
    seed: testSeed,
    generator: new TestSeedGenerator(testSeed),
  };
}

// Benchmark registry
const BENCHMARK_REGISTRY: Benchmark[] = [
  // Runtime benchmarks
  {
    name: "crc32",
    description: "Hardware-accelerated CRC32 hashing (20x faster in Bun 1.3.6+)",
    category: "runtime",
    script: "scripts/bench/crc32-bench-mitata.ts",
    status: "ready",
  },
  {
    name: "spawn",
    description: "Bun.spawn() vs Bun.spawnSync() performance (30x faster on Linux ARM64)",
    category: "runtime",
    script: "scripts/bench/spawn-bench-mitata.ts",
    status: "ready",
  },
  {
    name: "archive",
    description: "Archive creation performance (tar/tar.gz)",
    category: "runtime",
    script: "scripts/bench/archive-bench-mitata.ts",
    status: "ready",
  },
  {
    name: "bun-1.3.6",
    description: "Comprehensive Bun 1.3.6+ performance benchmarks (Response.json, Buffer operations)",
    category: "runtime",
    script: "examples/bun-1.3.6-bench-mitata.ts",
    status: "ready",
  },
  // Route benchmarks (dynamic - generated from topology)
  {
    name: "route",
    description: "API endpoint performance benchmarks",
    category: "route",
    status: "ready",
  },
  // Project benchmarks (dynamic - per project)
  {
    name: "project",
    description: "Git operation benchmarks per repository",
    category: "project",
    status: "ready",
  },
];

/**
 * List all available benchmarks
 */
export function listBenchmarks(): Benchmark[] {
  // Add route benchmarks from topology
  const routeGroups = new Set(ROUTES.map(r => r.group));
  const routeBenchmarks: Benchmark[] = Array.from(routeGroups).map(group => ({
    name: `route-${group}`,
    description: `Benchmark all routes in ${group} group`,
    category: "route",
    group,
    status: "ready",
  }));

  return [...BENCHMARK_REGISTRY, ...routeBenchmarks];
}

/**
 * Get benchmark details by name
 */
export function getBenchmarkDetails(name: string): Benchmark | null {
  const benchmark = BENCHMARK_REGISTRY.find(b => b.name === name);
  if (benchmark) return benchmark;

  // Check if it's a route benchmark
  if (name.startsWith("route-")) {
    const group = name.replace("route-", "");
    return {
      name,
      description: `Benchmark all routes in ${group} group`,
      category: "route",
      group,
      status: "ready",
    };
  }

  return null;
}

/**
 * Parse Mitata JSON output into structured format
 * Uses Bun.JSONC natively for JSON with comments support (Bun native always)
 */
export function parseMitataResults(jsonOutput: string): BenchmarkResult[] {
  try {
    // Use Bun.JSONC natively - supports JSON with comments (Jan 17, 2026 fix: 1344151)
    const data = Bun.JSONC.parse(jsonOutput);
    if (!data.benchmarks || !Array.isArray(data.benchmarks)) {
      throw new Error("Invalid Mitata output format");
    }

    return data.benchmarks.map((bench: any) => ({
      name: bench.alias || bench.name || "unknown",
      avg: bench.stats?.avg || 0,
      min: bench.stats?.min || 0,
      max: bench.stats?.max || 0,
      p75: bench.stats?.p75 || 0,
      p99: bench.stats?.p99 || 0,
      heap: bench.stats?.heap ? {
        avg: bench.stats.heap.avg || 0,
        min: bench.stats.heap.min || 0,
        max: bench.stats.heap.max || 0,
      } : undefined,
      samples: bench.stats?.samples || [],
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    throw new Error(`Failed to parse Mitata results: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Run a runtime benchmark script
 */
export async function runBenchmark(
  name: string,
  options: { json?: boolean } = {}
): Promise<BenchmarkResult[]> {
  const benchmark = BENCHMARK_REGISTRY.find(b => b.name === name);
  if (!benchmark || !benchmark.script) {
    throw new Error(`Benchmark not found: ${name}`);
  }

  const scriptPath = resolve(process.cwd(), benchmark.script);
  const env = { ...process.env };
  if (options.json) {
    env.BENCHMARK_RUNNER = "1";
  }

  const proc = Bun.spawn({
    cmd: ["bun", scriptPath],
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  let stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Benchmark failed: ${stderr || stdout}`);
  }

  // Use Bun.wrapAnsi() natively for better output formatting (Bun native always)
  if (!options.json) {
    stdout = Bun.wrapAnsi(stdout, 120); // 120 char width
  }

  if (options.json) {
    return parseMitataResults(stdout);
  }

  // For non-JSON output, return a simple result
  return [{
    name: benchmark.name,
    avg: 0,
    min: 0,
    max: 0,
    p75: 0,
    p99: 0,
    samples: [],
    timestamp: new Date().toISOString(),
  }];
}

/**
 * Run a route benchmark by making HTTP requests
 */
export async function runRouteBenchmark(
  route: string,
  method: string = "GET",
  options: { iterations?: number; testSeed?: number; baseUrl?: string } = {}
): Promise<RouteBenchmarkResult> {
  const routeDef = ROUTES.find(r => r.path === route && r.methods.includes(method));
  if (!routeDef) {
    throw new Error(`Route not found: ${method} ${route}`);
  }

  const iterations = options.iterations ?? 100;
  const times: number[] = [];
  const statusCodes: number[] = [];
  const payloadSizes: number[] = [];
  let errors = 0;

  const baseUrl = options.baseUrl || process.env.BASE_URL || "http://localhost:8080";
  const url = `${baseUrl}${route}`;

  // Use test seed if provided for reproducible benchmarks
  const seedGen = options.testSeed ? new TestSeedGenerator(options.testSeed) : null;

  for (let i = 0; i < iterations; i++) {
    try {
      // Add small random delay if using seed (for realistic load simulation)
      if (seedGen) {
        const delay = seedGen.randomFloat(0, 10); // 0-10ms random delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const start = performance.now();
      const response = await fetch(url, { method });
      const end = performance.now();
      
      const responseTime = end - start;
      times.push(responseTime);
      statusCodes.push(response.status);
      
      const text = await response.text();
      payloadSizes.push(new Blob([text]).size);
    } catch (error) {
      errors++;
    }
  }

  const sortedTimes = [...times].sort((a, b) => a - b);
  const avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p95ResponseTime = sortedTimes[p95Index] || 0;
  const avgPayloadSize = payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length;
  const errorRate = errors / iterations;
  const throughput = iterations / (times.reduce((a, b) => a + b, 0) / 1000);

  return {
    route,
    method,
    responseTime: avgResponseTime,
    statusCode: Math.round(statusCodes.reduce((a, b) => a + b, 0) / statusCodes.length),
    payloadSize: avgPayloadSize,
    errorRate,
    p95ResponseTime,
    throughput,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run benchmark for a network matrix host
 */
export async function runHostBenchmark(
  hostId: string,
  hostUrl: string,
  options: { iterations?: number; testSeed?: number } = {}
): Promise<RouteBenchmarkResult & { hostId: string; hostUrl: string }> {
  // Benchmark the host's health endpoint or root
  const healthRoute = hostUrl.endsWith("/") ? `${hostUrl}health` : `${hostUrl}/health`;
  const result = await runRouteBenchmark(healthRoute, "GET", {
    ...options,
    baseUrl: hostUrl,
  });

  return {
    ...result,
    hostId,
    hostUrl,
    route: healthRoute,
  };
}

/**
 * Run benchmark with CPU profiling using Bun's native Profiler API
 * Uses the Profiler API from Bun commits (Jan 16, 2026) - Bun native always
 */
export async function runBenchmarkWithProfiling(
  name: string,
  options: { json?: boolean; profile?: boolean } = {}
): Promise<BenchmarkResult[] & { profile?: any }> {
  if (options.profile) {
    // Bun native Profiler API (Jan 16, 2026)
    const Inspector = (globalThis as any).Inspector;
    const profiler = new Inspector.Profiler();
    
    await profiler.start();
    const results = await runBenchmark(name, options);
    const profile = await profiler.stop();
    
    return {
      ...results,
      profile: {
        nodes: profile.nodes?.length || 0,
        startTime: profile.startTime,
        endTime: profile.endTime,
        samples: profile.samples?.length || 0,
      },
    } as any;
  }
  
  return runBenchmark(name, options);
}

/**
 * Run project benchmark for git operations
 */
export async function runProjectBenchmark(projectId: string): Promise<ProjectBenchmarkResult> {
  // projectId can be either project ID or project name
  // getRepoPath expects project name, so we use projectId directly as it may be the name
  // If it's an ID, we'd need to look up the project first, but for simplicity
  // we'll try projectId as name first (common case)
  const repoPath = await getRepoPath(projectId);
  if (!repoPath) {
    throw new Error(`Project not found: ${projectId}. Use project name (directory name) for benchmarking.`);
  }

  const operations: ProjectBenchmarkResult["operations"] = [];
  const startTime = performance.now();

  // Benchmark scanRepo
  try {
    const scanStart = performance.now();
    const project = await scanRepo(repoPath, projectId);
    const scanTime = performance.now() - scanStart;
    operations.push({
      operation: "scanRepo",
      time: scanTime,
      success: project !== null,
    });
  } catch (error) {
    operations.push({
      operation: "scanRepo",
      time: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Note: Individual git operations (getBranch, getGitStatus, getRemoteStatus, getLastCommit)
  // are not exported from git-scanner.ts, so we benchmark scanRepo which internally calls them all.
  // For more granular benchmarks, export those functions from git-scanner.ts.

  const totalTime = performance.now() - startTime;

  return {
    projectId,
    projectName: repoPath.split("/").filter(Boolean).pop() || projectId,
    operations,
    totalTime,
    timestamp: new Date().toISOString(),
  };
}
