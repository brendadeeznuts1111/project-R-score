// Simulates a build step (~1.5s)
const start = performance.now();
console.log("[build] Starting compilation...");
await Bun.sleep(500);
console.log("[build] Compiling modules...");
await Bun.sleep(500);
console.log("[build] Generating output...");
await Bun.sleep(500);
const elapsed = (performance.now() - start).toFixed(0);
console.log(`[build] Done in ${elapsed}ms`);
