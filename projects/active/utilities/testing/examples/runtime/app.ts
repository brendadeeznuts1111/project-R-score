/**
 * Main Application Script
 * 
 * Run this with: bun --preload ./preload.ts app.ts
 */

// Accessing globals defined in the preload script
const startTime = (globalThis as any).APP_START_TIME;
const config = (globalThis as any).APP_CONFIG;

console.info("[APP] Application logic started.");

if (config) {
  console.info(`[APP] Config found: version ${config.version}, debug: ${config.debug}`);
} else {
  console.info("[APP] WARNING: No config found. Run with --preload to initialize.");
}

if (startTime) {
  const diff = Date.now() - startTime;
  console.info(`[APP] Time since preload: ${diff}ms`);
}

console.info("[APP] Application finished.");
