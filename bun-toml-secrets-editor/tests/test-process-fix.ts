#!/usr/bin/env bun

/**
 * Test script to verify the process utils fixes work correctly
 */

import { ProcessUtils } from "./src/utils/process-utils";

async function testProcessUtils() {
	console.log("🧪 Testing Fixed Process Utils");
	console.log("===============================\n");

	try {
		// Test 1: Capture output
		console.log("1️⃣  Testing captureOutput():");
		const output1 = await ProcessUtils.captureOutput(["echo", "Hello World"]);
		console.log(`   ✅ Success: "${output1.trim()}"\n`);

		// Test 2: Capture both stdout and stderr
		console.log("2️⃣  Testing captureBoth():");
		const result = await ProcessUtils.captureBoth(["echo", "Stdout message"]);
		console.log(`   ✅ Success - Stdout: "${result.stdout.trim()}"\n`);

		// Test 3: Inherit output
		console.log("3️⃣  Testing inheritOutput():");
		console.log("   (Output should appear directly below):");
		await ProcessUtils.inheritOutput(["echo", "Inherited output"]);
		console.log("   ✅ Success - Back to test script\n");

		// Test 4: Stream output
		console.log("4️⃣  Testing streamOutput():");
		console.log("   Streaming lines:");
		await ProcessUtils.streamOutput(
			["echo", "Line 1\nLine 2\nLine 3"],
			(line) => console.log(`   → ${line}`),
		);
		console.log("   ✅ Success\n");

		console.log("🎉 All process utils tests passed!");
	} catch (error) {
		console.error(
			"❌ Test failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
		process.exit(1);
	}
}

testProcessUtils();
