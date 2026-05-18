#!/usr/bin/env bun

/**
 * Simple demonstration of enhanced OS signal handling
 */

import { ProcessUtils } from "../../src/utils/process-utils";

async function demonstrateSignals() {
	console.info("🎯 Enhanced OS Signal Handling Demo");
	console.info("===================================\n");

	console.info("📝 This demo shows comprehensive signal handling:");
	console.info("   • SIGINT (Ctrl+C) - Graceful shutdown with process cleanup");
	console.info("   • SIGTERM - Termination signal handling");
	console.info("   • beforeExit - Final cleanup when event loop empties");
	console.info("   • exit - Process exit logging");
	console.info("   • Error handling for uncaught exceptions/rejections\n");

	console.info("🚀 Starting 15-second process...");
	console.info("💡 Try pressing Ctrl+C to see the enhanced signal handling\n");

	try {
		// This will be tracked and cleaned up on any signal
		await ProcessUtils.captureOutput(["sleep", "15"]);
		console.info("✅ Process completed naturally");
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Process failed with exit code")
		) {
			console.info("✅ Process was gracefully interrupted with full cleanup");
		} else {
			console.info(
				"❌ Unexpected error:",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	console.info("\n🎉 Demo completed!");
	console.info("💡 The ProcessUtils now handles all major OS signals");
	console.info("   with comprehensive cleanup and logging.");
}

// Run the demonstration
demonstrateSignals().catch(console.error);
