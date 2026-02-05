#!/usr/bin/env bun

/**
 * Edge Cases Demo - IPC and Process Error Handling
 *
 * Demonstrates various edge cases and error conditions in:
 * - IPC message serialization
 * - Process lifecycle management
 * - Signal handling
 * - Error recovery
 */

console.log("🧪 Edge Cases Demo - Testing IPC and Process Edge Cases\n");

console.log("1️⃣ Testing IPC with circular references:");
const circular: any = {};
circular.self = circular;

try {
  // This will throw a serialization error
  Bun.spawn([process.execPath, "-e", "console.log('test')"], {
    ipc(message, proc) {
      proc.send(circular);
    },
  });
} catch (error) {
  console.log(`✅ Expected error caught: ${error.message}`);
}

console.log("\n2️⃣ Testing IPC with unsupported types:");
const child1 = Bun.spawn([process.execPath, "-e", "process.on('message', () => process.exit(0))"]);

setTimeout(() => {
  try {
    // Functions can't be serialized in IPC
    child1.send(() => console.log("function"));
  } catch (error) {
    console.log(`✅ Expected error caught: ${error.message}`);
  }
}, 100);

console.log("\n3️⃣ Testing child process exit timing:");
const child2 = Bun.spawn([process.execPath, "-e",
  `
  process.on("message", (msg) => {
    console.log("Child received:", msg);
    // Child exits before sending response
    process.exit(0);
  });
  `
]);

setTimeout(() => {
  child2.send("Message after child exits");
  // IPC message might be lost if sent after child exits
}, 200);

console.log("\n4️⃣ Testing signal handling during cleanup:");
let cleanupStarted = false;

process.on("SIGINT", () => {
  console.log("\n🛑 SIGINT during cleanup test");

  if (!cleanupStarted) {
    cleanupStarted = true;
    console.log("Starting cleanup...");

    // Simulate cleanup operation
    setTimeout(() => {
      console.log("Cleanup completed, exiting now");
      process.exit(0);
    }, 2000);
  } else {
    console.log("Cleanup already in progress, forcing exit");
    process.exit(1);
  }
});

console.log("Press Ctrl+C during different phases to test signal handling");
console.log("Press Ctrl+C now (normal), wait, then press again (force exit)\n");

// Simulate different phases
setTimeout(() => console.log("Phase 1: Normal operation"), 500);
setTimeout(() => console.log("Phase 2: Performing work..."), 1500);
setTimeout(() => console.log("Phase 3: Ready for interrupt"), 2500);

// Keep running to test interrupts
const timer = setInterval(() => {
  process.stdout.write("⏳");
}, 300);

// Cleanup on exit
process.on("exit", () => {
  clearInterval(timer);
  console.log("\n🏁 Demo completed");
});
