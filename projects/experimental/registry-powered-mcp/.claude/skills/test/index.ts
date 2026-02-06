/**
 * /test - Run test suites using Bun's native test runner
 *
 * Usage:
 *   /test                    - Run all tests
 *   /test unit               - Run unit tests only
 *   /test integration        - Run integration tests only
 *   /test performance        - Run performance tests only
 *   /test regression         - Run regression tests only
 *   /test redis              - Run tests matching "redis" in filename
 *   /test -t <pattern>       - Filter tests by name pattern
 *   /test --grep <pattern>   - Filter tests by name (alias for -t)
 *   /test --grep-invert <p>  - Exclude tests matching pattern
 *   /test --tag <tag>        - Run tests with specific tag
 *   /test --coverage         - Run with coverage
 *   /test --watch            - Watch mode
 *   /test --bail             - Stop on first failure
 *   /test --bail=10          - Stop after 10 failures
 *   /test --quiet            - Minimal output (sets CLAUDECODE=1)
 *   /test --timeout <ms>     - Per-test timeout (default: 5000ms)
 *
 * Examples:
 *   /test redis                      - Tests with "redis" in filename
 *   /test --grep "Redis Client"      - Tests matching name pattern
 *   /test unit --grep-invert "slow"  - Unit tests excluding "slow"
 *   /test --tag fast                 - Only tests tagged "fast"
 *   /test --tag redis --tag critical - Tests with both tags
 *   /test performance --quiet        - Perf tests with minimal output
 *   /test --watch --grep "auth"      - Watch mode for auth tests
 *
 * @see https://bun.com/docs/test
 */

export default async function test(args?: string) {
  const parts = args?.trim().split(/\s+/) || [];

  // Base command
  const command: string[] = ["bun", "test"];

  // Environment variables
  const env: Record<string, string> = { ...process.env };

  // Parse arguments
  let testPath = "test/";
  const flags: string[] = [];
  let hasExplicitPath = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (!part) continue;

    // Known test directories
    if (["unit", "integration", "performance", "regression", "e2e"].includes(part)) {
      testPath = `test/${part}`;
      hasExplicitPath = true;
    }
    // Quiet mode - set CLAUDECODE=1 for AI-friendly output
    else if (part === "--quiet" || part === "-q") {
      env.CLAUDECODE = "1";
    }
    // Bun test flags
    else if (part.startsWith("--") || part.startsWith("-")) {
      flags.push(part);
      // Check for flags that need a value (but not --bail=N which is combined)
      if (["-t", "--grep", "--grep-invert", "--tag", "--timeout", "--preload", "--test-name-pattern"].includes(part) && parts[i + 1] && !parts[i + 1].startsWith("-")) {
        flags.push(parts[++i]);
      }
    }
    // Could be a file path, directory, or pattern
    else if (part.includes("/") || part.endsWith(".ts") || part.endsWith(".test.ts")) {
      testPath = part;
      hasExplicitPath = true;
    }
    // Treat as filename filter (bun test <pattern> matches filenames)
    else {
      // Pass as positional arg to bun test for filename matching
      testPath = part;
      hasExplicitPath = true;
    }
  }

  command.push(...flags, testPath);

  console.log(`\n🧪 Running: ${command.join(" ")}\n`);

  const proc = Bun.spawn(command, {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
    env,
  });

  await proc.exited;
  return proc.exitCode === 0;
}
