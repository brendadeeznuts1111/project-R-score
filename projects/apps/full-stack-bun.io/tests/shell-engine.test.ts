import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import ShellExecutionEngine from "../src/entry-point/cli/shell-engine.bun.ts";

describe("ShellExecutionEngine", () => {
  let shellEngine: ShellExecutionEngine;

  beforeAll(() => {
    shellEngine = new ShellExecutionEngine();
  });

  test("should execute simple shell script", async () => {
    const script = `#!/usr/bin/env bun
echo "Hello World"
echo "Test completed"`;

    const result = await shellEngine.executeScript(script, "test.sh");

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Hello World");
    expect(result.stdout).toContain("Test completed");
    expect(result.duration).toBeGreaterThan(0);
  });

  test("should handle script errors gracefully", async () => {
    const script = `#!/usr/bin/env bun
echo "This will fail"
exit 1`;

    const result = await shellEngine.executeScript(script, "fail.sh");

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("This will fail");
  });

  test("should detect security vulnerabilities", async () => {
    const dangerousScript = `#!/usr/bin/env bun
eval("malicious code")
rm -rf /`;

    const securityResult = await (shellEngine as any).scanScriptSecurity(dangerousScript, "danger.sh");

    expect(securityResult.safe).toBe(false);
    expect(securityResult.vulnerabilities.length).toBeGreaterThan(0);
    expect(["critical", "high"].includes(securityResult.vulnerabilities[0].severity)).toBe(true);
  });

  test("should execute direct commands", async () => {
    const result = await shellEngine.executeCommand("echo", ["test command"]);

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("test command");
  });

  test("should list available commands", async () => {
    const commands = await shellEngine.listAvailableCommands();

    expect(Array.isArray(commands)).toBe(true);
    expect(commands).toContain("bun");
  });

  test("should respect timeout", async () => {
    const slowScript = `#!/usr/bin/env bun
echo "Starting sleep"
sleep 5
echo "This should not execute"`;

    const result = await shellEngine.executeScript(slowScript, "slow.sh", { timeout: 1000 });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(143);  // SIGTERM (128 + 15) when process is killed
  }, 10000);
});
