#!/usr/bin/env bun

/**
 * Performance Benchmarking Tool
 * Comprehensive performance testing for Bun applications
 */

import { performance } from "perf_hooks";
import { spawn } from "bun";
import { readFileSync, writeFileSync, existsSync } from "fs";

interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memory: {
    before: number;
    after: number;
    peak: number;
  };
  success: boolean;
  error?: string;
}

interface BenchmarkSuite {
  name: string;
  benchmarks: BenchmarkResult[];
  totalTime: number;
  summary: {
    totalBenchmarks: number;
    successful: number;
    failed: number;
    averageOpsPerSecond: number;
    totalMemoryUsed: number;
  };
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private suiteName: string;

  constructor(suiteName: string = "Bun Performance Suite") {
    this.suiteName = suiteName;
  }

  async benchmark(name: string, fn: () => Promise<void> | void, iterations: number = 1000): Promise<BenchmarkResult> {
    console.log(`🏃 Running ${name}...`);
    
    const memoryBefore = this.getMemoryUsage();
    let peakMemory = memoryBefore;
    
    try {
      // Warm up
      for (let i = 0; i < Math.min(iterations / 10, 100); i++) {
        await fn();
      }
      
      // Actual benchmark
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await fn();
        
        const currentMemory = this.getMemoryUsage();
        peakMemory = Math.max(peakMemory, currentMemory);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const memoryAfter = this.getMemoryUsage();
      
      const result: BenchmarkResult = {
        name,
        duration,
        operations: iterations,
        opsPerSecond: Math.round((iterations / duration) * 1000),
        memory: {
          before: memoryBefore,
          after: memoryAfter,
          peak: peakMemory
        },
        success: true
      };
      
      this.results.push(result);
      console.log(`✅ ${name}: ${result.opsPerSecond.toLocaleString()} ops/sec (${duration.toFixed(2)}ms)`);
      
      return result;
    } catch (error) {
      const result: BenchmarkResult = {
        name,
        duration: 0,
        operations: 0,
        opsPerSecond: 0,
        memory: {
          before: memoryBefore,
          after: this.getMemoryUsage(),
          peak: peakMemory
        },
        success: false,
        error: (error as Error).message
      };
      
      this.results.push(result);
      console.log(`❌ ${name}: Failed - ${result.error}`);
      
      return result;
    }
  }

  async benchmarkAsync(name: string, fn: () => Promise<void>, iterations: number = 100): Promise<BenchmarkResult> {
    return this.benchmark(name, fn, iterations);
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  async runBunBenchmarks(): Promise<BenchmarkSuite> {
    console.log("🚀 Starting Bun Performance Benchmarks\n");
    
    // String operations
    await this.benchmark("String Concatenation", () => {
      let str = "";
      for (let i = 0; i < 100; i++) {
        str += "test";
      }
    }, 10000);

    await this.benchmark("Template Literals", () => {
      for (let i = 0; i < 100; i++) {
        const str = `test${i}`;
      }
    }, 10000);

    // Array operations
    await this.benchmark("Array Push", () => {
      const arr: number[] = [];
      for (let i = 0; i < 1000; i++) {
        arr.push(i);
      }
    }, 1000);

    await this.benchmark("Array Map", () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i);
      arr.map(x => x * 2);
    }, 1000);

    await this.benchmark("Array Filter", () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i);
      arr.filter(x => x % 2 === 0);
    }, 1000);

    // Object operations
    await this.benchmark("Object Creation", () => {
      for (let i = 0; i < 100; i++) {
        const obj = { a: i, b: i * 2, c: i * 3 };
      }
    }, 1000);

    await this.benchmark("Property Access", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 };
      for (let i = 0; i < 1000; i++) {
        const a = obj.a;
        const b = obj.b;
        const c = obj.c;
      }
    }, 1000);

    // JSON operations
    await this.benchmark("JSON Parse", () => {
      const json = '{"a":1,"b":2,"c":3}';
      JSON.parse(json);
    }, 10000);

    await this.benchmark("JSON Stringify", () => {
      const obj = { a: 1, b: 2, c: 3 };
      JSON.stringify(obj);
    }, 10000);

    // Bun-specific operations
    await this.benchmark("Bun.hash()", () => {
      Bun.hash("test string");
    }, 100000);

    await this.benchmark("Bun.password()", () => {
      Bun.password.hash("password");
    }, 1000);

    await this.benchmark("Bun.color()", () => {
      Bun.color("red", "hex");
    }, 10000);

    // File operations
    await this.benchmarkAsync("File Read Sync", async () => {
      if (existsSync("package.json")) {
        readFileSync("package.json");
      }
    }, 100);

    // RegExp operations
    await this.benchmark("RegExp Test", () => {
      const regex = /test\d+/g;
      const str = "test123 test456 test789";
      regex.test(str);
    }, 10000);

    // Math operations
    await this.benchmark("Math Operations", () => {
      for (let i = 0; i < 100; i++) {
        Math.random() * 100;
        Math.floor(Math.random() * 100);
        Math.ceil(Math.random() * 100);
      }
    }, 1000);

    // Date operations
    await this.benchmark("Date Creation", () => {
      new Date();
      Date.now();
    }, 10000);

    // Function calls
    await this.benchmark("Function Calls", () => {
      const testFn = (x: number) => x * 2;
      for (let i = 0; i < 1000; i++) {
        testFn(i);
      }
    }, 1000);

    // Async operations
    await this.benchmarkAsync("Promise.resolve()", async () => {
      await Promise.resolve("test");
    }, 1000);

    await this.benchmarkAsync("setTimeout(0)", async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    }, 100);

    return this.generateSuite();
  }

  async runServerBenchmarks(port: number = 3000): Promise<BenchmarkSuite> {
    console.log(`🌐 Running Server Benchmarks on port ${port}\n`);
    
    const baseUrl = `http://localhost:${port}`;
    
    // HTTP GET requests
    await this.benchmarkAsync("HTTP GET", async () => {
      try {
        await fetch(`${baseUrl}/health`);
      } catch (error) {
        // Server might not be running
      }
    }, 100);

    // JSON API responses
    await this.benchmarkAsync("JSON API Response", async () => {
      try {
        await fetch(`${baseUrl}/metrics`);
      } catch (error) {
        // Server might not be running
      }
    }, 50);

    // Concurrent requests
    await this.benchmarkAsync("Concurrent Requests", async () => {
      try {
        await Promise.all([
          fetch(`${baseUrl}/health`),
          fetch(`${baseUrl}/metrics`),
          fetch(`${baseUrl}/bundle-analysis`)
        ]);
      } catch (error) {
        // Server might not be running
      }
    }, 50);

    return this.generateSuite();
  }

  async runMemoryBenchmarks(): Promise<BenchmarkSuite> {
    console.log("💾 Running Memory Benchmarks\n");
    
    // Large object creation
    await this.benchmark("Large Object Creation", () => {
      const obj: any = {};
      for (let i = 0; i < 10000; i++) {
        obj[`key${i}`] = `value${i}`.repeat(10);
      }
    }, 10);

    // Large array creation
    await this.benchmark("Large Array Creation", () => {
      const arr: string[] = [];
      for (let i = 0; i < 10000; i++) {
        arr.push(`item${i}`.repeat(10));
      }
    }, 10);

    // Memory allocation and cleanup
    await this.benchmark("Memory Allocation/Cleanup", () => {
      const data: any[] = [];
      for (let i = 0; i < 1000; i++) {
        data.push({
          id: i,
          data: new Array(100).fill(0),
          timestamp: Date.now()
        });
      }
      // Clear reference
      data.length = 0;
    }, 100);

    return this.generateSuite();
  }

  private generateSuite(): BenchmarkSuite {
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalMemoryUsed = this.results.reduce((sum, r) => sum + (r.memory.after - r.memory.before), 0);
    const averageOpsPerSecond = successful > 0 
      ? Math.round(this.results.filter(r => r.success).reduce((sum, r) => sum + r.opsPerSecond, 0) / successful)
      : 0;

    return {
      name: this.suiteName,
      benchmarks: this.results,
      totalTime: this.results.reduce((sum, r) => sum + r.duration, 0),
      summary: {
        totalBenchmarks: this.results.length,
        successful,
        failed,
        averageOpsPerSecond,
        totalMemoryUsed
      }
    };
  }

  printResults(suite: BenchmarkSuite): void {
    console.log("\n" + "=".repeat(60));
    console.log(`📊 ${suite.name} Results`);
    console.log("=".repeat(60));
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Benchmarks: ${suite.summary.totalBenchmarks}`);
    console.log(`  Successful: ${suite.summary.successful} ✅`);
    console.log(`  Failed: ${suite.summary.failed} ${suite.summary.failed > 0 ? '❌' : ''}`);
    console.log(`  Average Performance: ${suite.summary.averageOpsPerSecond.toLocaleString()} ops/sec`);
    console.log(`  Total Time: ${suite.totalTime.toFixed(2)}ms`);
    console.log(`  Memory Used: ${(suite.summary.totalMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
    
    console.log(`\n🏆 Top Performers:`);
    const sortedResults = suite.benchmarks
      .filter(r => r.success)
      .sort((a, b) => b.opsPerSecond - a.opsPerSecond)
      .slice(0, 5);
    
    sortedResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name}: ${result.opsPerSecond.toLocaleString()} ops/sec`);
    });
    
    if (suite.summary.failed > 0) {
      console.log(`\n❌ Failed Benchmarks:`);
      suite.benchmarks
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  • ${result.name}: ${result.error}`);
        });
    }
    
    console.log("\n" + "=".repeat(60));
  }

  async saveResults(suite: BenchmarkSuite, filename: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      suite,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: Bun.version
      }
    };
    
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`💾 Results saved to: ${filename}`);
  }

  clear(): void {
    this.results = [];
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const type = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'all';
  const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
  const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const iterations = parseInt(args.find(arg => arg.startsWith('--iterations='))?.split('=')[1] || '1000');

  const benchmark = new PerformanceBenchmark();

  let suite: BenchmarkSuite;

  switch (type) {
    case 'bun':
      suite = await benchmark.runBunBenchmarks();
      break;
    case 'server':
      suite = await benchmark.runServerBenchmarks(port);
      break;
    case 'memory':
      suite = await benchmark.runMemoryBenchmarks();
      break;
    case 'all':
    default:
      console.log("🚀 Running Complete Performance Suite\n");
      await benchmark.runBunBenchmarks();
      await benchmark.runMemoryBenchmarks();
      suite = benchmark.generateSuite();
      break;
  }

  benchmark.printResults(suite);

  if (output) {
    await benchmark.saveResults(suite, output);
  }

  // Return exit code based on results
  process.exit(suite.summary.failed > 0 ? 1 : 0);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { PerformanceBenchmark, type BenchmarkResult, type BenchmarkSuite };
