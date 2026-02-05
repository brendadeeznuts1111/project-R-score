#!/usr/bin/env bun

/**
 * Debug SIGINT Test
 * Troubleshooting SIGINT signal handling
 */

console.log("🔍 Debugging SIGINT Signal Handler");
console.log("===============================");

// Check if we're in a TTY
console.log("📊 Environment Info:");
console.log("   isTTY:", process.stdout.isTTY);
console.log("   platform:", process.platform);
console.log("   pid:", process.pid);

// Set up multiple signal handlers for debugging
console.log("\n🔧 Registering signal handlers...");

process.on("SIGINT", () => {
	console.log("\n✅ SIGINT handler triggered!");
	console.log("Ctrl-C was pressed");
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("\n✅ SIGTERM handler triggered!");
	process.exit(0);
});

// Also try alternative approach
process.on("SIGINT", () => {
	console.log("\n✅ Alternative SIGINT handler!");
	process.exit(0);
});

console.log("✅ Signal handlers registered");

// Test immediate signal sending
console.log("\n⚡ Testing immediate signal to self...");
setTimeout(() => {
	console.log("📤 Sending SIGINT to process...");
	process.kill(process.pid, "SIGINT");
}, 2000);

// Keep process alive
let tickCount = 0;
const interval = setInterval(() => {
	tickCount++;
	console.log(`💓 Tick ${tickCount} - Process running...`);

	if (tickCount >= 10) {
		console.log("⏰ Timeout reached, exiting...");
		clearInterval(interval);
		process.exit(1);
	}
}, 1000);

// Additional debugging
process.on("exit", (code) => {
	console.log(`🏁 Process exiting with code: ${code}`);
});

// Test manual signal handling
console.log("\n📝 Manual test options:");
console.log("   1. Wait for auto-signal (2 seconds)");
console.log("   2. Press Ctrl+C manually");
console.log("   3. Send signal from another terminal:");
console.log(`      kill -SIGINT ${process.pid}`);
