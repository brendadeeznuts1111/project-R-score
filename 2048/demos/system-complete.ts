#!/usr/bin/env bun

// Complete Bun Processes & System demo
import { parseArgs } from "util";
import { colourKit, pad } from "./quantum-toolkit-patch.ts";

console.log(
  colourKit(0.8).ansi + "🖥️ Complete Bun System & Process Demo" + "\x1b[0m"
);
console.log("=".repeat(60));

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
  console.log("\n🚀 Spawn Child Process:");

  const proc = Bun.spawn(["echo", "hello from child"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await proc.stdout.text();
  const stderr = await proc.stderr.text();
  const exitCode = await proc.exited;

  console.log(`Exit code: ${exitCode}`);
  console.log(`stdout: ${stdout.trim()}`);
  if (stderr) console.log(`stderr: ${stderr.trim()}`);
}

// 2. Run shell command
async function runShellCommand(command?: string) {
  console.log("\n🐚 Shell Command:");

  const cmd = command || "date '+%Y-%m-%d %H:%M:%S'";
  console.log(`Running: ${cmd}`);

  const proc = Bun.spawn(["bash", "-c", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await proc.stdout.text();
  const stderr = await proc.stderr.text();

  if (stdout) console.log(`Output: ${stdout.trim()}`);
  if (stderr) console.log(`Error: ${stderr.trim()}`);
}

// 3. Set and read environment variables
function demonstrateEnvVars(envVar?: string) {
  console.log("\n🌍 Environment Variables:");

  // Set a custom env var
  process.env.DEMO_VAR = "Hello from Bun!";
  process.env.DEMO_TIME = new Date().toISOString();

  if (envVar) {
    process.env.USER_VAR = envVar;
    console.log(`Set USER_VAR = ${envVar}`);
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

  console.log("┌─────────────┬────────────────────────────────────┐");
  console.log("│ Variable    │ Value                              │");
  console.log("├─────────────┼────────────────────────────────────┤");

  keyVars.forEach((key) => {
    const value = process.env[key] || "undefined";
    const display = value.length > 35 ? value.slice(0, 32) + "..." : value;
    console.log(`│ ${pad(key, 11)} │ ${pad(display, 36)} │`);
  });

  console.log("└─────────────┴────────────────────────────────────┘");
}

// 4. Set timezone (if supported)
function setTimezone(tz?: string) {
  console.log("\n🌍 Timezone:");

  const timezone = tz || process.env.TZ || "UTC";
  console.log(`Current timezone: ${timezone}`);
  console.log(`Current time: ${new Date().toLocaleString()}`);

  // Note: Actually changing TZ requires process restart in most cases
  console.log(
    "💡 To change timezone, set TZ environment variable before starting"
  );
}

// 5. Process uptime
function showProcessUptime() {
  console.log("\n⏰ Process Uptime:");

  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  console.log(`Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`);
  console.log(`Total seconds: ${uptime.toFixed(2)}`);
  console.log(
    `Process start: ${new Date(Date.now() - uptime * 1000).toISOString()}`
  );
}

// 6. OS signals and CTRL+C handling
function setupSignalHandlers() {
  console.log("\n📡 Signal Handlers:");

  // Handle CTRL+C (SIGINT)
  process.on("SIGINT", () => {
    console.log("\n🛑 Received SIGINT (CTRL+C)");
    console.log("🧹 Cleaning up...");
    console.log("👋 Graceful shutdown!");
    process.exit(0);
  });

  // Handle SIGTERM
  process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM");
    process.exit(0);
  });

  // Handle SIGUSR1 (custom signal)
  process.on("SIGUSR1", () => {
    console.log("\n📊 Received SIGUSR1 - Showing stats...");
    const memUsage = process.memoryUsage();
    console.log(`Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  });

  console.log("✅ Signal handlers configured");
  console.log("💡 Try: CTRL+C (SIGINT) or kill -SIGUSR1 <PID>");
}

// 7. Read from stdin
async function readFromStdin() {
  console.log("\n📥 Stdin Reading Demo:");
  console.log('Type messages and press Enter (type "quit" to exit)');

  // Create a simple stdin reader
  const stdin = Bun.stdin.stream();
  const decoder = new TextDecoder();

  try {
    for await (const chunk of stdin) {
      const text = decoder.decode(chunk);
      const line = text.trim();

      if (line === "quit" || line === "exit") {
        console.log("👋 Exiting stdin demo");
        break;
      }

      if (line) {
        const color = colourKit(Math.random()).ansi;
        console.log(`Echo: ${color}${line}\x1b[0m`);
        console.log("Length: " + line.length + " characters");
      }

      process.stdout.write("> ");
    }
  } catch (error) {
    console.log("Stdin demo ended");
  }
}

// 8. Spawn child process with IPC
async function spawnWithIPC() {
  console.log("\n📨 IPC (Inter-Process Communication):");

  // Create a simple worker script
  const workerCode = `
    process.on('message', (msg) => {
      console.log('Worker received:', msg);
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

  console.log("📤 Sending messages to worker...");

  // Send messages
  worker.send({ id: 1, data: 21 });
  worker.send({ id: 2, data: 42 });
  worker.send({ id: 3, data: 100 });

  // Read responses
  const stdout = await worker.stdout.text();
  const stderr = await worker.stderr.text();

  if (stdout) {
    console.log("📥 Worker responses:");
    stdout
      .trim()
      .split("\n")
      .forEach((line) => {
        if (line) console.log(`  ${line}`);
      });
  }

  if (stderr) console.log(`Worker errors: ${stderr}`);

  await worker.exited;
  console.log("✅ IPC demo completed");
}

// 9. System information
function showSystemInfo() {
  console.log("\n💻 System Information:");

  console.log("┌─────────────────┬──────────────────────────────┐");
  console.log("│ Property        │ Value                        │");
  console.log("├─────────────────┼──────────────────────────────┤");
  console.log(`│ ${pad("Platform", 15)} │ ${pad(process.platform, 28)} │`);
  console.log(`│ ${pad("Architecture", 15)} │ ${pad(process.arch, 28)} │`);
  console.log(
    `│ ${pad("Node Version", 15)} │ ${pad(process.versions.node, 28)} │`
  );
  console.log(
    `│ ${pad("Bun Version", 15)} │ ${pad(process.versions.bun, 28)} │`
  );
  console.log(
    `│ ${pad("Process ID", 15)} │ ${pad(process.pid.toString(), 28)} │`
  );
  console.log(
    `│ ${pad("Parent PID", 15)} │ ${pad(
      process.ppid?.toString() || "N/A",
      28
    )} │`
  );
  console.log("└─────────────────┴──────────────────────────────┘");
}

// Main execution
async function main() {
  console.log("🎯 Command line arguments:");
  console.log("Values:", JSON.stringify(values, null, 2));
  console.log("Positionals:", positionals);

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

  console.log("\n🎉 System demo completed!");
  console.log(
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
  console.log("\n\n👋 System demo completed successfully!");
  process.exit(0);
});

// Start demo
main().catch(console.error);
