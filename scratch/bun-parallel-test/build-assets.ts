const start = performance.now();
console.log("[build:assets] Copying static assets...");
await Bun.sleep(300);
console.log(`[build:assets] Done in ${(performance.now() - start).toFixed(0)}ms`);
