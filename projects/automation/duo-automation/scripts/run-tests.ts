// scripts/run-tests.ts - Test runner script with coverage and reporting

import { spawn } from "bun";

interface TestConfig {
  coverage?: boolean;
  reporter?: string;
  outputFile?: string;
  pattern?: string;
  timeout?: number;
  concurrent?: boolean;
}

class TestRunner {
  private config: TestConfig;
  private reportsDir: string;

  constructor(config: TestConfig = {}) {
    this.config = {
      coverage: true,
      reporter: "text",
      timeout: 30000,
      concurrent: false,
      ...config
    };
    
    this.reportsDir = "./reports";
  }

  private async ensureReportsDirectory(): Promise<void> {
    const reportsDir = Bun.file(this.reportsDir);
    if (!await reportsDir.exists()) {
      await Bun.write(this.reportsDir + "/.gitkeep", "");
    }
    
    // Create subdirectories
    const subdirs = ["coverage", "junit", "screenshots"];
    for (const dir of subdirs) {
      const fullPath = `${this.reportsDir}/${dir}`;
      const dirFile = Bun.file(fullPath);
      if (!await dirFile.exists()) {
        await Bun.write(fullPath + "/.gitkeep", "");
      }
    }
  }

  async runUnitTests(): Promise<void> {
    console.log("🧪 Running Unit Tests");
    console.log("=".repeat(50));

    const args = [
      "bun",
      "test",
      "tests/unit/**/*.test.ts",
      "--timeout",
      this.config.timeout!.toString()
    ];

    if (this.config.coverage) {
      args.push("--coverage");
    }

    if (this.config.reporter) {
      args.push("--reporter", this.config.reporter);
    }

    if (this.config.concurrent) {
      args.push("--concurrent");
    }

    await this.executeCommand(args);
  }

  async runIntegrationTests(): Promise<void> {
    console.log("\n🔗 Running Integration Tests");
    console.log("=".repeat(50));

    const args = [
      "bun",
      "test",
      "tests/integration/**/*.test.ts",
      "--timeout",
      (this.config.timeout! * 2).toString() // Longer timeout for integration tests
    ];

    if (this.config.coverage) {
      args.push("--coverage");
    }

    if (this.config.reporter) {
      args.push("--reporter", this.config.reporter);
    }

    await this.executeCommand(args);
  }

  async runAllTests(): Promise<void> {
    console.log("🎯 Running All Tests");
    console.log("=".repeat(50));

    const args = [
      "bun",
      "test",
      "tests/**/*.test.ts",
      "--timeout",
      this.config.timeout!.toString()
    ];

    if (this.config.coverage) {
      args.push("--coverage");
    }

    if (this.config.reporter) {
      args.push("--reporter", this.config.reporter);
    }

    if (this.config.concurrent) {
      args.push("--concurrent");
    }

    await this.executeCommand(args);
  }

  async runTestsByPattern(pattern: string): Promise<void> {
    console.log(`🔍 Running Tests Matching: ${pattern}`);
    console.log("=".repeat(50));

    const args = [
      "bun",
      "test",
      pattern,
      "--timeout",
      this.config.timeout!.toString()
    ];

    if (this.config.coverage) {
      args.push("--coverage");
    }

    await this.executeCommand(args);
  }

  async generateCoverageReport(): Promise<void> {
    console.log("\n📊 Generating Coverage Report");
    console.log("=".repeat(50));

    const coverageArgs = [
      "bun",
      "test",
      "--coverage",
      "--coverage-reporter",
      "text",
      "--coverage-reporter",
      "lcov",
      "--coverage-reporter",
      "html",
      "--coverage-dir",
      "./coverage"
    ];

    await this.executeCommand(coverageArgs);

    // Generate coverage summary
    await this.generateCoverageSummary();
  }

  async generateJUnitReport(): Promise<void> {
    console.log("\n📋 Generating JUnit Report");
    console.log("=".repeat(50));

    const junitArgs = [
      "bun",
      "test",
      "--reporter",
      "junit",
      "--reporter-outfile",
      `${this.reportsDir}/junit/test-results.xml`
    ];

    await this.executeCommand(junitArgs);
  }

  async runPerformanceTests(): Promise<void> {
    console.log("\n⚡ Running Performance Tests");
    console.log("=".repeat(50));

    const performanceArgs = [
      "bun",
      "test",
      "tests/performance/**/*.test.ts",
      "--timeout",
      "60000" // 1 minute timeout for performance tests
    ];

    await this.executeCommand(performanceArgs);
  }

  async watchTests(): Promise<void> {
    console.log("👀 Watching Tests for Changes");
    console.log("=".repeat(50));

    const watchArgs = [
      "bun",
      "test",
      "--watch",
      "tests/**/*.test.ts"
    ];

    await this.executeCommand(watchArgs);
  }

  async runE2ETests(): Promise<void> {
    console.log("\n🌐 Running End-to-End Tests");
    console.log("=".repeat(50));

    const e2eArgs = [
      "bun",
      "test",
      "tests/e2e/**/*.test.ts",
      "--timeout",
      "120000" // 2 minutes timeout for E2E tests
    ];

    await this.executeCommand(e2eArgs);
  }

  private async executeCommand(args: string[]): Promise<void> {
    console.log(`Executing: ${args.join(" ")}`);

    const childProcess = spawn({
      cmd: args,
      stdout: "inherit",
      stderr: "inherit",
      env: process.env
    });

    const exitCode = await childProcess.exited;

    if (exitCode !== 0) {
      console.error(`❌ Tests failed with exit code: ${exitCode}`);
      process.exit(exitCode);
    }

    console.log("✅ Tests completed successfully");
  }

  private async generateCoverageSummary(): Promise<void> {
    try {
      // Read coverage summary if it exists
      const coverageSummaryPath = "./coverage/coverage-summary.json";
      
      if (existsSync(coverageSummaryPath)) {
        const coverageData = await Bun.file(coverageSummaryPath).json();
        
        const summary = {
          total: coverageData.total?.lines?.pct || 0,
          lines: coverageData.lines?.pct || 0,
          functions: coverageData.functions?.pct || 0,
          branches: coverageData.branches?.pct || 0,
          statements: coverageData.statements?.pct || 0
        };

        const summaryReport = `
# Coverage Summary

| Metric | Coverage |
|--------|----------|
| Lines | ${summary.lines.toFixed(1)}% |
| Functions | ${summary.functions.toFixed(1)}% |
| Branches | ${summary.branches.toFixed(1)}% |
| Statements | ${summary.statements.toFixed(1)}% |
| **Total** | **${summary.total.toFixed(1)}%** |

Generated on: ${new Date().toISOString()}
        `;

        await Bun.write(`${this.reportsDir}/coverage-summary.md`, summaryReport);
        console.log("📈 Coverage summary generated");
      }
    } catch (error) {
      console.warn("⚠️  Could not generate coverage summary:", error);
    }
  }

  async runFullTestSuite(): Promise<void> {
    console.log("🚀 Running Full Test Suite");
    console.log("=".repeat(60));

    try {
      // 1. Run unit tests
      await this.runUnitTests();

      // 2. Run integration tests
      await this.runIntegrationTests();

      // 3. Generate coverage report
      if (this.config.coverage) {
        await this.generateCoverageReport();
      }

      // 4. Generate JUnit report
      await this.generateJUnitReport();

      console.log("\n🎊 Full test suite completed successfully!");
      console.log(`📁 Reports available in: ${this.reportsDir}`);

    } catch (error) {
      console.error("❌ Test suite failed:", error);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "all";

  const config: TestConfig = {
    coverage: !args.includes("--no-coverage"),
    concurrent: args.includes("--concurrent"),
    timeout: 30000
  };

  const runner = new TestRunner(config);

  try {
    switch (command) {
      case "unit":
        await runner.runUnitTests();
        break;

      case "integration":
        await runner.runIntegrationTests();
        break;

      case "all":
        await runner.runFullTestSuite();
        break;

      case "coverage":
        await runner.generateCoverageReport();
        break;

      case "junit":
        await runner.generateJUnitReport();
        break;

      case "performance":
        await runner.runPerformanceTests();
        break;

      case "e2e":
        await runner.runE2ETests();
        break;

      case "watch":
        await runner.watchTests();
        break;

      default:
        if (command.includes(".test.ts") || command.includes("**/")) {
          await runner.runTestsByPattern(command);
        } else {
          console.error(`Unknown command: ${command}`);
          console.log(`
Available commands:
  unit              - Run unit tests
  integration       - Run integration tests
  all               - Run full test suite
  coverage          - Generate coverage report
  junit             - Generate JUnit report
  performance       - Run performance tests
  e2e               - Run end-to-end tests
  watch             - Watch tests for changes
  <pattern>         - Run tests matching pattern

Options:
  --no-coverage     - Disable coverage reporting
  --concurrent      - Run tests concurrently
          `);
          process.exit(1);
        }
    }
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

// Export for programmatic use
export { TestRunner, type TestConfig };

// Run CLI if called directly
if (import.meta.main) {
  main();
}
