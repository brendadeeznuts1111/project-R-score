#!/usr/bin/env bun

/**
 * Test: Process Exit Events
 * Demonstrates beforeExit and exit event handlers
 */

export {}; // Make this file a module

console.log("🧪 Testing Process Exit Events");
console.log("==============================");

// Set up the event handlers exactly as specified
process.on("beforeExit", (code) => {
	console.log(`Event loop is empty with code ${code}!`);
});

process.on("exit", (code) => {
	console.log(`Process is exiting with code ${code}`);
});

console.log("✅ Event handlers registered");
console.log("📝 Test will complete and trigger events...");

// Simulate some work
setTimeout(() => {
	console.log("⏰ Work completed - process will exit naturally");
}, 1000);

// Additional test - handle manual exit
setTimeout(() => {
	console.log("🚪 You can also press Ctrl+C to test signal handling");
}, 500);
