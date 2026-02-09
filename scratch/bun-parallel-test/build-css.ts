const start = performance.now();
console.log("[build:css] Compiling stylesheets...");
await Bun.sleep(400);
console.log(`[build:css] Done in ${(performance.now() - start).toFixed(0)}ms`);
