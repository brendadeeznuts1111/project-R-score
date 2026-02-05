#!/usr/bin/env bun

// benchmark-helper.ts - Comprehensive Bun Performance Benchmarking Utility
// Based on Bun.nanoseconds() for high-precision timing

import { nanoseconds } from "bun";

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTimeNs: number;
  avgTimeNs: number;
  avgTimeMs: number;
  opsPerSecond: number;
}

interface ComparisonResult {
  baseline: BenchmarkResult;
  comparison: BenchmarkResult;
  improvement: number;
  faster: boolean;
}

class BenchmarkHelper {
  private results: BenchmarkResult[] = [];

  /**
   * Measure execution time of a single expression
   */
  measure(name: string, fn: () => void | Promise<void>): BenchmarkResult {
    const start = nanoseconds();
    
    // Execute the function
    const result = fn();
    
    // Handle both sync and async functions
    if (result instanceof Promise) {
      return this.measureAsync(name, result);
    }
    
    const end = nanoseconds();
    const totalTime = end - start;
    
    const benchmarkResult: BenchmarkResult = {
      name,
      iterations: 1,
      totalTimeNs: totalTime,
      avgTimeNs: totalTime,
      avgTimeMs: totalTime / 1_000_000,
      opsPerSecond: 1_000_000_000 / totalTime
    };
    
    this.results.push(benchmarkResult);
    return benchmarkResult;
  }

  /**
   * Measure async function execution time
   */
  private async measureAsync(name: string, promise: Promise<void>): Promise<BenchmarkResult> {
    const start = nanoseconds();
    await promise;
    const end = nanoseconds();
    const totalTime = end - start;
    
    const benchmarkResult: BenchmarkResult = {
      name,
      iterations: 1,
      totalTimeNs: totalTime,
      avgTimeNs: totalTime,
      avgTimeMs: totalTime / 1_000_000,
      opsPerSecond: 1_000_000_000 / totalTime
    };
    
    this.results.push(benchmarkResult);
    return benchmarkResult;
  }

  /**
   * Benchmark with multiple iterations
   */
  benchmark(name: string, fn: () => void | Promise<void>, iterations: number = 1_000_000): BenchmarkResult {
    const start = nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    
    const end = nanoseconds();
    const totalTime = end - start;
    const avgTime = totalTime / iterations;
    
    const benchmarkResult: BenchmarkResult = {
      name,
      iterations,
      totalTimeNs: totalTime,
      avgTimeNs: avgTime,
      avgTimeMs: avgTime / 1_000_000,
      opsPerSecond: 1_000_000_000 / avgTime
    };
    
    this.results.push(benchmarkResult);
    return benchmarkResult;
  }

  /**
   * Benchmark async function with iterations
   */
  async benchmarkAsync(name: string, fn: () => Promise<void>, iterations: number = 1000): Promise<BenchmarkResult> {
    const start = nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    
    const end = nanoseconds();
    const totalTime = end - start;
    const avgTime = totalTime / iterations;
    
    const benchmarkResult: BenchmarkResult = {
      name,
      iterations,
      totalTimeNs: totalTime,
      avgTimeNs: avgTime,
      avgTimeMs: avgTime / 1_000_000,
      opsPerSecond: 1_000_000_000 / avgTime
    };
    
    this.results.push(benchmarkResult);
    return benchmarkResult;
  }

  /**
   * Compare two benchmarks
   */
  compare(baselineName: string, comparisonName: string): ComparisonResult | null {
    const baseline = this.results.find(r => r.name === baselineName);
    const comparison = this.results.find(r => r.name === comparisonName);
    
    if (!baseline || !comparison) {
      return null;
    }
    
    const improvement = ((baseline.avgTimeNs - comparison.avgTimeNs) / baseline.avgTimeNs) * 100;
    
    return {
      baseline,
      comparison,
      improvement,
      faster: improvement > 0
    };
  }

  /**
   * Print single benchmark result
   */
  printResult(result: BenchmarkResult): void {
    console.log(`\n📊 ${result.name}`);
    console.log(`   Iterations: ${result.iterations.toLocaleString()}`);
    console.log(`   Total time: ${(result.totalTimeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Avg time: ${result.avgTimeMs.toFixed(4)}ms`);
    console.log(`   Ops/sec: ${result.opsPerSecond.toLocaleString()}`);
  }

  /**
   * Print comparison result
   */
  printComparison(comparison: ComparisonResult): void {
    const { baseline, comparison, improvement, faster } = comparison;
    
    console.log(`\n⚡ Performance Comparison`);
    console.log(`   Baseline: ${baseline.name} - ${baseline.avgTimeMs.toFixed(4)}ms`);
    console.log(`   Comparison: ${comparison.name} - ${comparison.avgTimeMs.toFixed(4)}ms`);
    
    if (faster) {
      console.log(`   ✅ ${improvement.toFixed(1)}% faster`);
    } else {
      console.log(`   ❌ ${Math.abs(improvement).toFixed(1)}% slower`);
    }
    
    console.log(`   Speed ratio: ${(baseline.avgTimeNs / comparison.avgTimeNs).toFixed(2)}x`);
  }

  /**
   * Print all results
   */
  printAll(): void {
    console.log("\n🏁 Benchmark Results");
    console.log("=" .repeat(60));
    
    this.results.forEach(result => {
      this.printResult(result);
    });
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Export results as JSON
   */
  export(): string {
    return JSON.stringify(this.results, null, 2);
  }

  /**
   * Import results from JSON
   */
  import(json: string): void {
    this.results = JSON.parse(json);
  }
}

// YAML-specific benchmarking utilities
class YAMLBenchmark extends BenchmarkHelper {
  private sampleYAML = `
name: test-app
version: 1.0.0
database:
  host: localhost
  port: 5432
  name: myapp
features:
  - authentication
  - authorization
  - logging
settings:
  debug: true
  timeout: 30
  retries: 3
`;

  private sampleYAMLMulti = `
---
name: document-1
version: 1.0.0
---
name: document-2
version: 2.0.0
---
name: document-3
version: 3.0.0
`;

  /**
   * Benchmark Bun.YAML.parse()
   */
  async benchmarkBunYAML(iterations: number = 10000): Promise<BenchmarkResult> {
    const { YAML } = await import("bun");
    
    return this.benchmark("Bun.YAML.parse()", () => {
      YAML.parse(this.sampleYAML);
    }, iterations);
  }

  /**
   * Benchmark Bun.YAML.parse() with multi-document
   */
  async benchmarkBunYAMLMulti(iterations: number = 10000): Promise<BenchmarkResult> {
    const { YAML } = await import("bun");
    
    return this.benchmark("Bun.YAML.parse() (multi-doc)", () => {
      YAML.parse(this.sampleYAMLMulti);
    }, iterations);
  }

  /**
   * Benchmark Bun.YAML.stringify()
   */
  async benchmarkBunYAMLStringify(iterations: number = 10000): Promise<BenchmarkResult> {
    const { YAML } = await import("bun");
    const data = YAML.parse(this.sampleYAML);
    
    return this.benchmark("Bun.YAML.stringify()", () => {
      YAML.stringify(data);
    }, iterations);
  }

  /**
   * Benchmark external YAML library (if available)
   */
  async benchmarkExternalYAML(iterations: number = 10000): Promise<BenchmarkResult | null> {
    try {
      const yaml = await import("yaml");
      
      return this.benchmark("external yaml.parse()", () => {
        yaml.parse(this.sampleYAML);
      }, iterations);
    } catch {
      console.log("⚠️  External YAML library not available for comparison");
      return null;
    }
  }

  /**
   * Benchmark js-yaml library (if available)
   */
  async benchmarkJsYAML(iterations: number = 10000): Promise<BenchmarkResult | null> {
    try {
      const { load } = await import("js-yaml");
      
      return this.benchmark("js-yaml.load()", () => {
        load(this.sampleYAML);
      }, iterations);
    } catch {
      console.log("⚠️  js-yaml library not available for comparison");
      return null;
    }
  }

  /**
   * Run comprehensive YAML benchmark suite
   */
  async runYAMLSuite(): Promise<void> {
    console.log("🚀 Starting YAML Performance Benchmark Suite\n");

    // Benchmark Bun.YAML
    const bunParse = await this.benchmarkBunYAML();
    this.printResult(bunParse);

    const bunParseMulti = await this.benchmarkBunYAMLMulti();
    this.printResult(bunParseMulti);

    const bunStringify = await this.benchmarkBunYAMLStringify();
    this.printResult(bunStringify);

    // Benchmark external libraries if available
    const externalYAML = await this.benchmarkExternalYAML();
    if (externalYAML) {
      this.printResult(externalYAML);
      
      const comparison = this.compare("external yaml.parse()", "Bun.YAML.parse()");
      if (comparison) {
        this.printComparison(comparison);
      }
    }

    const jsYAML = await this.benchmarkJsYAML();
    if (jsYAML) {
      this.printResult(jsYAML);
      
      const comparison = this.compare("js-yaml.load()", "Bun.YAML.parse()");
      if (comparison) {
        this.printComparison(comparison);
      }
    }

    console.log("\n✅ YAML Benchmark Suite Complete!");
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const benchmark = new YAMLBenchmark();

  switch (command) {
    case "yaml":
      await benchmark.runYAMLSuite();
      break;

    case "measure":
      // Simple measurement like bun -e template
      const code = process.argv[3];
      if (!code) {
        console.log("Usage: bun benchmark-helper.ts measure '<code>'");
        console.log("Example: bun benchmark-helper.ts measure 'Math.random()'");
        process.exit(1);
      }
      
      const result = benchmark.measure("Custom Expression", () => {
        eval(code);
      });
      benchmark.printResult(result);
      break;

    case "loop":
      // Loop benchmark like bun -e template
      const loopCode = process.argv[3];
      const iterations = parseInt(process.argv[4]) || 1_000_000;
      
      if (!loopCode) {
        console.log("Usage: bun benchmark-helper.ts loop '<code>' [iterations]");
        console.log("Example: bun benchmark-helper.ts loop 'Math.random()' 1000000");
        process.exit(1);
      }
      
      const loopResult = benchmark.benchmark("Loop Expression", () => {
        eval(loopCode);
      }, iterations);
      benchmark.printResult(loopResult);
      break;

    case "export":
      console.log(benchmark.export());
      break;

    case "--help":
    case "-h":
      console.log(`
Benchmark Helper - Performance Measurement Utility

Usage:
  bun benchmark-helper.ts <command> [options]

Commands:
  yaml           - Run comprehensive YAML benchmark suite
  measure <code> - Measure single expression execution time
  loop <code> [n] - Benchmark expression in loop (default: 1M iterations)
  export         - Export results as JSON

Examples:
  # Measure single expression
  bun benchmark-helper.ts measure 'Math.sqrt(144)'
  
  # Benchmark loop performance
  bun benchmark-helper.ts loop 'Math.random()' 1000000
  
  # Run YAML benchmarks
  bun benchmark-helper.ts yaml
  
  # One-liner templates (like bun -e):
  bun -e 'const t=Bun.nanoseconds(); for(let i=0;i<1e6;i++)Math.random(); console.log((Bun.nanoseconds()-t)/1e6,"ms")'
  bun -e 'const s=Bun.nanoseconds(); Math.sqrt(144); console.log(Bun.nanoseconds()-s,"ns")'
`);
      break;

    default:
      console.log("❌ Unknown command. Use 'yaml', 'measure', 'loop', or 'export'");
      console.log("Run 'bun benchmark-helper.ts --help' for usage");
      process.exit(1);
  }
}

main().catch(console.error);
