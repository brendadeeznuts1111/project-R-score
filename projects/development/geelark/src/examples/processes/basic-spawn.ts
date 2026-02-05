#!/usr/bin/env bun

/**
 * Basic Child Process Spawning Examples
 *
 * This example demonstrates the fundamental usage of Bun.spawn()
 * for executing child processes with different scenarios.
 */

console.log("🚀 Basic Child Process Spawning Examples\n");

// Example 1: Simple command execution
console.log("1. Simple echo command:");
const proc1 = Bun.spawn(["echo", "Hello from a child process!"]);

// Wait for completion
await proc1.exited;
console.log(`Process exited with code: ${proc1.exitCode}\n`);

// Example 2: Command with multiple arguments
console.log("2. Multiple arguments:");
const proc2 = Bun.spawn(["echo", "First arg", "Second arg", "Third arg"]);
await proc2.exited;
console.log(`Exit code: ${proc2.exitCode}\n`);

// Example 3: Different executable (if available)
console.log("3. Using a system command:");
try {
  const proc3 = Bun.spawn(["pwd"]); // Print working directory
  await proc3.exited;
  console.log(`Exit code: ${proc3.exitCode}\n`);
} catch (error) {
  console.log(`Error running pwd: ${error.message}\n`);
}

// Example 4: Long-running process (with timeout)
console.log("4. Long-running process (with sleep simulation):");
const proc4 = Bun.spawn(["sleep", "1"]); // Sleep for 1 second
const start = Date.now();

try {
  // Set a timeout in case the process hangs
  const timeout = setTimeout(() => {
    proc4.kill();
    console.log("Process was killed due to timeout");
  }, 3000);

  await proc4.exited;
  clearTimeout(timeout);
  console.log(`Sleep completed in ${(Date.now() - start)}ms, exit code: ${proc4.exitCode}\n`);
} catch (error) {
  console.log(`Error: ${error.message}\n`);
}

console.log("✅ Basic spawning examples completed!");
