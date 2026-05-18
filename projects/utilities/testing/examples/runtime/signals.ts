/**
 * This example demonstrates signal handling and environment variables in Bun.
 * Reference: https://bun.com/docs/api/process#signals
 */

console.info(`Process ID: ${process.pid}`);
console.info("--- Signal Handling ---");
console.info("Try pressing Ctrl+C or running: kill -SIGUSR1", process.pid);

// Listen for SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  console.info("\nReceived SIGINT. Cleaning up...");
  process.exit(0);
});

// Custom signal
process.on("SIGUSR1", () => {
  console.info("Received SIGUSR1! Reloading configuration or state...");
});

// Demonstrate Bun.env vs process.env
// Bun.env is restricted to the variables present at startup, but faster.
console.info("\n--- Environment Variables ---");
const key = "BUN_DEMO_VAR";
process.env[key] = "Hello world";

console.info(`process.env[${key}]:`, process.env[key]);
console.info(`Bun.env[${key}]:    `, Bun.env[key]); // Might be undefined if added after startup

// Keep process alive for a bit to allow for signal testing
console.info("\nProcess will stay alive for 10 seconds. You can send signals now.");
const timer = setTimeout(() => {
  console.info("Timeout reached. Exiting peacefully.");
}, 10000);

// Unref the timer so it doesn't block exit if we have no other reason to stay alive (optional here)
// timer.unref(); 
