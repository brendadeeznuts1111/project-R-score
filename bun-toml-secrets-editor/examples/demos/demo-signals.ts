#!/usr/bin/env bun

/**
 * Simple demonstration of enhanced OS signal handling
 */

import { ProcessUtils } from "../../src/utils/process-utils";

async function demonstrateSignals() {
	console.log("🎯 Enhanced OS Signal Handling Demo");
	console.log("===================================\n");

	console.log("📝 This demo shows comprehensive signal handling:");
	console.log("   • SIGINT (Ctrl+C) - Graceful shutdown with process cleanup");
	console.log("   • SIGTERM - Termination signal handling");
	console.log("   • beforeExit - Final cleanup when event loop empties");
	console.log("   • exit - Process exit logging");
	console.log("   • Error handling for uncaught exceptions/rejections\n");

	console.log("🚀 Starting 15-second process...");
	console.log("💡 Try pressing Ctrl+C to see the enhanced signal handling\n");

	try {
		// This will be tracked and cleaned up on any signal
		await ProcessUtils.captureOutput(["sleep", "15"]);
		console.log("✅ Process completed naturally");
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Process failed with exit code")
		) {
			console.log("✅ Process was gracefully interrupted with full cleanup");
		} else {
			console.log(
				"❌ Unexpected error:",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	console.log("\n🎉 Demo completed!");
	console.log("💡 The ProcessUtils now handles all major OS signals");
	console.log("   with comprehensive cleanup and logging.");
}

// Run the demonstration
demonstrateSignals().catch(console.error);
