#!/usr/bin/env bun
/**
 * Demo: IPC Communication with Bun.spawn()
 * 
 * Spawn child processes and communicate via IPC
 */

console.log("📡 Bun IPC Communication Demo\n");
console.log("=".repeat(70));

// Create a child process with IPC
const child = Bun.spawn({
  cmd: [process.execPath, "--eval", `
    // Child process code
    console.log("Child: Started");
    
    // Send message to parent
    process.send({ type: "ready", pid: process.pid });
    
    // Listen for messages from parent
    process.on("message", (msg) => {
      console.log("Child received:", msg);
      
      // Respond
      process.send({ 
        type: "response", 
        echo: msg,
        timestamp: Date.now()
      });
      
      // Exit after response
      setTimeout(() => process.exit(0), 100);
    });
  `],
  ipc(message) {
    console.log("Parent received:", message);
  },
  stdout: "inherit",
  stderr: "inherit",
});

console.log("Parent: Child spawned with PID", child.pid);

// Send messages to child
setTimeout(() => {
  console.log("\nParent: Sending hello...");
  child.send("Hello from parent!");
}, 100);

setTimeout(() => {
  console.log("Parent: Sending object...");
  child.send({ type: "command", action: "doSomething", data: [1, 2, 3] });
}, 300);

// Wait for child to finish
setTimeout(() => {
  console.log("\n✅ IPC demo complete!");
  process.exit(0);
}, 1000);
