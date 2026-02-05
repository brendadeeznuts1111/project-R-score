#!/usr/bin/env bun

/**
 * Process Lifecycle Performance Benchmarks
 * Testing Bun.spawn() lifecycle performance and state transitions
 * 
 * Reference: docs/PROCESS_LIFECYCLE.md
 */

import { bench, describe, it, expect, beforeEach, afterEach } from "bun:test";
import { spawn } from "bun";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { measureNanoseconds } from "./utils";

describe("Process Lifecycle Performance", () => {
  const testScriptPath = join("/tmp", "bun-bench-test.ts");
  
  beforeEach(() => {
    // Create a minimal test script
    writeFileSync(testScriptPath, "process.exit(0);\n");
  });

  afterEach(() => {
    if (existsSync(testScriptPath)) {
      try {
        unlinkSync(testScriptPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("Spawn Performance", () => {
    bench("spawn() call (INITIAL → CREATING)", () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      // Don't wait for exit to measure spawn time only
      return proc;
    }, {
      iterations: 100,
    });

    bench("spawn() and wait for exit (full lifecycle)", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      await proc.exited;
    }, {
      iterations: 50,
    });

    it("should measure spawn time with nanosecond precision", async () => {
      const { duration } = measureNanoseconds(() => {
        spawn({
          cmd: ["bun", "run", testScriptPath],
        });
      });
      // Spawn should be very fast (just creating handle)
      expect(duration).toBeLessThan(10); // Less than 10ms
    });
  });

  describe("State Transition Performance", () => {
    bench("Wait for EXITED state (proc.exited)", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      await proc.exited;
    }, {
      iterations: 50,
    });

    bench("Check exitCode property", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      await proc.exited;
      // Access exitCode after EXITED state
      const code = proc.exitCode;
      return code;
    }, {
      iterations: 50,
    });

    bench("Check pid property", () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      // PID available after STARTING state
      const pid = proc.pid;
      return pid;
    }, {
      iterations: 100,
    });

    bench("Check killed property", () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      // killed should be false during RUNNING
      const killed = proc.killed;
      return killed;
    }, {
      iterations: 100,
    });
  });

  describe("Kill Performance", () => {
    bench("kill() call (RUNNING → KILLED)", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      // Give it a moment to reach RUNNING
      await new Promise(resolve => setTimeout(resolve, 10));
      proc.kill();
      await proc.exited;
    }, {
      iterations: 50,
    });

    bench("kill(SIGKILL) call", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      proc.kill("SIGKILL");
      await proc.exited;
    }, {
      iterations: 50,
    });

    it("should measure kill() with nanosecond precision", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      await new Promise(resolve => setTimeout(resolve, 10));

      const { duration } = measureNanoseconds(() => {
        proc.kill();
      });

      // kill() should be very fast
      expect(duration).toBeLessThan(1); // Less than 1ms

      await proc.exited;
    });
  });

  describe("Stream Performance", () => {
    it("should benchmark stdout stream reading", async () => {
      const outputScript = join("/tmp", "bun-stream-bench.ts");
      writeFileSync(outputScript, `
        console.log("Output line 1");
        console.log("Output line 2");
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", outputScript],
        stdout: "pipe",
      });

      const start = Bun.nanoseconds();
      
      // Read all output during RUNNING state
      const chunks: Uint8Array[] = [];
      for await (const chunk of proc.stdout) {
        chunks.push(chunk);
      }

      const end = Bun.nanoseconds();
      const duration = (end - start) / 1_000_000; // Convert to ms

      await proc.exited;

      expect(duration).toBeGreaterThan(0);

      // Cleanup
      if (existsSync(outputScript)) {
        unlinkSync(outputScript);
      }
    });

    it("should benchmark stderr stream reading", async () => {
      const errorScript = join("/tmp", "bun-error-bench.ts");
      writeFileSync(errorScript, `
        console.error("Error line 1");
        console.error("Error line 2");
        process.exit(0);
      `);

      const proc = spawn({
        cmd: ["bun", "run", errorScript],
        stderr: "pipe",
      });

      const start = Bun.nanoseconds();
      
      const chunks: Uint8Array[] = [];
      for await (const chunk of proc.stderr) {
        chunks.push(chunk);
      }

      const end = Bun.nanoseconds();
      const duration = (end - start) / 1_000_000;

      await proc.exited;

      expect(duration).toBeGreaterThan(0);

      // Cleanup
      if (existsSync(errorScript)) {
        unlinkSync(errorScript);
      }
    });
  });

  describe("Concurrent Process Performance", () => {
    bench("spawn multiple processes concurrently", async () => {
      const procs = Array.from({ length: 10 }, () =>
        spawn({
          cmd: ["bun", "run", testScriptPath],
        })
      );

      // Wait for all to exit
      await Promise.all(procs.map(p => p.exited));
    }, {
      iterations: 10,
    });

    it("should measure concurrent spawn performance", async () => {
      const start = Bun.nanoseconds();

      const procs = Array.from({ length: 20 }, () =>
        spawn({
          cmd: ["bun", "run", testScriptPath],
        })
      );

      await Promise.all(procs.map(p => p.exited));

      const end = Bun.nanoseconds();
      const duration = (end - start) / 1_000_000;

      // Concurrent spawning should be efficient
      expect(duration).toBeLessThan(1000); // Less than 1 second for 20 processes
    });
  });

  describe("Lifecycle Overhead", () => {
    bench("Full lifecycle overhead (spawn to exit)", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScriptPath],
      });
      await proc.exited;
    }, {
      iterations: 100,
    });

    it("should measure full lifecycle with nanosecond precision", async () => {
      const { duration } = measureNanoseconds(async () => {
        const proc = spawn({
          cmd: ["bun", "run", testScriptPath],
        });
        await proc.exited;
      });

      // Full lifecycle should be fast for simple script
      expect(duration).toBeLessThan(100); // Less than 100ms
    });
  });
});

