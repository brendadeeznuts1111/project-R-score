/**
 * Preload Script
 * 
 * This script runs BEFORE the main target when using `bun --preload examples/runtime/preload.ts ...`
 */

console.info("[PRELOAD] Initializing environment...");
globalThis.APP_START_TIME = Date.now();
globalThis.APP_CONFIG = { debug: true, version: "1.0.0" };

console.info("[PRELOAD] Setup complete.\n");
