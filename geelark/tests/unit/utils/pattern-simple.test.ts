#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("🎯 Perfect Flag Separation Pattern - Simple Tests", () => {
  test("bun flags + cli flags - pattern verification", async () => {
    const { stdout } = await Bun.spawn(
      ["bun", "--smol", "dev-hq-cli.ts", "insights", "--table"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(stdout).text();

    // Bun processes --smol flag, CLI only sees remaining args
    expect(output).toContain("🟡 Bun flags: []"); // Bun handled --smol already
    expect(output).toContain("🟢 CLI flags: [--table]");
    expect(output).toContain("🔵 Command: insights");
    expect(output).toContain("Dev HQ");
  });

  test("multiple cli flags only", async () => {
    const { stdout } = await Bun.spawn(
      ["bun", "dev-hq-cli.ts", "git", "--json", "--verbose"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(stdout).text();

    expect(output).toContain("🟡 Bun flags: []");
    expect(output).toContain("🟢 CLI flags: [--json, --verbose]");
    expect(output).toContain("🔵 Command: git");
    expect(output).toContain("{"); // JSON output
  });

  test("cli flags with values", async () => {
    const { stdout } = await Bun.spawn(
      ["bun", "dev-hq-cli.ts", "test", "--timeout", "5000"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(stdout).text();

    expect(output).toContain("🟡 Bun flags: []");
    expect(output).toContain("🟢 CLI flags: [--timeout, 5000]");
    expect(output).toContain("🔵 Command: test");
  });

  test("no flags - command only", async () => {
    const { stdout } = await Bun.spawn(["bun", "dev-hq-cli.ts", "health"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(stdout).text();

    expect(output).toContain("🟡 Bun flags: []");
    expect(output).toContain("🟢 CLI flags: []");
    expect(output).toContain("🔵 Command: health");
  });

  test("help shows pattern documentation", async () => {
    const { stdout } = await Bun.spawn(["bun", "dev-hq-cli.ts"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(stdout).text();

    expect(output).toContain(
      "Pattern: bun [bun-flags] dev-hq [command] [cli-flags]"
    );
    expect(output).toContain("Bun Flags (handled by Bun):");
    expect(output).toContain("CLI Flags (handled by CLI):");
    expect(output).toContain(
      "Perfect separation: Bun handles runtime, CLI handles formatting!"
    );
  });

  test("output formatting - table", async () => {
    const { stdout } = await Bun.spawn(
      ["bun", "dev-hq-cli.ts", "insights", "--table"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(stdout).text();

    expect(output).toContain("🟢 CLI flags: [--table]");
    expect(output).toContain("📊 Gathering Dev HQ insights");
  });

  test("output formatting - json", async () => {
    const { stdout } = await Bun.spawn(
      ["bun", "dev-hq-cli.ts", "insights", "--json"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(stdout).text();

    expect(output).toContain("🟢 CLI flags: [--json]");
    expect(output).toContain("{"); // JSON output
    expect(output).toContain("}"); // JSON output
  });

  test("complex command with args", async () => {
    const { stdout } = await Bun.spawn(
      ["bun", "dev-hq-cli.ts", "run", "echo", "hello", "--verbose"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(stdout).text();

    expect(output).toContain("🟡 Bun flags: []");
    expect(output).toContain("🟢 CLI flags: [echo, hello, --verbose]");
    expect(output).toContain("🔵 Command: run");
  });
});
