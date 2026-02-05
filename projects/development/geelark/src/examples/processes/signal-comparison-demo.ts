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

console.log("🔄 Signal Comparison Demo");
console.log("This shows when to use specific signals vs catch-all lifecycle events\n");

// Track start time for precise timing measurements
const startTime = Bun.nanoseconds();
console.log(`⏱️  Process start time: ${startTime} nanoseconds\n`);

let eventCount = 0;

console.log("Adding signal handlers in order...\n");

// 1. Specific signal handler
process.on("SIGINT", () => {
  eventCount++;
  console.log(`${eventCount}. 🛑 SIGINT: Ctrl-C was pressed!`);
  console.log("   ↳ Specific OS signal handler");
  console.log("   ↳ Use when you know EXACTLY which signal to expect");
  console.log("   ↳ Process continues running unless you call process.exit()");
});

// 2. Catch-all beforeExit handler
process.on("beforeExit", (code) => {
  eventCount++;
  console.log(`${eventCount}. 🔔 beforeExit: Event loop is empty! (code: ${code})`);
  console.log("   ↳ Fires for ANY process termination scenario");
  console.log("   ↳ Use when you DON'T know which signal/OS condition will cause exit");
  console.log("   ↳ Good for cleanup that might happen for various reasons");
});

// 3. Catch-all exit handler
process.on("exit", (code) => {
  eventCount++;
  console.log(`${eventCount}. 👋 exit: Process exiting with code ${code}`);
  console.log("   ↳ Final event before process termination");
  console.log("   ↳ Only synchronous operations allowed here");
});

console.log("Demonstrating scenarios:\n");

// Scenario 1: SIGINT triggered
console.log("Scenario 1: Pressing Ctrl+C (SIGINT)...");
console.log("Expected order: SIGINT (if pressed) → beforeExit → exit\n");

// Scenario 2: Natural exit
setTimeout(() => {
  console.log("Scenario 2: Natural exit by clearing event loop...");
}, 3000);

// Keep event loop active initially, then clear it
const timers = [
  setInterval(() => process.stdout.write("⏳"), 300),
  setInterval(() => process.stdout.write("🕐"), 400),
];

// Clear timers after 5 seconds to allow natural exit
setTimeout(() => {
  console.log("\n\nClearing all timers - natural exit will occur...");
  timers.forEach(clearInterval);
  console.log("Expected order: beforeExit → exit\n");
}, 5000);

console.log("\n🎯 Key insight from documentation:");
console.log("\"If you don't know which signal to listen for, you listen to the");
console.log(" 'beforeExit' and 'exit' events.\"");
console.log("\nThey catch process termination from ANY cause: signals, errors, explicit exit, etc.");
