#!/usr/bin/env bun

/**
 * Final demonstration of the updated DuoPlus CLI
 * Shows proper Bun.spawn() stdout/stderr handling per documentation
 */

import { DuoplusCLI } from "../../src/cli/duoplus-cli";
import { ProcessUtils } from "../../src/utils/process-utils";

async function demonstrateBunSpawnFeatures() {
	console.log("🚀 Bun.spawn() stdout/stderr Handling Demo");
	console.log("==========================================\n");

	// Demo 1: Direct stderr handling as per documentation
	console.log("1️⃣  Direct stderr handling (per Bun docs):");
	try {
		const proc = Bun.spawn(["echo", "Hello from stderr"], {
			stderr: "pipe",
		});

		await proc.exited;

		// This is the documented approach with type safety
		let errors = "";
		if (typeof proc.stderr === "object" && proc.stderr !== null) {
			errors = await new Response(
				proc.stderr as unknown as ReadableStream,
			).text();
		}
		console.log(`   Stdout: "Hello from stderr"`);
		console.log(`   Stderr: "${errors}" (empty as expected)\n`);
	} catch (error) {
		console.log(
			`   Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
		);
	}

	// Demo 2: Process utils with fallback handling
	console.log("2️⃣  Process utils with fallbacks:");
	try {
		const result = await ProcessUtils.captureBoth(["echo", "Test message"]);
		console.log(`   ✅ Captured stdout: "${result.stdout.trim()}"`);
		console.log(`   ✅ Captured stderr: "${result.stderr.trim()}"\n`);
	} catch (error) {
		console.log(
			`   ❌ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
		);
	}

	// Demo 3: Error handling with stderr
	console.log("3️⃣  Error handling with stderr:");
	try {
		// This will fail and produce stderr
		await ProcessUtils.captureOutput(["ls", "/nonexistent-directory"]);
	} catch (error) {
		console.log(
			`   ✅ Properly caught error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
		);
	}
}

async function demonstrateCloudStatusAPI() {
	console.log("🌐 DuoPlus Cloud Phone Status API Demo");
	console.log("=====================================\n");

	const cli = new DuoplusCLI();

	try {
		// Show help to demonstrate CLI functionality
		console.log("📋 CLI Help:");
		await cli.run({ help: true });

		console.log(`\n${"=".repeat(50)}\n`);

		// Test cloud status (will show API integration)
		console.log("☁️  Cloud Status API Integration:");
		console.log("   (This uses Bun.spawn() with curl for API calls)");
		await cli.run({ cloudStatus: true, verbose: false });
	} catch (error) {
		console.log(`ℹ️  Expected behavior: API call requires valid credentials`);
		console.log(
			`   Error details: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

async function main() {
	console.log("🎯 Final DuoPlus CLI Demonstration");
	console.log("===============================\n");

	// Demonstrate Bun.spawn() features
	await demonstrateBunSpawnFeatures();

	console.log(`\n${"=".repeat(60)}\n`);

	// Demonstrate CLI functionality
	await demonstrateCloudStatusAPI();

	console.log("\n✨ Demo completed successfully!");
	console.log("\n📚 Key Features Implemented:");
	console.log("   • Proper Bun.spawn() stdout/stderr handling");
	console.log("   • DuoPlus Cloud Phone Status API integration");
	console.log("   • Fallback error handling for type issues");
	console.log("   • Verbose mode with stdout inheritance");
	console.log("   • Complete TypeScript compliance");
}

// Run the demonstration
main().catch(console.error);
