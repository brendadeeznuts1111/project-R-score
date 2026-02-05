#!/usr/bin/env bun

// Comprehensive Bun process management demo
import { colourKit, pad } from "./quantum-toolkit-patch.ts";

console.log(colourKit(0.8).ansi + "🔧 Bun Process Management Demo" + "\x1b[0m");
console.log("=".repeat(50));

// Demo 1: Basic process information
function showProcessInfo() {
  console.log("\n📊 Process Information:");
  console.log("┌─────────────────┬──────────────────────────────┐");
  console.log("│ Property        │ Value                        │");
  console.log("├─────────────────┼──────────────────────────────┤");
  console.log(`│ ${pad("PID", 15)} │ ${pad(process.pid.toString(), 28)} │`);
  console.log(`│ ${pad("Platform", 15)} │ ${pad(process.platform, 28)} │`);
  console.log(`│ ${pad("Arch", 15)} │ ${pad(process.arch, 28)} │`);
  console.log(
    `│ ${pad("Node Version", 15)} │ ${pad(process.versions.node, 28)} │`
  );
  console.log(
    `│ ${pad("Bun Version", 15)} │ ${pad(process.versions.bun, 28)} │`
  );
  console.log(`│ ${pad("Title", 15)} │ ${pad(process.title, 28)} │`);
  console.log("└─────────────────┴──────────────────────────────┘");
}

// Demo 2: Environment variables
function showEnvironment() {
  console.log("\n🌍 Environment Variables:");

  const envVars = ["PATH", "HOME", "SHELL", "USER", "LANG", "TERM"];

  console.log("┌─────────────┬────────────────────────────────────┐");
  console.log("│ Variable    │ Value                              │");
  console.log("├─────────────┼────────────────────────────────────┤");

  envVars.forEach((key) => {
    const value = process.env[key] || "undefined";
    const displayValue = value.length > 35 ? value.slice(0, 32) + "..." : value;
    console.log(`│ ${pad(key, 11)} │ ${pad(displayValue, 36)} │`);
  });

  console.log("└─────────────┴────────────────────────────────────┘");
}

// Demo 3: Memory usage
function showMemoryUsage() {
  console.log("\n💾 Memory Usage:");

  const memUsage = process.memoryUsage();

  console.log("┌─────────────────┬──────────────┬──────────────┐");
  console.log("│ Type            │ RSS (MB)     │ Heap Used    │");
  console.log("├─────────────────┼──────────────┼──────────────┤");

  Object.entries(memUsage).forEach(([key, value]) => {
    const rssMB = (value / 1024 / 1024).toFixed(2);
    const heapMB =
      key === "heapUsed" ? (value / 1024 / 1024).toFixed(2) : "N/A";
    const color =
      value > 50 * 1024 * 1024 ? colourKit(0.8).ansi : colourKit(0.2).ansi;
    console.log(
      `│ ${pad(key, 15)} │ ${color}${pad(rssMB, 12)}\x1b[0m │ ${pad(
        heapMB,
        12
      )} │`
    );
  });

  console.log("└─────────────────┴──────────────┴──────────────┘");
}

// Demo 4: CPU usage
async function showCPUUsage() {
  console.log("\n⚡ CPU Usage:");

  const startUsage = process.cpuUsage();

  // Simulate some work
  const start = performance.now();
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += Math.random();
  }
  const end = performance.now();

  const endUsage = process.cpuUsage(startUsage);

  console.log(`Work completed in ${(end - start).toFixed(2)}ms`);
  console.log(`CPU user time: ${(endUsage.user / 1000).toFixed(2)}ms`);
  console.log(`CPU system time: ${(endUsage.system / 1000).toFixed(2)}ms`);
  console.log(`Calculation result: ${sum.toFixed(2)}`);
}

// Demo 5: Signal handling
function setupSignalHandlers() {
  console.log("\n📡 Signal Handlers:");

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    console.log("\n🛑 Received SIGINT (Ctrl+C)");
    console.log("🧹 Cleaning up resources...");
    console.log("👋 Graceful shutdown complete");
    process.exit(0);
  });

  // Handle SIGTERM
  process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM");
    console.log("👋 Terminating gracefully");
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.log(
      colourKit(0.8).ansi +
        `❌ Uncaught exception: ${error.message}` +
        "\x1b[0m"
    );
    process.exit(1);
  });

  // Handle unhandled rejections
  process.on("unhandledRejection", (reason) => {
    console.log(
      colourKit(0.8).ansi + `❌ Unhandled rejection: ${reason}` + "\x1b[0m"
    );
    process.exit(1);
  });

  console.log("✅ Signal handlers configured");
  console.log("💡 Try pressing Ctrl+C to test graceful shutdown");
}

// Demo 6: Process events
function setupProcessEvents() {
  console.log("\n📅 Process Events:");

  process.on("beforeExit", (code) => {
    console.log(`🚪 Process about to exit with code: ${code}`);
  });

  process.on("exit", (code) => {
    console.log(`👋 Process exited with code: ${code}`);
  });

  process.on("warning", (warning) => {
    console.log(
      colourKit(0.6).ansi +
        `⚠️ Warning: ${warning.name} - ${warning.message}` +
        "\x1b[0m"
    );
  });

  console.log("✅ Process event listeners configured");
}

// Demo 7: Working directory
function showWorkingDirectory() {
  console.log("\n📁 Working Directory:");
  console.log(`Current directory: ${process.cwd()}`);

  try {
    process.chdir("/tmp");
    console.log(`Changed to: ${process.cwd()}`);

    // Change back
    process.chdir(process.env.HOME || process.cwd());
    console.log(`Changed back to: ${process.cwd()}`);
  } catch (error) {
    console.log(`❌ Directory change failed: ${error.message}`);
  }
}

// Demo 8: Process timing
function showProcessTiming() {
  console.log("\n⏰ Process Timing:");

  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  console.log(`Process uptime: ${hours}h ${minutes}m ${seconds}s`);
  console.log(`Uptime in seconds: ${uptime.toFixed(2)}`);
  console.log(
    `Process start time: ${new Date(Date.now() - uptime * 1000).toISOString()}`
  );
}

// Demo 9: Custom process title
function setProcessTitle() {
  console.log("\n🏷️ Process Title:");
  console.log(`Original title: ${process.title}`);

  process.title = "quantum-process-demo";
  console.log(`New title: ${process.title}`);

  // Reset after 2 seconds
  setTimeout(() => {
    process.title = "bun-process-demo";
  }, 2000);
}

// Demo 10: Process monitoring
async function monitorProcess() {
  console.log("\n📈 Live Process Monitor (5 seconds):");

  for (let i = 0; i < 5; i++) {
    const memUsage = process.memoryUsage();
    const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const color =
      parseFloat(heapMB) > 50 ? colourKit(0.8).ansi : colourKit(0.2).ansi;

    process.stdout.write(
      `\r[${pad((i + 1).toString(), 2)}/5] Memory: ${color}${heapMB}MB\x1b[0m`
    );

    // Simulate memory allocation
    const data = new Array(10000).fill(0).map(() => Math.random());

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n✅ Monitoring complete");
}

// Main execution
async function main() {
  try {
    showProcessInfo();
    showEnvironment();
    showMemoryUsage();
    await showCPUUsage();
    setupSignalHandlers();
    setupProcessEvents();
    showWorkingDirectory();
    showProcessTiming();
    setProcessTitle();
    await monitorProcess();

    console.log(
      "\n" +
        colourKit(0.2).ansi +
        "🎉 Process management demo completed!" +
        "\x1b[0m"
    );
    console.log(
      "💡 The process will continue running. Press Ctrl+C to exit gracefully."
    );

    // Keep process alive to demonstrate signal handling
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
      process.stdout.write(`\r🔄 Running... Memory: ${heapMB}MB   `);
    }, 2000);
  } catch (error) {
    console.log(
      colourKit(0.8).ansi + `❌ Demo error: ${error.message}` + "\x1b[0m"
    );
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Thanks for trying the process management demo!");
  process.exit(0);
});

// Start the demo
main();
