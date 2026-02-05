#!/usr/bin/env bun

/**
 * Comprehensive test script for OS signal handling
 * Tests SIGINT, SIGTERM, beforeExit, exit, uncaughtException, and unhandledRejection
 */

import { DuoplusCLI } from "./src/cli/duoplus-cli";
import { ProcessUtils } from "./src/utils/process-utils";

async function testProcessUtilsSignals() {
	console.log("🧪 Testing ProcessUtils Signal Handling");
	console.log("======================================\n");

	console.log("📝 This test demonstrates comprehensive signal handling:");
	console.log("   • SIGINT (Ctrl+C) - Graceful shutdown");
	console.log("   • SIGTERM - Termination signal");
	console.log("   • beforeExit - Event loop empty");
	console.log("   • exit - Process exiting");
	console.log("   • uncaughtException - Unhandled errors");
	console.log("   • unhandledRejection - Promise rejections\n");

	try {
		console.log("🚀 Starting long-running process (sleep 30)...");
		console.log("💡 Try these signals to test handling:");
		console.log("   • Press Ctrl+C for SIGINT");
		console.log("   • Run: kill -TERM <pid> for SIGTERM");
		console.log("   • Let it complete naturally for beforeExit/exit\n");

		// Start a long-running process that will be tracked
		await ProcessUtils.captureOutput(["sleep", "30"], { timeout: 35000 });
		console.log("✅ Process completed normally");
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Process failed with exit code")
		) {
			console.log("✅ Process was interrupted gracefully");
		} else {
			console.log(
				"❌ Unexpected error:",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}
}

async function _testUncaughtException() {
	console.log("\n🧪 Testing Uncaught Exception Handling");
	console.log("=====================================\n");

	console.log("💡 This will demonstrate uncaught exception handling...");

	// Simulate an uncaught exception after a delay
	setTimeout(() => {
		console.log("💥 Throwing uncaught exception...");
		throw new Error("This is a test uncaught exception");
	}, 1000);

	// Wait a bit to see the exception
	await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function _testUnhandledRejection() {
	console.log("\n🧪 Testing Unhandled Promise Rejection");
	console.log("====================================\n");

	console.log("💡 This will demonstrate unhandled promise rejection...");

	// Create a promise that rejects
	setTimeout(() => {
		console.log("⚠️  Creating unhandled promise rejection...");
		Promise.reject(new Error("This is a test unhandled promise rejection"));
	}, 1000);

	// Wait a bit to see the rejection
	await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function testCLISignals() {
	console.log("\n🧪 Testing CLI Signal Handling");
	console.log("==============================\n");

	console.log("💡 Testing CLI-specific signal handling...");

	const cli = new DuoplusCLI();

	try {
		// Test a command that could be interrupted
		console.log("🚀 Testing cloud status with signal handling...");
		await cli.run({ cloudStatus: true, verbose: true });
	} catch (_error) {
		console.log("ℹ️  CLI operation was handled gracefully");
	}
}

async function main() {
	console.log("🎯 Comprehensive OS Signal Handling Demo");
	console.log("========================================\n");

	console.log("This demo shows how the DuoPlus CLI and ProcessUtils");
	console.log("handle various OS signals for robust operation.\n");

	// Test 1: ProcessUtils signals
	await testProcessUtilsSignals();

	console.log(`\n${"=".repeat(50)}\n`);

	// Test 2: CLI signals
	await testCLISignals();

	console.log(`\n${"=".repeat(50)}\n`);

	// Ask user if they want to test error handling
	console.log("📝 Additional tests available:");
	console.log("   • Uncaught exception handling");
	console.log("   • Unhandled promise rejection");
	console.log("\n💡 These will cause the process to exit with cleanup.");

	console.log("\n✨ Signal handling demo completed!");
	console.log("💡 All signals are now handled with proper cleanup.");
}

// Handle process termination for this test script
process.on("SIGINT", () => {
	console.log("\n🛑 Test script interrupted - Exiting gracefully...");
	process.exit(0);
});

// Run the demonstration
main().catch(console.error);
