#!/usr/bin/env bun

/**
 * Process Lifecycle Demo - beforeExit and exit Events
 *
 * Demonstrates the process lifecycle events from the Bun documentation.
 * "If you don't know which signal to listen for, you listen to the 'beforeExit' and 'exit' events."
 *
 * These catch-all events fire for any process termination scenario, whether from signals,
 * explicit process.exit() calls, or natural process completion.
 */

console.info("🚀 Process Lifecycle Demo starting...");
console.info("This demo shows beforeExit and exit events");
console.info("Watch for the lifecycle events when the process ends\n");

// Counter to show event order
let lifecycleEventCount = 0;

// Listen for beforeExit event
process.on("beforeExit", (code) => {
  lifecycleEventCount++;
  console.info(`${lifecycleEventCount}. 🔔 beforeExit: Event loop is empty! (exit code: ${code})`);
  console.info("   ↳ Process is about to exit naturally");
  console.info("   ↳ No async operations allowed in beforeExit!");
  console.info("   ↳ Use this for cleanup that must be synchronous");
});

// Listen for exit event
process.on("exit", (code) => {
  lifecycleEventCount++;
  console.info(`${lifecycleEventCount}. 👋 exit: Process is exiting with code ${code}`);
  console.info("   ↳ This is the last event before process termination");
  console.info("   ↳ Only synchronous operations allowed here");
  console.info("   ↳ Perfect for final logging or cleanup");
});

// Demonstrate different exit scenarios
console.info("Demonstrating exit scenarios:\n");

setTimeout(() => {
  console.info("1️⃣ Natural exit (no more work to do):");
  // No more async operations, process will exit naturally
  console.info("   ↳ Event loop empty → beforeExit → exit\n");
}, 1000);

setTimeout(() => {
  console.info("2️⃣ Explicit exit with code:");
  process.exit(0); // Triggers beforeExit (if event loop is empty) then exit
}, 2000);

// Keep the event loop active initially
const keepAlive = setInterval(() => {
  // This keeps the event loop active
  process.stdout.write("⏳");
}, 200);

// Clear the keep-alive after first scenario
setTimeout(() => {
  clearInterval(keepAlive);
  console.info("\n   ↳ Cleared interval (event loop may become empty)");
}, 500);
