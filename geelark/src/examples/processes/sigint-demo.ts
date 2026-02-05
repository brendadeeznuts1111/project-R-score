#!/usr/bin/env bun

/**
 * Signal Handling Demo - Listen for OS signals
 *
 * This demonstrates comprehensive signal handling patterns from the documentation:
 * - SIGINT (Ctrl+C) handling with explicit process.exit() requirement
 * - beforeExit and exit events for process lifecycle management
 *
 * Run this script and press Ctrl+C to see the signal handler in action.
 */

console.log("🚀 SIGINT Demo started!");
console.log("Press Ctrl+C to trigger the signal handler...");
console.log("The handler will log 'Ctrl-C was pressed' and exit\n");

let interrupts = 0;

// Listen for CTRL+C (SIGINT)
process.on("SIGINT", () => {
  interrupts++;
  console.log(`\n🛑 Ctrl-C was pressed (${interrupts} times)`);

  if (interrupts >= 3) {
    console.log("Multiple interrupts detected - exiting now!");
    process.exit();
  } else {
    console.log("Press Ctrl+C again to exit, or wait...");
  }
});

// Keep running so you can press Ctrl+C
const dotTimer = setInterval(() => {
  process.stdout.write(".");
}, 100);

// Handle process lifecycle events
process.on("beforeExit", (code) => {
  console.log(`🔔 Event loop is empty! (exit code: ${code})`);
  // Note: No async operations allowed here
});

process.on("exit", (code) => {
  // Only synchronous operations allowed here
  console.log(`👋 Process is exiting with code ${code}`);
  clearInterval(dotTimer);
});
