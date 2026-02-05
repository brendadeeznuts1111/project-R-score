#!/usr/bin/env bun

/**
 * IPC Parent Process Example
 *
 * This example demonstrates spawning a child process with IPC (Inter-Process Communication)
 * and handling messages between parent and child processes.
 *
 * Uses process.execPath to ensure we're spawning another Bun process (required for IPC).
 */

console.log("🚀 IPC Parent Process Example\n");

const child = Bun.spawn([process.execPath, "child.ts"], {
  ipc(message, childProc) {
    try {
      console.log(`📨 Received from child:`, message);

      // Handle potential serialization issues in response
      childProc.send({
        response: "Message received",
        timestamp: Date.now(),
        // Edge case: What happens with deeply nested objects?
        // Test with: {} then check
      });
    } catch (error) {
      console.error(`❌ Failed to send response to child: ${error.message}`);
      // Edge case: Handle IPC communication errors gracefully
      // Process continues running even if child communication fails
    }
  },
});

// Handle CTRL+C
process.on("SIGINT", () => {
  console.log("Ctrl-C was pressed");
  child.kill("SIGTERM"); // Gracefully terminate child
  process.exit();
});

// Send initial message to child
child.send("Hello from parent! I am your father");

// Wait for the child process to exit
await child.exited;
console.log(`\n✅ Child process exited with code: ${child.exitCode}`);
