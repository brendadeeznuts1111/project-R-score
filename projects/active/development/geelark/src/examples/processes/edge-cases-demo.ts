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

console.info("🧪 Edge Cases Demo - Testing IPC and Process Edge Cases\n");

console.info("1️⃣ Testing IPC with circular references:");
const circular: any = {};
circular.self = circular;

try {
  // This will throw a serialization error
  Bun.spawn([process.execPath, "-e", "console.info('test')"], {
    ipc(message, proc) {
      proc.send(circular);
    },
  });
} catch (error) {
  console.info(`✅ Expected error caught: ${error.message}`);
}

console.info("\n2️⃣ Testing IPC with unsupported types:");
const child1 = Bun.spawn([process.execPath, "-e", "process.on('message', () => process.exit(0))"]);

setTimeout(() => {
  try {
    // Functions can't be serialized in IPC
    child1.send(() => console.info("function"));
  } catch (error) {
    console.info(`✅ Expected error caught: ${error.message}`);
  }
}, 100);

console.info("\n3️⃣ Testing child process exit timing:");
const child2 = Bun.spawn([process.execPath, "-e",
  `
  process.on("message", (msg) => {
    console.info("Child received:", msg);
    // Child exits before sending response
    process.exit(0);
  });
  `
]);

setTimeout(() => {
  child2.send("Message after child exits");
  // IPC message might be lost if sent after child exits
}, 200);

console.info("\n4️⃣ Testing signal handling during cleanup:");
let cleanupStarted = false;

process.on("SIGINT", () => {
  console.info("\n🛑 SIGINT during cleanup test");

  if (!cleanupStarted) {
    cleanupStarted = true;
    console.info("Starting cleanup...");

    // Simulate cleanup operation
    setTimeout(() => {
      console.info("Cleanup completed, exiting now");
      process.exit(0);
    }, 2000);
  } else {
    console.info("Cleanup already in progress, forcing exit");
    process.exit(1);
  }
});

console.info("Press Ctrl+C during different phases to test signal handling");
console.info("Press Ctrl+C now (normal), wait, then press again (force exit)\n");

// Simulate different phases
setTimeout(() => console.info("Phase 1: Normal operation"), 500);
setTimeout(() => console.info("Phase 2: Performing work..."), 1500);
setTimeout(() => console.info("Phase 3: Ready for interrupt"), 2500);

// Keep running to test interrupts
const timer = setInterval(() => {
  process.stdout.write("⏳");
}, 300);

// Cleanup on exit
process.on("exit", () => {
  clearInterval(timer);
  console.info("\n🏁 Demo completed");
});
