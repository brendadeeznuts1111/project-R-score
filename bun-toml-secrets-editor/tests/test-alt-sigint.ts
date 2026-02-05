#!/usr/bin/env bun

/**
 * Alternative SIGINT Test
 * Different approaches to signal handling
 */

console.log("🔄 Alternative SIGINT Approaches");

// Approach 1: Standard SIGINT
process.on("SIGINT", () => {
	console.log("\n✅ Approach 1: Standard SIGINT worked!");
	process.exit(0);
});

// Approach 2: Raw mode signal detection
if (process.stdin.setRawMode) {
	process.stdin.setRawMode(true);
	process.stdin.on("data", (key) => {
		// Ctrl+C is \u0003
		if (key === "\u0003") {
			console.log("\n✅ Approach 2: Raw Ctrl+C detected!");
			process.stdin.setRawMode(false);
			process.exit(0);
		}
	});
	console.log("✅ Raw mode enabled");
} else {
	console.log("❌ Raw mode not available");
}

// Approach 3: Polling for signal
const _sigintReceived = false;
const originalListeners = process.listeners("SIGINT");
console.log(`📊 SIGINT listeners: ${originalListeners.length}`);

// Approach 4: Manual kill test
setTimeout(() => {
	console.log("\n⚡ Attempting manual SIGINT...");
	try {
		process.kill(process.pid, "SIGINT");
	} catch (error: any) {
		console.log("❌ Manual SIGINT failed:", error.message);
	}
}, 2000);

// Keep alive
console.log("⏳ Waiting for SIGINT (multiple approaches)...");
let count = 0;
setInterval(() => {
	count++;
	console.log(`Waiting... ${count}`);
	if (count > 8) {
		console.log("⏰ Timeout - no SIGINT received");
		process.exit(1);
	}
}, 1000);
