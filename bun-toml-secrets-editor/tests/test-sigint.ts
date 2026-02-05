#!/usr/bin/env bun

/**
 * Test script to demonstrate SIGINT (Ctrl+C) handling
 */

import { DuoplusCLI } from "./src/cli/duoplus-cli";
import { ProcessUtils } from "./src/utils/process-utils";

async function testProcessUtilsSigint() {
	console.log("🧪 Testing ProcessUtils SIGINT Handling");
	console.log("========================================\n");

	console.log("📝 This test will run a long-running process.");
	console.log("💡 Press Ctrl+C to test graceful shutdown.\n");

	try {
		// Start a long-running process (sleep for 30 seconds)
		console.log("🚀 Starting long-running process (sleep 30)...");
		await ProcessUtils.captureOutput(["sleep", "30"], { timeout: 35000 });
		console.log("✅ Process completed normally");
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Process failed with exit code")
		) {
			console.log("✅ Process was interrupted (expected behavior)");
		} else {
			console.log(
				"❌ Unexpected error:",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}
}

async function testCLISigint() {
	console.log("\n🧪 Testing CLI SIGINT Handling");
	console.log("===============================\n");

	console.log("📝 This will test the CLI graceful shutdown.");
	console.log("💡 Press Ctrl+C to test graceful shutdown.\n");

	const cli = new DuoplusCLI();

	try {
		// Test a command that could be interrupted
		console.log("🚀 Testing cloud status (interruptible)...");
		await cli.run({ cloudStatus: true, verbose: true });
	} catch (_error) {
		console.log("ℹ️  CLI operation was interrupted");
	}
}

async function main() {
	console.log("🎯 SIGINT (Ctrl+C) Handling Demonstration");
	console.log("======================================\n");

	console.log("This demo shows how the DuoPlus CLI handles graceful shutdown.");
	console.log("Each test will wait for you to press Ctrl+C.\n");

	// Wait for user to continue
	console.log("Press Enter to start ProcessUtils test...");
	await new Promise((resolve) => {
		process.stdin.once("data", resolve);
	});

	await testProcessUtilsSigint();

	console.log(`\n${"=".repeat(50)}\n`);

	console.log("Press Enter to start CLI test...");
	await new Promise((resolve) => {
		process.stdin.once("data", resolve);
	});

	await testCLISigint();

	console.log("\n✨ SIGINT handling demo completed!");
	console.log("💡 The CLI and ProcessUtils now handle Ctrl+C gracefully.");
}

// Setup stdin for interactive demo
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

// Run the demo
main()
	.catch(console.error)
	.finally(() => {
		// Restore stdin
		process.stdin.setRawMode(false);
		process.stdin.pause();
		process.exit(0);
	});
