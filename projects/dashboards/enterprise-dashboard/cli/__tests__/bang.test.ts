#!/usr/bin/env bun
/**
 * Tests for bang.ts CLI tool
 */

import { describe, it, expect } from "bun:test";
import { spawn } from "bun";

describe("bang CLI", () => {
  it("should show help when no command provided", async () => {
    const proc = spawn(["bun", "run", "cli/bang.ts", "help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    expect(output).toContain("Quick Actions");
    expect(output).toContain("Usage:");
  });

  it("should list all actions", async () => {
    const proc = spawn(["bun", "run", "cli/bang.ts", "list"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    expect(output).toContain("Available Quick Actions");
    expect(output).toContain("ANALYSIS");
    expect(output).toContain("DEV");
  });

  it("should list actions by category", async () => {
    const proc = spawn(["bun", "run", "cli/bang.ts", "list", "dev"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    expect(output).toContain("DEV");
    expect(output).toContain("dev");
  });

  it("should execute health action via alias", async () => {
    const proc = spawn(["bun", "run", "cli/bang.ts", "h"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    // Should execute health command
    expect(output).toContain("health");
  });
});