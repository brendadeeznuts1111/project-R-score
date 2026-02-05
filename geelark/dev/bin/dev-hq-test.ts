#!/usr/bin/env bun
// dev-hq-test - Enhanced test command with Dev HQ insights

import { spawn } from "bun";
import { DevHQAutomation } from "../dev-hq/core/automation.js";

interface TestOptions {
  coverage?: boolean;
  watch?: boolean;
  filter?: string;
  verbose?: boolean;
  json?: boolean;
  parallel?: boolean;
  timeout?: number;
  reporter?: string;
  bail?: boolean;
}

class DevHQTestRunner {
  private automation = new DevHQAutomation();
  private theme = {
    info: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    error: "\x1b[31m", // Red
    warning: "\x1b[33m", // Yellow
    reset: "\x1b[0m", // Reset
    bold: "\x1b[1m", // Bold
    dim: "\x1b[2m", // Dim
  };

  async run(options: TestOptions = {}) {
    console.log(`${this.theme.info}🧪 Dev HQ Test Runner${this.theme.reset}`);
    console.log(
      `${this.theme.dim}Running tests with enhanced insights...${this.theme.reset}\n`
    );

    // Build test command
    const testArgs = this.buildTestArgs(options);

    // Pre-test analysis
    await this.analyzeTestEnvironment(options);

    // Run tests
    console.log(
      `${this.theme.info}▶️  Executing: bun ${testArgs.join(" ")}${
        this.theme.reset
      }\n`
    );

    const startTime = Date.now();
    const proc = spawn(["bun", ...testArgs], {
      stdout: "inherit",
      stderr: "inherit",
    });

    await proc.exited;
    const duration = Date.now() - startTime;

    // Post-test analysis
    await this.analyzeResults(proc.exitCode || 0, duration, options);

    return proc.exitCode || 0;
  }

  private buildTestArgs(options: TestOptions): string[] {
    const args = ["test"];

    // Coverage
    if (options.coverage) {
      args.push("--coverage");
    }

    // Watch mode
    if (options.watch) {
      args.push("--watch");
    }

    // Filter
    if (options.filter) {
      args.push("--filter", options.filter);
    }

    // Verbose output
    if (options.verbose) {
      args.push("--verbose");
    }

    // JSON output
    if (options.json) {
      args.push("--reporter", "json");
    }

    // Parallel execution
    if (options.parallel) {
      args.push("--parallel");
    }

    // Timeout
    if (options.timeout) {
      args.push("--timeout", options.timeout.toString());
    }

    // Custom reporter
    if (options.reporter) {
      args.push("--reporter", options.reporter);
    }

    // Bail on first failure
    if (options.bail) {
      args.push("--bail");
    }

    return args;
  }

  private async analyzeTestEnvironment(options: TestOptions) {
    console.log(
      `${this.theme.info}📊 Test Environment Analysis${this.theme.reset}`
    );

    // Check test files
    const testFiles = await this.findTestFiles();
    console.log(`   📁 Test files found: ${testFiles.length}`);

    // Check dependencies
    const deps = await this.checkDependencies();
    console.log(
      `   📦 Dependencies: ${deps.available}/${deps.total} available`
    );

    // Check TypeScript config
    const tsConfig = await this.checkTypeScriptConfig();
    console.log(`   📝 TypeScript config: ${tsConfig ? "Found" : "Not found"}`);

    // Check coverage setup
    if (options.coverage) {
      const coverageReady = await this.checkCoverageSetup();
      console.log(
        `   📊 Coverage setup: ${coverageReady ? "Ready" : "Not configured"}`
      );
    }

    console.log("");
  }

  private async findTestFiles(): Promise<string[]> {
    try {
      const result = await this.automation.runCommand(
        "find-tests",
        ["find", ".", "-name", "*.test.ts", "-o", "-name", "*.test.js"],
        { cwd: process.cwd() }
      );

      if (result && "stdout" in result && typeof result.stdout === "string") {
        return result.stdout.trim().split("\n").filter(Boolean);
      }
    } catch (error) {
      // Fallback to glob pattern
      console.log(
        `${this.theme.warning}⚠️  Could not count test files${this.theme.reset}`
      );
    }

    return [];
  }

  private async checkDependencies(): Promise<{
    available: number;
    total: number;
  }> {
    try {
      const packageJson = await Bun.file("package.json").text();
      const pkg = JSON.parse(packageJson);

      const devDeps = Object.keys(pkg.devDependencies || {});
      const deps = Object.keys(pkg.dependencies || {});
      const allDeps = [...devDeps, ...deps];

      return {
        available: allDeps.length,
        total: allDeps.length,
      };
    } catch {
      return { available: 0, total: 0 };
    }
  }

  private async checkTypeScriptConfig(): Promise<boolean> {
    try {
      await Bun.file("tsconfig.json").text();
      return true;
    } catch {
      return false;
    }
  }

  private async checkCoverageSetup(): Promise<boolean> {
    try {
      const packageJson = await Bun.file("package.json").text();
      const pkg = JSON.parse(packageJson);

      return !!(
        pkg.devDependencies?.["@vitest/coverage-v8"] ||
        pkg.devDependencies?.["c8"] ||
        pkg.devDependencies?.["nyc"]
      );
    } catch {
      return false;
    }
  }

  private async analyzeResults(
    exitCode: number,
    duration: number,
    options: TestOptions
  ) {
    console.log(
      `\n${this.theme.info}📊 Test Results Analysis${this.theme.reset}`
    );

    // Duration
    console.log(`   ⏱️  Duration: ${duration}ms`);

    // Exit code
    if (exitCode === 0) {
      console.log(
        `   ${this.theme.success}✅ Status: All tests passed${this.theme.reset}`
      );
    } else {
      console.log(
        `   ${this.theme.error}❌ Status: Tests failed (exit code: ${exitCode})${this.theme.reset}`
      );
    }

    // Coverage analysis
    if (options.coverage) {
      await this.analyzeCoverage();
    }

    // Performance metrics
    if (duration > 10000) {
      console.log(
        `   ${this.theme.warning}⚠️  Slow test execution (>10s)${this.theme.reset}`
      );
    }

    // Recommendations
    await this.provideRecommendations(exitCode, duration, options);
  }

  private async analyzeCoverage() {
    try {
      const coverageDir = "./coverage";
      const coverageFile = `${coverageDir}/coverage-summary.json`;

      try {
        const coverageData = await Bun.file(coverageFile).text();
        const coverage = JSON.parse(coverageData);

        console.log(`   📊 Coverage Report:`);
        console.log(`      Lines: ${coverage.total?.lines?.pct || "N/A"}%`);
        console.log(
          `      Functions: ${coverage.total?.functions?.pct || "N/A"}%`
        );
        console.log(
          `      Branches: ${coverage.total?.branches?.pct || "N/A"}%`
        );
        console.log(
          `      Statements: ${coverage.total?.statements?.pct || "N/A"}%`
        );
      } catch {
        console.log(`   📊 Coverage: Report not found at ${coverageFile}`);
      }
    } catch (error) {
      console.log(`   📊 Coverage: Could not analyze coverage report`);
    }
  }

  private async provideRecommendations(
    exitCode: number,
    duration: number,
    options: TestOptions
  ) {
    console.log(`\n${this.theme.info}💡 Recommendations${this.theme.reset}`);

    const recommendations: string[] = [];

    if (exitCode !== 0) {
      recommendations.push("🔧 Fix failing tests before proceeding");
    }

    if (duration > 30000) {
      recommendations.push(
        "⚡ Consider using --parallel for faster test execution"
      );
      recommendations.push("🔍 Use --filter to run specific test files");
    }

    if (!options.coverage && exitCode === 0) {
      recommendations.push("📊 Add --coverage to track test coverage");
    }

    if (!options.verbose && exitCode !== 0) {
      recommendations.push("📝 Use --verbose for detailed error output");
    }

    if (recommendations.length === 0) {
      recommendations.push("🎉 Great job! Tests are running optimally");
    }

    recommendations.forEach((rec) => {
      console.log(`   ${rec}`);
    });
  }

  async watch(options: TestOptions = {}) {
    console.log(
      `${this.theme.info}👁️  Dev HQ Test Watch Mode${this.theme.reset}`
    );
    console.log(
      `${this.theme.dim}Watching for test file changes...${this.theme.reset}\n`
    );

    // Enable watch mode
    options.watch = true;

    // Run in watch mode
    return this.run(options);
  }

  async coverage(options: TestOptions = {}) {
    console.log(`${this.theme.info}📊 Dev HQ Coverage Mode${this.theme.reset}`);
    console.log(
      `${this.theme.dim}Running tests with coverage analysis...${this.theme.reset}\n`
    );

    // Enable coverage
    options.coverage = true;

    return this.run(options);
  }

  async filter(pattern: string, options: TestOptions = {}) {
    console.log(`${this.theme.info}🔍 Dev HQ Filter Mode${this.theme.reset}`);
    console.log(
      `${this.theme.dim}Running tests matching: ${pattern}${this.theme.reset}\n`
    );

    // Set filter
    options.filter = pattern;

    return this.run(options);
  }
}

// CLI Interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const testRunner = new DevHQTestRunner();

  // Parse command line arguments
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-c":
      case "--coverage":
        options.coverage = true;
        break;
      case "-w":
      case "--watch":
        options.watch = true;
        break;
      case "-f":
      case "--filter":
        options.filter = args[++i];
        break;
      case "-v":
      case "--verbose":
        options.verbose = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--parallel":
        options.parallel = true;
        break;
      case "--bail":
        options.bail = true;
        break;
      case "--timeout":
        options.timeout = parseInt(args[++i]) || 5000;
        break;
      case "--reporter":
        options.reporter = args[++i];
        break;
      case "watch":
        await testRunner.watch(options);
        process.exit(0);
        break;
      case "coverage":
        await testRunner.coverage(options);
        process.exit(0);
        break;
      default:
        if (arg.startsWith("filter:")) {
          options.filter = arg.replace("filter:", "");
        }
        break;
    }
  }

  // Run tests
  testRunner.run(options).then((code) => {
    process.exit(code);
  });
}

export { DevHQTestRunner };
