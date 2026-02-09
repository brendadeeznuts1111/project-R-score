const start = performance.now();
console.log("[build:js] Bundling JavaScript...");
await Bun.sleep(600);
console.log(`[build:js] Done in ${(performance.now() - start).toFixed(0)}ms`);
