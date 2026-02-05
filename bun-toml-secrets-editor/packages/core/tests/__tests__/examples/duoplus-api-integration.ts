// Duoplus API Integration Example
// Demonstrates how to use the enhanced ADB mock with real Duoplus cloud phone APIs

import { getADBMock } from "../mocks/adb-mock";

async function demonstrateDuoplusIntegration() {
	console.log("🚀 Duoplus API Integration Demo\n");

	// Initialize ADB mock with real Duoplus endpoint
	const adb = getADBMock();

	// Configure with real Duoplus API credentials
	adb.configureRealDevice("https://api.duoplus.net", "your-api-key-here");

	try {
		// 1. Get cloud phone list (following official Duoplus API spec)
		console.log("📱 Getting cloud phone list...");

		// Example 1: Basic list with pagination
		const basicList = await adb.getCloudPhoneList({
			page: 1,
			pagesize: 10,
		});

		if (basicList.code === 200) {
			console.log("✅ Basic device list:");
			basicList.data.list.forEach((device) => {
				console.log(
					`  📱 ${device.name} (${device.id}) - Status: ${device.status} - ${device.os}`,
				);
			});
			console.log(
				`📊 Pagination: Page ${basicList.data.page}/${basicList.data.total_page}, Total: ${basicList.data.total}`,
			);
		}

		// Example 2: Filtered list (ADB enabled devices only)
		console.log("\n🔧 Getting ADB-enabled devices...");
		const adbDevices = await adb.getCloudPhoneList({
			page: 1,
			pagesize: 50,
			adb_status: ["1"], // Only powered on devices with ADB
			sort_by: "created_at",
			order: "desc",
		});

		if (adbDevices.code === 200) {
			console.log("✅ ADB-enabled devices:", adbDevices.data.list.length);
			adbDevices.data.list.forEach((device) => {
				console.log(
					`  📱 ${device.name} - IP: ${device.ip} - ADB: ${device.adb}`,
				);
			});
		}

		// Example 3: Search by device name
		console.log("\n� Searching for Oppo devices...");
		const searchResults = await adb.getCloudPhoneList({
			page: 1,
			pagesize: 10,
			name: "Oppo",
			link_status: ["0"], // Available devices
			sort_by: "name",
			order: "asc",
		});

		if (searchResults.code === 200) {
			console.log("✅ Search results:", searchResults.data.list.length);
			searchResults.data.list.forEach((device) => {
				console.log(
					`  📱 ${device.name} - Area: ${device.area} - Size: ${device.size}`,
				);
			});
		}

		// 2. Get cloud phone status (using official API spec)
		console.log("\n🔍 Checking device status...");
		const statusResult = await adb.getCloudPhoneStatus([
			"DUOPLUS-OPPO-FIND-X7",
		]);

		if (statusResult.code === 200) {
			console.log("✅ Device status results:");
			statusResult.data.list.forEach((device) => {
				const statusText =
					{
						0: "Not configured",
						1: "Powered on ✅",
						2: "Powered off",
						3: "Expired",
						4: "Renewal needed",
						10: "Powering on",
						11: "Configuring",
						12: "Configuration failed",
					}[device.status] || "Unknown";

				const isOnline = device.status === 1; // Powered on = online

				console.log(
					`  📱 ${device.name} (${device.id}) - Status: ${statusText} ${isOnline ? "(Online)" : "(Offline)"}`,
				);
			});
		} else {
			console.log("❌ Failed to get device status");
		}

		// 3. Get comprehensive device details
		console.log("\n📋 Getting detailed device information...");
		const deviceDetails = await adb.getCloudPhoneDetails(
			"DUOPLUS-OPPO-FIND-X7",
		);

		if (deviceDetails.code === 200) {
			const details = deviceDetails.data;
			console.log("✅ Device Details:");
			console.log(
				`  📱 Device: ${details.device.manufacturer} ${details.device.brand} ${details.device.model}`,
			);
			console.log(`  🔧 OS: ${details.os}`);
			console.log(
				`  🌐 Network: ${details.proxy.ip} (${details.proxy.city}, ${details.proxy.region})`,
			);
			console.log(
				`  📍 GPS: ${details.gps.latitude}, ${details.gps.longitude}`,
			);
			console.log(`  🕐 Timezone: ${details.locale.timezone}`);
			console.log(`  📞 SIM: ${details.sim.operator} (${details.sim.msisdn})`);
			console.log(`  📶 WiFi: ${details.wifi.name} (${details.wifi.mac})`);
			console.log(
				`  🔊 Bluetooth: ${details.bluetooth.name} (${details.bluetooth.address})`,
			);
			console.log(
				`  🔍 Device IDs: IMEI=${details.device.imei}, Serial=${details.device.serialno}`,
			);
		} else {
			console.log("❌ Failed to get device details");
		}

		// 4. Batch power on devices
		console.log("\n⚡ Powering on devices...");
		const powerResult = await adb.batchPowerOn(["DUOPLUS-OPPO-FIND-X7"]);
		console.log("✅ Power result:", powerResult.results);

		// 5. Enable ADB on devices (using official Duoplus API format)
		console.log("\n🔧 Enabling ADB...");
		const adbResult = await adb.batchEnableADB(["DUOPLUS-OPPO-FIND-X7"]);

		if (adbResult.code === 200) {
			console.log("✅ ADB enable results:");
			console.log(
				`  ✅ Successfully enabled: ${adbResult.data.success.join(", ")}`,
			);
			if (adbResult.data.fail.length > 0) {
				console.log(`  ❌ Failed to enable: ${adbResult.data.fail.join(", ")}`);
				Object.entries(adbResult.data.fail_reason).forEach(([id, reason]) => {
					console.log(`    ${id}: ${reason}`);
				});
			}
		} else {
			console.log("❌ ADB enable failed:", adbResult.message);
		}

		// 6. Execute ADB commands (using official Duoplus API format)
		console.log("\n📋 Executing ADB commands...");

		// Example 1: Single device command (official format)
		console.log("\n🔧 Single device ADB command...");
		const singleCommandResult = await adb.executeADBCommand(
			"DUOPLUS-OPPO-FIND-X7",
			"ls /sdcard",
		);

		if (singleCommandResult.code === 200) {
			console.log("✅ Single command result:");
			console.log(`  Success: ${singleCommandResult.data.success}`);
			console.log(`  Content: ${singleCommandResult.data.content.trim()}`);
			console.log(`  Message: ${singleCommandResult.data.message}`);
		} else {
			console.log("❌ Single command failed:", singleCommandResult.message);
		}

		// Example 2: Batch ADB commands (official format)
		console.log("\n🔧 Batch ADB commands...");
		const batchCommandResult = await adb.batchExecuteADBCommands(
			["DUOPLUS-OPPO-FIND-X7"],
			"getprop ro.product.model",
		);

		if (batchCommandResult.code === 200) {
			console.log("✅ Batch command results:");
			Object.entries(batchCommandResult.data).forEach(([deviceId, result]) => {
				console.log(`  📱 ${deviceId}:`);
				console.log(`    Success: ${result.success}`);
				console.log(`    Content: ${result.content.trim()}`);
				console.log(`    Message: ${result.message}`);
			});
		} else {
			console.log("❌ Batch command failed:", batchCommandResult.message);
		}

		// Example 3: Multiple commands for KYC testing
		console.log("\n🔍 KYC device information gathering...");
		const kycCommands = [
			"getprop ro.product.model",
			"getprop ro.build.version.release",
			"getprop ro.product.manufacturer",
			"getenforce",
			"settings get global airplane_mode_on",
		];

		for (const cmd of kycCommands) {
			const result = await adb.executeADBCommand("DUOPLUS-OPPO-FIND-X7", cmd);
			if (result.code === 200 && result.data.success) {
				console.log(`🔹 ${cmd}: ${result.data.content.trim()}`);
			} else {
				console.log(`❌ ${cmd}: Failed - ${result.data.message}`);
			}
		}

		// Example 4: Background command (long-running)
		console.log("\n⏳ Testing background command...");
		const backgroundCommand =
			"curl --no-check-certificate -O /sdcard/test.apk https://example.com/test.apk > /dev/null 2>&1 &";
		const bgResult = await adb.executeADBCommand(
			"DUOPLUS-OPPO-FIND-X7",
			backgroundCommand,
		);

		if (bgResult.code === 200) {
			console.log("✅ Background command initiated");
			console.log(`  Success: ${bgResult.data.success}`);
		}

		// 7. Get device fingerprint for security validation
		console.log("\n🔒 Getting device fingerprint...");
		const fingerprint = await adb.getDeviceFingerprint("DUOPLUS-OPPO-FIND-X7");
		console.log("✅ Device fingerprint:", {
			manufacturer: fingerprint.manufacturer,
			model: fingerprint.model,
			androidVersion: fingerprint.androidVersion,
			duoplusVerified: fingerprint.duoplusVerified,
		});

		// 8. Batch modify device parameters
		console.log("\n⚙️ Modifying device parameters...");

		// Example 1: Full parameter modification
		const modifyResult = await adb.batchModifyParameters([
			{
				image_id: "DUOPLUS-OPPO-FIND-X7",
				name: "Oppo FIND X7 Modified",
				remark: "test-device-updated",
				proxy: {
					id: "192.168.1.100",
					dns: 1,
				},
				gps: {
					type: 2,
					longitude: -77.0365,
					latitude: 38.8977,
				},
				locale: {
					type: 2,
					timezone: "America/New_York",
					language: "en-US",
				},
				sim: {
					status: 1,
					country: "US",
					msisdn: "+12025551234",
					operator: "AT&T Mobility",
					msin: "5551234",
					iccid: "8914800000052345678",
					mcc: "310",
					mnc: "410",
					imsi: "310410555123456",
				},
				bluetooth: {
					name: "ModifiedDevice",
					address: "aa:bb:cc:dd:ee:ff",
				},
				wifi: {
					status: 1,
					name: "TestNetwork",
					mac: "11:22:33:44:55:66",
					bssid: "aa:bb:cc:dd:ee:ff",
				},
				device: {
					imei: "990000862471854",
					serialno: "modified123456",
					android_id: "4ac56870dc271490",
					name: "Oppo FIND X7 Modified",
					gsf_id: "3555f0641c1d1421",
					gaid: "2a4afd02-f4ea-44c3-9678-c27a6b8e506b",
				},
			},
		]);

		if (modifyResult.code === 200) {
			console.log("✅ Full parameter modification results:");
			console.log(
				`  ✅ Successfully updated: ${modifyResult.data.success.join(", ")}`,
			);
			if (modifyResult.data.fail.length > 0) {
				console.log(
					`  ❌ Failed to update: ${modifyResult.data.fail.join(", ")}`,
				);
				Object.entries(modifyResult.data.fail_reason).forEach(
					([id, reason]) => {
						console.log(`    ${id}: ${reason}`);
					},
				);
			}
		}

		// Example 2: Proxy-only modification with automatic GPS/locale simulation
		console.log(
			"\n🌐 Proxy-only modification (with automatic GPS/locale simulation)...",
		);
		const proxyOnlyResult = await adb.batchModifyParameters([
			{
				image_id: "DUOPLUS-OPPO-FIND-X7",
				name: "Oppo FIND X7 Singapore",
				remark: "singapore-proxy",
				proxy: {
					id: "103.75.201.5", // Singapore IP
					dns: 1,
				},
				gps: {
					type: 1, // Simulate based on proxy IP
				},
				locale: {
					type: 1, // Simulate based on proxy IP
				},
			},
		]);

		if (proxyOnlyResult.code === 200) {
			console.log("✅ Proxy-only modification results:");
			console.log(
				`  ✅ Successfully updated: ${proxyOnlyResult.data.success.join(", ")}`,
			);

			// Verify the changes by getting device details
			const updatedDetails = await adb.getCloudPhoneDetails(
				"DUOPLUS-OPPO-FIND-X7",
			);
			if (updatedDetails.code === 200) {
				const details = updatedDetails.data;
				console.log("  📍 Auto-simulated location:");
				console.log(`    IP: ${details.proxy.ip}`);
				console.log(
					`    GPS: ${details.gps.latitude}, ${details.gps.longitude}`,
				);
				console.log(`    Timezone: ${details.locale.timezone}`);
				console.log(`    Language: ${details.locale.language}`);
			}
		}

		// Example 3: Mixed success/failure response demonstration
		console.log("\n🔄 Testing mixed success/failure response...");
		const mixedResult = await adb.batchModifyParameters([
			{
				image_id: "DUOPLUS-OPPO-FIND-X7", // Exists - should succeed
				name: "Oppo FIND X7 Final",
				proxy: { id: "203.0.113.1", dns: 1 },
			},
			{
				image_id: "NONEXISTENT-DEVICE", // Doesn't exist - should fail
				name: "Nonexistent Device",
				proxy: { id: "203.0.113.2", dns: 1 },
			},
		]);

		if (mixedResult.code === 200) {
			console.log("✅ Mixed response results:");
			console.log(`  ✅ Success: ${mixedResult.data.success.join(", ")}`);
			console.log(`  ❌ Failed: ${mixedResult.data.fail.join(", ")}`);

			// Show failure reasons
			Object.entries(mixedResult.data.fail_reason).forEach(([id, reason]) => {
				console.log(`    ${id}: ${reason}`);
			});

			// Demonstrate official response format
			console.log("\n📋 Official API Response Format:");
			console.log(
				JSON.stringify(
					{
						code: mixedResult.code,
						data: {
							success: mixedResult.data.success,
							fail: mixedResult.data.fail,
							fail_reason: mixedResult.data.fail_reason,
						},
						message: mixedResult.message,
					},
					null,
					2,
				),
			);
		}

		// Example 4: Reset and regenerate device
		console.log("\n🔄 Resetting and regenerating device...");
		const resetResult = await adb.resetAndRegenerateDevice(
			"DUOPLUS-OPPO-FIND-X7",
			{
				proxy_id: "198.51.100.5",
				phone_model: "samsung_s23_ultra",
				gps: {
					longitude: -118.2437,
					latitude: 34.0522, // Los Angeles
				},
				locale: {
					timezone: "America/Los_Angeles",
					language: "en-US",
				},
				sim: {
					country: "US",
					msisdn: "+13105551234",
					operator: "T-Mobile USA",
					mcc: "310",
					mnc: "260",
				},
			},
		);

		if (resetResult.code === 200) {
			console.log("✅ Device reset successfully!");

			// Verify the reset by getting new device details
			const newDetails = await adb.getCloudPhoneDetails("DUOPLUS-OPPO-FIND-X7");
			if (newDetails.code === 200) {
				const details = newDetails.data;
				console.log("📱 New device identity:");
				console.log(`  Model: ${details.device.model}`);
				console.log(`  Serial: ${details.device.serialno}`);
				console.log(`  Phone: ${details.sim.msisdn}`);
				console.log(`  Operator: ${details.sim.operator}`);
				console.log(
					`  Location: ${details.gps.latitude}, ${details.gps.longitude}`,
				);
				console.log(`  Timezone: ${details.locale.timezone}`);
				console.log(`  Bluetooth MAC: ${details.bluetooth.address}`);
				console.log(`  Build Fingerprint: ${details.device.serialno}`); // Would be actual fingerprint in real API
			}
		} else {
			console.log("❌ Device reset failed:", resetResult.message);
		}

		// Example 5: Simple reset (factory defaults)
		console.log("\n🔄 Simple factory reset...");
		const simpleResetResult = await adb.resetAndRegenerateDevice(
			"DUOPLUS-OPPO-FIND-X7",
		);

		if (simpleResetResult.code === 200) {
			console.log("✅ Factory reset completed!");
			console.log(
				"  Device restored to default settings with new random identity",
			);
		}

		// 11. Validate security compliance
		console.log("\n🛡️ Validating security compliance...");
		const compliance = await adb.validateSecurityCompliance(
			"DUOPLUS-OPPO-FIND-X7",
		);
		console.log("✅ Security compliance:", {
			passesAllChecks: compliance.passesAllChecks,
			riskScore: compliance.riskScore,
			isGenuine: compliance.isGenuine,
			isNotRooted: compliance.isNotRooted,
		});

		// 12. Show command history
		console.log("\n📊 Command history:");
		adb.getCommandHistory().forEach((cmd, index) => {
			console.log(`  ${index + 1}. ${cmd}`);
		});

		console.log("\n✨ Duoplus API integration demo completed successfully!");
	} catch (error) {
		console.error(
			"❌ Error during demo:",
			error instanceof Error ? error.message : String(error),
		);
	}
}

// KYC Testing Integration Example
async function kycTestingWithDuoplus() {
	console.log("\n🔐 KYC Testing with Duoplus Integration\n");

	const adb = getADBMock();
	adb.configureRealDevice("https://api.duoplus.net", "kyc-test-api-key");

	// Simulate KYC device verification workflow
	const deviceId = "DUOPLUS-OPPO-FIND-X7";

	try {
		// Step 1: Verify device is online and accessible
		const status = await adb.getCloudPhoneStatus([deviceId]);
		if (
			status.code !== 200 ||
			status.data.list.length === 0 ||
			status.data.list[0].status !== 1
		) {
			throw new Error("Device is not online or not found");
		}

		const deviceStatus = status.data.list[0];
		console.log(`✅ Device verified: ${deviceStatus.name} is online`);

		// Step 2: Enable ADB for device inspection
		const adbResult = await adb.batchEnableADB([deviceId]);

		if (adbResult.code !== 200 || adbResult.data.fail.length > 0) {
			throw new Error("Failed to enable ADB on device");
		}

		console.log("✅ ADB enabled successfully");

		// Step 3: Gather device information for KYC
		const deviceInfo = await Promise.all([
			adb.executeADBCommand(deviceId, "getprop ro.product.model"),
			adb.executeADBCommand(deviceId, "getprop ro.build.version.release"),
			adb.executeADBCommand(deviceId, "getprop ro.product.manufacturer"),
			adb.executeADBCommand(deviceId, "getenforce"),
		]);

		console.log("📋 Device Information for KYC:");
		deviceInfo.forEach((result) => {
			if (result.code === 200 && result.data.success) {
				console.log(`  ${result.data.content.trim()}`);
			} else {
				console.log(`  Error: ${result.data.message}`);
			}
		});

		// Step 4: Security compliance check
		const compliance = await adb.validateSecurityCompliance(deviceId);

		if (!compliance.passesAllChecks) {
			throw new Error(
				`Device failed security compliance: Risk Score ${compliance.riskScore}`,
			);
		}

		// Step 5: Device fingerprint verification
		const fingerprint = await adb.getDeviceFingerprint(deviceId);

		console.log("🔒 Security Verification Results:");
		console.log(`  ✅ Genuine Hardware: ${compliance.isGenuine}`);
		console.log(`  ✅ Not Rooted: ${compliance.isNotRooted}`);
		console.log(`  ✅ Secure Boot: ${compliance.isSecureBoot}`);
		console.log(`  ✅ Risk Score: ${compliance.riskScore} (Low Risk)`);
		console.log(`  ✅ Duoplus Verified: ${fingerprint.duoplusVerified}`);

		console.log("\n✅ KYC device verification passed!");
		return {
			verified: true,
			deviceId,
			riskScore: compliance.riskScore,
			fingerprint: fingerprint.buildFingerprint,
		};
	} catch (error) {
		console.error(
			"❌ KYC verification failed:",
			error instanceof Error ? error.message : String(error),
		);
		return {
			verified: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// Export for testing
export { demonstrateDuoplusIntegration, kycTestingWithDuoplus };

// Run demo if this file is executed directly
if (require.main === module) {
	demonstrateDuoplusIntegration()
		.then(() => kycTestingWithDuoplus())
		.catch(console.error);
}
