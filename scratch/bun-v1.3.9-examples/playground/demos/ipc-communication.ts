#!/usr/bin/env bun
/**
 * Demo: IPC Communication with Bun.spawn()
 * 
 * Spawn child processes and communicate via IPC
 */

console.info("📡 Bun IPC Communication Demo\n");
console.info("=".repeat(70));

// Create a child process with IPC
const child = Bun.spawn({
  cmd: [process.execPath, "--eval", `
    // Child process code
    console.info("Child: Started");
    
    // Send message to parent
    process.send({ type: "ready", pid: process.pid });
    
    // Listen for messages from parent
    process.on("message", (msg) => {
      console.info("Child received:", msg);
      
      // Respond
      process.send({ 
        type: "response", 
        echo: msg,
        timestamp: Date.now()
      });
      
      // Exit after response (give parent time to send second message)
      setTimeout(() => process.exit(0), 500);
    });
  `],
  ipc(message) {
    console.info("Parent received:", message);
  },
  stdout: "inherit",
  stderr: "inherit",
});

console.info("Parent: Child spawned with PID", child.pid);

// Send messages to child
setTimeout(() => {
  console.info("\nParent: Sending hello...");
  child.send("Hello from parent!");
}, 100);

setTimeout(() => {
  console.info("Parent: Sending object...");
  child.send({ type: "command", action: "doSomething", data: [1, 2, 3] });
}, 300);

// Wait for child to finish
setTimeout(() => {
  console.info("\n✅ IPC demo complete!");
  process.exit(0);
}, 1000);
