#!/usr/bin/env bun

/**
 * Simple demonstration of SIGINT handling
 */

import { ProcessUtils } from "../../src/utils/process-utils";

async function demonstrateSigint() {
	console.info("🎯 SIGINT (Ctrl+C) Handling Demo");
	console.info("===============================\n");

	console.info("📝 This demo shows graceful shutdown handling.");
	console.info("💡 Try pressing Ctrl+C during the sleep command.\n");

	try {
		console.info("🚀 Starting 10-second sleep process...");
		console.info("   (Press Ctrl+C to test graceful shutdown)\n");

		// This will track the process and handle SIGINT gracefully
		await ProcessUtils.captureOutput(["sleep", "10"]);

		console.info("✅ Process completed normally");
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Process failed with exit code")
		) {
			console.info("✅ Process was gracefully interrupted");
		} else {
			console.info(
				"❌ Unexpected error:",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	console.info("\n🎉 Demo completed!");
	console.info("💡 The ProcessUtils class now handles Ctrl+C gracefully");
	console.info(
		"   by tracking active processes and cleaning them up on shutdown.",
	);
}

// Run the demonstration
demonstrateSigint().catch(console.error);
