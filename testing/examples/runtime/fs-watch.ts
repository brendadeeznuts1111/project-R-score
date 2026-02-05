/**
 * File System Watch Demo
 * 
 * Demonstrates:
 * - fs.watch for detecting file changes
 * - Recursive watching
 * - Async iterable pattern (fs/promises)
 * - Clean shutdown with SIGINT
 */

import { watch } from "fs";
import { watch as watchPromises } from "fs/promises";

console.log("=== Bun File System Watch Demo ===\n");

console.log(`Watching directory: ${import.meta.dir}`);

// 1. Callback-based watcher (Shallow)
const watcher = watch(import.meta.dir, (event, filename) => {
  if (filename) {
    console.log(`[Callback] Detected ${event} in ${filename}`);
  }
});

// 2. Async iterable watcher (Recursive)
// This runs independently to show both patterns
async function startRecursiveWatcher() {
  console.log("\n[Async] Starting recursive watcher...");
  const recursiveWatcher = watchPromises(import.meta.dir, { recursive: true });
  
  try {
    for await (const event of recursiveWatcher) {
      console.log(`[Async] ${event.eventType}: ${event.filename}`);
    }
  } catch (err) {
    // Watcher closed or error
  }
}

// Start recursive watcher (we ignore errors if it fails in this simple demo)
startRecursiveWatcher().catch(() => {});

// 3. Clean Shutdown with SIGINT
process.on("SIGINT", () => {
  console.log("\n\n🛑 Received Ctrl+C. Closing watchers...");
  watcher.close();
  // Note: The async watcher will close when the process exits
  process.exit(0);
});

console.log("\nWaiting for file changes...");
console.log("Create, modify, or delete a file in this directory to see events.");
console.log("Press Ctrl+C to stop.");

// Keep alive
await new Promise(() => {});
