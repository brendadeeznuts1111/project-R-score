#!/usr/bin/env bun

/**
 * Signal Comparison Demo - When to use SIGINT vs beforeExit/exit
 *
 * As per Bun documentation: "If you don't know which signal to listen for,
 * you listen to the 'beforeExit' and 'exit' events."
 *
 * This demo shows the relationship between different signal handlers and
 * includes precise timing measurements using Bun.nanoseconds().
 */

console.info("🔄 Signal Comparison Demo");
console.info("This shows when to use specific signals vs catch-all lifecycle events\n");

// Track start time for precise timing measurements
const startTime = Bun.nanoseconds();
console.info(`⏱️  Process start time: ${startTime} nanoseconds\n`);

let eventCount = 0;

console.info("Adding signal handlers in order...\n");

// 1. Specific signal handler
process.on("SIGINT", () => {
  eventCount++;
  console.info(`${eventCount}. 🛑 SIGINT: Ctrl-C was pressed!`);
  console.info("   ↳ Specific OS signal handler");
  console.info("   ↳ Use when you know EXACTLY which signal to expect");
  console.info("   ↳ Process continues running unless you call process.exit()");
});

// 2. Catch-all beforeExit handler
process.on("beforeExit", (code) => {
  eventCount++;
  console.info(`${eventCount}. 🔔 beforeExit: Event loop is empty! (code: ${code})`);
  console.info("   ↳ Fires for ANY process termination scenario");
  console.info("   ↳ Use when you DON'T know which signal/OS condition will cause exit");
  console.info("   ↳ Good for cleanup that might happen for various reasons");
});

// 3. Catch-all exit handler
process.on("exit", (code) => {
  eventCount++;
  console.info(`${eventCount}. 👋 exit: Process exiting with code ${code}`);
  console.info("   ↳ Final event before process termination");
  console.info("   ↳ Only synchronous operations allowed here");
});

console.info("Demonstrating scenarios:\n");

// Scenario 1: SIGINT triggered
console.info("Scenario 1: Pressing Ctrl+C (SIGINT)...");
console.info("Expected order: SIGINT (if pressed) → beforeExit → exit\n");

// Scenario 2: Natural exit
setTimeout(() => {
  console.info("Scenario 2: Natural exit by clearing event loop...");
}, 3000);

// Keep event loop active initially, then clear it
const timers = [
  setInterval(() => process.stdout.write("⏳"), 300),
  setInterval(() => process.stdout.write("🕐"), 400),
];

// Clear timers after 5 seconds to allow natural exit
setTimeout(() => {
  console.info("\n\nClearing all timers - natural exit will occur...");
  timers.forEach(clearInterval);
  console.info("Expected order: beforeExit → exit\n");
}, 5000);

console.info("\n🎯 Key insight from documentation:");
console.info("\"If you don't know which signal to listen for, you listen to the");
console.info(" 'beforeExit' and 'exit' events.\"");
console.info("\nThey catch process termination from ANY cause: signals, errors, explicit exit, etc.");
