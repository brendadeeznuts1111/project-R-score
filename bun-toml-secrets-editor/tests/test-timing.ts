#!/usr/bin/env bun

/**
 * Test script to demonstrate process timing functionality
 */

import { ProcessUtils } from "./src/utils/process-utils";

async function testTimingFeatures() {
	console.log("🧪 Testing Process Timing Features");
	console.log("==================================\n");

	// Test 1: Basic uptime information
	console.log("1️⃣  Process Uptime Information:");
	console.log(`   Raw uptime (ms): ${ProcessUtils.getProcessUptime()}`);
	console.log(
		`   Formatted uptime: ${ProcessUtils.getProcessUptimeFormatted()}`,
	);
	console.log(`   Nanoseconds: ${Bun.nanoseconds()}\n`);

	// Test 2: Fast process with timing
	console.log("2️⃣  Fast Process with Timing:");
	const fastResult = await ProcessUtils.captureWithTiming(
		["echo", "Hello World"],
		{ trackTiming: true },
	);
	console.log(`   Output: "${fastResult.stdout.trim()}"`);
	console.log(
		`   Duration: ${ProcessUtils.formatDuration(fastResult.duration)}`,
	);
	console.log(`   Exit Code: ${fastResult.exitCode}\n`);

	// Test 3: Slower process with timing
	console.log("3️⃣  Slower Process with Timing:");
	const slowResult = await ProcessUtils.captureWithTiming(["sleep", "3"], {
		trackTiming: true,
	});
	console.log(
		`   Duration: ${ProcessUtils.formatDuration(slowResult.duration)}`,
	);
	console.log(`   Started: ${new Date(slowResult.startTime).toISOString()}`);
	console.log(`   Ended: ${new Date(slowResult.endTime).toISOString()}\n`);

	// Test 4: Process with error and timing
	console.log("4️⃣  Process with Error and Timing:");
	try {
		await ProcessUtils.captureWithTiming(["ls", "/nonexistent"], {
			trackTiming: true,
		});
	} catch (_error) {
		console.log(`   ✅ Error properly caught and timed`);
	}

	// Test 5: Multiple processes with timing comparison
	console.log("5️⃣  Multiple Processes Timing Comparison:");
	const processes = [
		{ name: "echo", args: ["echo", "test"] },
		{ name: "pwd", args: ["pwd"] },
		{ name: "date", args: ["date"] },
	];

	for (const proc of processes) {
		const result = await ProcessUtils.captureWithTiming(proc.args, {
			trackTiming: false,
		});
		console.log(
			`   ${proc.name}: ${ProcessUtils.formatDuration(result.duration)}`,
		);
	}

	console.log("\n✅ All timing tests completed!");
}

async function testDurationFormatting() {
	console.log("\n🧪 Testing Duration Formatting");
	console.log("===============================\n");

	const testDurations = [
		500, // 500ms
		1500, // 1.5s
		5000, // 5s
		65000, // 1m 5s
		3665000, // 61m 5s
	];

	testDurations.forEach((duration) => {
		console.log(`   ${duration}ms → ${ProcessUtils.formatDuration(duration)}`);
	});
}

async function main() {
	console.log("🎯 Process Timing Demonstration");
	console.log("===============================\n");

	console.log("This demo shows the timing capabilities added to ProcessUtils");
	console.log(
		"using Bun.nanoseconds() for accurate process uptime tracking.\n",
	);

	await testTimingFeatures();
	await testDurationFormatting();

	console.log("\n🎉 Timing demonstration completed!");
	console.log(
		"💡 All process operations now include detailed timing information",
	);
	console.log("   for performance monitoring and debugging.");
}

// Run the demonstration
main().catch(console.error);
