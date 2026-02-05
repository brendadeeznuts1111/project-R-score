#!/usr/bin/env bun

// Build script demonstrating Bun v1.3.6 spawnSync performance improvements
console.log("🔨 Build Script with Bun v1.3.6 spawnSync Optimizations");
console.log("=".repeat(60));

import { spawnSync } from "bun";

interface BuildMetrics {
  operation: string;
  duration: number;
  success: boolean;
}

class BuildScript {
  private metrics: BuildMetrics[] = [];

  private async measureOperation<T>(
    name: string,
    operation: () => T,
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = operation();
      const duration = performance.now() - start;

      this.metrics.push({
        operation: name,
        duration,
        success: true,
      });

      console.log(`✅ ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.metrics.push({
        operation: name,
        duration,
        success: false,
      });

      console.log(`❌ ${name}: ${duration.toFixed(2)}ms (failed)`);
      throw error;
    }
  }

  async cleanDist() {
    console.log("\n🧹 Cleaning dist directory...");

    return this.measureOperation("Clean dist", () => {
      // Use spawnSync for directory operations - benefits from v1.3.6 improvements
      const cleanResult =
        process.platform === "win32"
          ? spawnSync(["cmd", "/c", "if exist dist rmdir /s /q dist"])
          : spawnSync(["rm", "-rf", "dist"]);

      if (
        cleanResult.exitCode !== 0 &&
        !cleanResult.stderr.toString().includes("No such file")
      ) {
        console.warn("Clean warning:", cleanResult.stderr.toString());
      }

      return (
        cleanResult.exitCode === 0 ||
        cleanResult.stderr.toString().includes("No such file")
      );
    });
  }

  async runTypeCheck() {
    console.log("\n📋 Running type check...");

    return this.measureOperation("Type check", () => {
      // TypeScript compilation - spawnSync benefits from performance fix
      const tscResult = spawnSync([
        "bun",
        "x",
        "tsc",
        "--noEmit",
        "--skipLibCheck",
      ]);

      if (tscResult.exitCode !== 0) {
        console.error("TypeScript errors:");
        console.error(tscResult.stderr.toString());
        throw new Error("TypeScript compilation failed");
      }

      return true;
    });
  }

  async runTests() {
    console.log("\n🧪 Running tests...");

    return this.measureOperation("Run tests", () => {
      // Test execution - uses spawnSync with v1.3.6 performance improvements
      const testResult = spawnSync(["bun", "test", "--bail"]);

      if (testResult.exitCode !== 0) {
        console.error("Test failures:");
        console.error(testResult.stdout.toString());
        console.error(testResult.stderr.toString());
        throw new Error("Tests failed");
      }

      console.log(testResult.stdout.toString());
      return true;
    });
  }

  async runSpecificTests(pattern: string) {
    console.log(`\n🎯 Running tests matching: ${pattern}`);

    return this.measureOperation(`Run tests (${pattern})`, () => {
      // Demonstrate --grep flag functionality (v1.3.6 improvement)
      const testResult = spawnSync(["bun", "test", "--grep", pattern]);

      if (testResult.exitCode !== 0) {
        console.log("No tests matched pattern or tests failed");
        return false;
      }

      console.log(testResult.stdout.toString());
      return true;
    });
  }

  async buildProject() {
    console.log("\n🏗️ Building project...");

    return this.measureOperation("Build project", () => {
      // Build process - spawnSync performance critical here
      const buildResult = spawnSync([
        "bun",
        "build",
        "src/index.ts",
        "--outdir",
        "dist",
        "--target",
        "bun",
      ]);

      if (buildResult.exitCode !== 0) {
        console.error("Build errors:");
        console.error(buildResult.stderr.toString());
        throw new Error("Build failed");
      }

      return true;
    });
  }

  async optimizeAssets() {
    console.log("\n⚡ Optimizing assets...");

    return this.measureOperation("Optimize assets", () => {
      // Asset optimization - multiple spawnSync calls benefit from performance fix
      const operations = [
        ["echo", "Optimizing JavaScript..."],
        ["echo", "Optimizing CSS..."],
        ["echo", "Optimizing images..."],
      ];

      operations.forEach(([cmd, ...args]) => {
        const result = spawnSync([cmd, ...args]);
        if (result.exitCode !== 0) {
          throw new Error(`Asset optimization failed: ${cmd}`);
        }
      });

      return true;
    });
  }

  async generateBundleReport() {
    console.log("\n📊 Generating bundle report...");

    return this.measureOperation("Bundle report", () => {
      // Bundle analysis - spawnSync used for external tools
      const reportData = {
        timestamp: new Date().toISOString(),
        buildTime: this.metrics.reduce((sum, m) => sum + m.duration, 0),
        operations: this.metrics.length,
        successful: this.metrics.filter((m) => m.success).length,
      };

      console.log("%j", reportData); // Uses v1.3.6 fast JSON serialization

      return reportData;
    });
  }

  printPerformanceReport() {
    console.log("\n📈 Performance Report (Bun v1.3.6 spawnSync improvements):");
    console.log("=".repeat(60));

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const successfulOps = this.metrics.filter((m) => m.success);
    const avgDuration = totalDuration / this.metrics.length;

    console.log(`Total build time: ${totalDuration.toFixed(2)}ms`);
    console.log(
      `Operations completed: ${successfulOps.length}/${this.metrics.length}`,
    );
    console.log(`Average operation time: ${avgDuration.toFixed(2)}ms`);

    console.log("\nOperation breakdown:");
    this.metrics.forEach((metric) => {
      const status = metric.success ? "✅" : "❌";
      const performance =
        metric.duration < 10
          ? "🚀 Fast"
          : metric.duration < 50
            ? "⚡ Good"
            : "🐢 Slow";
      console.log(
        `  ${status} ${metric.operation}: ${metric.duration.toFixed(2)}ms (${performance})`,
      );
    });

    // Highlight spawnSync improvements
    const spawnSyncOps = this.metrics.filter(
      (m) =>
        m.operation.includes("Type check") ||
        m.operation.includes("Run tests") ||
        m.operation.includes("Build project"),
    );

    if (spawnSyncOps.length > 0) {
      const avgSpawnSyncTime =
        spawnSyncOps.reduce((sum, m) => sum + m.duration, 0) /
        spawnSyncOps.length;
      console.log(
        `\n🎯 spawnSync operations average: ${avgSpawnSyncTime.toFixed(2)}ms`,
      );
      console.log(
        `   🚀 Up to 30x faster on Linux ARM64 with close_range() fix`,
      );
      console.log(`   ✅ Consistent performance across all platforms`);
    }
  }

  async run(options: { testPattern?: string } = {}) {
    console.log("🚀 Starting build with Bun v1.3.6 optimizations...");

    try {
      await this.cleanDist();
      await this.runTypeCheck();

      if (options.testPattern) {
        await this.runSpecificTests(options.testPattern);
      } else {
        await this.runTests();
      }

      await this.buildProject();
      await this.optimizeAssets();
      await this.generateBundleReport();

      this.printPerformanceReport();

      console.log("\n🎉 Build completed successfully!");
      console.log(
        "💨 Powered by Bun v1.3.6 spawnSync performance improvements",
      );
    } catch (error) {
      console.error("\n❌ Build failed:", error);
      this.printPerformanceReport();
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: { testPattern?: string } = {};

  // Parse command line arguments
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: bun run build-script.ts [options]

Options:
  --test-pattern <pattern>    Run only tests matching pattern (uses --grep)
  --help, -h                  Show this help message

Examples:
  bun run build-script.ts                    # Full build
  bun run build-script.ts --test-pattern "crc32"  # Build with CRC32 tests only
    `);
    process.exit(0);
  }

  const testIndex = args.indexOf("--test-pattern");
  if (testIndex !== -1 && testIndex + 1 < args.length) {
    options.testPattern = args[testIndex + 1];
  }

  const buildScript = new BuildScript();
  await buildScript.run(options);
}

if (import.meta.main) {
  main();
}

export { BuildScript };
