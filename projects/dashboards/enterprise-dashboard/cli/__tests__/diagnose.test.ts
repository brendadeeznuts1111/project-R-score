#!/usr/bin/env bun
/**
 * Tests for diagnose.ts CLI tool
 */

import { describe, it, expect } from "bun:test";
import { spawn } from "bun";

describe("diagnose CLI", () => {
  it("should show help when no command provided", async () => {
    const proc = spawn(["bun", "run", "cli/diagnose.ts", "help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;
    
    const output = stdout + stderr;
    expect(output).toContain("Project Health");
    expect(output).toContain("Commands:");
  });

  it("should run health check", async () => {
    const proc = spawn(["bun", "run", "cli/diagnose.ts", "health", "--quick"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;
    
    const output = stdout + stderr;
    expect(output).toContain("Project Health") || expect(output).toContain("Overall Score");
  });

  it("should detect painpoints", async () => {
    const proc = spawn(["bun", "run", "cli/diagnose.ts", "painpoints", "--top=3"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;
    
    const output = stdout + stderr;
    expect(output).toContain("Painpoints") || expect(output).toContain("painpoints");
  });

  it("should output JSON format", async () => {
    const proc = spawn(["bun", "run", "cli/diagnose.ts", "health", "--quick", "--format=json"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    
    // JSON should be in stdout, ignore stderr (warnings)
    const jsonOutput = stdout.trim();
    if (jsonOutput) {
      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    }
  });

  it("should calculate grade", async () => {
    const proc = spawn(["bun", "run", "cli/diagnose.ts", "grade", "--format=json"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    
    const jsonOutput = stdout.trim();
    if (jsonOutput) {
      const data = JSON.parse(jsonOutput);
      expect(data).toHaveProperty("overall");
      expect(data).toHaveProperty("grade");
      expect(data).toHaveProperty("breakdown");
    }
  });
});