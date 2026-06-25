#!/usr/bin/env bun

/**
 * Debug SIGINT Test
 * Troubleshooting SIGINT signal handling
 */

console.info("🔍 Debugging SIGINT Signal Handler");
console.info("===============================");

// Check if we're in a TTY
console.info("📊 Environment Info:");
console.info("   isTTY:", process.stdout.isTTY);
console.info("   platform:", process.platform);
console.info("   pid:", process.pid);

// Set up multiple signal handlers for debugging
console.info("\n🔧 Registering signal handlers...");

process.on("SIGINT", () => {
	console.info("\n✅ SIGINT handler triggered!");
	console.info("Ctrl-C was pressed");
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.info("\n✅ SIGTERM handler triggered!");
	process.exit(0);
});

// Also try alternative approach
process.on("SIGINT", () => {
	console.info("\n✅ Alternative SIGINT handler!");
	process.exit(0);
});

console.info("✅ Signal handlers registered");

// Test immediate signal sending
console.info("\n⚡ Testing immediate signal to self...");
setTimeout(() => {
	console.info("📤 Sending SIGINT to process...");
	process.kill(process.pid, "SIGINT");
}, 2000);

// Keep process alive
let tickCount = 0;
const interval = setInterval(() => {
	tickCount++;
	console.info(`💓 Tick ${tickCount} - Process running...`);

	if (tickCount >= 10) {
		console.info("⏰ Timeout reached, exiting...");
		clearInterval(interval);
		process.exit(1);
	}
}, 1000);

// Additional debugging
process.on("exit", (code) => {
	console.info(`🏁 Process exiting with code: ${code}`);
});

// Test manual signal handling
console.info("\n📝 Manual test options:");
console.info("   1. Wait for auto-signal (2 seconds)");
console.info("   2. Press Ctrl+C manually");
console.info("   3. Send signal from another terminal:");
console.info(`      kill -SIGINT ${process.pid}`);
