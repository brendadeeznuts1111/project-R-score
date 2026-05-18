#!/usr/bin/env bun

// Complete Bun Processes & System demo
import { parseArgs } from "util";
import { colourKit, pad } from "./quantum-toolkit-patch.ts";

console.info(
  colourKit(0.8).ansi + "🖥️ Complete Bun System & Process Demo" + "\x1b[0m"
);
console.info("=".repeat(60));

// Parse command line arguments
const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    command: { type: "string", short: "c" },
    env: { type: "string", short: "e" },
    tz: { type: "string", short: "t" },
    ipc: { type: "boolean", short: "i" },
    shell: { type: "boolean", short: "s" },
  },
  allowPositionals: true,
});

// 1. Spawn child process with stdout/stderr
async function spawnChildProcess() {
  console.info("\n🚀 Spawn Child Process:");

  const proc = Bun.spawn(["echo", "hello from child"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await proc.stdout.text();
  const stderr = await proc.stderr.text();
  const exitCode = await proc.exited;

  console.info(`Exit code: ${exitCode}`);
  console.info(`stdout: ${stdout.trim()}`);
  if (stderr) console.info(`stderr: ${stderr.trim()}`);
}

// 2. Run shell command
async function runShellCommand(command?: string) {
  console.info("\n🐚 Shell Command:");

  const cmd = command || "date '+%Y-%m-%d %H:%M:%S'";
  console.info(`Running: ${cmd}`);

  const proc = Bun.spawn(["bash", "-c", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await proc.stdout.text();
  const stderr = await proc.stderr.text();

  if (stdout) console.info(`Output: ${stdout.trim()}`);
  if (stderr) console.info(`Error: ${stderr.trim()}`);
}

// 3. Set and read environment variables
function demonstrateEnvVars(envVar?: string) {
  console.info("\n🌍 Environment Variables:");

  // Set a custom env var
  process.env.DEMO_VAR = "Hello from Bun!";
  process.env.DEMO_TIME = new Date().toISOString();

  if (envVar) {
    process.env.USER_VAR = envVar;
    console.info(`Set USER_VAR = ${envVar}`);
  }

  // Display key env vars
  const keyVars = [
    "DEMO_VAR",
    "DEMO_TIME",
    "USER_VAR",
    "PATH",
    "HOME",
    "SHELL",
  ];

  console.info("┌─────────────┬────────────────────────────────────┐");
  console.info("│ Variable    │ Value                              │");
  console.info("├─────────────┼────────────────────────────────────┤");

  keyVars.forEach((key) => {
    const value = process.env[key] || "undefined";
    const display = value.length > 35 ? value.slice(0, 32) + "..." : value;
    console.info(`│ ${pad(key, 11)} │ ${pad(display, 36)} │`);
  });

  console.info("└─────────────┴────────────────────────────────────┘");
}

// 4. Set timezone (if supported)
function setTimezone(tz?: string) {
  console.info("\n🌍 Timezone:");

  const timezone = tz || process.env.TZ || "UTC";
  console.info(`Current timezone: ${timezone}`);
  console.info(`Current time: ${new Date().toLocaleString()}`);

  // Note: Actually changing TZ requires process restart in most cases
  console.info(
    "💡 To change timezone, set TZ environment variable before starting"
  );
}

// 5. Process uptime
function showProcessUptime() {
  console.info("\n⏰ Process Uptime:");

  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  console.info(`Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`);
  console.info(`Total seconds: ${uptime.toFixed(2)}`);
  console.info(
    `Process start: ${new Date(Date.now() - uptime * 1000).toISOString()}`
  );
}

// 6. OS signals and CTRL+C handling
function setupSignalHandlers() {
  console.info("\n📡 Signal Handlers:");

  // Handle CTRL+C (SIGINT)
  process.on("SIGINT", () => {
    console.info("\n🛑 Received SIGINT (CTRL+C)");
    console.info("🧹 Cleaning up...");
    console.info("👋 Graceful shutdown!");
    process.exit(0);
  });

  // Handle SIGTERM
  process.on("SIGTERM", () => {
    console.info("\n🛑 Received SIGTERM");
    process.exit(0);
  });

  // Handle SIGUSR1 (custom signal)
  process.on("SIGUSR1", () => {
    console.info("\n📊 Received SIGUSR1 - Showing stats...");
    const memUsage = process.memoryUsage();
    console.info(`Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  });

  console.info("✅ Signal handlers configured");
  console.info("💡 Try: CTRL+C (SIGINT) or kill -SIGUSR1 <PID>");
}

// 7. Read from stdin
async function readFromStdin() {
  console.info("\n📥 Stdin Reading Demo:");
  console.info('Type messages and press Enter (type "quit" to exit)');

  // Create a simple stdin reader
  const stdin = Bun.stdin.stream();
  const decoder = new TextDecoder();

  try {
    for await (const chunk of stdin) {
      const text = decoder.decode(chunk);
      const line = text.trim();

      if (line === "quit" || line === "exit") {
        console.info("👋 Exiting stdin demo");
        break;
      }

      if (line) {
        const color = colourKit(Math.random()).ansi;
        console.info(`Echo: ${color}${line}\x1b[0m`);
        console.info("Length: " + line.length + " characters");
      }

      process.stdout.write("> ");
    }
  } catch (error) {
    console.info("Stdin demo ended");
  }
}

// 8. Spawn child process with IPC
async function spawnWithIPC() {
  console.info("\n📨 IPC (Inter-Process Communication):");

  // Create a simple worker script
  const workerCode = `
    process.on('message', (msg) => {
      console.info('Worker received:', msg);
      process.send({
        id: msg.id,
        result: msg.data * 2,
        timestamp: Date.now()
      });
    });

    // Send initial message
    process.send({ ready: true, pid: process.pid });
  `;

  // Write worker to temp file
  const workerFile = "/tmp/ipc-worker.js";
  await Bun.write(workerFile, workerCode);

  // Spawn worker with IPC
  const worker = Bun.spawn(["bun", workerFile], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  console.info("📤 Sending messages to worker...");

  // Send messages
  worker.send({ id: 1, data: 21 });
  worker.send({ id: 2, data: 42 });
  worker.send({ id: 3, data: 100 });

  // Read responses
  const stdout = await worker.stdout.text();
  const stderr = await worker.stderr.text();

  if (stdout) {
    console.info("📥 Worker responses:");
    stdout
      .trim()
      .split("\n")
      .forEach((line) => {
        if (line) console.info(`  ${line}`);
      });
  }

  if (stderr) console.info(`Worker errors: ${stderr}`);

  await worker.exited;
  console.info("✅ IPC demo completed");
}

// 9. System information
function showSystemInfo() {
  console.info("\n💻 System Information:");

  console.info("┌─────────────────┬──────────────────────────────┐");
  console.info("│ Property        │ Value                        │");
  console.info("├─────────────────┼──────────────────────────────┤");
  console.info(`│ ${pad("Platform", 15)} │ ${pad(process.platform, 28)} │`);
  console.info(`│ ${pad("Architecture", 15)} │ ${pad(process.arch, 28)} │`);
  console.info(
    `│ ${pad("Node Version", 15)} │ ${pad(process.versions.node, 28)} │`
  );
  console.info(
    `│ ${pad("Bun Version", 15)} │ ${pad(process.versions.bun, 28)} │`
  );
  console.info(
    `│ ${pad("Process ID", 15)} │ ${pad(process.pid.toString(), 28)} │`
  );
  console.info(
    `│ ${pad("Parent PID", 15)} │ ${pad(
      process.ppid?.toString() || "N/A",
      28
    )} │`
  );
  console.info("└─────────────────┴──────────────────────────────┘");
}

// Main execution
async function main() {
  console.info("🎯 Command line arguments:");
  console.info("Values:", JSON.stringify(values, null, 2));
  console.info("Positionals:", positionals);

  await spawnChildProcess();
  await runShellCommand(values.command);
  demonstrateEnvVars(values.env);
  setTimezone(values.tz);
  showProcessUptime();
  showSystemInfo();
  setupSignalHandlers();

  if (values.ipc) {
    await spawnWithIPC();
  }

  if (values.shell) {
    await runShellCommand("uname -a && uptime");
  }

  console.info("\n🎉 System demo completed!");
  console.info(
    "💡 Process will continue running. Try CTRL+C to test signal handling."
  );

  // Optional: stdin demo (commented out for non-interactive use)
  // if (!values.shell && !values.ipc) {
  //   await readFromStdin();
  // }

  // Keep process alive
  setInterval(() => {
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    process.stdout.write(`\r🔄 Running... Memory: ${mem}MB   `);
  }, 3000);
}

// Handle signals
process.on("SIGINT", () => {
  console.info("\n\n👋 System demo completed successfully!");
  process.exit(0);
});

// Start demo
main().catch(console.error);
