#!/usr/bin/env bun
/**
 * Kimi Shell Signal Handling Demo
 * 
 * Demonstrates Bun-native signal handling capabilities:
 * - SIGINT (Ctrl+C)
 * - SIGTERM
 * - SIGHUP
 * - Graceful shutdown with cleanup
 * 
 * Usage:
 *   bun run signal-demo.ts
 * 
 * Then in another terminal:
 *   kill -INT <pid>   # or press Ctrl+C
 *   kill -TERM <pid>
 *   kill -HUP <pid>
 */

import { onCleanup, getHealthStatus, executeCommand } from "./unified-shell-bridge";

console.info("🚀 Kimi Shell Signal Handling Demo");
console.info("===================================\n");
console.info(`PID: ${process.pid}`);
console.info(`Bun version: ${Bun.version}`);
console.info(`\nSend signals to this process to test handling:`);
console.info(`  kill -INT  ${process.pid}  # Same as Ctrl+C`);
console.info(`  kill -TERM ${process.pid}  # Termination request`);
console.info(`  kill -HUP  ${process.pid}  # Terminal closed`);
console.info(`\nPress Ctrl+C to trigger graceful shutdown.\n`);

// Register cleanup handlers
onCleanup(async () => {
  console.info("\n🧹 Cleanup Handler 1: Saving state...");
  await Bun.sleep(100);
  console.info("   ✅ State saved");
});

onCleanup(async () => {
  console.info("🧹 Cleanup Handler 2: Closing connections...");
  await Bun.sleep(100);
  console.info("   ✅ Connections closed");
});

onCleanup(async () => {
  console.info("🧹 Cleanup Handler 3: Flushing logs...");
  await Bun.sleep(50);
  console.info("   ✅ Logs flushed");
});

// Track received signals
const receivedSignals: string[] = [];

process.on("SIGINT", () => {
  receivedSignals.push("SIGINT");
  console.info("\n📥 SIGINT received (Ctrl+C)");
});

process.on("SIGTERM", () => {
  receivedSignals.push("SIGTERM");
  console.info("\n📥 SIGTERM received");
});

process.on("SIGHUP", () => {
  receivedSignals.push("SIGHUP");
  console.info("\n📥 SIGHUP received (terminal closed)");
});

process.on("exit", (code) => {
  console.info(`\n🚪 Exiting with code ${code}`);
  console.info(`📊 Signals received: ${receivedSignals.join(", ") || "none"}`);
});

// Simulate some work
let counter = 0;
const interval = setInterval(async () => {
  counter++;
  
  if (counter % 5 === 0) {
    // Show health status every 5 seconds
    const health = await getHealthStatus();
    console.info(`💓 Health check: ${(health as any).status} | Uptime: ${((health as any).uptime / 1000).toFixed(1)}s`);
  } else {
    console.info(`⏱️  Running... (${counter}s)`);
  }
  
  // Auto-exit after 60 seconds
  if (counter >= 60) {
    console.info("\n⏰ Auto-exit after 60 seconds");
    clearInterval(interval);
    process.exit(0);
  }
}, 1000);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("\n💥 Uncaught exception:", err.message);
  process.exit(1);
});

console.info("✅ Demo running. Waiting for signals...\n");
