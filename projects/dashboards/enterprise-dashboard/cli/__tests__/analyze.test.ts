#!/usr/bin/env bun
/**
 * Tests for analyze.ts CLI tool
 */

import { describe, it, expect } from "bun:test";
import { spawn } from "bun";

describe("analyze CLI", () => {
  it("should show help when no command provided", async () => {
    const proc = spawn(["bun", "run", "cli/analyze.ts", "help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    expect(output).toContain("Code Analysis");
    expect(output).toContain("Commands:");
  });

  it("should scan files", async () => {
    const proc = spawn(["bun", "run", "cli/analyze.ts", "scan", "src/", "--depth=1"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    expect(output).toContain("Code Structure Analysis");
  });

  it("should extract types", async () => {
    const proc = spawn(["bun", "run", "cli/analyze.ts", "types", "src/server/kyc", "--exported-only"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    expect(output).toContain("Type Extraction");
  });

  it("should output JSON format", async () => {
    const proc = spawn(["bun", "run", "cli/analyze.ts", "types", "src/server/kyc", "--format=json"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    expect(() => JSON.parse(output)).not.toThrow();
  });
});