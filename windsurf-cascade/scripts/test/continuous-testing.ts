import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
#!/usr/bin/env bun

import { spawn } from "bun";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { EventEmitter } from "events";

interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped" | "pending";
  duration: number;
  error?: string;
  coverage?: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  status: "passed" | "failed" | "skipped";
}

interface TestReport {
  timestamp: string;
  duration: number;
  suites: TestSuite[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
  };
  performance: {
    memoryUsed: number;
    cpuTime: number;
    buildTime: number;
  };
}

class ContinuousTestingPipeline extends EventEmitter {
  private projectPath: string;
  private isRunning = false;
  private testInterval: NodeJS.Timeout | null = null;
  private lastReport: TestReport | null = null;
  private watchers: Map<string, any> = new Map();

  constructor(projectPath: string = process.cwd()) {
    super();
    this.projectPath = projectPath;
  }

  async start(options: {
    interval?: number;
    watch?: boolean;
    coverage?: boolean;
    performance?: boolean;
    concurrent?: boolean;
  } = {}): Promise<void> {
    const {
      interval = 30000, // 30 seconds
      watch = true,
      coverage = true,
      performance = true,
      concurrent = true,
    } = options;

    if (this.isRunning) {
      console.log("⚠️  Continuous testing is already running");
      return;
    }

    console.log("🚀 Starting continuous testing pipeline...");
    console.log(`📊 Configuration:`);
    console.log(`   - Interval: ${interval}ms`);
    console.log(`   - Watch mode: ${watch ? "Enabled" : "Disabled"}`);
    console.log(`   - Coverage: ${coverage ? "Enabled" : "Disabled"}`);
    console.log(`   - Performance: ${performance ? "Enabled" : "Disabled"}`);
    console.log(`   - Concurrent: ${concurrent ? "Enabled" : "Disabled"}`);

    this.isRunning = true;

    // Initial test run
    await this.runTests({ coverage, performance, concurrent });

    // Set up file watchers
    if (watch) {
      this.setupWatchers();
    }

    // Set up interval testing
    this.testInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.runTests({ coverage, performance, concurrent });
      }
    }, interval);

    this.emit("started");
    console.log("✅ Continuous testing pipeline started");
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("🛑 Stopping continuous testing pipeline...");
    
    this.isRunning = false;
    
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }

    // Stop all watchers
    for (const [path, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        console.error(`Failed to stop watcher for ${path}:`, error);
      }
    }
    this.watchers.clear();

    this.emit("stopped");
    console.log("✅ Continuous testing pipeline stopped");
  }

  private setupWatchers(): void {
    const watchPaths = [
      "packages/*/src/**/*.ts",
      "apps/*/src/**/*.ts",
      "scripts/**/*.ts",
      "*.toml",
      "*.json",
    ];

    for (const pattern of watchPaths) {
      // In a real implementation, you'd use a proper file watcher like chokidar
      // For this example, we'll simulate file watching
      console.log(`👀 Setting up watcher for: ${pattern}`);
    }
  }

  private async runTests(options: {
    coverage: boolean;
    performance: boolean;
    concurrent: boolean;
  }): Promise<TestReport> {
    const startTime = Date.now();
    console.log("🧪 Running test suite...");

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      duration: 0,
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: 0,
      },
      performance: {
        memoryUsed: 0,
        cpuTime: 0,
        buildTime: 0,
      },
    };

    try {
      // Run core tests
      const coreSuite = await this.runTestSuite("core", [
        "packages/odds-core/src/__tests__/**/*.test.ts",
      ], options);

      report.suites.push(coreSuite);

      // Run WebSocket tests
      const wsSuite = await this.runTestSuite("websocket", [
        "packages/odds-websocket/src/__tests__/**/*.test.ts",
      ], options);

      report.suites.push(wsSuite);

      // Run integration tests
      const integrationSuite = await this.runTestSuite("integration", [
        "packages/odds-core/src/__tests__/integration.test.ts",
      ], options);

      report.suites.push(integrationSuite);

      // Run performance tests if enabled
      if (options.performance) {
        const perfSuite = await this.runTestSuite("performance", [
          "packages/odds-core/src/__tests__/performance.test.ts",
        ], options);

        report.suites.push(perfSuite);
      }

      // Calculate summary
      report.summary.total = report.suites.reduce((sum, suite) => sum + suite.tests.length, 0);
      report.summary.passed = report.suites.reduce((sum, suite) => 
        sum + suite.tests.filter(t => t.status === "passed").length, 0);
      report.summary.failed = report.suites.reduce((sum, suite) => 
        sum + suite.tests.filter(t => t.status === "failed").length, 0);
      report.summary.skipped = report.suites.reduce((sum, suite) => 
        sum + suite.tests.filter(t => t.status === "skipped").length, 0);

      // Calculate overall coverage
      const coverages = report.suites
        .map(suite => suite.tests.map(t => t.coverage || 0))
        .flat()
        .filter(c => c > 0);
      
      if (coverages.length > 0) {
        report.summary.coverage = Math.round(
          coverages.reduce((sum, c) => sum + c, 0) / coverages.length
        );
      }

      // Get performance metrics
      report.performance = await this.getPerformanceMetrics();

      report.duration = Date.now() - startTime;
      this.lastReport = report;

      // Generate reports
      await this.generateReports(report);

      // Emit events
      this.emit("test-completed", report);
      
      if (report.summary.failed > 0) {
        this.emit("test-failed", report);
      }

      console.log(`✅ Tests completed in ${report.duration}ms`);
      console.log(`📊 Results: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`);
      console.log(`📈 Coverage: ${report.summary.coverage}%`);

      return report;
    } catch (error: any) {
      console.error("❌ Test execution failed:", error);
      
      const errorReport: TestReport = {
        ...report,
        duration: Date.now() - startTime,
        suites: [{
          name: "error",
          tests: [{
            name: "pipeline-error",
            status: "failed",
            duration: 0,
            error: error.message,
          }],
          duration: 0,
          status: "failed",
        }],
      };

      this.emit("test-error", errorReport);
      return errorReport;
    }
  }

  private async runTestSuite(
    name: string,
    patterns: string[],
    options: { coverage: boolean; performance: boolean; concurrent: boolean }
  ): Promise<TestSuite> {
    const startTime = Date.now();
    const suite: TestSuite = {
      name,
      tests: [],
      duration: 0,
      status: "passed",
    };

    try {
      // Build test command
      let testCmd = "bun test --config ./bun.test.toml";
      
      if (options.concurrent) {
        testCmd += " --concurrent";
      }
      
      if (options.coverage) {
        testCmd += " --coverage";
      }

      // Add test patterns
      const testFiles = await this.findTestFiles(patterns);
      
      if (testFiles.length === 0) {
        suite.tests.push({
          name: "no-tests-found",
          status: "skipped",
          duration: 0,
        });
        suite.status = "skipped";
      } else {
        // Run tests for each pattern
        for (const pattern of patterns) {
          const patternTests = await this.executeTestCommand(testCmd, pattern);
          suite.tests.push(...patternTests);
        }

        // Determine suite status
        const hasFailures = suite.tests.some(t => t.status === "failed");
        suite.status = hasFailures ? "failed" : "passed";
      }

      suite.duration = Date.now() - startTime;
      return suite;
    } catch (error: any) {
      suite.tests.push({
        name: "suite-error",
        status: "failed",
        duration: Date.now() - startTime,
        error: error.message,
      });
      suite.status = "failed";
      suite.duration = Date.now() - startTime;
      return suite;
    }
  }

  private async findTestFiles(patterns: string[]): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const proc = Bun.spawn({
        cmd: ["find", this.projectPath, "-path", pattern, "-type", "f"],
        stdout: "pipe",
      });
      
      const output = await new Response(proc.stdout).text();
      await proc.exited;
      
      if (output.trim()) {
        files.push(...output.trim().split("\\n"));
      }
    }
    
    return files;
  }

  private async executeTestCommand(
    baseCmd: string,
    pattern: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    try {
      const cmd = `${baseCmd} ${pattern}`;
      const proc = Bun.spawn({
        cmd: cmd.split(" "),
        cwd: this.projectPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      const startTime = Date.now();
      const output = await new Response(proc.stdout).text();
      const errorOutput = await new Response(proc.stderr).text();
      await proc.exited;
      const duration = Date.now() - startTime;

      // Parse test output (simplified parsing)
      const lines = output.split("\\n");
      let currentTest: TestResult | null = null;

      for (const line of lines) {
        if (line.includes("✓") || line.includes("PASS")) {
          if (currentTest) {
            results.push(currentTest);
          }
          currentTest = {
            name: this.extractTestName(line),
            status: "passed",
            duration: duration / 10, // Approximate
          };
        } else if (line.includes("✗") || line.includes("FAIL")) {
          if (currentTest) {
            results.push(currentTest);
          }
          currentTest = {
            name: this.extractTestName(line),
            status: "failed",
            duration: duration / 10,
            error: errorOutput,
          };
        }
      }

      if (currentTest) {
        results.push(currentTest);
      }

      // If no tests were parsed, create a summary result
      if (results.length === 0) {
        results.push({
          name: pattern,
          status: proc.exitCode === 0 ? "passed" : "failed",
          duration,
          error: proc.exitCode !== 0 ? errorOutput : undefined,
        });
      }

      return results;
    } catch (error: any) {
      return [{
        name: pattern,
        status: "failed",
        duration: 0,
        error: error.message,
      }];
    }
  }

  private extractTestName(line: string): string {
    // Extract test name from output line
    const match = line.match(/(?:✓|✗|PASS|FAIL)\s+(.+)/);
    return match?.[1]?.trim() || "unknown-test";
  }

  private async getPerformanceMetrics(): Promise<{
    memoryUsed: number;
    cpuTime: number;
    buildTime: number;
  }> {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      cpuTime: process.cpuUsage().user, // microseconds
      buildTime: 0, // Would be measured in actual implementation
    };
  }

  private async generateReports(report: TestReport): Promise<void> {
    // Ensure reports directory exists
    const reportsDir = join(this.projectPath, "test-results");
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    // JSON report
    const jsonReport = join(reportsDir, `test-report-${Date.now()}.json`);
    writeFileSync(jsonReport, JSON.stringify(report, null, 2));

    // Latest report
    const latestReport = join(reportsDir, "latest.json");
    writeFileSync(latestReport, JSON.stringify(report, null, 2));

    // Markdown summary
    const markdownReport = this.generateMarkdownReport(report);
    const mdFile = join(reportsDir, "summary.md");
    writeFileSync(mdFile, markdownReport);

    // HTML report (simplified)
    const htmlReport = this.generateHtmlReport(report);
    const htmlFile = join(reportsDir, "report.html");
    writeFileSync(htmlFile, htmlReport);

    console.log(`📄 Reports generated in test-results/`);
  }

  private generateMarkdownReport(report: TestReport): string {
    return `
# Test Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}  
**Duration:** ${report.duration}ms  
**Status:** ${report.summary.failed === 0 ? "✅ PASSED" : "❌ FAILED"}

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${report.summary.total} |
| Passed | ${report.summary.passed} |
| Failed | ${report.summary.failed} |
| Skipped | ${report.summary.skipped} |
| Coverage | ${report.summary.coverage}% |

## Performance

| Metric | Value |
|--------|-------|
| Memory Used | ${report.performance.memoryUsed}MB |
| CPU Time | ${report.performance.cpuTime}μs |
| Build Time | ${report.performance.buildTime}ms |

## Test Suites

${report.suites.map(suite => `
### ${suite.name}
**Status:** ${suite.status}  
**Duration:** ${suite.duration}ms  
**Tests:** ${suite.tests.length}

${suite.tests.filter(t => t.status === "failed").map(test => `
❌ **${test.name}**  
\`${test.error}\`
`).join("")}
`).join("")}

## Trends

${this.lastReport ? `
**Previous Report:** ${new Date(this.lastReport.timestamp).toLocaleString()}  
**Coverage Change:** ${report.summary.coverage - this.lastReport.summary.coverage > 0 ? "📈" : "📉"} ${report.summary.coverage - this.lastReport.summary.coverage}%
` : "No previous report available"}
    `;
  }

  private generateHtmlReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${new Date(report.timestamp).toLocaleString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .test { padding: 10px; border-bottom: 1px solid #eee; }
        .test.passed { border-left: 4px solid #28a745; }
        .test.failed { border-left: 4px solid #dc3545; }
        .test.skipped { border-left: 4px solid #ffc107; }
        .status.passed { color: #28a745; }
        .status.failed { color: #dc3545; }
        .status.skipped { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Test Report</h1>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${report.duration}ms</p>
        <p><strong>Status:</strong> <span class="status ${report.summary.failed === 0 ? "passed" : "failed"}">
            ${report.summary.failed === 0 ? "✅ PASSED" : "❌ FAILED"}
        </span></p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${report.summary.total}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3 class="status passed">${report.summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric">
            <h3 class="status failed">${report.summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3 class="status skipped">${report.summary.skipped}</h3>
            <p>Skipped</p>
        </div>
        <div class="metric">
            <h3>${report.summary.coverage}%</h3>
            <p>Coverage</p>
        </div>
    </div>

    <h2>Test Suites</h2>
    ${report.suites.map(suite => `
        <div class="suite">
            <div class="suite-header">
                ${suite.name} - 
                <span class="status ${suite.status}">${suite.status.toUpperCase()}</span> 
                (${suite.duration}ms, ${suite.tests.length} tests)
            </div>
            ${suite.tests.map(test => `
                <div class="test ${test.status}">
                    <strong>${test.name}</strong> - 
                    <span class="status ${test.status}">${test.status}</span>
                    (${test.duration}ms)
                    ${test.error ? `<pre>${test.error}</pre>` : ""}
                </div>
            `).join("")}
        </div>
    `).join("")}

    <div class="header">
        <h2>Performance Metrics</h2>
        <p><strong>Memory Used:</strong> ${report.performance.memoryUsed}MB</p>
        <p><strong>CPU Time:</strong> ${report.performance.cpuTime}μs</p>
        <p><strong>Build Time:</strong> ${report.performance.buildTime}ms</p>
    </div>
</body>
</html>
    `;
  }

  getLastReport(): TestReport | null {
    return this.lastReport;
  }

  isTestRunning(): boolean {
    return this.isRunning;
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: any = {};

  for (const arg of args) {
    if (arg === "--no-watch") options.watch = false;
    if (arg === "--no-coverage") options.coverage = false;
    if (arg === "--no-performance") options.performance = false;
    if (arg === "--no-concurrent") options.concurrent = false;
    if (arg.startsWith("--interval=")) {
      const intervalValue = arg.split("=")[1];
      if (intervalValue) {
        options.interval = parseInt(intervalValue);
      }
    }
    if (arg === "--help") {
      console.log(`
Usage: bun run continuous-testing.ts [options]

Options:
  --no-watch        Disable file watching
  --no-coverage     Disable coverage reporting
  --no-performance  Disable performance testing
  --no-concurrent   Disable concurrent test execution
  --interval=<ms>   Set test interval (default: 30000)
  --help            Show this help

Examples:
  bun run continuous-testing.ts
  bun run continuous-testing.ts --interval=10000
  bun run continuous-testing.ts --no-coverage
      `);
      process.exit(0);
    }
  }

  const pipeline = new ContinuousTestingPipeline();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\\n🛑 Received SIGINT, stopping pipeline...");
    await pipeline.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\\n🛑 Received SIGTERM, stopping pipeline...");
    await pipeline.stop();
    process.exit(0);
  });

  // Start pipeline
  pipeline.start(options).catch((error: any) => {
    console.error("❌ Failed to start pipeline:", error);
    process.exit(1);
  });
}

export { ContinuousTestingPipeline, TestReport, TestSuite, TestResult };
