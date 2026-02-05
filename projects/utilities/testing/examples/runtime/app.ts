/**
 * Main Application Script
 * 
 * Run this with: bun --preload ./preload.ts app.ts
 */

// Accessing globals defined in the preload script
const startTime = (globalThis as any).APP_START_TIME;
const config = (globalThis as any).APP_CONFIG;

console.log("[APP] Application logic started.");

if (config) {
  console.log(`[APP] Config found: version ${config.version}, debug: ${config.debug}`);
} else {
  console.log("[APP] WARNING: No config found. Run with --preload to initialize.");
}

if (startTime) {
  const diff = Date.now() - startTime;
  console.log(`[APP] Time since preload: ${diff}ms`);
}

console.log("[APP] Application finished.");
