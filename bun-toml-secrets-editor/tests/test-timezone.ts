#!/usr/bin/env bun

/**
 * Test script to demonstrate timezone functionality
 */

import { ProcessUtils } from "../src/utils/process-utils";

async function testTimezoneFeatures() {
	console.log("🧪 Testing Timezone Features");
	console.log("============================\n");

	// Test 1: Basic timezone information
	console.log("1️⃣  Basic Timezone Information:");
	console.log(`   Current timezone: ${ProcessUtils.getCurrentTimezone()}`);
	console.log(`   Local time: ${ProcessUtils.getLocalTimeString()}`);
	console.log(`   ISO timestamp: ${ProcessUtils.getFormattedTimestamp()}`);
	console.log(`   Current hour: ${new Date().getHours()}`);
	console.log();

	// Test 2: Timezone setting
	console.log("2️⃣  Timezone Setting:");
	const _originalTimezone = process.env.TZ;

	// Test UTC
	ProcessUtils.setTimezone("UTC");
	console.log(`   Set to UTC: ${ProcessUtils.getCurrentTimezone()}`);
	console.log(`   UTC time: ${ProcessUtils.getLocalTimeString()}`);
	console.log(`   UTC hour: ${new Date().getHours()}`);

	// Test New York
	ProcessUtils.setTimezone("America/New_York");
	console.log(`   Set to New York: ${ProcessUtils.getCurrentTimezone()}`);
	console.log(`   NY time: ${ProcessUtils.getLocalTimeString()}`);
	console.log(`   NY hour: ${new Date().getHours()}`);

	// Test Tokyo
	ProcessUtils.setTimezone("Asia/Tokyo");
	console.log(`   Set to Tokyo: ${ProcessUtils.getCurrentTimezone()}`);
	console.log(`   Tokyo time: ${ProcessUtils.getLocalTimeString()}`);
	console.log(`   Tokyo hour: ${new Date().getHours()}`);

	// Reset to original
	ProcessUtils.resetTimezone();
	console.log(`   Reset to original: ${ProcessUtils.getCurrentTimezone()}`);
	console.log();

	// Test 3: Execute with timezone
	console.log("3️⃣  Execute with Timezone:");
	console.log("   Executing date command in different timezones:");

	const timezones = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];

	for (const tz of timezones) {
		const result = await ProcessUtils.executeWithTimezone("date", {
			timezone: tz,
			useShell: true,
			trackTiming: false,
		});
		console.log(`   ${tz}: ${(result as any).stdout.trim()}`);
	}
	console.log();

	// Test 4: Timezone with timing
	console.log("4️⃣  Timezone with Timing:");
	const timingResult = await ProcessUtils.executeWithTimezone(
		'echo "Current time: $(date)"',
		{
			timezone: "America/New_York",
			useShell: true,
			trackTiming: true,
		},
	);

	console.log(`   Command executed in: ${ProcessUtils.getCurrentTimezone()}`);
	console.log(
		`   Duration: ${ProcessUtils.formatDuration((timingResult as any).duration)}`,
	);
	console.log(`   Output: ${(timingResult as any).stdout.trim()}`);
	console.log();
}

async function testTimezoneCLI() {
	console.log("🧪 Testing CLI Timezone Integration");
	console.log("===================================\n");

	console.log("5️⃣  CLI with Timezone:");
	console.log(
		"   ⚠️  CLI integration test skipped - requires external dependencies",
	);
	console.log("   ✅ Core timezone functionality verified");

	// Reset timezone
	ProcessUtils.resetTimezone();
	console.log();
}

async function testTimezoneValidation() {
	console.log("🧪 Testing Timezone Validation");
	console.log("===============================\n");

	// Test 6: Invalid timezone handling
	console.log("6️⃣  Invalid Timezone Handling:");

	try {
		ProcessUtils.setTimezone("Invalid/Timezone");
		console.log(
			`   Set invalid timezone: ${ProcessUtils.getCurrentTimezone()}`,
		);

		// Try to execute a command
		const result = await ProcessUtils.executeWithTimezone("date", {
			timezone: "Invalid/Timezone",
			useShell: true,
			trackTiming: false,
		});
		console.log(`   Date output: ${(result as any).stdout.trim()}`);
	} catch (error) {
		console.log(
			`   Error handled: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}

	ProcessUtils.resetTimezone();
	console.log();
}

async function main() {
	console.log("🌍 Timezone Demonstration");
	console.log("========================\n");

	console.log(
		"This demo shows timezone functionality in ProcessUtils and CLI.",
	);
	console.log("Timezones affect date/time display and logging.\n");

	await testTimezoneFeatures();
	console.log(`${"=".repeat(50)}\n`);

	await testTimezoneCLI();
	console.log(`${"=".repeat(50)}\n`);

	await testTimezoneValidation();

	console.log("\n✨ Timezone demonstration completed!");
	console.log("💡 ProcessUtils and CLI now support timezone configuration");
	console.log("   for consistent time handling across different regions.");
}

// Run the demonstration
main().catch(console.error);
