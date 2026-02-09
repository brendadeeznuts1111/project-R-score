#!/usr/bin/env bun
/**
 * Demo: OS Signals (SIGINT, SIGTERM, etc.)
 * 
 * https://bun.com/docs/guides/process/os-signals
 */

console.log("📡 Bun OS Signals Demo\n");
console.log("=".repeat(70));

console.log("\n1️⃣ Available Signal Handlers");
console.log("-".repeat(70));
console.log(`Supported signals in Bun:
  • SIGINT   - Interrupt (CTRL+C)
  • SIGTERM  - Termination request
  • SIGKILL  - Force kill (cannot be caught)
  • SIGUSR1  - User-defined signal 1
  • SIGUSR2  - User-defined signal 2
  • SIGHUP   - Hang up (terminal closed)
  • SIGALRM  - Alarm clock
  • SIGWINCH - Window resize
`);

// Track received signals
const receivedSignals: string[] = [];

// Handle SIGINT
process.on("SIGINT", () => {
  receivedSignals.push("SIGINT");
  console.log("\n📥 Received: SIGINT (CTRL+C)");
  console.log("   → Cleaning up and exiting gracefully...");
  gracefulShutdown("SIGINT");
});

// Handle SIGTERM
process.on("SIGTERM", () => {
  receivedSignals.push("SIGTERM");
  console.log("\n📥 Received: SIGTERM");
  console.log("   → Termination requested, shutting down...");
  gracefulShutdown("SIGTERM");
});

// Handle SIGHUP (terminal closed)
process.on("SIGHUP", () => {
  receivedSignals.push("SIGHUP");
  console.log("\n📥 Received: SIGHUP (terminal closed)");
  gracefulShutdown("SIGHUP");
});

// Handle beforeExit
process.on("beforeExit", (code) => {
  console.log(`\n📤 beforeExit: Event loop is empty (code: ${code})`);
  if (receivedSignals.length > 0) {
    console.log(`   Signals received: ${receivedSignals.join(", ")}`);
  }
});

// Handle exit
process.on("exit", (code) => {
  console.log(`\n🚪 exit: Process exiting with code ${code}`);
});

// Graceful shutdown function
function gracefulShutdown(signal: string) {
  console.log(`\n🔄 Graceful shutdown initiated by ${signal}`);
  console.log("   1. Stopping new connections...");
  console.log("   2. Closing existing connections...");
  console.log("   3. Saving state...");
  console.log("   4. Exiting...\n");
  
  // Simulate cleanup delay
  setTimeout(() => {
    console.log("✅ Cleanup complete!");
    process.exit(0);
  }, 500);
}

// Demo instructions
console.log("\n2️⃣ Testing Signals");
console.log("-".repeat(70));
console.log(`Run these commands in another terminal:

  Send SIGINT (same as CTRL+C):
    kill -INT ${process.pid}

  Send SIGTERM:
    kill -TERM ${process.pid}

  Send SIGHUP:
    kill -HUP ${process.pid}

Or press CTRL+C in this terminal.
`);

console.log("\n3️⃣ Waiting for signals...");
console.log("-".repeat(70));
console.log(`(Process PID: ${process.pid})`);
console.log("(Will exit automatically after 5 seconds)\n");

// Keep process alive
let seconds = 0;
const interval = setInterval(() => {
  seconds += 1;
  console.log(`   Waiting... (${seconds}s elapsed)`);
  
  if (seconds >= 5) {
    clearInterval(interval);
    console.log("\n⏱️  Timeout reached, exiting...");
    process.exit(0);
  }
}, 1000);

console.log("💡 Send a signal or press CTRL+C to see the handlers in action!");
console.log("   (Demo will auto-exit after 5 seconds)\n");
