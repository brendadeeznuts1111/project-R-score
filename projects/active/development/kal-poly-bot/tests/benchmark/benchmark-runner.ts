#!/usr/bin/env bun

/**
 * Benchmark Runner for Phase 3 Zero-Trust Implementation
 * Specialized runner for performance benchmarks with detailed reporting
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";

interface BenchmarkResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  metrics: {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
    throughput?: number;
  };
  timestamp: string;
}

interface BenchmarkReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    totalDuration: number;
  };
  results: BenchmarkResult[];
  recommendations: string[];
}

const BENCHMARK_SUITES = [
  {
    name: "Threat Detection Performance",
    path: "tests/benchmark/performance/threat-detection.test.ts",
    category: "Security",
    thresholds: { maxLatency: 50, minThroughput: 500 },
  },
  {
    name: "Compliance Enforcement Performance",
    path: "tests/benchmark/performance/compliance.test.ts",
    category: "Compliance",
    thresholds: { maxLatency: 100, minThroughput: 200 },
  },
  {
    name: "Redis Pub/Sub Performance",
    path: "tests/benchmark/performance/redis-pubsub.test.ts",
    category: "Infrastructure",
    thresholds: { maxLatency: 20, minThroughput: 100 },
  },
  {
    name: "Quantum Operations Performance",
    path: "tests/benchmark/performance/quantum-operations.test.ts",
    category: "Security",
    thresholds: { maxLatency: 500, minThroughput: 50 },
  },
  {
    name: "System Integration Performance",
    path: "tests/benchmark/performance/system-integration.test.ts",
    category: "Integration",
    thresholds: { maxLatency: 2000 },
  },
];

class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  async runBenchmark(suite: {
    name: string;
    path: string;
    category: string;
    thresholds: { maxLatency: number; minThroughput?: number };
  }): Promise<BenchmarkResult> {
    console.info(`\n🚀 Running: ${suite.name}`);
    console.info(`📂 Category: ${suite.category}`);
    console.info(`⏱️  Thresholds: Max ${suite.thresholds.maxLatency}ms latency`);

    const startTime = Date.now();

    try {
      const output = execSync(`bun test ${suite.path} --timeout 120000`, {
        encoding: "utf8",
        stdio: "pipe",
      });

      const duration = Date.now() - startTime;
      const metrics = this.parseBenchmarkOutput(output);
      const passed = this.evaluateResults(metrics, suite.thresholds);

      const result: BenchmarkResult = {
        name: suite.name,
        category: suite.category,
        passed,
        duration,
        metrics,
        timestamp: new Date().toISOString(),
      };

      console.info(`${passed ? "✅" : "❌"} ${suite.name}: ${duration}ms`);
      console.info(`   Average Latency: ${metrics.average.toFixed(2)}ms`);
      console.info(`   P95 Latency: ${metrics.p95.toFixed(2)}ms`);
      if (metrics.throughput) {
        console.info(`   Throughput: ${metrics.throughput.toFixed(0)} req/s`);
      }

      return result;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const result: BenchmarkResult = {
        name: suite.name,
        category: suite.category,
        passed: false,
        duration,
        metrics: { average: 0, min: 0, max: 0, p95: 0, p99: 0 },
        timestamp: new Date().toISOString(),
      };

      console.info(`❌ ${suite.name} failed: ${duration}ms`);
      console.info(`   Error: ${errorMessage}`);

      return result;
    }
  }

  private parseBenchmarkOutput(output: string): {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
    throughput?: number;
  } {
    const metrics = {
      average: 0,
      min: 0,
      max: 0,
      p95: 0,
      p99: 0,
      throughput: undefined,
    };

    // Extract performance metrics from test output
    const avgMatch = output.match(/Average:\s*([\d.]+)ms/);
    const minMatch = output.match(/Min:\s*([\d.]+)ms/);
    const maxMatch = output.match(/Max:\s*([\d.]+)ms/);
    const p95Match = output.match(/P95:\s*([\d.]+)ms/);
    const p99Match = output.match(/P99:\s*([\d.]+)ms/);
    const throughputMatch = output.match(/Throughput:\s*([\d.]+)\s*req\/s/);

    if (avgMatch) metrics.average = parseFloat(avgMatch[1]);
    if (minMatch) metrics.min = parseFloat(minMatch[1]);
    if (maxMatch) metrics.max = parseFloat(maxMatch[1]);
    if (p95Match) metrics.p95 = parseFloat(p95Match[1]);
    if (p99Match) metrics.p99 = parseFloat(p99Match[1]);
    if (throughputMatch) metrics.throughput = parseFloat(throughputMatch[1]);

    return metrics;
  }

  private evaluateResults(
    metrics: {
      average: number;
      min: number;
      max: number;
      p95: number;
      p99: number;
      throughput?: number;
    },
    thresholds: { maxLatency: number; minThroughput?: number }
  ): boolean {
    if (metrics.average > thresholds.maxLatency) return false;
    if (metrics.p95 > thresholds.maxLatency * 1.5) return false;
    if (
      thresholds.minThroughput &&
      (!metrics.throughput || metrics.throughput < thresholds.minThroughput)
    ) {
      return false;
    }
    return true;
  }

  async runAll(): Promise<BenchmarkReport> {
    console.info("🎯 Phase 3 Zero-Trust Benchmark Suite");
    console.info("=".repeat(80));

    const startTime = Date.now();

    for (const suite of BENCHMARK_SUITES) {
      const result = await this.runBenchmark(suite);
      this.results.push(result);
    }

    const totalDuration = Date.now() - startTime;
    const report = this.generateReport(totalDuration);

    this.saveReport(report);
    this.printReport(report);

    return report;
  }

  private generateReport(totalDuration: number): BenchmarkReport {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const passRate = (passed / this.results.length) * 100;

    const recommendations = this.generateRecommendations();

    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed,
        failed,
        passRate,
        totalDuration,
      },
      results: this.results,
      recommendations,
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const failedBenchmarks = this.results.filter((r) => !r.passed);

    if (failedBenchmarks.length === 0) {
      recommendations.push(
        "🎉 All benchmarks passed! System meets performance requirements."
      );
      return recommendations;
    }

    // Analyze failure patterns
    const latencyFailures = failedBenchmarks.filter(
      (r) => r.metrics.average > 50 || r.metrics.p95 > 75
    );

    if (latencyFailures.length > 0) {
      recommendations.push("⚠️  Consider optimizing latency-critical paths:");
      latencyFailures.forEach((f) => {
        recommendations.push(
          `   - ${f.name}: Average ${f.metrics.average.toFixed(2)}ms`
        );
      });
    }

    const throughputFailures = failedBenchmarks.filter(
      (r) => r.metrics.throughput && r.metrics.throughput < 200
    );

    if (throughputFailures.length > 0) {
      recommendations.push("🚀 Consider scaling improvements:");
      throughputFailures.forEach((f) => {
        recommendations.push(
          `   - ${f.name}: ${f.metrics.throughput?.toFixed(0)} req/s`
        );
      });
    }

    const securityBenchmarks = failedBenchmarks.filter(
      (r) => r.category === "Security"
    );
    if (securityBenchmarks.length > 0) {
      recommendations.push("🔐 Review security performance optimizations");
    }

    const integrationBenchmarks = failedBenchmarks.filter(
      (r) => r.category === "Integration"
    );
    if (integrationBenchmarks.length > 0) {
      recommendations.push("🔄 Optimize end-to-end integration performance");
    }

    return recommendations;
  }

  private saveReport(report: BenchmarkReport): void {
    const reportPath = join(process.cwd(), "benchmark-report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.info(`\n📄 Report saved to: ${reportPath}`);
  }

  private printReport(report: BenchmarkReport): void {
    console.info("\n" + "=".repeat(80));
    console.info("📊 BENCHMARK EXECUTION SUMMARY");
    console.info("=".repeat(80));
    console.info(`Total Benchmarks: ${report.summary.total}`);
    console.info(`Passed: ${report.summary.passed} ✅`);
    console.info(
      `Failed: ${report.summary.failed} ${report.summary.failed > 0 ? "❌" : ""}`
    );
    console.info(`Pass Rate: ${report.summary.passRate.toFixed(1)}%`);
    console.info(`Total Duration: ${report.summary.totalDuration}ms`);

    console.info("\n🎯 Performance Results:");
    this.results.forEach((result) => {
      const status = result.passed ? "✅" : "❌";
      console.info(`   ${status} ${result.name} (${result.category})`);
      console.info(
        `      Latency: ${result.metrics.average.toFixed(2)}ms avg, ${result.metrics.p95.toFixed(2)}ms P95`
      );
      if (result.metrics.throughput !== undefined) {
        console.info(
          `      Throughput: ${result.metrics.throughput.toFixed(0)} req/s`
        );
      }
    });

    if (report.recommendations.length > 0) {
      console.info("\n💡 Recommendations:");
      report.recommendations.forEach((rec) => {
        console.info(`   ${rec}`);
      });
    }

    console.info("\n" + "=".repeat(80));

    if (report.summary.passRate === 100) {
      console.info(
        "🎉 ALL BENCHMARKS PASSED! System exceeds performance targets."
      );
    } else if (report.summary.passRate >= 80) {
      console.info(
        "⚠️  Most benchmarks passed. Review recommendations for optimization."
      );
    } else {
      console.info(
        "🚨 CRITICAL: Multiple benchmark failures. Performance optimization required."
      );
    }
  }
}

// CLI Interface
async function main() {
  const runner = new BenchmarkRunner();

  try {
    await runner.runAll();
  } catch (error) {
    console.error("❌ Benchmark runner failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
