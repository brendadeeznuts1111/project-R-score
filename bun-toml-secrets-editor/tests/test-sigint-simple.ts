#!/usr/bin/env bun

/**
 * Simple SIGINT Test
 * Direct test of process.on("SIGINT") functionality
 */

console.log("🧪 Testing SIGINT Signal Handler");
console.log("================================");

// Set up SIGINT handler exactly as specified
process.on("SIGINT", () => {
	console.log("Ctrl-C was pressed");
	process.exit(0);
});

console.log("✅ SIGINT handler registered");
console.log("📝 Test process is running...");
console.log("⚡ Press Ctrl+C to test the handler");

// Keep the process alive with a heartbeat
let heartbeatCount = 0;
const heartbeat = setInterval(() => {
	heartbeatCount++;
	console.log(`💓 Heartbeat ${heartbeatCount} - Process still running...`);
}, 2000);

// Clean up on exit
process.on("exit", () => {
	clearInterval(heartbeat);
	console.log("🏁 Process exited cleanly");
});

// Handle other signals for completeness
process.on("SIGTERM", () => {
	console.log("🛑 SIGTERM received");
	clearInterval(heartbeat);
	process.exit(0);
});

console.log("⏰ Test will run for 30 seconds or until Ctrl+C is pressed");

// Auto-exit after 30 seconds if no SIGINT
setTimeout(() => {
	console.log("⏰ Test completed - no SIGINT received");
	clearInterval(heartbeat);
	process.exit(0);
}, 30000);
