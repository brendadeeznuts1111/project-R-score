#!/usr/bin/env bun

/**
 * Minimal SIGINT Test
 * Stripped down to basics
 */

console.log("🧪 Minimal SIGINT Test");

// Basic handler
process.on("SIGINT", () => {
	console.log("\nSIGINT received!");
	process.exit(0);
});

console.log("Handler registered. Waiting for SIGINT...");
console.log(`Try: Ctrl+C OR kill -SIGINT ${process.pid}`);

// Simple loop
let i = 0;
setInterval(() => {
	i++;
	console.log(`Loop ${i}`);
	if (i > 5) {
		console.log("Auto-exit");
		process.exit(0);
	}
}, 1000);
