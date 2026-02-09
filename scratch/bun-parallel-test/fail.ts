// Simulates a failing script
console.log("[fail] Starting task that will fail...");
await Bun.sleep(300);
console.error("[fail] ERROR: Something went wrong!");
process.exit(1);
