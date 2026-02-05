/**
 * src/testing/pty-test-runner.ts
 * PTY Test Runner for CI/CD
 * - Test interactive skills automatically
 * - Pattern matching for expected output
 * - Timeout handling
 * - Generate expect-like scripts
 * - Mock TTY for headless environments
 */

// =============================================================================
// Types
// =============================================================================

export interface TestCase {
  name: string;
  input?: string; // Initial input/command
  send?: string; // Text to send to terminal
  expect: string | RegExp; // Expected output pattern
  timeout?: number; // Timeout in ms (default: 5000)
  delay?: number; // Delay before sending input (default: 100)
}

export interface TestCaseResult {
  name: string;
  success: boolean;
  duration: number;
  error: string | null;
  output?: string;
}

export interface TestResult {
  skillId: string;
  tests: TestCaseResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

export interface ExpectInteraction {
  send: string;
  expect: string;
}

// =============================================================================
// PTYTestRunner Class
// =============================================================================

export class PTYTestRunner {
  private static readonly DEFAULT_TIMEOUT = 5000;
  private static readonly DEFAULT_DELAY = 100;

  /**
   * Run a suite of interactive tests against a skill
   */
  static async testInteractiveSkill(
    skillId: string,
    testCases: TestCase[]
  ): Promise<TestResult> {
    const startTime = performance.now();
    const results: TestCaseResult[] = [];

    console.log(`\nRunning ${testCases.length} tests for skill: ${skillId}\n`);

    for (const testCase of testCases) {
      const testStart = performance.now();

      try {
        const output = await this.runInteractiveTest(skillId, testCase);

        results.push({
          name: testCase.name,
          success: true,
          duration: performance.now() - testStart,
          error: null,
          output,
        });

        console.log(`  \x1b[32m✓\x1b[0m ${testCase.name}`);
      } catch (error: any) {
        results.push({
          name: testCase.name,
          success: false,
          duration: performance.now() - testStart,
          error: error.message,
          output: error.output,
        });

        console.log(`  \x1b[31m✗\x1b[0m ${testCase.name}`);
        console.log(`    Error: ${error.message}`);
      }
    }

    const summary = this.calculateSummary(results, performance.now() - startTime);

    console.log(`\n${"─".repeat(60)}`);
    console.log(
      `Tests: ${summary.passed}/${summary.total} passed (${((summary.passed / summary.total) * 100).toFixed(0)}%)`
    );
    console.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`);

    return {
      skillId,
      tests: results,
      summary,
    };
  }

  /**
   * Run a single interactive test
   */
  private static async runInteractiveTest(
    skillId: string,
    testCase: TestCase
  ): Promise<string> {
    const timeout = testCase.timeout || this.DEFAULT_TIMEOUT;
    const delay = testCase.delay || this.DEFAULT_DELAY;

    let outputBuffer = "";
    let resolved = false;

    return new Promise((resolve, reject) => {
      // Create terminal
      const terminal = {
        cols: 80,
        rows: 24,
        data(term: any, data: Uint8Array) {
          outputBuffer += new TextDecoder().decode(data);

          // Check if expected pattern is found
          if (!resolved) {
            const matches =
              typeof testCase.expect === "string"
                ? outputBuffer.includes(testCase.expect)
                : testCase.expect.test(outputBuffer);

            if (matches) {
              resolved = true;
              cleanup();
              resolve(outputBuffer);
            }
          }
        },
      };

      const skillDir = `./skills/${skillId}`;
      const args = testCase.input ? testCase.input.split(" ") : [];

      // Spawn the skill process
      const proc = Bun.spawn(["bun", "run", "src/index.ts", ...args], {
        terminal,
        cwd: skillDir,
        env: {
          ...process.env,
          CI: "true",
          FORCE_COLOR: "0",
          TERM: "dumb",
        },
      });

      // Cleanup function
      const cleanup = () => {
        try {
          proc.kill();
          (proc as any).terminal?.close?.();
        } catch {
          // Ignore cleanup errors
        }
      };

      // Send input after delay
      if (testCase.send) {
        setTimeout(() => {
          if (!resolved) {
            (proc as any).terminal?.write?.(testCase.send + "\n");
          }
        }, delay);
      }

      // Timeout handler
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();

          const error = new Error(
            `Timeout (${timeout}ms) waiting for: ${testCase.expect.toString()}`
          ) as any;
          error.output = outputBuffer;
          reject(error);
        }
      }, timeout);

      // Process exit handler
      proc.exited.then((exitCode) => {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;

          // Check one more time
          const matches =
            typeof testCase.expect === "string"
              ? outputBuffer.includes(testCase.expect)
              : testCase.expect.test(outputBuffer);

          if (matches) {
            resolve(outputBuffer);
          } else {
            const error = new Error(
              `Process exited (code ${exitCode}) without matching: ${testCase.expect.toString()}`
            ) as any;
            error.output = outputBuffer;
            reject(error);
          }
        }
      });
    });
  }

  /**
   * Calculate test summary
   */
  private static calculateSummary(
    results: TestCaseResult[],
    totalDuration: number
  ): TestResult["summary"] {
    const passed = results.filter((r) => r.success).length;
    return {
      total: results.length,
      passed,
      failed: results.length - passed,
      duration: totalDuration,
    };
  }

  /**
   * Generate an expect-style script for CI systems
   */
  static generateExpectScript(
    skillId: string,
    interactions: ExpectInteraction[]
  ): string {
    const lines = [
      "#!/usr/bin/env expect",
      "# Auto-generated expect script for skill: " + skillId,
      "# Generated: " + new Date().toISOString(),
      "",
      "set timeout 10",
      `spawn bun run ./skills/${skillId}/src/index.ts`,
      "",
    ];

    for (const interaction of interactions) {
      lines.push(`expect "${this.escapeExpect(interaction.expect)}"`);
      lines.push(`send "${this.escapeExpect(interaction.send)}\\r"`);
      lines.push("");
    }

    lines.push("expect eof");
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Escape special characters for expect script
   */
  private static escapeExpect(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
  }

  /**
   * Generate a bash script with heredoc for CI
   */
  static generateBashTestScript(
    skillId: string,
    interactions: ExpectInteraction[]
  ): string {
    const inputLines = interactions.map((i) => i.send).join("\n");

    return `#!/bin/bash
# Auto-generated test script for skill: ${skillId}
# Generated: ${new Date().toISOString()}

set -e

# Run skill with input
output=$(cat <<'INPUT' | bun run ./skills/${skillId}/src/index.ts
${inputLines}
INPUT
)

# Verify expected outputs
${interactions
  .map(
    (i, idx) => `
if ! echo "$output" | grep -q "${i.expect}"; then
  echo "Test ${idx + 1} failed: Expected '${i.expect}'"
  exit 1
fi
echo "Test ${idx + 1} passed: Found '${i.expect}'"
`
  )
  .join("")}

echo "All tests passed!"
`;
  }

  /**
   * Create a mock TTY for headless CI environments
   */
  static createMockTTY(): {
    stdin: { write: (data: string) => void; end: () => void };
    stdout: { on: (event: string, cb: (data: Buffer) => void) => void };
    isTTY: true;
    columns: number;
    rows: number;
  } {
    const listeners: Array<(data: Buffer) => void> = [];
    let inputQueue: string[] = [];

    return {
      stdin: {
        write: (data: string) => {
          inputQueue.push(data);
        },
        end: () => {
          inputQueue = [];
        },
      },
      stdout: {
        on: (event: string, cb: (data: Buffer) => void) => {
          if (event === "data") {
            listeners.push(cb);
          }
        },
      },
      isTTY: true,
      columns: 80,
      rows: 24,
    };
  }

  /**
   * Run tests from a test file
   */
  static async runTestFile(testFilePath: string): Promise<TestResult[]> {
    const content = await Bun.file(testFilePath).text();
    const testConfig = JSON.parse(content);

    const results: TestResult[] = [];

    for (const [skillId, tests] of Object.entries(testConfig) as [
      string,
      TestCase[]
    ][]) {
      const result = await this.testInteractiveSkill(skillId, tests);
      results.push(result);
    }

    return results;
  }

  /**
   * Create a test file template
   */
  static generateTestTemplate(skillId: string): string {
    const template = {
      [skillId]: [
        {
          name: "Basic execution",
          input: "",
          expect: "Usage:",
          timeout: 5000,
        },
        {
          name: "Help command",
          input: "--help",
          expect: "Options:",
          timeout: 5000,
        },
        {
          name: "Interactive prompt",
          input: "",
          send: "test input",
          expect: "Enter",
          timeout: 10000,
          delay: 500,
        },
      ],
    };

    return JSON.stringify(template, null, 2);
  }

  /**
   * Assert helper for test results
   */
  static assertPassed(result: TestResult): void {
    if (result.summary.failed > 0) {
      const failures = result.tests
        .filter((t) => !t.success)
        .map((t) => `  - ${t.name}: ${t.error}`)
        .join("\n");

      throw new Error(
        `${result.summary.failed}/${result.summary.total} tests failed:\n${failures}`
      );
    }
  }
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Quick test assertion
 */
export function expectOutput(
  output: string,
  pattern: string | RegExp
): boolean {
  if (typeof pattern === "string") {
    return output.includes(pattern);
  }
  return pattern.test(output);
}

/**
 * Create test case helper
 */
export function createTestCase(
  name: string,
  expect: string | RegExp,
  options: Partial<TestCase> = {}
): TestCase {
  return {
    name,
    expect,
    timeout: 5000,
    delay: 100,
    ...options,
  };
}

export default PTYTestRunner;
