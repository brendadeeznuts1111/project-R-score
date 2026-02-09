// Simulates a slow task (~3s)
const start = performance.now();
console.log("[slow] Starting long-running task...");
for (let i = 1; i <= 6; i++) {
  await Bun.sleep(500);
  console.log(`[slow] Progress: ${Math.round((i / 6) * 100)}%`);
}
const elapsed = (performance.now() - start).toFixed(0);
console.log(`[slow] Completed in ${elapsed}ms`);
