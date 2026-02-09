#!/usr/bin/env bun
/**
 * Unified Shell Bridge Benchmark Suite
 * 
 * Comprehensive benchmarks for:
 * - Signal handling performance
 * - Command execution throughput
 * - Memory usage
 * - Startup/shutdown times
 * - Bun-native vs Node.js patterns
 * 
 * @bun >= 1.3.0
 */

import { run, bench, group } from "mitata";
import { $ } from "bun";

// ============================================================================
// Benchmark Configuration
// ============================================================================

const CONFIG = {
  warmup: 100,
  iterations: 1000,
  signalIterations: 100,
};

// ============================================================================
// Signal Handling Benchmarks
// ============================================================================

group("Signal Handling", () => {
  bench("register SIGINT handler", async () => {
    const handler = () => {};
    process.on("SIGINT", handler);
    process.removeListener("SIGINT", handler);
  });

  bench("check listener count", () => {
    process.listenerCount("SIGINT");
  });

  bench("emit signal to self (process.kill)", async () => {
    // Note: This is a simulation - actual signal handling benchmarked separately
    const start = performance.now();
    process.emit("SIGINT");
    return performance.now() - start;
  });
});

// ============================================================================
// Command Execution Benchmarks
// ============================================================================

group("Command Execution", () => {
  bench("simple echo command", async () => {
    const result = await $`echo hello`.nothrow();
    return result.exitCode;
  });

  bench("command with env var", async () => {
    const result = await $`echo $TEST_VAR`
      .env({ TEST_VAR: "test" })
      .nothrow();
    return result.exitCode;
  });

  bench("command with cwd", async () => {
    const result = await $`pwd`
      .cwd("/tmp")
      .nothrow();
    return result.exitCode;
  });

  bench("command with output capture", async () => {
    const result = await $`echo hello world`.nothrow();
    return result.stdout.toString().length;
  });

  bench("sequential commands", async () => {
    for (let i = 0; i < 10; i++) {
      await $`echo ${i}`.nothrow();
    }
  });

  bench("concurrent commands (10)", async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push($`echo ${i}`.nothrow());
    }
    await Promise.all(promises);
  });
});

// ============================================================================
// Bun-specific Benchmarks
// ============================================================================

group("Bun Native APIs", () => {
  bench("Bun.sleep (1ms)", async () => {
    await Bun.sleep(1);
  });

  bench("setTimeout (1ms)", async () => {
    return new Promise(resolve => setTimeout(resolve, 1));
  });

  bench("Bun.spawn (simple)", async () => {
    const proc = Bun.spawn(["echo", "hello"], {
      stdout: "pipe",
    });
    await proc.exited;
  });

  bench("$ template literal", async () => {
    await $`echo hello`.nothrow();
  });

  bench("Bun.file read", async () => {
    const file = Bun.file(import.meta.path);
    await file.text();
  });

  bench("JSON parse/stringify", () => {
    const data = { test: "data", number: 123, bool: true };
    const str = JSON.stringify(data);
    JSON.parse(str);
  });
});

// ============================================================================
// Memory & Resource Benchmarks
// ============================================================================

group("Memory & Resources", () => {
  let resources: any[] = [];

  bench("cleanup handler registration", () => {
    const handlers: Array<() => Promise<void>> = [];
    for (let i = 0; i < 100; i++) {
      handlers.push(async () => {});
    }
  });

  bench("process info access", () => {
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  });

  bench("environment variable access", () => {
    const home = process.env.HOME;
    const path = process.env.PATH;
    return { home, path };
  });
});

// ============================================================================
// JSON-RPC MCP Benchmarks
// ============================================================================

group("MCP Protocol", () => {
  bench("JSON-RPC request parse", () => {
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "shell_execute",
        arguments: { command: "echo test" },
      },
    };
    const str = JSON.stringify(request);
    JSON.parse(str);
  });

  bench("JSON-RPC response serialize", () => {
    const response = {
      jsonrpc: "2.0",
      id: 1,
      result: {
        content: [{ type: "text", text: "output" }],
      },
    };
    JSON.stringify(response);
  });

  bench("tool dispatch simulation", () => {
    const tools: Record<string, Function> = {
      shell_execute: () => ({ stdout: "", stderr: "", exitCode: 0 }),
      openclaw_status: () => ({ running: true }),
      profile_list: () => ({ profiles: [] }),
      bridge_health: () => ({ status: "healthy" }),
    };
    
    const toolName = "shell_execute";
    const handler = tools[toolName];
    if (handler) handler();
  });
});

// ============================================================================
// Real-world Scenario Benchmarks
// ============================================================================

group("Real-world Scenarios", () => {
  bench("typical shell workflow", async () => {
    // Simulate: check health -> execute command -> get status
    const health = { status: "healthy", pid: process.pid };
    const result = await $`echo "command output"`.nothrow();
    const status = { success: result.exitCode === 0 };
    return { health, output: result.stdout.toString(), status };
  });

  bench("profile switch workflow", async () => {
    // Simulate: list profiles -> switch -> verify
    const profiles = ["dev", "prod", "staging"];
    const currentProfile = "dev";
    const env = { MATRIX_ACTIVE_PROFILE: currentProfile };
    const result = await $`echo $MATRIX_ACTIVE_PROFILE`
      .env(env)
      .nothrow();
    return { profiles, current: result.stdout.toString() };
  });

  bench("signal stress test", async () => {
    // Register and remove multiple handlers
    const handlers: Array<() => void> = [];
    
    for (let i = 0; i < 10; i++) {
      const handler = () => {};
      handlers.push(handler);
      process.on("SIGUSR1", handler);
    }
    
    // Clean up
    for (const handler of handlers) {
      process.removeListener("SIGUSR1", handler);
    }
  });
});

// ============================================================================
// Comparison Benchmarks: Bun vs Node patterns
// ============================================================================

group("Pattern Comparisons", () => {
  // Signal handling comparison
  bench("Bun signal handler (process.on)", () => {
    const handler = () => {};
    process.on("SIGINT", handler);
    process.removeListener("SIGINT", handler);
  });

  // Command execution comparison
  bench("Bun.$ vs Bun.spawn", async () => {
    // Bun.$ (template literal)
    const result1 = await $`echo hello`.nothrow();
    
    // Bun.spawn (explicit)
    const proc = Bun.spawn(["echo", "hello"], { stdout: "pipe" });
    await proc.exited;
    
    return { exitCode1: result1.exitCode, exitCode2: proc.exitCode };
  });

  // File operations
  bench("Bun.file vs fs.readFile", async () => {
    // Bun.file (native)
    const bunFile = Bun.file(import.meta.path);
    await bunFile.text();
    
    // Node fs (for comparison)
    const fs = await import("fs/promises");
    await fs.readFile(import.meta.path, "utf-8");
  });
});

// ============================================================================
// Startup/Shutdown Benchmarks
// ============================================================================

group("Startup/Shutdown", () => {
  bench("minimal startup time", () => {
    const start = performance.now();
    // Simulate minimal init
    const state = {
      isShuttingDown: false,
      receivedSignals: [],
      startTime: Date.now(),
    };
    const handlers: Array<() => Promise<void>> = [];
    return performance.now() - start;
  });

  bench("signal handler setup", () => {
    const start = performance.now();
    
    const handlers: Array<() => void> = [];
    const sigintHandler = () => {};
    const sigtermHandler = () => {};
    const sighupHandler = () => {};
    
    process.on("SIGINT", sigintHandler);
    process.on("SIGTERM", sigtermHandler);
    process.on("SIGHUP", sighupHandler);
    
    // Cleanup
    process.removeListener("SIGINT", sigintHandler);
    process.removeListener("SIGTERM", sigtermHandler);
    process.removeListener("SIGHUP", sighupHandler);
    
    return performance.now() - start;
  });

  bench("cleanup execution (10 handlers)", async () => {
    const handlers: Array<() => Promise<void>> = [];
    
    for (let i = 0; i < 10; i++) {
      handlers.push(async () => {
        // Simulate cleanup work
        await Bun.sleep(0);
      });
    }
    
    const start = performance.now();
    for (const handler of handlers) {
      await handler();
    }
    return performance.now() - start;
  });
});

// ============================================================================
// Throughput Benchmarks
// ============================================================================

group("Throughput", () => {
  bench("commands per second (estimate)", async () => {
    const iterations = 100;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await $`true`.nothrow();
    }
    
    const duration = performance.now() - start;
    const perSecond = (iterations / duration) * 1000;
    return perSecond;
  }, { iterations: 5 });

  bench("JSON-RPC messages per second", () => {
    const iterations = 10000;
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "test", arguments: {} },
    };
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const str = JSON.stringify(request);
      JSON.parse(str);
    }
    
    const duration = performance.now() - start;
    const perSecond = (iterations / duration) * 1000;
    return perSecond;
  });
});

// ============================================================================
// Main
// ============================================================================

console.log("🔥 Unified Shell Bridge Benchmark Suite");
console.log("========================================\n");
console.log(`Bun version: ${Bun.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`\nRunning benchmarks...\n`);

// Run benchmarks with mitata
await run({
  avg: true,
  json: false,
  colors: true,
  min_max: true,
  collect: false,
  percentiles: [50, 75, 99],
});

console.log("\n✅ Benchmarks complete!");
