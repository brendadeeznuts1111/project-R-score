/**
 * This example helps observe memory usage in Bun.
 * Flags:
 * - --smol: Use less memory, but run garbage collection more often.
 */

function printMemory() {
  const usage = process.memoryUsage();
  console.log(`RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB | Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
}

console.log("--- Memory Usage Observation ---");
printMemory();

console.log("\nAllocating memory...");
const data = [];
for (let i = 0; i < 5; i++) {
  // Allocate roughly 10MB of strings in each iteration
  data.push(".".repeat(10 * 1024 * 1024));
  printMemory();
}

console.log("\nClearing references and forcing GC...");
data.length = 0;
Bun.gc(true);
printMemory();

console.log("\nNote: Try running this with and without the `--smol` flag to observe differences in GC frequency and memory overhead.");
