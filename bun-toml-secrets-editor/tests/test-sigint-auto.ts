#!/usr/bin/env bun

/**
 * Simple Automated SIGINT Test
 * Tests process.on("SIGINT") without hanging
 */

console.log("🧪 Simple SIGINT Test");
console.log("=====================");

// Set up SIGINT handler
process.on("SIGINT", () => {
	console.log("✅ SIGINT handler triggered!");
	process.exit(0);
});

console.log("🚀 Starting automated test...");

// Auto-send SIGINT after 1 second
setTimeout(() => {
	console.log("⚡ Sending SIGINT to self...");
	process.kill(process.pid, "SIGINT");
}, 1000);

// Timeout after 5 seconds
setTimeout(() => {
	console.log("❌ Test timed out");
	process.exit(1);
}, 5000);

console.log("⏳ Waiting for SIGINT...");
