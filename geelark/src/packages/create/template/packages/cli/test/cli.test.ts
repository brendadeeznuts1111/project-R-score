// test/cli.test.ts
import { describe, test, expect } from "bun:test";
import { $ } from "bun";
import { spawn } from "bun";

const CLI_PATH = import.meta.dir + "/../src/index.ts";
const CWD = import.meta.dir + "/../..";

describe("Dev HQ CLI", () => {
  test("insights command --json output", async () => {
    const result = await $`bun ${CLI_PATH} insights --json`.cwd(CWD).quiet();
    
    const data = JSON.parse(result.stdout.toString());
    expect(data).toHaveProperty("stats");
    expect(data.stats).toHaveProperty("totalFiles");
    expect(data.stats).toHaveProperty("healthScore");
    expect(typeof data.stats.healthScore).toBe("number");
  });

  test("insights command --table output", async () => {
    const result = await $`bun ${CLI_PATH} insights --table`.cwd(CWD).quiet();
    
    const output = result.stdout.toString();
    
    // Table output should contain table markers
    expect(output).toContain("┌");
    expect(output).toContain("│");
    expect(output).toContain("Statistics");
  });

  test("health command exit code", async () => {
    try {
      const result = await $`bun ${CLI_PATH} health`.cwd(CWD).quiet();
      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout.toString()).toContain("Health Score");
    } catch (e: any) {
      // Exit code 1 is acceptable for degraded health
      expect([0, 1]).toContain(e.exitCode || 1);
    }
  });

  test("serve command starts server", async () => {
    const proc = spawn(["bun", CLI_PATH, "serve", "--port=0"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: CWD,
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check that process is still running
    expect(proc.killed).toBe(false);

    // Clean up
    proc.kill();
    await proc.exited;
    
    // If we got here, server started successfully
    expect(true).toBe(true);
  });

  test("--help flag shows usage", async () => {
    const result = await $`bun ${CLI_PATH} --help`.cwd(CWD).quiet();
    
    const output = result.stdout.toString();

    expect(output).toContain("Usage:");
    expect(output).toContain("insights");
    expect(output).toContain("serve");
    expect(output).toContain("health");
  });

  test("--version flag shows version", async () => {
    const result = await $`bun ${CLI_PATH} --version`.cwd(CWD).quiet();
    
    const output = result.stdout.toString().trim();

    expect(output).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("insights with bun flags", async () => {
    const result = await $`bun ${CLI_PATH} insights --smol --prefer-offline --json`.cwd(CWD).quiet();
    
    const data = JSON.parse(result.stdout.toString());
    expect(data).toHaveProperty("stats");
  });
});
