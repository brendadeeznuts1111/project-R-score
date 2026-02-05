#!/usr/bin/env bun

/**
 * Simple demonstration of SIGINT handling
 */

import { ProcessUtils } from "../../src/utils/process-utils";

async function demonstrateSigint() {
	console.log("🎯 SIGINT (Ctrl+C) Handling Demo");
	console.log("===============================\n");

	console.log("📝 This demo shows graceful shutdown handling.");
	console.log("💡 Try pressing Ctrl+C during the sleep command.\n");

	try {
		console.log("🚀 Starting 10-second sleep process...");
		console.log("   (Press Ctrl+C to test graceful shutdown)\n");

		// This will track the process and handle SIGINT gracefully
		await ProcessUtils.captureOutput(["sleep", "10"]);

		console.log("✅ Process completed normally");
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Process failed with exit code")
		) {
			console.log("✅ Process was gracefully interrupted");
		} else {
			console.log(
				"❌ Unexpected error:",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	console.log("\n🎉 Demo completed!");
	console.log("💡 The ProcessUtils class now handles Ctrl+C gracefully");
	console.log(
		"   by tracking active processes and cleaning them up on shutdown.",
	);
}

// Run the demonstration
demonstrateSigint().catch(console.error);
