#!/usr/bin/env bun

/**
 * IPC Child Process Example
 *
 * This example demonstrates communicating with a parent process via IPC
 * using process.send() and process.on("message").
 */

console.info("🚀 IPC Child Process Example\n");

// Handle CTRL+C
process.on("SIGINT", () => {
  console.info("Ctrl-C was pressed");
  process.exit();
});

// Send messages to parent (edge cases: rapid sending, large objects)
try {
  process.send("Hello from child as string");

  // Edge case: Send object with nested structures
  process.send({
    message: "Hello from child as object",
    timestamp: Date.now(),
    nested: { level1: { level2: "deep nesting" } }
  });

  // Edge case: What happens if we send circular references?
  // const circular = {}; circular.self = circular;
  // process.send(circular); // Would throw serialization error
} catch (error) {
  console.error(`❌ Child failed to send message: ${error.message}`);
  // Edge case: Parent might terminate, orphaning the child
  process.exit(1); // Graceful exit on communication failure
}

// Listen for messages from parent
let responded = false;
process.on("message", message => {
  try {
    console.info(`📨 Received from parent:`, message);

    // Send a final response only once
    if (!responded) {
      responded = true;
      process.send("Child received your message! Goodbye.");
    }
  } catch (error) {
    console.error(`❌ Child failed to process message: ${error.message}`);
    // Edge case: IPC channel might be closed if parent exits
  }
});

// Edge case: Handle parent process termination
process.on("disconnect", () => {
  console.info("⚠️ Parent process disconnected");
  // Child continues running but can't communicate
});

// Exit after a short delay
setTimeout(() => {
  console.info("✅ Child process exiting...");
  process.exit(0);
}, 1000);
