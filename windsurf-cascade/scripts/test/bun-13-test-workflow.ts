#!/usr/bin/env bun
// scripts/test/bun-13-test-workflow.ts
// Comprehensive testing workflow leveraging Bun 1.3 improvements

import { spawn } from "bun";

interface TestConfig {
    concurrent: boolean;
    maxConcurrency: number;
    randomize: boolean;
    timeout: number;
    coverage: boolean;
}

class BunTestWorkflow {
    private config: TestConfig = {
        concurrent: true,
        maxConcurrency: 20,
        randomize: true,
        timeout: 120000,
        coverage: true
    };

    async runFullSuite(): Promise<void> {
        console.log("🚀 Running full test suite with Bun 1.3 optimizations...\n");

        // 1. Run unit tests sequentially for reliability
        console.log("📋 Running unit tests...");
        await this.runTests("packages/*/src/**/*.test.ts", {
            ...this.config,
            concurrent: false,
            maxConcurrency: 1
        });

        // 2. Run integration tests concurrently
        console.log("\n🔗 Running integration tests concurrently...");
        await this.runTests("packages/*/src/integration/**/*.test.ts", {
            ...this.config,
            maxConcurrency: 10
        });

        // 3. Run property tests with high concurrency
        console.log("\n🎲 Running property tests with maximum concurrency...");
        await this.runTests("property-tests/**/*.property.test.ts", {
            ...this.config,
            maxConcurrency: 50,
            timeout: 300000 // 5 minutes for property tests
        });

        // 4. Run type tests
        console.log("\n🔍 Running type tests...");
        await this.runTypeTests();

        console.log("\n✅ Full test suite completed!");
    }

    async runQuickTests(): Promise<void> {
        console.log("⚡ Running quick tests (unit + integration)...\n");

        await this.runTests("packages/*/src/**/*.test.ts", {
            ...this.config,
            concurrent: false,
            maxConcurrency: 1,
            coverage: false
        });

        await this.runTests("packages/*/src/integration/**/*.test.ts", {
            ...this.config,
            maxConcurrency: 10,
            coverage: false
        });

        console.log("\n✅ Quick tests completed!");
    }

    async runPropertyTests(): Promise<void> {
        console.log("🎲 Running property tests with maximum performance...\n");

        await this.runTests("property-tests/**/*.property.test.ts", {
            ...this.config,
            maxConcurrency: 50,
            timeout: 300000,
            randomize: true
        });

        console.log("\n✅ Property tests completed!");
    }

    async runDebugTests(pattern: string): Promise<void> {
        console.log(`🐛 Running debug tests for pattern: ${pattern}\n`);

        await this.runTests(pattern, {
            ...this.config,
            concurrent: false,
            maxConcurrency: 1,
            randomize: false,
            coverage: false
        });

        console.log("\n✅ Debug tests completed!");
    }

    async runPerformanceTests(): Promise<void> {
        console.log("📊 Running performance benchmarks...\n");

        const startTime = Date.now();

        // Test concurrent performance
        await this.runTests("packages/*/src/integration/**/*.test.ts", {
            ...this.config,
            maxConcurrency: 20,
            coverage: false
        });

        const duration = Date.now() - startTime;
        console.log(`\n⏱️ Performance test completed in ${duration}ms`);

        // Log performance metrics
        await this.logPerformanceMetrics(duration);
    }

    async runCI(): Promise<void> {
        console.log("🔄 Running CI tests with strict settings...\n");

        // CI environment - stricter settings
        const ciConfig = {
            ...this.config,
            maxConcurrency: 10, // Conservative for CI
            randomize: true,
            timeout: 120000,
            coverage: true
        };

        // Check for test.only (Bun 1.3 will fail automatically)
        console.log("🔍 Checking for test.only usage...");
        await this.checkForTestOnly();

        // Run tests with seed for reproducibility
        const seed = Math.floor(Math.random() * 1000000);
        console.log(`🎲 Using random seed: ${seed}`);

        await this.runTests("packages/**/*.test.ts", ciConfig, [`--seed=${seed}`]);

        console.log("\n✅ CI tests completed successfully!");
    }

    private async runTests(
        pattern: string,
        config: Partial<TestConfig> = {},
        extraArgs: string[] = []
    ): Promise<void> {
        const args = this.buildTestArgs(config, extraArgs);
        const command = ["bun", "test", pattern, ...args];

        console.log(`Running: ${command.join(" ")}`);

        const proc = spawn({
            cmd: command,
            stdout: "inherit",
            stderr: "inherit",
            env: process.env
        });

        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            throw new Error(`Tests failed with exit code: ${exitCode}`);
        }
    }

    private async runTypeTests(): Promise<void> {
        console.log("Running TypeScript type verification...");

        const proc = spawn({
            cmd: ["bunx", "tsc", "--noEmit", "packages/odds-core/src/__tests__/type-testing-verification.ts"],
            stdout: "inherit",
            stderr: "inherit"
        });

        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            throw new Error("Type tests failed");
        }
    }

    private async checkForTestOnly(): Promise<void> {
        const proc = spawn({
            cmd: ["grep", "-r", "test.only", "packages/", "property-tests/"],
            stdout: "pipe",
            stderr: "pipe"
        });

        const exitCode = await proc.exited;
        if (exitCode === 0) {
            const output = await new Response(proc.stdout).text();
            console.error("❌ Found test.only usage (will fail in CI):");
            console.error(output);
            throw new Error("test.only found in codebase");
        } else {
            console.log("✅ No test.only usage found");
        }
    }

    private buildTestArgs(config: Partial<TestConfig>, extraArgs: string[]): string[] {
        const args: string[] = [];

        if (config.concurrent !== undefined) {
            args.push(config.concurrent ? "--concurrent" : "--no-concurrent");
        }

        if (config.maxConcurrency) {
            args.push(`--max-concurrency=${config.maxConcurrency}`);
        }

        if (config.randomize) {
            args.push("--randomize");
        }

        if (config.timeout) {
            args.push(`--timeout=${config.timeout}`);
        }

        if (config.coverage) {
            args.push("--coverage");
        }

        return [...args, ...extraArgs];
    }

    private async logPerformanceMetrics(duration: number): Promise<void> {
        const metrics = {
            timestamp: new Date().toISOString(),
            duration,
            config: this.config,
            performance: duration < 10000 ? "excellent" : duration < 30000 ? "good" : "needs-improvement"
        };

        console.log("📊 Performance Metrics:", JSON.stringify(metrics, null, 2));

        // Could write to performance tracking system
        await Bun.write("./performance-metrics.json", JSON.stringify(metrics, null, 2));
    }
}

// CLI interface
async function main() {
    const workflow = new BunTestWorkflow();
    const command = process.argv[2];

    try {
        switch (command) {
            case "full":
                await workflow.runFullSuite();
                break;
            case "quick":
                await workflow.runQuickTests();
                break;
            case "property":
                await workflow.runPropertyTests();
                break;
            case "debug":
                const pattern = process.argv[3] || "**/*.test.ts";
                await workflow.runDebugTests(pattern);
                break;
            case "performance":
                await workflow.runPerformanceTests();
                break;
            case "ci":
                await workflow.runCI();
                break;
            default:
                console.log(`
🚀 Bun 1.3 Test Workflow

Usage: bun scripts/test/bun-13-test-workflow.ts <command>

Commands:
  full        - Run complete test suite with all optimizations
  quick       - Run unit + integration tests (no property tests)
  property    - Run property tests with maximum concurrency
  debug       - Run tests in debug mode (single thread, no randomization)
  performance - Run performance benchmarks
  ci          - Run CI tests with strict settings

Examples:
  bun scripts/test/bun-13-test-workflow.ts full
  bun scripts/test/bun-13-test-workflow.ts quick
  bun scripts/test/bun-13-test-workflow.ts debug "packages/odds-core/**/*.test.ts"
        `);
        }
    } catch (error) {
        console.error("❌ Test workflow failed:", error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}
