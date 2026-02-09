#!/usr/bin/env bun
/**
 * Demo: Handling CTRL+C (SIGINT)
 * 
 * https://bun.com/docs/guides/process/ctrl-c
 */

console.log("⌨️  Bun CTRL+C Demo\n");
console.log("=".repeat(70));

console.log("\n1️⃣ Listening for CTRL+C (SIGINT)");
console.log("-".repeat(70));
console.log("Press CTRL+C to trigger the handler...\n");

let interruptCount = 0;
const maxInterrupts = 3;

// Handle SIGINT (CTRL+C)
process.on("SIGINT", () => {
  interruptCount++;
  console.log(`\n⚡ CTRL+C pressed! (count: ${interruptCount})`);
  
  if (interruptCount >= maxInterrupts) {
    console.log("👋 Exiting after 3 interrupts...");
    process.exit(0);
  } else {
    console.log(`   Press CTRL+C ${maxInterrupts - interruptCount} more time(s) to exit`);
    console.log("   (Or wait for timeout)\n");
  }
});

// Also handle beforeExit
process.on("beforeExit", () => {
  console.log("\n📤 Process beforeExit event (event loop empty)");
});

// And exit
process.on("exit", (code) => {
  console.log(`\n🚪 Process exit event with code: ${code}`);
});

// Simulate work
console.log("2️⃣ Simulating work (press CTRL+C to interrupt)...");
console.log("-".repeat(70));

let counter = 0;
const interval = setInterval(() => {
  counter++;
  console.log(`   Working... ${counter}s`);
  
  if (counter >= 10) {
    clearInterval(interval);
    console.log("\n✅ Work completed without interruption!");
    process.exit(0);
  }
}, 1000);

// Keep process alive
console.log("\n💡 Try pressing CTRL+C multiple times!");
console.log("   (Will auto-exit after 10 seconds)\n");
