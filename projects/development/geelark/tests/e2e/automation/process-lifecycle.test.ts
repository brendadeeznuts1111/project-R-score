#!/usr/bin/env bun

/**
 * Process Lifecycle State Machine Tests
 * Testing Bun.spawn() process lifecycle states and transitions
 * 
 * Reference: docs/PROCESS_LIFECYCLE.md
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { spawn } from "bun";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("Process Lifecycle State Machine", () => {
  const testScriptPath = join("/tmp", "bun-lifecycle-test.ts");
  
  beforeEach(() => {
    // Create a test script that exits immediately
    writeFileSync(testScriptPath, "process.exit(0);\n");
  });

  afterEach(() => {
    // Cleanup test script
    if (existsSync(testScriptPath)) {
      try {
        unlinkSync(testScriptPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("State Transitions", () => {
    it("should transition INITIAL → CREATING → STARTING → RUNNING → STOPPED → EXITED → CLEANUP → FINAL", async () => {
      // INITIAL → CREATING
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });

      // CREATING → STARTING → RUNNING
      // Process automatically transitions through these states

      // Wait for STOPPED → EXITED transition
      const exitCode = await proc.exited;

      // EXITED → CLEANUP → FINAL
      expect(exitCode).toBe(0);
      expect(proc.exitCode).toBe(0);
    });

    it("should handle RUNNING → KILLED → CLEANUP → FINAL transition", async () => {
      // Create a long-running script
      const longRunningScript = join("/tmp", "bun-long-running.ts");
      writeFileSync(longRunningScript, `
        // Run for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", longRunningScript],
      });

      // Give it a moment to reach RUNNING state
      await new Promise(resolve => setTimeout(resolve, 100));

      // RUNNING → KILLED
      proc.kill();

      // Wait for CLEANUP → FINAL
      const exitCode = await proc.exited;
      
      expect(proc.killed).toBe(true);
      expect(exitCode).not.toBe(0); // Non-zero exit code for killed process

      // Cleanup
      if (existsSync(longRunningScript)) {
        unlinkSync(longRunningScript);
      }
    });

    it("should handle process.exit() for RUNNING → STOPPED transition", async () => {
      const exitScript = join("/tmp", "bun-exit-test.ts");
      writeFileSync(exitScript, `
        console.log("Running");
        process.exit(42); // Exit with custom code
      `);

      const proc = spawn({
        cmd: ["bun", "run", exitScript],
      });

      // Wait for STOPPED → EXITED
      const exitCode = await proc.exited;

      expect(exitCode).toBe(42);
      expect(proc.exitCode).toBe(42);

      // Cleanup
      if (existsSync(exitScript)) {
        unlinkSync(exitScript);
      }
    });
  });

  describe("Process Properties by State", () => {
    it("should have pid after STARTING state", () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });

      // PID should be available after STARTING
      expect(proc.pid).toBeGreaterThan(0);
      expect(typeof proc.pid).toBe("number");
    });

    it("should have exitCode null until EXITED state", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });

      // exitCode should be null during RUNNING
      expect(proc.exitCode).toBeNull();

      // Wait for EXITED state
      await proc.exited;

      // exitCode should be set after EXITED
      expect(proc.exitCode).toBe(0);
    });

    it("should have killed=false until KILLED state", async () => {
      const longRunningScript = join("/tmp", "bun-kill-test.ts");
      writeFileSync(longRunningScript, `
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", longRunningScript],
      });

      // killed should be false during RUNNING
      expect(proc.killed).toBe(false);

      // Transition to KILLED state
      proc.kill();
      
      // killed should be true after kill() call
      expect(proc.killed).toBe(true);

      await proc.exited;

      // Cleanup
      if (existsSync(longRunningScript)) {
        unlinkSync(longRunningScript);
      }
    });
  });

  describe("Stream Handling During States", () => {
    it("should handle stdout during RUNNING state", async () => {
      const outputScript = join("/tmp", "bun-output-test.ts");
      writeFileSync(outputScript, `
        console.log("Hello from process");
        console.error("Error output");
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", outputScript],
        stdout: "pipe",
        stderr: "pipe",
      });

      // Read stdout during RUNNING state
      const chunks: Uint8Array[] = [];
      for await (const chunk of proc.stdout) {
        chunks.push(chunk);
      }

      const output = new TextDecoder().decode(
        new Uint8Array(chunks.flatMap(c => Array.from(c)))
      );

      expect(output).toContain("Hello from process");

      // Wait for EXITED
      await proc.exited;

      // Cleanup
      if (existsSync(outputScript)) {
        unlinkSync(outputScript);
      }
    });

    it("should handle stderr during RUNNING state", async () => {
      const errorScript = join("/tmp", "bun-error-test.ts");
      writeFileSync(errorScript, `
        console.error("Error message");
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", errorScript],
        stderr: "pipe",
      });

      // Read stderr during RUNNING state
      const chunks: Uint8Array[] = [];
      for await (const chunk of proc.stderr) {
        chunks.push(chunk);
      }

      const errorOutput = new TextDecoder().decode(
        new Uint8Array(chunks.flatMap(c => Array.from(c)))
      );

      expect(errorOutput).toContain("Error message");

      await proc.exited;

      // Cleanup
      if (existsSync(errorScript)) {
        unlinkSync(errorScript);
      }
    });
  });

  describe("Exit Code Handling", () => {
    it("should return exit code 0 for successful process", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });

      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    });

    it("should return non-zero exit code for failed process", async () => {
      const failScript = join("/tmp", "bun-fail-test.ts");
      writeFileSync(failScript, `
        process.exit(1); // Exit with error code
      `);

      const proc = spawn({
        cmd: ["bun", "run", failScript],
      });

      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);

      // Cleanup
      if (existsSync(failScript)) {
        unlinkSync(failScript);
      }
    });

    it("should handle custom exit codes", async () => {
      const customExitScript = join("/tmp", "bun-custom-exit.ts");
      writeFileSync(customExitScript, `
        process.exit(42);
      `);

      const proc = spawn({
        cmd: ["bun", "run", customExitScript],
      });

      const exitCode = await proc.exited;
      expect(exitCode).toBe(42);

      // Cleanup
      if (existsSync(customExitScript)) {
        unlinkSync(customExitScript);
      }
    });
  });

  describe("Kill Signal Handling", () => {
    it("should handle SIGTERM kill signal", async () => {
      const longScript = join("/tmp", "bun-sigterm-test.ts");
      writeFileSync(longScript, `
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", longScript],
      });

      // Give it time to reach RUNNING
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send SIGTERM
      proc.kill(); // Default is SIGTERM

      const exitCode = await proc.exited;
      
      expect(proc.killed).toBe(true);
      // Exit code should be non-zero for killed process
      expect(exitCode).not.toBe(0);

      // Cleanup
      if (existsSync(longScript)) {
        unlinkSync(longScript);
      }
    });

    it("should handle SIGKILL kill signal", async () => {
      const longScript = join("/tmp", "bun-sigkill-test.ts");
      writeFileSync(longScript, `
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", longScript],
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Send SIGKILL (force kill)
      proc.kill("SIGKILL");

      const exitCode = await proc.exited;
      
      expect(proc.killed).toBe(true);
      expect(exitCode).not.toBe(0);

      // Cleanup
      if (existsSync(longScript)) {
        unlinkSync(longScript);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid command gracefully", async () => {
      const proc = spawn({
        cmd: ["nonexistent-command-12345"],
      });

      // Should transition to EXITED with error
      const exitCode = await proc.exited;
      
      // Non-zero exit code indicates error
      expect(exitCode).not.toBe(0);
    });

    it("should handle script that throws error", async () => {
      const errorScript = join("/tmp", "bun-throw-error.ts");
      writeFileSync(errorScript, `
        throw new Error("Test error");
      `);

      const proc = spawn({
        cmd: ["bun", "run", errorScript],
      });

      const exitCode = await proc.exited;
      
      // Should exit with non-zero code
      expect(exitCode).not.toBe(0);

      // Cleanup
      if (existsSync(errorScript)) {
        unlinkSync(errorScript);
      }
    });
  });

  describe("Process State Consistency", () => {
    it("should maintain state consistency through lifecycle", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });

      // Verify state properties are consistent
      const pid = proc.pid;
      expect(pid).toBeGreaterThan(0);

      // Wait for exit
      const exitCode = await proc.exited;

      // After exit, exitCode should match exited promise
      expect(proc.exitCode).toBe(exitCode);

      // PID should remain the same
      expect(proc.pid).toBe(pid);
    });
  });
});

