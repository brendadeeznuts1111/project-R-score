/**
 * Advanced Bun Runtime & Process Control Demo
 * 
 * This script acts as a mini-monitor that spawns tasks and tracks health.
 * Highlights:
 * - Bun.spawn for task management
 * - process.on('SIGINT') for clean shutdown
 * - memoryUsage() for health tracking
 * - Bun.env for configuration
 */

import { formatBytes } from "../../utils/table-formatter"; // Reusing project utils if possible, but let's keep it self-contained for robustness

function formatMb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

console.info("🚀 Advanced Process Monitor Started");
console.info(`Main Entry: ${Bun.main}`);
console.info(`PID: ${process.pid}`);
console.info("----------------------------------\n");

// 1. Monitor health every 2 seconds
const monitor = setInterval(() => {
  const { rss, heapUsed } = process.memoryUsage();
  console.info(`[MONITOR] RSS: ${formatMb(rss)} | Heap: ${formatMb(heapUsed)}`);
}, 2000);

// 2. Spawn a background "worker" (a simple shell command)
console.info("Spawning long-running worker process...");
const worker = Bun.spawn(["sh", "-c", "for i in 1 2 3; do echo 'Worker pulse '$i; sleep 1; done"], {
  stdout: "pipe",
});

// Stream worker output
(async () => {
  const reader = worker.stdout.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.info(`[WORKER] ${new TextDecoder().decode(value).trim()}`);
  }
  console.info("[WORKER] Finished work.");
})();

// 3. Handle Graceful Shutdown
process.on("SIGINT", () => {
  console.info("\n\n🛑 Shutdown signal received.");
  clearInterval(monitor);
  worker.kill();
  console.info("Cleaning up resources... done.");
  process.exit(0);
});

console.info("\nPress Ctrl+C to stop the monitor.");

// 4. Demonstrate unhandled rejections configuration if needed
// (But we want this script to stay alive, so we won't trigger a fatal one here)
