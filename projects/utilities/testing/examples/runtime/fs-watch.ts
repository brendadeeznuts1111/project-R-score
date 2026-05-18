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

console.info("=== Bun File System Watch Demo ===\n");

console.info(`Watching directory: ${import.meta.dir}`);

// 1. Callback-based watcher (Shallow)
const watcher = watch(import.meta.dir, (event, filename) => {
  if (filename) {
    console.info(`[Callback] Detected ${event} in ${filename}`);
  }
});

// 2. Async iterable watcher (Recursive)
// This runs independently to show both patterns
async function startRecursiveWatcher() {
  console.info("\n[Async] Starting recursive watcher...");
  const recursiveWatcher = watchPromises(import.meta.dir, { recursive: true });
  
  try {
    for await (const event of recursiveWatcher) {
      console.info(`[Async] ${event.eventType}: ${event.filename}`);
    }
  } catch (err) {
    // Watcher closed or error
  }
}

// Start recursive watcher (we ignore errors if it fails in this simple demo)
startRecursiveWatcher().catch(() => {});

// 3. Clean Shutdown with SIGINT
process.on("SIGINT", () => {
  console.info("\n\n🛑 Received Ctrl+C. Closing watchers...");
  watcher.close();
  // Note: The async watcher will close when the process exits
  process.exit(0);
});

console.info("\nWaiting for file changes...");
console.info("Create, modify, or delete a file in this directory to see events.");
console.info("Press Ctrl+C to stop.");

// Keep alive
await new Promise(() => {});
