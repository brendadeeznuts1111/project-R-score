#!/usr/bin/env bun

// Enhanced Complete System Demo with Advanced Features
import { parseArgs } from "util";
import { colourKit, pad, rgbaLattice, sse } from "./quantum-toolkit-patch.ts";

console.info(
  colourKit(0.9).ansi + "🚀 Enhanced Bun System & Process Suite" + "\x1b[0m"
);
console.info("=".repeat(70));

// Enhanced argument parsing
const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    command: { type: "string", short: "c" },
    env: { type: "string", short: "e" },
    tz: { type: "string", short: "t" },
    ipc: { type: "boolean", short: "i" },
    shell: { type: "boolean", short: "s" },
    monitor: { type: "boolean", short: "m" },
    stress: { type: "boolean", short: "S" },
    benchmark: { type: "boolean", short: "b" },
    verbose: { type: "boolean", short: "V" },
    parallel: { type: "string", short: "p" },
  },
  allowPositionals: true,
});

// Enhanced process monitoring
class ProcessMonitor {
  private startTime: number = Date.now();
  private samples: Array<{ time: number; memory: number; cpu: number }> = [];

  start() {
    console.info(
      colourKit(0.6).ansi + "📊 Starting Advanced Process Monitor" + "\x1b[0m"
    );
    this.monitor();
  }

  private async monitor() {
    const interval = setInterval(async () => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const now = Date.now();

      this.samples.push({
        time: now,
        memory: memUsage.heapUsed,
        cpu: cpuUsage.user + cpuUsage.system,
      });

      // Keep only last 20 samples
      if (this.samples.length > 20) this.samples.shift();

      const memoryMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
      const uptime = process.uptime().toFixed(1);
      const color =
        memUsage.heapUsed > 100 * 1024 * 1024
          ? colourKit(0.8).ansi
          : colourKit(0.3).ansi;

      process.stdout.write(
        `\r🔄 Uptime: ${uptime}s | Memory: ${color}${memoryMB}MB\x1b[0m | Samples: ${this.samples.length}   `
      );

      // Check for memory warnings
      if (memUsage.heapUsed > 200 * 1024 * 1024) {
        console.info(
          colourKit(0.8).ansi +
            `\n⚠️ High memory usage: ${memoryMB}MB` +
            "\x1b[0m"
        );
      }
    }, 1000);

    // Handle cleanup
    process.on("SIGINT", () => {
      clearInterval(interval);
      this.showSummary();
      process.exit(0);
    });
  }

  private showSummary() {
    console.info("\n\n📈 Monitoring Summary:");
    if (this.samples.length === 0) return;

    const memories = this.samples.map((s) => s.memory);
    const avgMemory = memories.reduce((a, b) => a + b, 0) / memories.length;
    const maxMemory = Math.max(...memories);
    const minMemory = Math.min(...memories);

    console.info(`Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
    console.info(`Peak memory: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
    console.info(`Min memory: ${(minMemory / 1024 / 1024).toFixed(2)}MB`);
    console.info(`Total samples: ${this.samples.length}`);
  }
}

// Enhanced spawn with detailed metrics
async function enhancedSpawn(command: string) {
  console.info(
    colourKit(0.5).ansi + `\n🚀 Enhanced Spawn: ${command}` + "\x1b[0m"
  );

  const start = performance.now();

  const proc = Bun.spawn(["bash", "-c", command], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CUSTOM_VAR: "enhanced_spawn" },
  });

  const stdout = await proc.stdout.text();
  const stderr = await proc.stderr.text();
  const exitCode = await proc.exited;
  const duration = performance.now() - start;

  // Performance metrics
  console.info("┌─────────────────┬──────────────────────────────┐");
  console.info("│ Metric          │ Value                        │");
  console.info("├─────────────────┼──────────────────────────────┤");
  console.info(`│ ${pad("Exit Code", 15)} │ ${pad(exitCode.toString(), 28)} │`);
  console.info(
    `│ ${pad("Duration", 15)} │ ${pad(duration.toFixed(2) + "ms", 28)} │`
  );
  console.info(
    `│ ${pad("Stdout Size", 15)} │ ${pad(stdout.length + " bytes", 28)} │`
  );
  console.info(
    `│ ${pad("Stderr Size", 15)} │ ${pad(stderr.length + " bytes", 28)} │`
  );
  console.info("└─────────────────┴──────────────────────────────┘");

  if (stdout) {
    console.info("\n📤 Stdout:");
    stdout
      .trim()
      .split("\n")
      .slice(0, 5)
      .forEach((line, i) => {
        console.info(`  ${i + 1}: ${line}`);
      });
    if (stdout.split("\n").length > 5)
      console.info(`  ... and ${stdout.split("\n").length - 5} more lines`);
  }

  if (stderr) {
    console.info("\n⚠️ Stderr:");
    console.info(`  ${stderr.trim()}`);
  }

  return { exitCode, duration, stdout, stderr };
}

// Parallel process execution
async function runParallel(commands: string) {
  console.info(
    colourKit(0.7).ansi + "\n⚡ Parallel Process Execution" + "\x1b[0m"
  );

  const cmdList = commands.split(",").map((cmd) => cmd.trim());
  console.info(`Running ${cmdList.length} commands in parallel...`);

  const start = performance.now();
  const promises = cmdList.map(async (cmd, i) => {
    const proc = Bun.spawn(["bash", "-c", cmd], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await proc.stdout.text();
    const stderr = await proc.stderr.text();
    const exitCode = await proc.exited;

    return { cmd, stdout, stderr, exitCode, index: i };
  });

  const results = await Promise.all(promises);
  const duration = performance.now() - start;

  console.info("\n📊 Parallel Results:");
  console.info("┌─────┬─────────────────┬──────────┬──────────┐");
  console.info("│ #   │ Command         │ Exit Code │ Duration │");
  console.info("├─────┼─────────────────┼──────────┼──────────┤");

  results.forEach((result) => {
    const color =
      result.exitCode === 0 ? colourKit(0.2).ansi : colourKit(0.8).ansi;
    console.info(
      `│ ${pad((result.index + 1).toString(), 3)} │ ${pad(
        result.cmd.slice(0, 15),
        15
      )} │ ${color}${pad(result.exitCode.toString(), 8)}\x1b[0m │ ${pad(
        duration.toFixed(0) + "ms",
        8
      )} │`
    );
  });

  console.info("└─────┴─────────────────┴──────────┴──────────┘");
  console.info(`Total time: ${duration.toFixed(2)}ms`);
}

// Stress testing
async function stressTest() {
  console.info(colourKit(0.8).ansi + "\n🔥 System Stress Test" + "\x1b[0m");

  const tests = [
    {
      name: "CPU Intensive",
      fn: () => {
        let sum = 0;
        for (let i = 0; i < 10000000; i++) sum += Math.random();
        return sum;
      },
    },
    {
      name: "Memory Allocation",
      fn: () => {
        const arrays = [];
        for (let i = 0; i < 100; i++) {
          arrays.push(new Array(10000).fill(Math.random()));
        }
        return arrays.length;
      },
    },
    {
      name: "File I/O",
      fn: async () => {
        const data = "x".repeat(10000);
        await Bun.write("/tmp/stress-test.txt", data);
        const read = await Bun.file("/tmp/stress-test.txt").text();
        return read.length;
      },
    },
  ];

  console.info("Running stress tests...");

  for (const test of tests) {
    const start = performance.now();
    const memBefore = process.memoryUsage().heapUsed;

    const result = await test.fn();

    const duration = performance.now() - start;
    const memAfter = process.memoryUsage().heapUsed;
    const memDelta = (memAfter - memBefore) / 1024 / 1024;

    console.info(
      `${test.name}: ${duration.toFixed(2)}ms, Memory: +${memDelta.toFixed(
        2
      )}MB, Result: ${result}`
    );
  }
}

// Advanced IPC with multiple workers
async function advancedIPC() {
  console.info(colourKit(0.6).ansi + "\n📨 Advanced IPC Demo" + "\x1b[0m");

  const workerCode = `
    const id = process.argv[2];
    globalThis.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'compute') {
        const result = {
          id,
          input: data,
          output: data * data,
          timestamp: Date.now(),
          pid: process.pid
        };
        globalThis.postMessage(result);
      } else if (type === 'status') {
        globalThis.postMessage({
          id,
          status: 'ready',
          memory: process.memoryUsage().heapUsed,
          uptime: process.uptime()
        });
      }
    };

    // Send ready signal
    globalThis.postMessage({ id, ready: true });
  `;

  // Create multiple workers
  const workerCount = 3;
  const workers = [];

  for (let i = 0; i < workerCount; i++) {
    const workerFile = `/tmp/worker-${i}.js`;
    await Bun.write(workerFile, workerCode);

    const worker = Bun.spawn(["bun", workerFile, i.toString()], {
      stdout: "pipe",
      stderr: "pipe",
      ipc: true,
    });

    workers.push(worker);
  }

  console.info(`Created ${workerCount} workers`);

  // Collect responses
  const responses = [];
  for (const worker of workers) {
    const stdout = await worker.stdout.text();
    const stderr = await worker.stderr.text();

    if (stdout) {
      stdout
        .trim()
        .split("\n")
        .forEach((line) => {
          if (line) {
            try {
              responses.push(JSON.parse(line));
            } catch {}
          }
        });
    }

    await worker.exited;
  }

  console.info("\n📥 Worker Responses:");
  responses.forEach((resp) => {
    console.info(`  Worker ${resp.id}: ${resp.ready ? "Ready" : "Computing"}`);
  });

  // Send compute tasks
  console.info("\n🔢 Sending compute tasks...");
  const tasks = [5, 10, 15, 20, 25];

  for (const task of tasks) {
    console.info(`Task: ${task}² = ${task * task}`);
  }
}

// Enhanced environment management
function enhancedEnvironment(envVar?: string) {
  console.info(
    colourKit(0.4).ansi + "\n🌍 Enhanced Environment Management" + "\x1b[0m"
  );

  // Set multiple environment variables
  const envVars = {
    DEMO_APP: "Enhanced System Demo",
    DEMO_VERSION: "2.0.0",
    DEMO_START: new Date().toISOString(),
    DEMO_PID: process.pid.toString(),
    DEMO_PLATFORM: process.platform,
  };

  if (envVar) {
    const [key, value] = envVar.split("=");
    if (key && value) {
      process.env[key] = value;
      envVars[key] = value;
    }
  }

  Object.assign(process.env, envVars);

  // Display with categorization
  console.info("┌─────────────────┬──────────────────────────────┐");
  console.info("│ Category        │ Variables                    │");
  console.info("├─────────────────┼──────────────────────────────┤");
  console.info(
    `│ ${pad("Demo", 15)} │ ${pad(Object.keys(envVars).join(", "), 28)} │`
  );
  console.info(`│ ${pad("System", 15)} │ ${pad("PATH, HOME, SHELL", 28)} │`);
  console.info(
    `│ ${pad("Runtime", 15)} │ ${pad("NODE_ENV, BUN_RUNTIME", 28)} │`
  );
  console.info("└─────────────────┴──────────────────────────────┘");

  // Generate SSE for environment
  const envEvent = sse("environment", {
    variables: Object.keys(process.env).length,
    demo_vars: Object.keys(envVars).length,
    timestamp: new Date().toISOString(),
  });

  console.info("\n📡 Environment SSE Event:");
  console.info(envEvent.trim());
}

// System benchmark
async function systemBenchmark() {
  console.info(
    colourKit(0.7).ansi + "\n⚡ System Performance Benchmark" + "\x1b[0m"
  );

  const benchmarks = [
    {
      name: "Process Spawn",
      fn: async () => {
        const start = performance.now();
        const proc = Bun.spawn(["echo", "test"], { stderr: "pipe" });
        await proc.stderr.text();
        await proc.exited;
        return performance.now() - start;
      },
    },
    {
      name: "File Write/Read",
      fn: async () => {
        const start = performance.now();
        const data = "benchmark".repeat(1000);
        await Bun.write("/tmp/benchmark.txt", data);
        await Bun.file("/tmp/benchmark.txt").text();
        return performance.now() - start;
      },
    },
    {
      name: "Memory Allocation",
      fn: () => {
        const start = performance.now();
        const arr = new Array(100000).fill(0).map(() => Math.random());
        return performance.now() - start;
      },
    },
    {
      name: "JSON Operations",
      fn: () => {
        const start = performance.now();
        const data = {
          test: "x".repeat(1000),
          array: new Array(100).fill(Math.random()),
        };
        JSON.stringify(data);
        JSON.parse(JSON.stringify(data));
        return performance.now() - start;
      },
    },
  ];

  console.info("Running benchmarks...");
  console.info("┌─────────────────┬──────────┬──────────┬──────────┐");
  console.info("│ Benchmark       │ Avg (ms) │ Min (ms) │ Max (ms) │");
  console.info("├─────────────────┼──────────┼──────────┼──────────┤");

  for (const benchmark of benchmarks) {
    const times = [];
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      times.push(await benchmark.fn());
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    const color =
      avg < 10
        ? colourKit(0.2).ansi
        : avg < 50
        ? colourKit(0.5).ansi
        : colourKit(0.8).ansi;
    console.info(
      `│ ${pad(benchmark.name, 15)} │ ${color}${pad(
        avg.toFixed(2),
        8
      )}\x1b[0m │ ${pad(min.toFixed(2), 8)} │ ${pad(max.toFixed(2), 8)} │`
    );
  }

  console.info("└─────────────────┴──────────┴──────────┴──────────┘");
}

// Main enhanced execution
async function main() {
  if (values.verbose) {
    console.info("🎯 Enhanced Arguments:");
    console.info("Values:", JSON.stringify(values, null, 2));
    console.info("Positionals:", positionals);
    console.info("Bun.argv:", Bun.argv);
  }

  // Core demos
  await enhancedSpawn(values.command || 'echo "Enhanced System Demo"');
  enhancedEnvironment(values.env);

  // Advanced features
  if (values.parallel) {
    await runParallel(values.parallel);
  }

  if (values.stress) {
    await stressTest();
  }

  if (values.ipc) {
    await advancedIPC();
  }

  if (values.benchmark) {
    await systemBenchmark();
  }

  // Start monitoring if requested
  if (values.monitor) {
    const monitor = new ProcessMonitor();
    monitor.start();
    return; // Keep running
  }

  console.info(
    "\n" +
      colourKit(0.2).ansi +
      "🎉 Enhanced System Demo Completed!" +
      "\x1b[0m"
  );

  // Show quantum lattice as finale
  console.info("\n🎨 System Status Visualization:");
  const tension = Math.min(process.uptime() / 60, 1); // 1 minute = full tension
  console.info(rgbaLattice(tension * 10));
}

// Enhanced signal handling
process.on("SIGINT", () => {
  console.info("\n\n👋 Enhanced System Demo - Graceful Shutdown!");
  console.info(
    `📊 Final memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
      2
    )}MB`
  );
  console.info(`⏰ Final uptime: ${process.uptime().toFixed(2)}s`);
  process.exit(0);
});

process.on("SIGUSR1", () => {
  console.info("\n📊 Status Report:");
  console.info(
    `Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
  );
  console.info(`PID: ${process.pid}`);
  console.info(`Platform: ${process.platform}`);
});

// Start enhanced demo
main().catch(console.error);
