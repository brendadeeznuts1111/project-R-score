#!/usr/bin/env bun

/**
 * Test script to demonstrate Bun Shell integration in ProcessUtils
 */

import { ProcessUtils } from "./src/utils/process-utils";

async function testShellFeatures() {
	console.log("🧪 Testing Bun Shell Features");
	console.log("==============================\n");

	// Test 1: Basic shell command
	console.log("1️⃣  Basic Shell Command:");
	const basicResult = await ProcessUtils.executeWithShell(
		'echo "Hello from Bun Shell!"',
		{ trackTiming: true },
	);
	console.log(`   Output: "${basicResult.stdout.trim()}"`);
	console.log(`   Success: ${basicResult.success}`);
	console.log(
		`   Duration: ${ProcessUtils.formatDuration(basicResult.duration)}\n`,
	);

	// Test 2: Shell command with lines
	console.log("2️⃣  Shell Command with Lines:");
	const lines = await ProcessUtils.executeWithShellLines(
		'echo -e "Line 1\\nLine 2\\nLine 3"',
	);
	console.log(`   Retrieved ${lines.length} lines:`);
	lines.forEach((line, index) => {
		console.log(`     ${index + 1}: "${line}"`);
	});
	console.log();

	// Test 3: JSON parsing with shell
	console.log("3️⃣  JSON Parsing with Shell:");
	const jsonData = await ProcessUtils.executeWithShellJSON(
		'printf \'{"name": "DuoPlus", "version": "1.0.0"}\'',
	);
	console.log(`   Parsed JSON:`, jsonData);
	console.log();

	// Test 4: Complex shell command
	console.log("4️⃣  Complex Shell Command:");
	const complexResult = await ProcessUtils.executeWithShell(
		"ls -la /tmp | head -5",
		{ trackTiming: true },
	);
	console.log(`   Command: ls -la /tmp | head -5`);
	console.log(`   Success: ${complexResult.success}`);
	console.log(
		`   Duration: ${ProcessUtils.formatDuration(complexResult.duration)}`,
	);
	if (complexResult.stdout.trim()) {
		console.log(`   Output preview: ${complexResult.stdout.split("\n")[0]}...`);
	}
	console.log();

	// Test 5: Error handling
	console.log("5️⃣  Error Handling:");
	const errorResult = await ProcessUtils.executeWithShell(
		"ls /nonexistent/directory",
		{ trackTiming: true },
	);
	console.log(`   Success: ${errorResult.success}`);
	console.log(`   Exit Code: ${errorResult.exitCode}`);
	console.log(`   Error: ${errorResult.stderr.trim()}\n`);
}

async function testHybridExecution() {
	console.log("🧪 Testing Hybrid Execution");
	console.log("============================\n");

	// Test with string command (uses shell)
	console.log("1️⃣  String Command (Shell):");
	const stringResult = await ProcessUtils.execute('echo "String command"', {
		trackTiming: true,
	});
	const isShellResult1 = (stringResult as any).success !== undefined;
	const stringSuccess = isShellResult1 ? (stringResult as any).success : "N/A";
	console.log(`   Type: ${isShellResult1 ? "ShellResult" : "ProcessResult"}`);
	console.log(`   Success: ${stringSuccess}`);
	console.log();

	// Test with array command (uses spawn)
	console.log("2️⃣  Array Command (Spawn):");
	const arrayResult = await ProcessUtils.execute(["echo", "Array command"], {
		trackTiming: true,
	});
	const isShellResult2 = (arrayResult as any).success !== undefined;
	const arrayDuration = (arrayResult as any).duration || "N/A";
	console.log(`   Type: ${isShellResult2 ? "ShellResult" : "ProcessResult"}`);
	console.log(`   Duration: ${arrayDuration}ms`);
	console.log();

	// Test explicit shell option
	console.log("3️⃣  Explicit Shell Option:");
	const explicitShellResult = await ProcessUtils.execute(
		["echo", "Explicit shell"],
		{
			useShell: true,
			trackTiming: true,
		},
	);
	const isShellResult3 = (explicitShellResult as any).success !== undefined;
	const explicitSuccess = isShellResult3
		? (explicitShellResult as any).success
		: "N/A";
	console.log(`   Type: ${isShellResult3 ? "ShellResult" : "ProcessResult"}`);
	console.log(`   Success: ${explicitSuccess}`);
	console.log();
}

async function testPerformanceComparison() {
	console.log("🧪 Performance Comparison: Shell vs Spawn");
	console.log("==========================================\n");

	const testCommand = 'echo "Performance test"';
	const iterations = 5;

	// Test Shell performance
	console.log("1️⃣  Shell Performance:");
	const shellTimes: number[] = [];
	for (let i = 0; i < iterations; i++) {
		const result = await ProcessUtils.executeWithShell(testCommand, {
			trackTiming: false,
		});
		shellTimes.push(result.duration);
	}
	const avgShellTime =
		shellTimes.reduce((a, b) => a + b, 0) / shellTimes.length;
	console.log(`   Average time: ${avgShellTime.toFixed(2)}ms`);
	console.log(
		`   Times: [${shellTimes.map((t) => `${t.toFixed(2)}ms`).join(", ")}]`,
	);
	console.log();

	// Test Spawn performance
	console.log("2️⃣  Spawn Performance:");
	const spawnTimes: number[] = [];
	for (let i = 0; i < iterations; i++) {
		const result = await ProcessUtils.captureWithTiming(
			["echo", "Performance test"],
			{ trackTiming: false },
		);
		spawnTimes.push(result.duration);
	}
	const avgSpawnTime =
		spawnTimes.reduce((a, b) => a + b, 0) / spawnTimes.length;
	console.log(`   Average time: ${avgSpawnTime.toFixed(2)}ms`);
	console.log(
		`   Times: [${spawnTimes.map((t) => `${t.toFixed(2)}ms`).join(", ")}]`,
	);
	console.log();

	// Comparison
	const difference = Math.abs(avgShellTime - avgSpawnTime);
	const faster = avgShellTime < avgSpawnTime ? "Shell" : "Spawn";
	console.log(`3️⃣  Comparison:`);
	console.log(`   ${faster} is faster by ${difference.toFixed(2)}ms`);
	console.log(
		`   Shell: ${avgShellTime.toFixed(2)}ms vs Spawn: ${avgSpawnTime.toFixed(2)}ms`,
	);
}

async function main() {
	console.log("🎯 Bun Shell Integration Demo");
	console.log("============================\n");

	console.log("This demo shows the new Bun Shell ($) integration");
	console.log("alongside the existing Bun.spawn() functionality.\n");

	await testShellFeatures();
	console.log(`${"=".repeat(50)}\n`);

	await testHybridExecution();
	console.log(`${"=".repeat(50)}\n`);

	await testPerformanceComparison();

	console.log("\n✨ Bun Shell integration demo completed!");
	console.log(
		"💡 ProcessUtils now supports both Bun.spawn() and Bun Shell ($)",
	);
	console.log("   with automatic method selection and comprehensive timing.");
}

// Run the demonstration
main().catch(console.error);
