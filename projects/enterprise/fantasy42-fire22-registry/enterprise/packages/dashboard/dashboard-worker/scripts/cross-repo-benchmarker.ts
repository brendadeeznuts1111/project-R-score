#!/usr/bin/env bun

/**
 * 📊 Cross-Repository Benchmarking System
 *
 * Advanced benchmarking infrastructure for Fire22 workspace orchestration:
 * - Package-level performance benchmarking
 * - Integration benchmarking across repositories
 * - Deployment benchmarking for Cloudflare Workers
 * - Performance regression detection and alerting
 * - Benchmark dashboard generation and reporting
 *
 * Features:
 * - Multi-tier benchmarking (package, integration, deployment)
 * - Performance budgets and fail-fast on regressions
 * - Historical comparison and trend analysis
 * - Automated alerts and notifications
 * - Integration with CI/CD pipelines
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AdvancedProcessManager } from './advanced-process-manager.ts';

export interface BenchmarkSuite {
  name: string;
  type: 'package' | 'integration' | 'deployment' | 'performance';
  description: string;
  benchmarks: BenchmarkConfig[];
  budget: PerformanceBudget;
  reporting: ReportingConfig;
}

export interface BenchmarkConfig {
  name: string;
  description: string;
  script: string;
  timeout: number;
  iterations: number;
  warmupIterations: number;
  environment: Record<string, string>;
  expectations: {
    minThroughput?: number;
    maxLatency?: number;
    maxMemoryUsage?: number;
    maxCpuUsage?: number;
  };
}

export interface PerformanceBudget {
  buildTime: number;
  bundleSize: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  latency: number;
  errorRate: number;
}

export interface ReportingConfig {
  dashboard: boolean;
  alerts: boolean;
  comparison: boolean;
  export: {
    json: boolean;
    html: boolean;
    csv: boolean;
  };
  storage: {
    local: boolean;
    cloudflare: boolean;
    s3: boolean;
  };
}

export interface BenchmarkResult {
  benchmark: string;
  suite: string;
  timestamp: number;
  duration: number;
  iterations: number;
  metrics: {
    throughput: number;
    latency: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    customMetrics: Record<string, number>;
  };
  budget: {
    passed: boolean;
    violations: string[];
  };
  environment: {
    platform: string;
    arch: string;
    nodeVersion: string;
    bunVersion: string;
    memoryTotal: number;
  };
}

export class CrossRepoBenchmarker {
  private processManager: AdvancedProcessManager;
  private rootPath: string;
  private suites: Map<string, BenchmarkSuite>;
  private results: Map<string, BenchmarkResult[]>;
  private historicalData: Map<string, BenchmarkResult[]>;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.processManager = new AdvancedProcessManager();
    this.suites = new Map();
    this.results = new Map();
    this.historicalData = new Map();
    this.initializeBenchmarkSuites();
    this.loadHistoricalData();
  }

  /**
   * 📊 Run comprehensive benchmark suite
   */
  async runBenchmarks(
    options: {
      suites?: string[];
      packages?: string[];
      comparison?: boolean;
      dashboard?: boolean;
      alerts?: boolean;
      export?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<{
    results: Map<string, BenchmarkResult>;
    budgets: { passed: number; failed: number; violations: string[] };
    performance: { regression: boolean; improvement: boolean; trend: 'up' | 'down' | 'stable' };
    status: 'success' | 'warning' | 'failed';
  }> {
    console.log('📊 Starting comprehensive benchmark suite...');

    const targetSuites = options.suites || Array.from(this.suites.keys());
    const results = new Map<string, BenchmarkResult>();
    const violations: string[] = [];
    let budgetsPassed = 0,
      budgetsFailed = 0;

    // Run each benchmark suite
    for (const suiteName of targetSuites) {
      const suite = this.suites.get(suiteName);
      if (!suite) {
        console.warn(`⚠️ Unknown benchmark suite: ${suiteName}`);
        continue;
      }

      console.log(`🏃 Running ${suite.type} benchmarks: ${suite.name}`);

      try {
        const suiteResults = await this.runBenchmarkSuite(suite, options);

        for (const [benchmarkName, result] of suiteResults) {
          results.set(`${suiteName}.${benchmarkName}`, result);

          if (result.budget.passed) {
            budgetsPassed++;
          } else {
            budgetsFailed++;
            violations.push(...result.budget.violations.map(v => `${benchmarkName}: ${v}`));
          }
        }
      } catch (error) {
        console.error(`❌ Failed to run ${suiteName} benchmarks: ${error}`);
        budgetsFailed++;
      }
    }

    // Analyze performance trends
    const performance = options.comparison
      ? await this.analyzePerformanceTrends(results)
      : {
          regression: false,
          improvement: false,
          trend: 'stable' as const,
        };

    // Store results for historical comparison
    await this.storeResults(results);

    // Generate reports
    if (options.dashboard) {
      await this.generateDashboard(results, performance);
    }

    if (options.export) {
      await this.exportResults(results);
    }

    // Send alerts if needed
    if (options.alerts && (budgetsFailed > 0 || performance.regression)) {
      await this.sendAlerts(results, performance, violations);
    }

    const budgets = { passed: budgetsPassed, failed: budgetsFailed, violations };
    const status =
      budgetsFailed === 0 && !performance.regression
        ? 'success'
        : budgetsPassed > 0 || performance.improvement
          ? 'warning'
          : 'failed';

    console.log('\n📊 Benchmark Summary:');
    console.log(`✅ Budgets passed: ${budgetsPassed}`);
    console.log(`❌ Budgets failed: ${budgetsFailed}`);
    console.log(`📈 Performance trend: ${performance.trend}`);
    console.log(`🎯 Status: ${status}`);

    return { results, budgets, performance, status };
  }

  /**
   * 📦 Benchmark specific packages
   */
  async benchmarkPackages(
    packages: string[],
    options: {
      suiteTypes?: ('package' | 'integration')[];
      comparison?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<Map<string, BenchmarkResult[]>> {
    console.log(`📦 Benchmarking packages: ${packages.join(', ')}`);

    const results = new Map<string, BenchmarkResult[]>();
    const suiteTypes = options.suiteTypes || ['package', 'integration'];

    for (const packageName of packages) {
      const packagePath = join(this.rootPath, 'packages', packageName.replace('@fire22/', ''));
      if (!existsSync(packagePath)) {
        console.warn(`⚠️ Package not found: ${packageName}`);
        continue;
      }

      const packageResults: BenchmarkResult[] = [];

      // Run relevant benchmark suites for this package
      for (const [suiteName, suite] of this.suites) {
        if (!suiteTypes.includes(suite.type)) continue;

        console.log(`🏃 Running ${suite.type} benchmarks for ${packageName}...`);

        try {
          const suiteResults = await this.runPackageBenchmarks(packagePath, suite, options);
          packageResults.push(...Array.from(suiteResults.values()));
        } catch (error) {
          console.error(`❌ Failed to benchmark ${packageName} with ${suiteName}: ${error}`);
        }
      }

      results.set(packageName, packageResults);
    }

    return results;
  }

  /**
   * 🚀 Benchmark Cloudflare Worker deployment
   */
  async benchmarkDeployment(
    options: {
      environment?: 'staging' | 'production';
      duration?: number;
      concurrency?: number;
      verbose?: boolean;
    } = {}
  ): Promise<{
    coldStart: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput: number;
    latency: number;
    errorRate: number;
  }> {
    console.log('🚀 Benchmarking Cloudflare Worker deployment...');

    const environment = options.environment || 'staging';
    const duration = options.duration || 60; // seconds
    const concurrency = options.concurrency || 10;

    // Deploy to test environment
    const deployResult = await this.processManager.execute({
      command: ['wrangler', 'deploy', '--env', environment],
      timeout: 120000,
    });

    if (!deployResult.success) {
      throw new Error('Deployment failed');
    }

    // Run deployment benchmarks
    const benchmarks = await Promise.all([
      this.measureColdStart(environment),
      this.measureResourceUsage(environment, duration),
      this.measureThroughput(environment, duration, concurrency),
      this.measureLatency(environment, duration),
      this.measureErrorRate(environment, duration),
    ]);

    const [coldStart, resourceUsage, throughput, latency, errorRate] = benchmarks;

    return {
      coldStart,
      memoryUsage: resourceUsage.memory,
      cpuUsage: resourceUsage.cpu,
      throughput,
      latency,
      errorRate,
    };
  }

  // === PRIVATE METHODS ===

  private initializeBenchmarkSuites(): void {
    // Package-level benchmark suite
    this.suites.set('package-benchmarks', {
      name: 'Package Benchmarks',
      type: 'package',
      description: 'Individual package performance benchmarks',
      benchmarks: [
        {
          name: 'build-performance',
          description: 'Package build time and bundle size',
          script: 'bun run build',
          timeout: 60000,
          iterations: 3,
          warmupIterations: 1,
          environment: { NODE_ENV: 'production' },
          expectations: {
            maxLatency: 30000, // 30 seconds max build time
          },
        },
        {
          name: 'test-performance',
          description: 'Test suite execution performance',
          script: 'bun test',
          timeout: 30000,
          iterations: 3,
          warmupIterations: 1,
          environment: { NODE_ENV: 'test' },
          expectations: {
            maxLatency: 10000, // 10 seconds max test time
          },
        },
      ],
      budget: {
        buildTime: 30000,
        bundleSize: 1024 * 1024, // 1MB
        memoryUsage: 128 * 1024 * 1024, // 128MB
        cpuUsage: 80,
        throughput: 100,
        latency: 1000,
        errorRate: 0.01,
      },
      reporting: {
        dashboard: true,
        alerts: true,
        comparison: true,
        export: { json: true, html: true, csv: false },
        storage: { local: true, cloudflare: true, s3: false },
      },
    });

    // Integration benchmark suite
    this.suites.set('integration-benchmarks', {
      name: 'Integration Benchmarks',
      type: 'integration',
      description: 'Cross-package integration performance',
      benchmarks: [
        {
          name: 'cross-package-import',
          description: 'Cross-package import and initialization performance',
          script: 'bun run test:integration',
          timeout: 60000,
          iterations: 5,
          warmupIterations: 2,
          environment: { NODE_ENV: 'test' },
          expectations: {
            maxLatency: 5000,
            maxMemoryUsage: 64 * 1024 * 1024,
          },
        },
      ],
      budget: {
        buildTime: 60000,
        bundleSize: 5 * 1024 * 1024,
        memoryUsage: 256 * 1024 * 1024,
        cpuUsage: 70,
        throughput: 50,
        latency: 2000,
        errorRate: 0.01,
      },
      reporting: {
        dashboard: true,
        alerts: true,
        comparison: true,
        export: { json: true, html: true, csv: true },
        storage: { local: true, cloudflare: true, s3: false },
      },
    });

    // Deployment benchmark suite
    this.suites.set('deployment-benchmarks', {
      name: 'Deployment Benchmarks',
      type: 'deployment',
      description: 'Cloudflare Workers deployment performance',
      benchmarks: [
        {
          name: 'cold-start',
          description: 'Worker cold start performance',
          script: 'curl https://dashboard-worker.brendawill2233.workers.dev/health',
          timeout: 10000,
          iterations: 10,
          warmupIterations: 0,
          environment: {},
          expectations: {
            maxLatency: 1000, // 1 second max cold start
          },
        },
        {
          name: 'memory-usage',
          description: 'Worker memory consumption',
          script: 'bun run bench:memory',
          timeout: 30000,
          iterations: 5,
          warmupIterations: 1,
          environment: {},
          expectations: {
            maxMemoryUsage: 128 * 1024 * 1024, // 128MB max
          },
        },
      ],
      budget: {
        buildTime: 120000,
        bundleSize: 10 * 1024 * 1024,
        memoryUsage: 128 * 1024 * 1024,
        cpuUsage: 50,
        throughput: 1000,
        latency: 100,
        errorRate: 0.001,
      },
      reporting: {
        dashboard: true,
        alerts: true,
        comparison: true,
        export: { json: true, html: true, csv: true },
        storage: { local: true, cloudflare: true, s3: true },
      },
    });
  }

  private async runBenchmarkSuite(
    suite: BenchmarkSuite,
    options: any
  ): Promise<Map<string, BenchmarkResult>> {
    const results = new Map<string, BenchmarkResult>();

    for (const benchmark of suite.benchmarks) {
      if (options.verbose) {
        console.log(`  🔍 Running ${benchmark.name}...`);
      }

      const result = await this.runSingleBenchmark(benchmark, suite, options);
      results.set(benchmark.name, result);
    }

    return results;
  }

  private async runSingleBenchmark(
    config: BenchmarkConfig,
    suite: BenchmarkSuite,
    options: any
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const metrics = {
      throughput: 0,
      latency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      customMetrics: {} as Record<string, number>,
    };

    // Run warmup iterations
    for (let i = 0; i < config.warmupIterations; i++) {
      await this.processManager.execute({
        command: config.script.split(' '),
        env: { ...process.env, ...config.environment },
        timeout: config.timeout,
      });
    }

    // Run actual benchmark iterations
    let totalLatency = 0;
    let errors = 0;

    for (let i = 0; i < config.iterations; i++) {
      const iterationStart = Date.now();

      const result = await this.processManager.execute({
        command: config.script.split(' '),
        env: { ...process.env, ...config.environment },
        timeout: config.timeout,
      });

      const iterationLatency = Date.now() - iterationStart;
      totalLatency += iterationLatency;

      if (!result.success) {
        errors++;
      }

      // Collect resource usage
      if (result.resourceUsage) {
        metrics.memoryUsage = Math.max(metrics.memoryUsage, result.resourceUsage.memory);
        metrics.cpuUsage = Math.max(metrics.cpuUsage, result.resourceUsage.cpu);
      }
    }

    const duration = Date.now() - startTime;
    metrics.latency = totalLatency / config.iterations;
    metrics.throughput = config.iterations / (duration / 1000);
    metrics.errorRate = errors / config.iterations;

    // Check performance budget
    const budgetResult = this.checkPerformanceBudget(metrics, suite.budget);

    return {
      benchmark: config.name,
      suite: suite.name,
      timestamp: startTime,
      duration,
      iterations: config.iterations,
      metrics,
      budget: budgetResult,
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: await this.getBunVersion(),
        memoryTotal: process.memoryUsage().rss,
      },
    };
  }

  private checkPerformanceBudget(
    metrics: any,
    budget: PerformanceBudget
  ): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (metrics.latency > budget.latency) {
      violations.push(`Latency exceeded budget: ${metrics.latency}ms > ${budget.latency}ms`);
    }

    if (metrics.throughput < budget.throughput) {
      violations.push(`Throughput below budget: ${metrics.throughput} < ${budget.throughput}`);
    }

    if (metrics.memoryUsage > budget.memoryUsage) {
      violations.push(
        `Memory usage exceeded budget: ${metrics.memoryUsage} > ${budget.memoryUsage}`
      );
    }

    if (metrics.cpuUsage > budget.cpuUsage) {
      violations.push(`CPU usage exceeded budget: ${metrics.cpuUsage}% > ${budget.cpuUsage}%`);
    }

    if (metrics.errorRate > budget.errorRate) {
      violations.push(`Error rate exceeded budget: ${metrics.errorRate} > ${budget.errorRate}`);
    }

    return { passed: violations.length === 0, violations };
  }

  private async runPackageBenchmarks(
    packagePath: string,
    suite: BenchmarkSuite,
    options: any
  ): Promise<Map<string, BenchmarkResult>> {
    const results = new Map<string, BenchmarkResult>();

    for (const benchmark of suite.benchmarks) {
      console.log(`  🏃 Running package benchmark: ${benchmark.name}`);

      try {
        // Run the benchmark in the package directory
        const result = await this.runSingleBenchmark(benchmark, suite, {
          ...options,
          cwd: packagePath,
        });

        results.set(benchmark.name, result);
      } catch (error) {
        console.error(`❌ Package benchmark failed: ${benchmark.name} - ${error}`);
      }
    }

    return results;
  }

  private async analyzePerformanceTrends(results: Map<string, BenchmarkResult>): Promise<any> {
    console.log('📈 Analyzing performance trends...');

    const currentMetrics = this.extractMetrics(results);
    const historicalMetrics = await this.loadHistoricalMetrics();

    let regression = false;
    let improvement = false;
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (historicalMetrics.length > 0) {
      const lastMetrics = historicalMetrics[historicalMetrics.length - 1];

      // Compare current vs last metrics
      const latencyDiff = currentMetrics.avgLatency - lastMetrics.avgLatency;
      const throughputDiff = currentMetrics.avgThroughput - lastMetrics.avgThroughput;
      const memoryDiff = currentMetrics.avgMemoryUsage - lastMetrics.avgMemoryUsage;

      // Determine trends (5% threshold)
      const latencyRegression = latencyDiff > lastMetrics.avgLatency * 0.05;
      const throughputRegression = throughputDiff < -lastMetrics.avgThroughput * 0.05;
      const memoryRegression = memoryDiff > lastMetrics.avgMemoryUsage * 0.05;

      const latencyImprovement = latencyDiff < -lastMetrics.avgLatency * 0.05;
      const throughputImprovement = throughputDiff > lastMetrics.avgThroughput * 0.05;
      const memoryImprovement = memoryDiff < -lastMetrics.avgMemoryUsage * 0.05;

      regression = latencyRegression || throughputRegression || memoryRegression;
      improvement = latencyImprovement || throughputImprovement || memoryImprovement;

      if (improvement && !regression) trend = 'up';
      else if (regression && !improvement) trend = 'down';
      else trend = 'stable';

      console.log(`📊 Performance comparison:`);
      console.log(
        `  Latency: ${latencyDiff > 0 ? '+' : ''}${latencyDiff.toFixed(2)}ms (${latencyRegression ? '⬆️ regression' : latencyImprovement ? '⬇️ improvement' : '➡️ stable'})`
      );
      console.log(
        `  Throughput: ${throughputDiff > 0 ? '+' : ''}${throughputDiff.toFixed(2)}/s (${throughputRegression ? '⬇️ regression' : throughputImprovement ? '⬆️ improvement' : '➡️ stable'})`
      );
      console.log(
        `  Memory: ${memoryDiff > 0 ? '+' : ''}${(memoryDiff / 1024 / 1024).toFixed(2)}MB (${memoryRegression ? '⬆️ regression' : memoryImprovement ? '⬇️ improvement' : '➡️ stable'})`
      );
    }

    return { regression, improvement, trend };
  }

  private extractMetrics(results: Map<string, BenchmarkResult>): {
    avgLatency: number;
    avgThroughput: number;
    avgMemoryUsage: number;
    avgCpuUsage: number;
  } {
    const allResults = Array.from(results.values());

    if (allResults.length === 0) {
      return { avgLatency: 0, avgThroughput: 0, avgMemoryUsage: 0, avgCpuUsage: 0 };
    }

    const totals = allResults.reduce(
      (acc, result) => ({
        latency: acc.latency + result.metrics.latency,
        throughput: acc.throughput + result.metrics.throughput,
        memoryUsage: acc.memoryUsage + result.metrics.memoryUsage,
        cpuUsage: acc.cpuUsage + result.metrics.cpuUsage,
      }),
      { latency: 0, throughput: 0, memoryUsage: 0, cpuUsage: 0 }
    );

    const count = allResults.length;
    return {
      avgLatency: totals.latency / count,
      avgThroughput: totals.throughput / count,
      avgMemoryUsage: totals.memoryUsage / count,
      avgCpuUsage: totals.cpuUsage / count,
    };
  }

  private async loadHistoricalMetrics(): Promise<
    Array<{
      timestamp: number;
      avgLatency: number;
      avgThroughput: number;
      avgMemoryUsage: number;
      avgCpuUsage: number;
    }>
  > {
    const historyFile = join(this.rootPath, 'benchmark-results', 'performance-history.json');

    if (!existsSync(historyFile)) {
      return [];
    }

    try {
      const historyData = JSON.parse(readFileSync(historyFile, 'utf-8'));
      return historyData.metrics || [];
    } catch {
      return [];
    }
  }

  private async storeResults(results: Map<string, BenchmarkResult>): Promise<void> {
    const resultsDir = join(this.rootPath, 'benchmark-results');
    if (!existsSync(resultsDir)) {
      mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = join(resultsDir, `benchmark-results-${timestamp}.json`);

    const resultsArray = Array.from(results.entries()).map(([key, result]) => ({
      key,
      ...result,
    }));

    writeFileSync(resultsFile, JSON.stringify(resultsArray, null, 2));
    console.log(`💾 Benchmark results saved to: ${resultsFile}`);
  }

  private async generateDashboard(
    results: Map<string, BenchmarkResult>,
    performance: any
  ): Promise<void> {
    console.log('📊 Generating benchmark dashboard...');

    const dashboardDir = join(this.rootPath, 'benchmark-results', 'dashboard');
    if (!existsSync(dashboardDir)) {
      mkdirSync(dashboardDir, { recursive: true });
    }

    // Generate HTML dashboard
    const dashboardHtml = await this.generateDashboardHtml(results, performance);
    writeFileSync(join(dashboardDir, 'index.html'), dashboardHtml);

    // Generate JSON data for dynamic charts
    const dashboardData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBenchmarks: results.size,
        performance,
        metrics: this.extractMetrics(results),
      },
      results: Array.from(results.entries()).map(([key, result]) => ({
        key,
        ...result,
      })),
    };
    writeFileSync(join(dashboardDir, 'data.json'), JSON.stringify(dashboardData, null, 2));

    console.log(`📊 Dashboard generated: ${join(dashboardDir, 'index.html')}`);
  }

  private async generateDashboardHtml(
    results: Map<string, BenchmarkResult>,
    performance: any
  ): Promise<string> {
    const metrics = this.extractMetrics(results);
    const timestamp = new Date().toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Benchmark Dashboard</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .subtitle { opacity: 0.9; margin-top: 0.5rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .metric { text-align: center; padding: 1rem; }
        .metric-value { font-size: 2rem; font-weight: bold; color: #667eea; }
        .metric-label { color: #666; margin-top: 0.5rem; }
        .status { padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; }
        .status.success { background: #10b981; color: white; }
        .status.warning { background: #f59e0b; color: white; }
        .status.error { background: #ef4444; color: white; }
        .benchmark-list { list-style: none; padding: 0; }
        .benchmark-item { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem; }
        .trend { font-size: 1.5rem; }
        .footer { text-align: center; padding: 2rem; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🔥 Fire22 Benchmark Dashboard</h1>
            <div class="subtitle">Performance Monitoring & Analysis • Generated: ${timestamp}</div>
        </div>
    </div>
    
    <div class="container">
        <div class="grid">
            <div class="card">
                <h3>📊 Performance Summary</h3>
                <div class="metric">
                    <div class="metric-value">${results.size}</div>
                    <div class="metric-label">Total Benchmarks</div>
                </div>
                <div style="text-align: center; margin-top: 1rem;">
                    <span class="status ${performance.regression ? 'error' : performance.improvement ? 'success' : 'warning'}">
                        ${performance.regression ? '⬇️ Regression Detected' : performance.improvement ? '⬆️ Performance Improved' : '➡️ Stable Performance'}
                    </span>
                </div>
                <div style="text-align: center; margin-top: 1rem;">
                    <span class="trend">Trend: ${performance.trend === 'up' ? '📈' : performance.trend === 'down' ? '📉' : '➡️'} ${performance.trend.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>⚡ Latency Metrics</h3>
                <div class="metric">
                    <div class="metric-value">${metrics.avgLatency.toFixed(2)}ms</div>
                    <div class="metric-label">Average Latency</div>
                </div>
            </div>
            
            <div class="card">
                <h3>🚀 Throughput Metrics</h3>
                <div class="metric">
                    <div class="metric-value">${metrics.avgThroughput.toFixed(2)}</div>
                    <div class="metric-label">Operations/Second</div>
                </div>
            </div>
            
            <div class="card">
                <h3>💾 Memory Usage</h3>
                <div class="metric">
                    <div class="metric-value">${(metrics.avgMemoryUsage / 1024 / 1024).toFixed(2)}MB</div>
                    <div class="metric-label">Average Memory</div>
                </div>
            </div>
            
            <div class="card">
                <h3>🖥️ CPU Usage</h3>
                <div class="metric">
                    <div class="metric-value">${metrics.avgCpuUsage.toFixed(1)}%</div>
                    <div class="metric-label">Average CPU</div>
                </div>
            </div>
            
            <div class="card" style="grid-column: span 2;">
                <h3>📋 Benchmark Results</h3>
                <ul class="benchmark-list">
                    ${Array.from(results.entries())
                      .map(
                        ([key, result]) => `
                        <li class="benchmark-item">
                            <strong>${key}</strong>
                            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">
                                Latency: ${result.metrics.latency.toFixed(2)}ms • 
                                Throughput: ${result.metrics.throughput.toFixed(2)}/s • 
                                Memory: ${(result.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
                            </div>
                            <div style="margin-top: 0.5rem;">
                                <span class="status ${result.budget.passed ? 'success' : 'error'}">
                                    ${result.budget.passed ? '✅ Budget Passed' : '❌ Budget Failed'}
                                </span>
                            </div>
                        </li>
                    `
                      )
                      .join('')}
                </ul>
            </div>
        </div>
    </div>
    
    <div class="footer">
        Generated by Fire22 Workspace Orchestrator v1.0.0<br>
        <small>Performance monitoring and benchmarking for Fire22 ecosystem</small>
    </div>
</body>
</html>`;
  }

  private async exportResults(results: Map<string, BenchmarkResult>): Promise<void> {
    console.log('📤 Exporting benchmark results...');

    const exportDir = join(this.rootPath, 'benchmark-results', 'exports');
    if (!existsSync(exportDir)) {
      mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Export as JSON
    const jsonData = {
      timestamp: new Date().toISOString(),
      results: Array.from(results.entries()).map(([key, result]) => ({ key, ...result })),
      summary: this.extractMetrics(results),
    };
    writeFileSync(
      join(exportDir, `benchmark-results-${timestamp}.json`),
      JSON.stringify(jsonData, null, 2)
    );

    // Export as CSV
    const csvHeader =
      'Benchmark,Suite,Duration,Latency,Throughput,MemoryUsage,CPUUsage,BudgetPassed\\n';
    const csvRows = Array.from(results.entries())
      .map(
        ([key, result]) =>
          `${key},${result.suite},${result.duration},${result.metrics.latency},${result.metrics.throughput},${result.metrics.memoryUsage},${result.metrics.cpuUsage},${result.budget.passed}`
      )
      .join('\\n');
    writeFileSync(join(exportDir, `benchmark-results-${timestamp}.csv`), csvHeader + csvRows);

    console.log(`📁 Results exported to: ${exportDir}`);
  }

  private async sendAlerts(
    results: Map<string, BenchmarkResult>,
    performance: any,
    violations: string[]
  ): Promise<void> {
    console.log('🚨 Sending performance alerts...');

    const alertMessage = this.generateAlertMessage(results, performance, violations);

    // Console alert (always shown)
    console.log('\\n' + '='.repeat(80));
    console.log('🚨 PERFORMANCE ALERT');
    console.log('='.repeat(80));
    console.log(alertMessage);
    console.log('='.repeat(80));

    // Save alert to file
    const alertsDir = join(this.rootPath, 'benchmark-results', 'alerts');
    if (!existsSync(alertsDir)) {
      mkdirSync(alertsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const alertData = {
      timestamp: new Date().toISOString(),
      level: performance.regression ? 'error' : 'warning',
      message: alertMessage,
      performance,
      violations,
      metrics: this.extractMetrics(results),
    };

    writeFileSync(join(alertsDir, `alert-${timestamp}.json`), JSON.stringify(alertData, null, 2));

    // Future: Could integrate with Slack, email, webhook, etc.
    console.log(`📧 Alert logged to: ${join(alertsDir, `alert-${timestamp}.json`)}`);
  }

  private generateAlertMessage(
    results: Map<string, BenchmarkResult>,
    performance: any,
    violations: string[]
  ): string {
    const metrics = this.extractMetrics(results);

    let message = `Fire22 Performance Alert\\n`;
    message += `Generated: ${new Date().toLocaleString()}\\n\\n`;

    if (performance.regression) {
      message += `🔴 REGRESSION DETECTED\\n`;
      message += `Performance has degraded compared to previous run.\\n\\n`;
    } else {
      message += `🟡 BUDGET VIOLATIONS\\n`;
      message += `Some benchmarks exceeded their performance budgets.\\n\\n`;
    }

    message += `📊 Current Metrics:\\n`;
    message += `• Average Latency: ${metrics.avgLatency.toFixed(2)}ms\\n`;
    message += `• Average Throughput: ${metrics.avgThroughput.toFixed(2)}/s\\n`;
    message += `• Average Memory: ${(metrics.avgMemoryUsage / 1024 / 1024).toFixed(2)}MB\\n`;
    message += `• Average CPU: ${metrics.avgCpuUsage.toFixed(1)}%\\n\\n`;

    if (violations.length > 0) {
      message += `❌ Budget Violations:\\n`;
      violations.forEach(violation => {
        message += `• ${violation}\\n`;
      });
      message += `\\n`;
    }

    message += `📈 Trend: ${performance.trend.toUpperCase()}\\n`;
    message += `Total Benchmarks: ${results.size}\\n`;

    return message;
  }

  private loadHistoricalData(): void {
    // Load historical benchmark data for comparison
  }

  private async getBunVersion(): Promise<string> {
    const result = await this.processManager.execute({
      command: ['bun', '--version'],
      timeout: 5000,
    });
    return result.success ? result.output.trim() : 'unknown';
  }

  private async measureColdStart(environment: string): Promise<number> {
    // Implementation would measure Worker cold start time
    return 150; // placeholder
  }

  private async measureResourceUsage(
    environment: string,
    duration: number
  ): Promise<{ memory: number; cpu: number }> {
    // Implementation would measure resource usage
    return { memory: 64 * 1024 * 1024, cpu: 25 }; // placeholder
  }

  private async measureThroughput(
    environment: string,
    duration: number,
    concurrency: number
  ): Promise<number> {
    // Implementation would measure requests per second
    return 500; // placeholder
  }

  private async measureLatency(environment: string, duration: number): Promise<number> {
    // Implementation would measure response latency
    return 85; // placeholder
  }

  private async measureErrorRate(environment: string, duration: number): Promise<number> {
    // Implementation would measure error rate
    return 0.001; // placeholder
  }
}

export default CrossRepoBenchmarker;
