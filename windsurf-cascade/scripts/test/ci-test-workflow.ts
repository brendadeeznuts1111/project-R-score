#!/usr/bin/env bun
// scripts/test/ci-test-workflow.ts
// CI testing workflow with randomization and reproducible seeds

import { spawn } from "bun";

interface CIConfig {
    randomize: boolean;
    timeout: number;
    maxConcurrency: number;
    coverage: boolean;
}

class CITestWorkflow {
    private config: CIConfig = {
        randomize: true,
        timeout: 10000,
        maxConcurrency: 10, // Conservative for CI
        coverage: true
    };

    async runCITests(): Promise<{ seed: number; exitCode: number; duration: number }> {
        console.log("🔄 Running CI tests with randomization...\n");

        // Generate random seed for this run
        const seed = Math.floor(Math.random() * 1000000);
        console.log(`🎲 Using random seed: ${seed}`);

        const startTime = Date.now();

        try {
            // Run tests with randomization and seed
            await this.runTests("packages/*/src/**/*.test.ts", seed);

            const duration = Date.now() - startTime;

            console.log(`\n✅ CI tests completed successfully!`);
            console.log(`⏱️ Duration: ${duration}ms`);
            console.log(`🎲 Seed: ${seed} (use for reproduction)`);

            return { seed, exitCode: 0, duration };
        } catch (error) {
            const duration = Date.now() - startTime;

            console.log(`\n❌ CI tests failed!`);
            console.log(`⏱️ Duration: ${duration}ms`);
            console.log(`🎲 Seed: ${seed} (use for reproduction)`);
            console.log(`🔍 To reproduce locally: bun test --seed ${seed}`);

            return { seed, exitCode: 1, duration };
        }
    }

    async reproduceCIFailure(seed: number): Promise<void> {
        console.log(`🔍 Reproducing CI failure with seed: ${seed}\n`);

        try {
            await this.runTests("packages/*/src/**/*.test.ts", seed);
            console.log("✅ Tests passed with seed - issue may be environment-specific");
        } catch (error) {
            console.log("❌ Tests failed with seed - successfully reproduced CI issue");
            throw error;
        }
    }

    private async runTests(pattern: string, seed: number): Promise<void> {
        const args = [
            "test",
            pattern,
            "--randomize",
            `--seed=${seed}`,
            `--timeout=${this.config.timeout}`,
            `--max-concurrency=${this.config.maxConcurrency}`,
            "--coverage"
        ];

        console.log(`Running: bun ${args.join(" ")}`);

        const proc = spawn({
            cmd: ["bun", ...args],
            stdout: "inherit",
            stderr: "inherit",
            env: {
                ...process.env,
                CI: "true", // Enable CI-specific behaviors
                NODE_ENV: "test"
            }
        });

        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            throw new Error(`CI tests failed with exit code: ${exitCode}`);
        }
    }
}

// CLI interface
async function main() {
    const workflow = new CITestWorkflow();
    const command = process.argv[2];
    const seedArg = process.argv[3];

    try {
        switch (command) {
            case "run":
                const result = await workflow.runCITests();
                process.exit(result.exitCode);

            case "reproduce":
                if (!seedArg) {
                    console.error("❌ Seed required for reproduction");
                    console.log("Usage: bun scripts/test/ci-test-workflow.ts reproduce <seed>");
                    process.exit(1);
                }
                await workflow.reproduceCIFailure(parseInt(seedArg));
                break;

            default:
                console.log(`
🔄 CI Test Workflow

Usage: bun scripts/test/ci-test-workflow.ts <command> [seed]

Commands:
  run        - Run CI tests with random seed
  reproduce  - Reproduce CI failure with specific seed

Examples:
  bun scripts/test/ci-test-workflow.ts run
  bun scripts/test/ci-test-workflow.ts reproduce 98765

CI Integration:
  # In .github/workflows/test.yml
  - name: Run tests with randomization
    run: bun scripts/test/ci-test-workflow.ts run
  
  # Reproduce failures locally
  bun scripts/test/ci-test-workflow.ts reproduce $SEED
        `);
        }
    } catch (error) {
        console.error("❌ CI workflow failed:", error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}
