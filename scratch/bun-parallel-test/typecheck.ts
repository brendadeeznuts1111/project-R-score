// Simulates type checking (~1s)
const start = performance.now();
console.log("[typecheck] Analyzing types...");
await Bun.sleep(600);
console.log("[typecheck] Resolving generics...");
await Bun.sleep(400);
const elapsed = (performance.now() - start).toFixed(0);
console.log(`[typecheck] No errors found. Done in ${elapsed}ms`);
