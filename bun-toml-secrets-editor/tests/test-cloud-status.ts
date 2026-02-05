#!/usr/bin/env bun

/**
 * Test script for the new cloud status functionality
 * Demonstrates different Bun.spawn() stdout handling patterns
 */

import { DuoplusCLI } from "./src/cli/duoplus-cli";
import { ProcessUtils } from "./src/utils/process-utils";

async function testProcessUtils() {
	console.log("🧪 Testing Process Utils - Different stdout patterns");
	console.log("==================================================\n");

	try {
		// Test 1: Capture output as text
		console.log("1️⃣  Testing captureOutput():");
		const output1 = await ProcessUtils.captureOutput([
			"echo",
			"Hello from captureOutput",
		]);
		console.log(`   Result: "${output1.trim()}"\n`);

		// Test 2: Inherit output to parent
		console.log("2️⃣  Testing inheritOutput():");
		console.log("   (This will appear directly below):");
		await ProcessUtils.inheritOutput(["echo", "Hello from inheritOutput"]);
		console.log("   (Back to test script)\n");

		// Test 3: Capture both stdout and stderr
		console.log("3️⃣  Testing captureBoth():");
		const result = await ProcessUtils.captureBoth([
			"echo",
			"Hello from captureBoth",
		]);
		console.log(`   Stdout: "${result.stdout.trim()}"`);
		console.log(`   Stderr: "${result.stderr.trim()}"\n`);

		// Test 4: Stream output line by line
		console.log("4️⃣  Testing streamOutput():");
		console.log("   Streaming lines:");
		await ProcessUtils.streamOutput(
			["echo", "Line 1\nLine 2\nLine 3"],
			(line) => console.log(`   → ${line}`),
		);
		console.log("");
	} catch (error) {
		console.error(
			"Process utils test failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
	}
}

async function testCloudStatus() {
	console.log("🌐 Testing Cloud Status Functionality");
	console.log("====================================\n");

	const cli = new DuoplusCLI();

	try {
		// Test the help command first
		console.log("Testing: --help");
		await cli.run({ help: true });

		console.log(`\n${"=".repeat(50)}\n`);

		// Test the cloud status command with normal output
		console.log("Testing: --cloud-status (normal mode)");
		await cli.run({ cloudStatus: true, verbose: false });

		console.log(`\n${"=".repeat(50)}\n`);

		// Test the cloud status command with verbose output (inherits stdout)
		console.log("Testing: --cloud-status --verbose (inherits stdout)");
		await cli.run({ cloudStatus: true, verbose: true });
	} catch (error) {
		console.error(
			"Cloud status test failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
	}
}

async function main() {
	console.log("🚀 Bun.spawn() stdout handling demonstration\n");

	// Test process utilities first
	await testProcessUtils();

	console.log(`\n${"=".repeat(60)}\n`);

	// Then test the cloud status functionality
	await testCloudStatus();
}

// Run the test
main().catch(console.error);
