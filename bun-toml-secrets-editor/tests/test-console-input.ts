#!/usr/bin/env bun

/**
 * Interactive Console Input Test
 * Demonstrates console async iterator for user input
 */

export {}; // Make this file a module

console.log("🎮 Interactive Console Test");
console.log("==========================");

const inputPrompt = "Type something: ";
process.stdout.write(inputPrompt);

for await (const line of console) {
	if (line.trim().toLowerCase() === "exit") {
		console.log("👋 Goodbye!");
		break;
	}

	if (line.trim().toLowerCase() === "help") {
		console.log("📖 Available commands:");
		console.log("  help  - Show this help");
		console.log("  exit  - Exit the program");
		console.log("  Any other text will be echoed back");
		process.stdout.write(inputPrompt);
		continue;
	}

	console.log(`You typed: ${line}`);
	process.stdout.write(inputPrompt);
}

console.log("✅ Interactive session ended");
