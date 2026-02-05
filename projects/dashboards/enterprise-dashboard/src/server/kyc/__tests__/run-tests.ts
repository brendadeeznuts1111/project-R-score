#!/usr/bin/env bun
/**
 * KYC Test Runner
 * Convenience script for running KYC tests with various options
 */

import { spawn } from "bun";

const args = process.argv.slice(2);
const testDir = "src/server/kyc/__tests__";

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  file?: string;
  pattern?: string;
  verbose?: boolean;
}

function parseArgs(): TestOptions {
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--watch":
      case "-w":
        options.watch = true;
        break;
      case "--coverage":
      case "-c":
        options.coverage = true;
        break;
      case "--file":
      case "-f":
        options.file = args[++i];
        break;
      case "--pattern":
      case "-p":
        options.pattern = args[++i];
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
KYC Test Runner

Usage: bun run src/server/kyc/__tests__/run-tests.ts [options]

Options:
  --watch, -w          Run tests in watch mode
  --coverage, -c       Generate coverage report
  --file, -f <file>    Run specific test file
  --pattern, -p <pat>  Run tests matching pattern
  --verbose, -v        Verbose output
  --help, -h           Show this help message

Examples:
  bun run src/server/kyc/__tests__/run-tests.ts
  bun run src/server/kyc/__tests__/run-tests.ts --watch
  bun run src/server/kyc/__tests__/run-tests.ts --coverage
  bun run src/server/kyc/__tests__/run-tests.ts --file failsafeEngine.test.ts
  bun run src/server/kyc/__tests__/run-tests.ts --pattern "encryption"
`);
}

function buildTestCommand(options: TestOptions): string[] {
  const cmd = ["bun", "test"];

  if (options.watch) {
    cmd.push("--watch");
  }

  if (options.coverage) {
    cmd.push("--coverage");
  }

  if (options.file) {
    cmd.push(`${testDir}/${options.file}`);
  } else if (options.pattern) {
    cmd.push(testDir);
    cmd.push("--test-name-pattern", options.pattern);
  } else {
    cmd.push(testDir);
  }

  return cmd;
}

async function runTests() {
  const options = parseArgs();
  const cmd = buildTestCommand(options);

  console.log(`🧪 Running KYC tests...\n`);
  console.log(`Command: ${cmd.join(" ")}\n`);

  const proc = spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log(`\n✅ All tests passed!`);
  } else {
    console.log(`\n❌ Tests failed with exit code ${exitCode}`);
    process.exit(exitCode);
  }
}

runTests().catch((error) => {
  console.error("Error running tests:", error);
  process.exit(1);
});
