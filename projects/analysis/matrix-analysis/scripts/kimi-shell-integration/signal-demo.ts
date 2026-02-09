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

console.log("🚀 Kimi Shell Signal Handling Demo");
console.log("===================================\n");
console.log(`PID: ${process.pid}`);
console.log(`Bun version: ${Bun.version}`);
console.log(`\nSend signals to this process to test handling:`);
console.log(`  kill -INT  ${process.pid}  # Same as Ctrl+C`);
console.log(`  kill -TERM ${process.pid}  # Termination request`);
console.log(`  kill -HUP  ${process.pid}  # Terminal closed`);
console.log(`\nPress Ctrl+C to trigger graceful shutdown.\n`);

// Register cleanup handlers
onCleanup(async () => {
  console.log("\n🧹 Cleanup Handler 1: Saving state...");
  await Bun.sleep(100);
  console.log("   ✅ State saved");
});

onCleanup(async () => {
  console.log("🧹 Cleanup Handler 2: Closing connections...");
  await Bun.sleep(100);
  console.log("   ✅ Connections closed");
});

onCleanup(async () => {
  console.log("🧹 Cleanup Handler 3: Flushing logs...");
  await Bun.sleep(50);
  console.log("   ✅ Logs flushed");
});

// Track received signals
const receivedSignals: string[] = [];

process.on("SIGINT", () => {
  receivedSignals.push("SIGINT");
  console.log("\n📥 SIGINT received (Ctrl+C)");
});

process.on("SIGTERM", () => {
  receivedSignals.push("SIGTERM");
  console.log("\n📥 SIGTERM received");
});

process.on("SIGHUP", () => {
  receivedSignals.push("SIGHUP");
  console.log("\n📥 SIGHUP received (terminal closed)");
});

process.on("exit", (code) => {
  console.log(`\n🚪 Exiting with code ${code}`);
  console.log(`📊 Signals received: ${receivedSignals.join(", ") || "none"}`);
});

// Simulate some work
let counter = 0;
const interval = setInterval(async () => {
  counter++;
  
  if (counter % 5 === 0) {
    // Show health status every 5 seconds
    const health = await getHealthStatus();
    console.log(`💓 Health check: ${(health as any).status} | Uptime: ${((health as any).uptime / 1000).toFixed(1)}s`);
  } else {
    console.log(`⏱️  Running... (${counter}s)`);
  }
  
  // Auto-exit after 60 seconds
  if (counter >= 60) {
    console.log("\n⏰ Auto-exit after 60 seconds");
    clearInterval(interval);
    process.exit(0);
  }
}, 1000);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("\n💥 Uncaught exception:", err.message);
  process.exit(1);
});

console.log("✅ Demo running. Waiting for signals...\n");
