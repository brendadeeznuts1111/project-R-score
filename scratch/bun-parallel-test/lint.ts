// Simulates a linter (~0.8s)
const start = performance.now();
console.log("[lint] Checking code style...");
await Bun.sleep(400);
console.log("[lint] Checking imports...");
await Bun.sleep(400);
const elapsed = (performance.now() - start).toFixed(0);
console.log(`[lint] All clean! Done in ${elapsed}ms`);
