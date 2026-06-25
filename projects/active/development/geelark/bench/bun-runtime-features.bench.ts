#!/usr/bin/env bun

/**
 * Bun Runtime Features Performance Benchmarks
 * Comprehensive benchmarks for all Bun runtime features
 * 
 * Reference: docs/BUN_RUNTIME_FEATURES.md
 */

import { bench, describe, it, expect, beforeEach, afterEach } from "bun:test";
import { spawn, file, write, watch } from "bun";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { crypto } from "node:crypto";
import { measureNanoseconds } from "./utils";

describe("Bun Runtime Features Performance", () => {
  const testDir = join("/tmp", "bun-features-bench");
  
  beforeEach(() => {
    try {
      mkdirSync(testDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmdirSync(testDir, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("1. Process Spawning Performance", () => {
    const testScript = join(testDir, "bench-script.ts");
    
    beforeEach(() => {
      writeFileSync(testScript, "process.exit(0);");
    });

    afterEach(() => {
      if (existsSync(testScript)) {
        unlinkSync(testScript);
      }
    });

    bench("Bun.spawn() - simple command", () => {
      const proc = spawn({
        cmd: ["echo", "test"],
      });
      // Don't wait for exit to measure spawn time only
      return proc;
    }, {
      iterations: 100,
    });

    bench("Bun.spawn() - full lifecycle", async () => {
      const proc = spawn({
        cmd: ["bun", "run", testScript],
      });
      await proc.exited;
    }, {
      iterations: 50,
    });
  });

  describe("2. File I/O Performance", () => {
    bench("Bun.file() - read file", async () => {
      const testFile = join(testDir, "read-bench.txt");
      writeFileSync(testFile, "Test content".repeat(100));

      await Bun.file(testFile).text();
      unlinkSync(testFile);
    }, {
      iterations: 100,
    });

    bench("Bun.write() - write file", async () => {
      const testFile = join(testDir, "write-bench.txt");
      const content = "Test content".repeat(100);

      await Bun.write(testFile, content);
      unlinkSync(testFile);
    }, {
      iterations: 100,
    });
  });

  describe("3. Shell Template Strings Performance", () => {
    bench("Template string execution (via spawn)", async () => {
      const proc = spawn({
        cmd: ["echo", "test"],
        stdout: "pipe",
      });

      const chunks: Uint8Array[] = [];
      for await (const chunk of proc.stdout) {
        chunks.push(chunk);
      }

      await proc.exited;
    }, {
      iterations: 100,
    });

    bench("Template string with variables (via spawn)", async () => {
      const message = "test message";
      const proc = spawn({
        cmd: ["echo", message],
        stdout: "pipe",
      });

      const chunks: Uint8Array[] = [];
      for await (const chunk of proc.stdout) {
        chunks.push(chunk);
      }

      await proc.exited;
    }, {
      iterations: 100,
    });

    // Benchmark Bun.$ if available
    it("should benchmark Bun.$ if available", async () => {
      if (typeof Bun !== "undefined" && "$" in Bun && typeof (Bun as any).$ === "function") {
        const { duration } = measureNanoseconds(async () => {
          await (Bun as any).$`echo "test"`.text();
        });
        expect(duration).toBeGreaterThan(0);
      } else {
        expect(true).toBe(true); // Skip if not available
      }
    });
  });

  describe("4. File Watching Performance", () => {
    it("should measure file watch setup", async () => {
      const testFile = join(testDir, "watch-bench.txt");
      writeFileSync(testFile, "initial");

      const { duration } = measureNanoseconds(() => {
        const watcher = watch(testDir, () => {});
        watcher.close();
      });

      expect(duration).toBeLessThan(100); // Should be fast
      unlinkSync(testFile);
    });
  });

  describe("5. HTTP Server Performance", () => {
    bench("Bun.serve() - create server", () => {
      const server = Bun.serve({
        port: 0,
        fetch() {
          return new Response("OK");
        },
      });
      server.stop();
    }, {
      iterations: 100,
    });

    bench("Bun.serve() - handle request", async () => {
      const server = Bun.serve({
        port: 0,
        fetch() {
          return new Response("OK");
        },
      });

      await fetch(`http://localhost:${server.port}`);
      server.stop();
    }, {
      iterations: 50,
    });
  });

  describe("6. WebSocket Performance", () => {
    bench("WebSocket server creation", () => {
      const server = Bun.serve({
        port: 0,
        websocket: {
          message() {},
        },
        fetch() {
          return new Response("OK");
        },
      });
      server.stop();
    }, {
      iterations: 50,
    });
  });

  describe("8. Glob Patterns Performance", () => {
    beforeEach(() => {
      // Create test files
      for (let i = 0; i < 10; i++) {
        writeFileSync(join(testDir, `file${i}.ts`), `// File ${i}`);
      }
    });

    bench("Bun.glob() - find files", async () => {
      const files: string[] = [];
      for await (const file of Bun.glob("*.ts", { cwd: testDir })) {
        files.push(file);
      }
      return files.length;
    }, {
      iterations: 100,
    });
  });

  describe("12. Console Formatting Performance", () => {
    bench("Bun.inspect() - simple object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      return Bun.inspect(obj);
    }, {
      iterations: 1_000,
    });

    bench("Bun.inspect() - complex object", () => {
      const obj = {
        a: 1,
        b: { c: 2, d: { e: 3, f: [1, 2, 3] } },
        g: "string",
      };
      return Bun.inspect(obj);
    }, {
      iterations: 1_000,
    });
  });

  describe("13. Hash/Crypto Performance", () => {
    bench("crypto.createHash() - SHA256", () => {
      const hash = crypto.createHash("sha256");
      hash.update("test data");
      return hash.digest("hex");
    }, {
      iterations: 1_000,
    });

    bench("crypto.createHash() - MD5", () => {
      const hash = crypto.createHash("md5");
      hash.update("test data");
      return hash.digest("hex");
    }, {
      iterations: 1_000,
    });
  });

  describe("14. Process Info Performance", () => {
    bench("process.pid", () => {
      return process.pid;
    }, {
      iterations: 10_000,
    });

    bench("process.cwd()", () => {
      return process.cwd();
    }, {
      iterations: 1_000,
    });

    bench("process.uptime()", () => {
      return process.uptime();
    }, {
      iterations: 10_000,
    });
  });

  describe("15. Memory/Stats Performance", () => {
    bench("process.memoryUsage()", () => {
      return process.memoryUsage();
    }, {
      iterations: 10_000,
    });

    bench("process.cpuUsage()", () => {
      return process.cpuUsage();
    }, {
      iterations: 10_000,
    });
  });

  describe("16. Timeout/Abort Performance", () => {
    bench("setTimeout() call", () => {
      return setTimeout(() => {}, 0);
    }, {
      iterations: 1_000,
    });

    bench("AbortSignal creation", () => {
      return new AbortController();
    }, {
      iterations: 1_000,
    });
  });

  describe("Microbenchmarks", () => {
    it("should measure file read with nanosecond precision", async () => {
      const testFile = join(testDir, "nanosecond-test.txt");
      writeFileSync(testFile, "test");

      const { duration } = measureNanoseconds(async () => {
        await Bun.file(testFile).text();
      });

      expect(duration).toBeLessThan(10); // Should be fast
      unlinkSync(testFile);
    });

    it("should measure hash creation with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        const hash = crypto.createHash("sha256");
        hash.update("test");
        hash.digest("hex");
      });

      expect(duration).toBeLessThan(1); // Should be very fast
    });
  });
});

