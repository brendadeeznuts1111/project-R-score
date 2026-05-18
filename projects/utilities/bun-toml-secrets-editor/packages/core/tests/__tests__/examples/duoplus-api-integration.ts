// Duoplus API Integration Example
// Demonstrates how to use the enhanced ADB mock with real Duoplus cloud phone APIs

import { getADBMock } from "../mocks/adb-mock";

async function demonstrateDuoplusIntegration() {
	console.info("🚀 Duoplus API Integration Demo\n");

	// Initialize ADB mock with real Duoplus endpoint
	const adb = getADBMock();

	// Configure with real Duoplus API credentials
	adb.configureRealDevice("https://api.duoplus.net", "your-api-key-here");

	try {
		// 1. Get cloud phone list (following official Duoplus API spec)
		console.info("📱 Getting cloud phone list...");

		// Example 1: Basic list with pagination
		const basicList = await adb.getCloudPhoneList({
			page: 1,
			pagesize: 10,
		});

		if (basicList.code === 200) {
			console.info("✅ Basic device list:");
			basicList.data.list.forEach((device) => {
				console.info(
					`  📱 ${device.name} (${device.id}) - Status: ${device.status} - ${device.os}`,
				);
			});
			console.info(
				`📊 Pagination: Page ${basicList.data.page}/${basicList.data.total_page}, Total: ${basicList.data.total}`,
			);
		}

		// Example 2: Filtered list (ADB enabled devices only)
		console.info("\n🔧 Getting ADB-enabled devices...");
		const adbDevices = await adb.getCloudPhoneList({
			page: 1,
			pagesize: 50,
			adb_status: ["1"], // Only powered on devices with ADB
			sort_by: "created_at",
			order: "desc",
		});

		if (adbDevices.code === 200) {
			console.info("✅ ADB-enabled devices:", adbDevices.data.list.length);
			adbDevices.data.list.forEach((device) => {
				console.info(
					`  📱 ${device.name} - IP: ${device.ip} - ADB: ${device.adb}`,
				);
			});
		}

		// Example 3: Search by device name
		console.info("\n� Searching for Oppo devices...");
		const searchResults = await adb.getCloudPhoneList({
			page: 1,
			pagesize: 10,
			name: "Oppo",
			link_status: ["0"], // Available devices
			sort_by: "name",
			order: "asc",
		});

		if (searchResults.code === 200) {
			console.info("✅ Search results:", searchResults.data.list.length);
			searchResults.data.list.forEach((device) => {
				console.info(
					`  📱 ${device.name} - Area: ${device.area} - Size: ${device.size}`,
				);
			});
		}

		// 2. Get cloud phone status (using official API spec)
		console.info("\n🔍 Checking device status...");
		const statusResult = await adb.getCloudPhoneStatus([
			"DUOPLUS-OPPO-FIND-X7",
		]);

		if (statusResult.code === 200) {
			console.info("✅ Device status results:");
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

				console.info(
					`  📱 ${device.name} (${device.id}) - Status: ${statusText} ${isOnline ? "(Online)" : "(Offline)"}`,
				);
			});
		} else {
			console.info("❌ Failed to get device status");
		}

		// 3. Get comprehensive device details
		console.info("\n📋 Getting detailed device information...");
		const deviceDetails = await adb.getCloudPhoneDetails(
			"DUOPLUS-OPPO-FIND-X7",
		);

		if (deviceDetails.code === 200) {
			const details = deviceDetails.data;
			console.info("✅ Device Details:");
			console.info(
				`  📱 Device: ${details.device.manufacturer} ${details.device.brand} ${details.device.model}`,
			);
			console.info(`  🔧 OS: ${details.os}`);
			console.info(
				`  🌐 Network: ${details.proxy.ip} (${details.proxy.city}, ${details.proxy.region})`,
			);
			console.info(
				`  📍 GPS: ${details.gps.latitude}, ${details.gps.longitude}`,
			);
			console.info(`  🕐 Timezone: ${details.locale.timezone}`);
			console.info(`  📞 SIM: ${details.sim.operator} (${details.sim.msisdn})`);
			console.info(`  📶 WiFi: ${details.wifi.name} (${details.wifi.mac})`);
			console.info(
				`  🔊 Bluetooth: ${details.bluetooth.name} (${details.bluetooth.address})`,
			);
			console.info(
				`  🔍 Device IDs: IMEI=${details.device.imei}, Serial=${details.device.serialno}`,
			);
		} else {
			console.info("❌ Failed to get device details");
		}

		// 4. Batch power on devices
		console.info("\n⚡ Powering on devices...");
		const powerResult = await adb.batchPowerOn(["DUOPLUS-OPPO-FIND-X7"]);
		console.info("✅ Power result:", powerResult.results);

		// 5. Enable ADB on devices (using official Duoplus API format)
		console.info("\n🔧 Enabling ADB...");
		const adbResult = await adb.batchEnableADB(["DUOPLUS-OPPO-FIND-X7"]);

		if (adbResult.code === 200) {
			console.info("✅ ADB enable results:");
			console.info(
				`  ✅ Successfully enabled: ${adbResult.data.success.join(", ")}`,
			);
			if (adbResult.data.fail.length > 0) {
				console.info(`  ❌ Failed to enable: ${adbResult.data.fail.join(", ")}`);
				Object.entries(adbResult.data.fail_reason).forEach(([id, reason]) => {
					console.info(`    ${id}: ${reason}`);
				});
			}
		} else {
			console.info("❌ ADB enable failed:", adbResult.message);
		}

		// 6. Execute ADB commands (using official Duoplus API format)
		console.info("\n📋 Executing ADB commands...");

		// Example 1: Single device command (official format)
		console.info("\n🔧 Single device ADB command...");
		const singleCommandResult = await adb.executeADBCommand(
			"DUOPLUS-OPPO-FIND-X7",
			"ls /sdcard",
		);

		if (singleCommandResult.code === 200) {
			console.info("✅ Single command result:");
			console.info(`  Success: ${singleCommandResult.data.success}`);
			console.info(`  Content: ${singleCommandResult.data.content.trim()}`);
			console.info(`  Message: ${singleCommandResult.data.message}`);
		} else {
			console.info("❌ Single command failed:", singleCommandResult.message);
		}

		// Example 2: Batch ADB commands (official format)
		console.info("\n🔧 Batch ADB commands...");
		const batchCommandResult = await adb.batchExecuteADBCommands(
			["DUOPLUS-OPPO-FIND-X7"],
			"getprop ro.product.model",
		);

		if (batchCommandResult.code === 200) {
			console.info("✅ Batch command results:");
			Object.entries(batchCommandResult.data).forEach(([deviceId, result]) => {
				console.info(`  📱 ${deviceId}:`);
				console.info(`    Success: ${result.success}`);
				console.info(`    Content: ${result.content.trim()}`);
				console.info(`    Message: ${result.message}`);
			});
		} else {
			console.info("❌ Batch command failed:", batchCommandResult.message);
		}

		// Example 3: Multiple commands for KYC testing
		console.info("\n🔍 KYC device information gathering...");
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
				console.info(`🔹 ${cmd}: ${result.data.content.trim()}`);
			} else {
				console.info(`❌ ${cmd}: Failed - ${result.data.message}`);
			}
		}

		// Example 4: Background command (long-running)
		console.info("\n⏳ Testing background command...");
		const backgroundCommand =
			"curl --no-check-certificate -O /sdcard/test.apk https://example.com/test.apk > /dev/null 2>&1 &";
		const bgResult = await adb.executeADBCommand(
			"DUOPLUS-OPPO-FIND-X7",
			backgroundCommand,
		);

		if (bgResult.code === 200) {
			console.info("✅ Background command initiated");
			console.info(`  Success: ${bgResult.data.success}`);
		}

		// 7. Get device fingerprint for security validation
		console.info("\n🔒 Getting device fingerprint...");
		const fingerprint = await adb.getDeviceFingerprint("DUOPLUS-OPPO-FIND-X7");
		console.info("✅ Device fingerprint:", {
			manufacturer: fingerprint.manufacturer,
			model: fingerprint.model,
			androidVersion: fingerprint.androidVersion,
			duoplusVerified: fingerprint.duoplusVerified,
		});

		// 8. Batch modify device parameters
		console.info("\n⚙️ Modifying device parameters...");

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
			console.info("✅ Full parameter modification results:");
			console.info(
				`  ✅ Successfully updated: ${modifyResult.data.success.join(", ")}`,
			);
			if (modifyResult.data.fail.length > 0) {
				console.info(
					`  ❌ Failed to update: ${modifyResult.data.fail.join(", ")}`,
				);
				Object.entries(modifyResult.data.fail_reason).forEach(
					([id, reason]) => {
						console.info(`    ${id}: ${reason}`);
					},
				);
			}
		}

		// Example 2: Proxy-only modification with automatic GPS/locale simulation
		console.info(
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
			console.info("✅ Proxy-only modification results:");
			console.info(
				`  ✅ Successfully updated: ${proxyOnlyResult.data.success.join(", ")}`,
			);

			// Verify the changes by getting device details
			const updatedDetails = await adb.getCloudPhoneDetails(
				"DUOPLUS-OPPO-FIND-X7",
			);
			if (updatedDetails.code === 200) {
				const details = updatedDetails.data;
				console.info("  📍 Auto-simulated location:");
				console.info(`    IP: ${details.proxy.ip}`);
				console.info(
					`    GPS: ${details.gps.latitude}, ${details.gps.longitude}`,
				);
				console.info(`    Timezone: ${details.locale.timezone}`);
				console.info(`    Language: ${details.locale.language}`);
			}
		}

		// Example 3: Mixed success/failure response demonstration
		console.info("\n🔄 Testing mixed success/failure response...");
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
			console.info("✅ Mixed response results:");
			console.info(`  ✅ Success: ${mixedResult.data.success.join(", ")}`);
			console.info(`  ❌ Failed: ${mixedResult.data.fail.join(", ")}`);

			// Show failure reasons
			Object.entries(mixedResult.data.fail_reason).forEach(([id, reason]) => {
				console.info(`    ${id}: ${reason}`);
			});

			// Demonstrate official response format
			console.info("\n📋 Official API Response Format:");
			console.info(
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
		console.info("\n🔄 Resetting and regenerating device...");
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
			console.info("✅ Device reset successfully!");

			// Verify the reset by getting new device details
			const newDetails = await adb.getCloudPhoneDetails("DUOPLUS-OPPO-FIND-X7");
			if (newDetails.code === 200) {
				const details = newDetails.data;
				console.info("📱 New device identity:");
				console.info(`  Model: ${details.device.model}`);
				console.info(`  Serial: ${details.device.serialno}`);
				console.info(`  Phone: ${details.sim.msisdn}`);
				console.info(`  Operator: ${details.sim.operator}`);
				console.info(
					`  Location: ${details.gps.latitude}, ${details.gps.longitude}`,
				);
				console.info(`  Timezone: ${details.locale.timezone}`);
				console.info(`  Bluetooth MAC: ${details.bluetooth.address}`);
				console.info(`  Build Fingerprint: ${details.device.serialno}`); // Would be actual fingerprint in real API
			}
		} else {
			console.info("❌ Device reset failed:", resetResult.message);
		}

		// Example 5: Simple reset (factory defaults)
		console.info("\n🔄 Simple factory reset...");
		const simpleResetResult = await adb.resetAndRegenerateDevice(
			"DUOPLUS-OPPO-FIND-X7",
		);

		if (simpleResetResult.code === 200) {
			console.info("✅ Factory reset completed!");
			console.info(
				"  Device restored to default settings with new random identity",
			);
		}

		// 11. Validate security compliance
		console.info("\n🛡️ Validating security compliance...");
		const compliance = await adb.validateSecurityCompliance(
			"DUOPLUS-OPPO-FIND-X7",
		);
		console.info("✅ Security compliance:", {
			passesAllChecks: compliance.passesAllChecks,
			riskScore: compliance.riskScore,
			isGenuine: compliance.isGenuine,
			isNotRooted: compliance.isNotRooted,
		});

		// 12. Show command history
		console.info("\n📊 Command history:");
		adb.getCommandHistory().forEach((cmd, index) => {
			console.info(`  ${index + 1}. ${cmd}`);
		});

		console.info("\n✨ Duoplus API integration demo completed successfully!");
	} catch (error) {
		console.error(
			"❌ Error during demo:",
			error instanceof Error ? error.message : String(error),
		);
	}
}

// KYC Testing Integration Example
async function kycTestingWithDuoplus() {
	console.info("\n🔐 KYC Testing with Duoplus Integration\n");

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
		console.info(`✅ Device verified: ${deviceStatus.name} is online`);

		// Step 2: Enable ADB for device inspection
		const adbResult = await adb.batchEnableADB([deviceId]);

		if (adbResult.code !== 200 || adbResult.data.fail.length > 0) {
			throw new Error("Failed to enable ADB on device");
		}

		console.info("✅ ADB enabled successfully");

		// Step 3: Gather device information for KYC
		const deviceInfo = await Promise.all([
			adb.executeADBCommand(deviceId, "getprop ro.product.model"),
			adb.executeADBCommand(deviceId, "getprop ro.build.version.release"),
			adb.executeADBCommand(deviceId, "getprop ro.product.manufacturer"),
			adb.executeADBCommand(deviceId, "getenforce"),
		]);

		console.info("📋 Device Information for KYC:");
		deviceInfo.forEach((result) => {
			if (result.code === 200 && result.data.success) {
				console.info(`  ${result.data.content.trim()}`);
			} else {
				console.info(`  Error: ${result.data.message}`);
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

		console.info("🔒 Security Verification Results:");
		console.info(`  ✅ Genuine Hardware: ${compliance.isGenuine}`);
		console.info(`  ✅ Not Rooted: ${compliance.isNotRooted}`);
		console.info(`  ✅ Secure Boot: ${compliance.isSecureBoot}`);
		console.info(`  ✅ Risk Score: ${compliance.riskScore} (Low Risk)`);
		console.info(`  ✅ Duoplus Verified: ${fingerprint.duoplusVerified}`);

		console.info("\n✅ KYC device verification passed!");
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
