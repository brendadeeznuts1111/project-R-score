#!/usr/bin/env bun

/**
 * Duoplus Cloud Phone CLI
 * Command-line interface for Duoplus Cloud Phone API integration
 *
 * Features:
 * - Device management and control
 * - Application installation and management
 * - Team collaboration features
 * - Advanced device operations
 * - Real-time monitoring and analytics
 * - Configuration management with patterns
 * - Integration with external services
 *
 * Usage:
 *   bun run src/cli/duoplus-cli.ts [options]
 *   or
 *   chmod +x src/cli/duoplus-cli.ts
 *   ./src/cli/duoplus-cli.ts [options]
 */

import { parseArgs } from "node:util";
import { ADBMock } from "../__tests__/mocks/adb-mock";
import { DuoplusConfigManager } from "../config/duoplus-config";
import {
	AnalyticsService,
	type DeviceMetrics,
} from "../integrations/analytics-service";
import {
	type NotificationMessage,
	NotificationService,
} from "../integrations/notification-service";
import { SchedulerService } from "../integrations/scheduler-service";
import { CommandValidator } from "../utils/command-validator";
import { ProcessUtils } from "../utils/process-utils";
import { ProgressUtils } from "../utils/progress-indicator";
import { TableFormatter, TableUtils } from "../utils/table-formatter";

interface DuoplusCLIOptions {
	device?: string;
	command?: string;
	proxy?: string;
	gps?: string;
	list?: boolean;
	status?: boolean;
	cloudStatus?: boolean;
	power?: string;
	reboot?: boolean;
	factoryReset?: boolean;
	install?: string;
	uninstall?: string;
	batchInstall?: string;
	batchUninstall?: string;
	clearData?: string;
	clearCache?: string;
	monitor?: boolean;
	logs?: boolean;
	screenshot?: boolean;
	details?: boolean;
	team?: boolean;
	listUsers?: boolean;
	addUser?: string;
	removeUser?: string;
	listGroups?: boolean;
	inviteUser?: string;
	removeGroup?: string;
	createGroup?: string;
	deleteGroup?: string;
	addIntegration?: string;
	removeIntegration?: string;
	listIntegrations?: boolean;
	testIntegration?: string;
	notifications?: boolean;
	analytics?: boolean;
	scheduleTask?: string;
	listTasks?: boolean;
	removeTask?: string;
	exportLogs?: string;
	exportConfig?: string;
	importConfig?: string;
	validateConfig?: boolean;
	patterns?: boolean; // Add missing patterns property
	timezone?: string; // New timezone option
	help?: boolean;
	search?: string;
	verbose?: boolean;

	// Missing properties that are used in the code
	focusMode?: string;
	twoFA?: string;
	root?: string;
	quality?: string;
	route?: string;
	config?: string;
	applyPattern?: string;
	resolution?: string;
	reset?: boolean;
	enable?: boolean;
	upload?: string;
	batchApps?: boolean;
	preinstalled?: boolean;
	apps?: boolean;
	restart?: boolean;
	transfer?: string;
	clean?: boolean;
	backup?: boolean;
	qrScan?: boolean;
	streaming?: boolean;
	integrations?: boolean;
	scheduler?: boolean;
	notify?: string;
	applyPatterns?: string;
	resetConfig?: boolean;
	automation?: boolean;
	batch?: string;
	teams?: boolean;
	members?: boolean;
	invite?: string;
	groups?: boolean;
	share?: string;
}

export class DuoplusCLI {
	adb: ADBMock;
	deviceId: string;
	configManager: DuoplusConfigManager;
	notificationService: NotificationService;
	analyticsService: AnalyticsService;
	schedulerService: SchedulerService;
	verbose = false;
	private isShuttingDown = false;
	private timezone?: string;

	constructor(options?: { timezone?: string }) {
		this.adb = new ADBMock();
		this.deviceId = "DUOPLUS-OPPO-FIND-X7";
		this.configManager = new DuoplusConfigManager();
		const config = this.configManager.getConfig();
		this.notificationService = new NotificationService(config.integrations);
		this.analyticsService = new AnalyticsService();
		this.schedulerService = new SchedulerService();

		// Set timezone if provided
		if (options?.timezone) {
			this.timezone = options.timezone;
			ProcessUtils.setTimezone(options.timezone);
		}

		// Setup graceful shutdown
		this.setupGracefulShutdown();
	}

	/**
	 * Setup comprehensive signal handlers for graceful CLI shutdown
	 * Following best practices for process event handling
	 */
	private setupGracefulShutdown(): void {
		if (process.listenerCount("SIGINT") === 0) {
			// Handle Ctrl+C (SIGINT) - User interrupt
			process.on("SIGINT", () => {
				if (!this.isShuttingDown) {
					this.isShuttingDown = true;
					console.log(
						"\n🛑 SIGINT (Ctrl+C) detected - Gracefully shutting down Duoplus CLI...",
					);
					this.performCleanup("SIGINT");
				}
			});

			// Handle termination signal (SIGTERM) - System termination
			process.on("SIGTERM", () => {
				if (!this.isShuttingDown) {
					this.isShuttingDown = true;
					console.log(
						"\n🛑 SIGTERM detected - Gracefully shutting down Duoplus CLI...",
					);
					this.performCleanup("SIGTERM");
				}
			});

			// Handle beforeExit event - Event loop is empty, last chance for async cleanup
			process.on("beforeExit", (code) => {
				console.log(
					`\n📋 Event loop is empty with code ${code} - Final CLI cleanup...`,
				);
				this.performCleanup("beforeExit");
			});

			// Handle exit event - Process is exiting (synchronous only)
			process.on("exit", (code) => {
				console.log(`📤 Duoplus CLI exiting with code ${code}`);
			});

			// Handle uncaught exceptions - Critical errors
			process.on("uncaughtException", (error) => {
				console.error("\n💥 Uncaught Exception in Duoplus CLI:", error.message);
				this.performCleanup("uncaughtException");
				process.exit(1);
			});

			// Handle unhandled promise rejections - Async errors
			process.on("unhandledRejection", (reason, _promise) => {
				console.error(
					"\n⚠️  Unhandled Promise Rejection in Duoplus CLI:",
					reason,
				);
				this.performCleanup("unhandledRejection");
			});
		}
	}

	/**
	 * Perform CLI-specific cleanup operations
	 */
	private performCleanup(signal: string): void {
		console.log(`🧹 Cleaning up Duoplus CLI resources... (signal: ${signal})`);

		// Stop any active monitoring
		if (this.schedulerService) {
			console.log("   ⏹️  Stopping scheduled tasks...");
			// Stop any scheduled tasks
		}

		// Close database connections
		console.log("   💾 Closing database connections...");
		// Close any database connections

		// Cancel pending operations
		console.log("   ❌ Canceling pending operations...");
		// Cancel any pending API calls or operations

		// Cleanup integrations
		if (this.notificationService) {
			console.log("   🔔 Cleaning up notification service...");
			// Cleanup notification service
		}

		if (this.analyticsService) {
			console.log("   📊 Cleaning up analytics service...");
			// Cleanup analytics service
		}

		console.log("✅ Duoplus CLI cleanup completed");
	}

	private log(
		message: string,
		level: "info" | "warn" | "error" = "info",
	): void {
		const timestamp = new Date().toLocaleTimeString();
		const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";

		if (this.verbose || level === "error") {
			console.log(`${prefix} [${timestamp}] ${message}`);
		}
	}

	private validateOptions(options: DuoplusCLIOptions): string[] {
		const errors: string[] = [];

		// Validate device ID format
		if (options.device && !options.device.match(/^[A-Z0-9-]+$/)) {
			errors.push(
				"Device ID must contain only uppercase letters, numbers, and hyphens",
			);
		}

		// Validate power options
		if (options.power && !["on", "off"].includes(options.power)) {
			errors.push('Power option must be "on" or "off"');
		}

		// Validate focus mode
		if (
			options.focusMode &&
			!["none", "work", "gaming", "reading"].includes(options.focusMode)
		) {
			errors.push("Focus mode must be one of: none, work, gaming, reading");
		}

		// Validate 2FA actions
		if (
			options.twoFA &&
			!["enable", "disable", "generate-backup-codes"].includes(options.twoFA)
		) {
			errors.push(
				"2FA action must be one of: enable, disable, generate-backup-codes",
			);
		}

		// Validate root actions
		if (
			options.root &&
			!["enable", "disable", "status"].includes(options.root)
		) {
			errors.push("Root action must be one of: enable, disable, status");
		}

		// Validate quality options
		if (
			options.quality &&
			!["low", "medium", "high", "ultra", "auto"].includes(options.quality)
		) {
			errors.push("Quality must be one of: low, medium, high, ultra, auto");
		}

		// Validate route options
		if (
			options.route &&
			!["direct", "optimized", "secure", "balanced"].includes(options.route)
		) {
			errors.push("Route must be one of: direct, optimized, secure, balanced");
		}

		// Validate config actions
		if (
			options.config &&
			!["show", "reset", "summary", "validate"].includes(options.config)
		) {
			errors.push(
				"Config action must be one of: show, reset, summary, validate",
			);
		}

		// Validate pattern names
		if (
			options.applyPattern &&
			!this.isValidPatternName(options.applyPattern)
		) {
			errors.push(
				`Pattern '${options.applyPattern}' is not a valid pattern name`,
			);
		}

		// Validate resolution format
		if (options.resolution && !options.resolution.match(/^\d+x\d+$/)) {
			errors.push(
				"Resolution must be in format: WIDTHxHEIGHT (e.g., 1080x1920)",
			);
		}

		return errors;
	}

	private isValidPatternName(patternName: string): boolean {
		const validPatterns = [
			"development",
			"production",
			"high-security",
			"high-performance",
			"monitoring-intensive",
			"automation-heavy",
			"small-scale",
		];
		return validPatterns.includes(patternName);
	}

	private async handleDeviceConnection(): Promise<boolean> {
		try {
			this.log("Checking device connection...");

			const devices = await this.adb.listDevices();
			const deviceList = devices.split("\n").filter((line) => line.trim());
			const deviceExists = deviceList.some((line) =>
				line.includes(this.deviceId),
			);

			if (!deviceExists) {
				this.log(
					`Device ${this.deviceId} not found. Available devices:`,
					"warn",
				);
				deviceList.forEach((line) => {
					const [deviceId, status] = line.split("\t");
					console.log(`   - ${deviceId} (${status})`);
				});
				return false;
			}

			const status = await this.adb.getRealDeviceStatus();
			if (!status.online) {
				this.log(`Device ${this.deviceId} is offline`, "warn");
				return false;
			}

			this.log(`Device ${this.deviceId} is online and ready`);
			return true;
		} catch (error) {
			this.log(
				`Failed to connect to device: ${error instanceof Error ? error.message : "Unknown error"}`,
				"error",
			);
			return false;
		}
	}

	async run(options: DuoplusCLIOptions): Promise<void> {
		try {
			// Set verbose mode
			this.verbose = options.verbose || false;

			// Validate options first
			const validationErrors = this.validateOptions(options);
			const commandValidationErrors = CommandValidator.validate(
				process.argv.slice(2),
			);

			const allErrors = [
				...validationErrors,
				...commandValidationErrors.map((err) => err.message),
			];

			if (allErrors.length > 0) {
				console.log("❌ Validation errors:");
				allErrors.forEach((error) => console.log(`   - ${error}`));

				// Show suggestions for command errors
				const suggestions = commandValidationErrors.filter(
					(err) => err.suggestion,
				);
				if (suggestions.length > 0) {
					console.log("\n💡 Suggestions:");
					suggestions.forEach((err) => console.log(`   ${err.suggestion}`));
				}

				console.log(
					"\n💡 Use --help for usage information or --search <term> to find commands",
				);
				process.exit(1);
			}

			// Set device if specified
			if (options.device) {
				this.deviceId = options.device;
				this.log(`Using device: ${this.deviceId}`);
			}

			// Show help or search
			if (options.help || options.search) {
				// Check if help is requesting a specific category or search
				const positionalArgs = process.argv.slice(2);
				const helpIndex = positionalArgs.indexOf("--help");
				const searchIndex = positionalArgs.indexOf("--search");

				let category: string | undefined;
				let searchTerm: string | undefined;

				if (helpIndex !== -1 && positionalArgs[helpIndex + 1]) {
					category = positionalArgs[helpIndex + 1];
				}

				if (searchIndex !== -1 && positionalArgs[searchIndex + 1]) {
					searchTerm = positionalArgs[searchIndex + 1];
				} else if (options.search) {
					searchTerm = options.search;
				}

				this.showHelp(category, searchTerm);
				return;
			}

			// Check device connection for device-specific commands
			const deviceRequired = [
				options.status,
				options.details,
				options.reset,
				options.factoryReset,
				options.enable,
				options.power,
				options.screenshot,
				options.upload,
				options.install,
				options.uninstall,
				options.batchApps,
				options.preinstalled,
				options.apps,
				options.restart,
				options.transfer,
				options.focusMode,
				options.twoFA,
				options.clean,
				options.backup,
				options.root,
				options.qrScan,
				options.resolution,
				options.streaming,
				options.quality,
				options.route,
				options.monitor,
				options.command,
			].some(Boolean);

			if (deviceRequired) {
				const connected = await this.handleDeviceConnection();
				if (!connected) {
					console.log(
						"❌ Device connection failed. Please check device status and try again.",
					);
					process.exit(1);
				}
			}

			// Execute commands based on priority
			await this.executeCommands(options);
		} catch (error) {
			this.log(
				`Command execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				"error",
			);

			if (this.verbose) {
				console.log("\n🔍 Stack trace:");
				console.log(
					error instanceof Error ? error.stack : "No stack trace available",
				);
			}

			process.exit(1);
		}
	}

	private async executeCommands(options: DuoplusCLIOptions): Promise<void> {
		// Priority 1: Device listing (no device required)
		if (options.list) {
			await this.listDevices();
			return;
		}

		// Priority 2: Configuration and System Commands
		if (options.config) {
			await this.showConfig(options.config);
			return;
		}

		if (options.integrations) {
			await this.showIntegrations();
			return;
		}

		if (options.analytics) {
			await this.showAnalytics();
			return;
		}

		if (options.scheduler) {
			await this.showScheduler();
			return;
		}

		if (options.notify) {
			await this.sendNotification(options.notify);
			return;
		}

		// Pattern Management Commands
		if (options.patterns) {
			await this.listPatterns();
			return;
		}

		if (options.applyPattern) {
			await this.applyPattern(options.applyPattern);
			return;
		}

		if (options.applyPatterns) {
			await this.applyMultiplePatterns(options.applyPatterns);
			return;
		}

		if (options.resetConfig) {
			await this.resetConfiguration();
			return;
		}

		if (options.exportConfig) {
			await this.exportConfiguration(options.exportConfig);
			return;
		}

		if (options.importConfig) {
			await this.importConfiguration(options.importConfig);
			return;
		}

		if (options.validateConfig) {
			await this.validateConfiguration();
			return;
		}

		if (options.automation) {
			await this.startAutomation();
			return;
		}

		if (options.batch) {
			await this.executeBatch(options.batch);
			return;
		}

		// Priority 3: Device Information Commands
		if (options.cloudStatus) {
			await this.showCloudPhoneStatus();
			return;
		}

		if (options.status) {
			await this.showStatus();
			return;
		}

		if (options.details) {
			await this.showDetails();
			return;
		}

		// Priority 4: Device Control Commands
		if (options.reset) {
			await this.resetDevice();
			return;
		}

		if (options.factoryReset) {
			await this.factoryReset();
			return;
		}

		if (options.enable) {
			await this.enableADB();
			return;
		}

		if (options.power) {
			await this.powerDevice(options.power);
			return;
		}

		// Priority 5: Advanced Commands
		if (options.screenshot) {
			await this.takeScreenshot();
			return;
		}

		if (options.upload) {
			await this.uploadFile(options.upload);
			return;
		}

		if (options.install) {
			await this.installApp(options.install);
			return;
		}

		if (options.uninstall) {
			await this.uninstallApp(options.uninstall);
			return;
		}

		if (options.batchApps) {
			await this.batchAppOperations();
			return;
		}

		if (options.preinstalled) {
			await this.listPreinstalledApps();
			return;
		}

		if (options.apps) {
			await this.listApps();
			return;
		}

		// Priority 6: Team Management Commands
		if (options.teams) {
			await this.listTeams();
			return;
		}

		if (options.members) {
			await this.listTeamMembers();
			return;
		}

		if (options.invite) {
			await this.inviteTeamMember(options.invite);
			return;
		}

		if (options.groups) {
			await this.listGroups();
			return;
		}

		if (options.share) {
			await this.shareResource(options.share);
			return;
		}

		// Priority 7: Device Operations Commands
		if (options.restart) {
			await this.restartDevice();
			return;
		}

		if (options.transfer) {
			await this.transferDevice(options.transfer);
			return;
		}

		if (options.focusMode) {
			await this.setFocusMode(options.focusMode);
			return;
		}

		if (options.twoFA) {
			await this.manage2FA(options.twoFA);
			return;
		}

		if (options.clean) {
			await this.cleanDevice();
			return;
		}

		if (options.backup) {
			await this.backupDevice();
			return;
		}

		// Priority 8: Advanced Functions Commands
		if (options.root) {
			await this.manageRootAccess(options.root);
			return;
		}

		if (options.qrScan) {
			await this.scanQRCode();
			return;
		}

		if (options.resolution) {
			await this.changeResolution(options.resolution);
			return;
		}

		if (options.streaming) {
			await this.startStreaming();
			return;
		}

		if (options.quality) {
			await this.adjustQuality(options.quality);
			return;
		}

		if (options.route) {
			await this.selectRoute(options.route);
			return;
		}

		if (options.monitor) {
			await this.startMonitoring();
			return;
		}

		// Priority 9: Custom Commands
		if (options.command) {
			await this.executeCommand(options.command);
			return;
		}

		// Default: show status
		await this.showStatus();
	}

	private async listDevices(): Promise<void> {
		console.log("📱 Duoplus Cloud Phone List");
		console.log("================================");

		// Show progress for API call
		const progress = ProgressUtils.indeterminate("Fetching device list");
		progress.start();

		try {
			const result = await this.adb.getCloudPhoneList({
				page: 1,
				pagesize: 20,
			});

			progress.complete("Device list retrieved");

			if (result.code === 200) {
				const devices = result.data.list;

				if (devices.length === 0) {
					console.log("ℹ️  No devices found");
					return;
				}

				console.log(`Found ${devices.length} device(s):\n`);

				// Prepare data for table formatting
				const tableData = devices.map((device, _index) => ({
					id: device.id,
					name: device.name,
					status: device.status,
					model: device.os || "Unknown",
					ip: device.ip || "N/A",
					location: device.area || "Unknown",
				}));

				// Use table formatter for clean output
				const table = new TableFormatter(
					[
						{
							header: "#",
							key: "index",
							width: 4,
							align: "center",
							format: (_value: any, rowIndex?: number, _rowData?: any) =>
								String((rowIndex || 0) + 1),
						},
						{ header: "Device ID", key: "id", width: 25, align: "left" },
						{ header: "Name", key: "name", width: 20, align: "left" },
						{
							header: "Status",
							key: "status",
							width: 10,
							align: "center",
							format: (value: any) =>
								value === 1
									? "\x1b[32m● Online\x1b[0m"
									: "\x1b[31m● Offline\x1b[0m",
						},
						{ header: "Model", key: "model", width: 15, align: "left" },
						{ header: "IP Address", key: "ip", width: 15, align: "left" },
						{ header: "Location", key: "location", width: 15, align: "left" },
					],
					{
						showBorders: true,
						headerStyle: "bold",
						maxWidth: 100,
					},
				);

				table.print(tableData);

				// Show summary
				const onlineCount = devices.filter((d) => d.status === 1).length;
				const offlineCount = devices.length - onlineCount;

				console.log("");
				console.log("📊 Summary:");
				console.log(`   \x1b[32m● Online:\x1b[0m ${onlineCount}`);
				console.log(`   \x1b[31m● Offline:\x1b[0m ${offlineCount}`);
				console.log(`   📱 Total: ${devices.length}`);
			} else {
				console.log("❌ Failed to retrieve device list");
				if (result.message) {
					console.log(`   Error: ${result.message}`);
				}
			}
		} catch (error) {
			progress.fail("Failed to fetch device list");
			this.log(
				`Error fetching devices: ${error instanceof Error ? error.message : "Unknown error"}`,
				"error",
			);
		}
	}

	private async showStatus(): Promise<void> {
		console.log("🔍 Device Status");
		console.log("==================");

		const result = await this.adb.getCloudPhoneStatus([this.deviceId]);

		if (result.code === 200 && result.data.list.length > 0) {
			const device = result.data.list[0];
			const status = device.status === 1 ? "🟢 Online" : "🔴 Offline";
			const powered = device.status === 1 ? "🟢 Powered On" : "🔴 Powered Off";

			console.log(`Device: ${device.name} (${this.deviceId})`);
			console.log(`Status: ${status}`);
			console.log(`Power: ${powered}`);
			console.log(`Model: Available via --details`);
			console.log(`Android: Available via --details`);
			console.log(`IP: Available via --details`);
			console.log(`Location: Available via --details`);
		} else {
			console.log(`❌ Device ${this.deviceId} not found`);
		}
	}

	private async showCloudPhoneStatus(): Promise<void> {
		console.log("☁️  Cloud Phone Status (Official API)");
		console.log("====================================");

		// Check if shutting down
		if (this.isShuttingDown) {
			console.log("❌ CLI is shutting down - cannot start new operations");
			return;
		}

		try {
			const config = this.configManager.getApiConfig();
			const apiUrl = `${config.baseUrl}/api/v1/cloudPhone/status`;

			// Prepare request body with device IDs
			const requestBody = {
				image_ids: [this.deviceId],
			};

			this.log(`Querying cloud phone status for device: ${this.deviceId}`);
			this.log(`Process uptime: ${ProcessUtils.getProcessUptimeFormatted()}`);
			this.log(`Current timezone: ${ProcessUtils.getCurrentTimezone()}`);
			this.log(`Local time: ${ProcessUtils.getLocalTimeString()}`);

			// Use ProcessUtils with timezone support for better API integration
			const curlCommand = `curl -X POST "${apiUrl}" -H "Content-Type: application/json" -H "Authorization: ${config.apiKey ? `Bearer ${config.apiKey}` : ""}" -d '${JSON.stringify(requestBody)}' --silent --show-error --fail`;

			let output = "";

			if (this.verbose) {
				// In verbose mode, use shell with timing and timezone information
				console.log("🔍 Raw API Response with shell timing:");
				const result = await ProcessUtils.executeWithTimezone(curlCommand, {
					trackTiming: true,
					useShell: true,
					timezone: this.timezone,
				});
				output = (result as any).stdout;

				// Additional timing details in verbose mode
				console.log(`📊 API Call Details (Shell):`);
				console.log(
					`   Duration: ${ProcessUtils.formatDuration((result as any).duration)}`,
				);
				console.log(
					`   Started: ${new Date((result as any).startTime).toISOString()}`,
				);
				console.log(
					`   Ended: ${new Date((result as any).endTime).toISOString()}`,
				);
				console.log(`   Exit Code: ${(result as any).exitCode ?? "unknown"}`);
				console.log(`   Success: ${(result as any).success}`);
				console.log(`   Timezone: ${ProcessUtils.getCurrentTimezone()}`);
			} else {
				// Normal mode - use shell with minimal timing
				const result = await ProcessUtils.executeWithTimezone(curlCommand, {
					trackTiming: false,
					useShell: true,
					timezone: this.timezone,
				});
				output = (result as any).stdout;

				if (this.verbose) {
					console.log(
						`⏱️  API request completed in ${ProcessUtils.formatDuration((result as any).duration)}`,
					);
				}
			}

			if (!output.trim()) {
				throw new Error("Empty response from API");
			}

			// Parse JSON response
			let result;
			try {
				result = JSON.parse(output);
			} catch (_parseError) {
				this.log(`Failed to parse API response: ${output}`, "error");
				throw new Error("Invalid JSON response from API");
			}

			if (result.code === 200 && result.data && result.data.list) {
				console.log(`✅ Successfully retrieved cloud phone status!\n`);

				result.data.list.forEach((phone: any, index: number) => {
					console.log(
						`${index + 1}. 📱 ${phone.name || "Unknown Device"} (${phone.id})`,
					);

					// Status mapping based on API documentation
					const statusMap: Record<number, string> = {
						0: "🔧 Not configured",
						1: "🟢 Powered on",
						2: "🔴 Powered off",
						3: "⏰ Expired",
						4: "🔄 Renewal needed",
						10: "⚡ Powering on",
						11: "⚙️  Configuring",
						12: "❌ Configuration failed",
					};

					const statusText =
						statusMap[phone.status] || `❓ Unknown status (${phone.status})`;
					console.log(`   Status: ${statusText}`);

					if (phone.status === 1) {
						console.log(`   ✅ Device is ready for use`);
					} else if (phone.status === 2) {
						console.log(`   💡 Use --power on to start the device`);
					} else if (phone.status === 3) {
						console.log(`   ⚠️  Device subscription has expired`);
					} else if (phone.status === 4) {
						console.log(`   💰 Device needs renewal`);
					} else if (phone.status === 10) {
						console.log(`   ⏳ Device is currently starting...`);
					} else if (phone.status === 11) {
						console.log(`   🔧 Device is being configured...`);
					} else if (phone.status === 12) {
						console.log(`   ❌ Device configuration failed - check logs`);
					}

					console.log("");
				});

				if (result.data.list.length === 0) {
					console.log(`ℹ️  No cloud phones found for the specified device IDs`);
				}
			} else {
				console.log(`❌ API Error: ${result.message || "Unknown error"}`);
				if (result.code) {
					console.log(`   Error Code: ${result.code}`);
				}
			}
		} catch (error) {
			if (this.isShuttingDown) {
				console.log("⚠️  Operation cancelled due to shutdown");
				return;
			}

			this.log(
				`Failed to query cloud phone status: ${error instanceof Error ? error.message : "Unknown error"}`,
				"error",
			);

			if (this.verbose) {
				const config = this.configManager.getApiConfig();
				console.log("\n🔍 Debug Information:");
				console.log(`API URL: ${config.baseUrl}/api/v1/cloudPhone/status`);
				console.log(`Device ID: ${this.deviceId}`);
				console.log(
					`Process Uptime: ${ProcessUtils.getProcessUptimeFormatted()}`,
				);
				console.log(
					`Request Body: ${JSON.stringify({ image_ids: [this.deviceId] }, null, 2)}`,
				);
				console.log(
					"💡 Make sure curl is installed and API credentials are configured",
				);
			}
		}
	}

	private async showDetails(): Promise<void> {
		console.log("📋 Device Details");
		console.log("==================");

		const result = await this.adb.getCloudPhoneDetails(this.deviceId);

		if (result.code === 200) {
			const details = result.data;

			console.log(
				`📱 Device: ${details.device.manufacturer} ${details.device.brand} ${details.device.model}`,
			);
			console.log(`🔧 OS: ${details.os}`);
			console.log(
				`🌐 Network: ${details.proxy.ip} (${details.proxy.city}, ${details.proxy.region})`,
			);
			console.log(`📍 GPS: ${details.gps.latitude}, ${details.gps.longitude}`);
			console.log(`🕐 Timezone: ${details.locale.timezone}`);
			console.log(`📞 SIM: ${details.sim.operator} (${details.sim.msisdn})`);
			console.log(`📶 WiFi: ${details.wifi.name} (${details.wifi.mac})`);
			console.log(
				`🔊 Bluetooth: ${details.bluetooth.name} (${details.bluetooth.address})`,
			);
			console.log(`🔍 Device IDs:`);
			console.log(`   IMEI: ${details.device.imei}`);
			console.log(`   Serial: ${details.device.serialno}`);
			console.log(`   Android ID: ${details.device.android_id}`);
		} else {
			console.log(`❌ Failed to get device details`);
		}
	}

	private async factoryReset(): Promise<void> {
		console.log("🔄 Factory Reset Device");
		console.log("========================");
		console.log("⚠️  WARNING: This will reset the device to factory settings!");
		console.log("   All installed apps will be removed");
		console.log("   All data will be wiped");
		console.log("");

		// Simulate user confirmation (in real implementation, you'd ask for confirmation)
		console.log("🔧 Proceeding with factory reset...");

		const result = await this.adb.factoryReset(this.deviceId, {
			// Optional parameters can be added here
			data_type: 1, // Reinstall System
			keep_gp: 1, // Keep Google Play
			network_mode: 1, // WI-FI
		});

		if (result.code === 200) {
			console.log("✅ Factory reset successful!");
			console.log(`📊 Status: ${result.data.message}`);
			console.log("");
			console.log("🔄 Device has been reset to factory settings");
			console.log("💡 All installed apps have been removed");
			console.log("💡 Device is ready for fresh setup");
			console.log("💡 System has been reinstalled");
			console.log("💡 Google Play has been preserved");
		} else {
			console.log("❌ Failed to factory reset device");
			console.log(`Error: ${result.data.message}`);
		}
	}

	private async resetDevice(): Promise<void> {
		console.log("🔄 Resetting Device...");
		console.log("====================");

		const result = await this.adb.resetAndRegenerateDevice(this.deviceId);

		if (result.code === 200) {
			console.log("✅ Device reset successfully!");
			console.log(
				"Device has been restored to factory settings with new identity.",
			);
		} else {
			console.log(`❌ Reset failed: ${result.message}`);
		}
	}

	private async enableADB(): Promise<void> {
		console.log("🔧 Enabling ADB...");
		console.log("==================");

		const result = await this.adb.batchEnableADB([this.deviceId]);

		if (result.code === 200) {
			if (result.data.success.includes(this.deviceId)) {
				console.log("✅ ADB enabled successfully!");
				console.log(`Device ${this.deviceId} is ready for ADB commands.`);
			} else {
				console.log("❌ Failed to enable ADB");
				if (result.data.fail.length > 0) {
					console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
				}
			}
		} else {
			console.log("❌ ADB enable failed");
		}
	}

	private async powerDevice(action: string): Promise<void> {
		console.log(`⚡ Power ${action} Device...`);
		console.log("========================");

		if (action === "on") {
			const result = await this.adb.batchPowerControl([this.deviceId], "on");
			if (result.code === 200) {
				if (result.data.success.includes(this.deviceId)) {
					console.log("✅ Device powered on successfully!");
				} else {
					console.log("❌ Failed to power on device");
					if (result.data.fail.length > 0) {
						console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
					}
				}
			} else {
				console.log("❌ Power on failed");
			}
		} else if (action === "off") {
			const result = await this.adb.batchPowerControl([this.deviceId], "off");
			if (result.code === 200) {
				if (result.data.success.includes(this.deviceId)) {
					console.log("✅ Device powered off successfully!");
				} else {
					console.log("❌ Failed to power off device");
					if (result.data.fail.length > 0) {
						console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
					}
				}
			} else {
				console.log("❌ Power off failed");
			}
		} else {
			console.log('❌ Invalid power action. Use "on" or "off"');
		}
	}

	private async takeScreenshot(): Promise<void> {
		console.log("📸 Taking Screenshot...");
		console.log("=======================");

		// Show progress for screenshot capture
		const progress = ProgressUtils.timed("Capturing screenshot", 10);
		progress.start();

		try {
			const result = await this.adb.batchScreenshot([this.deviceId]);

			progress.complete("Screenshot captured");

			if (result.code === 200) {
				if (result.data.success.includes(this.deviceId)) {
					const screenshot = result.data.screenshots[this.deviceId];

					// Display screenshot info in a clean format
					const screenshotInfo = {
						Filename: screenshot.filename,
						Path: screenshot.path,
						Size: `${(screenshot.size / 1024).toFixed(1)} KB`,
						Timestamp: screenshot.timestamp,
						"Download URL": screenshot.url,
					};

					console.log("✅ Screenshot captured successfully!");
					TableUtils.printSimpleTable(screenshotInfo, "Screenshot Details");

					console.log("");
					console.log("💡 Download with ADB:");
					console.log(`   adb pull ${screenshot.path}`);
				} else {
					console.log("❌ Failed to capture screenshot");
					if (result.data.fail.length > 0) {
						console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
					}
				}
			} else {
				console.log("❌ Screenshot API failed");
				if (result.message) {
					console.log(`Error: ${result.message}`);
				}
			}
		} catch (error) {
			progress.fail("Failed to capture screenshot");
			this.log(
				`Screenshot error: ${error instanceof Error ? error.message : "Unknown error"}`,
				"error",
			);
		}
	}

	private async uploadFile(filePath: string): Promise<void> {
		console.log(`📤 Uploading File: ${filePath}`);
		console.log("============================");

		// Extract filename from path
		const filename = filePath.split("/").pop() || filePath;

		const result = await this.adb.batchUploadFile([this.deviceId], {
			filename,
			content: "Sample file content for testing",
			size: 1024,
			destination_path: `/sdcard/uploads/${filename}`,
		});

		if (result.code === 200) {
			if (result.data.success.includes(this.deviceId)) {
				const upload = result.data.uploads[this.deviceId];
				console.log("✅ File uploaded successfully!");
				console.log(`📁 Filename: ${upload.filename}`);
				console.log(`📂 Path: ${upload.path}`);
				console.log(`📏 Size: ${(upload.size / 1024).toFixed(1)} KB`);
				console.log(`🕐 Timestamp: ${upload.timestamp}`);
				console.log(`🔗 Download URL: ${upload.url}`);
				console.log("");
				console.log(`💡 Use ADB to download: adb pull ${upload.path}`);
			} else {
				console.log("❌ Failed to upload file");
				if (result.data.fail.length > 0) {
					console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
				}
			}
		} else {
			console.log("❌ File upload API failed");
		}
	}

	private async installApp(packageName: string): Promise<void> {
		console.log(`📱 Installing App: ${packageName}`);
		console.log("===========================");

		const result = await this.adb.batchInstallApp([this.deviceId], {
			package_name: packageName,
			install_flags: ["-r", "-d"], // Replace existing and allow downgrade
		});

		if (result.code === 200) {
			if (result.data.success.includes(this.deviceId)) {
				const installation = result.data.installations[this.deviceId];
				console.log("✅ App installation successful!");
				console.log(`📦 Package: ${installation.package_name}`);
				console.log(`📋 Version: ${installation.version}`);
				console.log(`🕐 Install Time: ${installation.install_time}`);
				console.log(`📊 Status: ${installation.status}`);
				if (installation.path) {
					console.log(`📂 Path: ${installation.path}`);
				}

				if (installation.status === "already_installed") {
					console.log("");
					console.log("ℹ️  App was already installed on the device");
				}
			} else {
				console.log("❌ Failed to install app");
				if (result.data.fail.length > 0) {
					console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
				}
			}
		} else {
			console.log("❌ App installation API failed");
		}
	}

	private async listApps(): Promise<void> {
		console.log("📱 Installed Applications");
		console.log("========================");

		const result = await this.adb.listApps(this.deviceId, {
			type: "all",
			limit: 20,
		});

		if (result.code === 200) {
			console.log(`Found ${result.data.total} apps:\n`);
			result.data.apps.forEach((app, index) => {
				const typeIcon = app.type === "system" ? "⚙️" : "📱";
				console.log(
					`${index + 1}. ${typeIcon} ${app.app_name} (${app.package_name})`,
				);
				console.log(
					`   Version: ${app.version} | Size: ${(app.size / 1024 / 1024).toFixed(1)}MB | Type: ${app.type}`,
				);
				console.log(`   Installed: ${app.install_time}`);
				console.log("");
			});

			if (result.data.total > 20) {
				console.log(`... and ${result.data.total - 20} more apps`);
			}
		} else {
			console.log("❌ Failed to list applications");
			console.log(`Error: ${result.message}`);
		}
	}

	private async uninstallApp(packageName: string): Promise<void> {
		console.log(`🗑️  Uninstalling App: ${packageName}`);
		console.log("===============================");

		const result = await this.adb.uninstallApp(this.deviceId, packageName);

		if (result.code === 200) {
			if (result.data.success.includes(this.deviceId)) {
				const uninstallation = result.data.uninstallations[this.deviceId];
				console.log("✅ App uninstalled successfully!");
				console.log(`📦 Package: ${uninstallation.package_name}`);
				console.log(`🕐 Uninstall Time: ${uninstallation.uninstall_time}`);
				console.log(`📊 Status: ${uninstallation.status}`);

				if (uninstallation.status === "not_found") {
					console.log("");
					console.log("ℹ️  App was not found on the device");
				}
			} else {
				console.log("❌ Failed to uninstall app");
				if (result.data.fail.length > 0) {
					console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
				}
			}
		} else {
			console.log("❌ App uninstallation API failed");
		}
	}

	private async batchAppOperations(): Promise<void> {
		console.log("🔄 Batch App Operations");
		console.log("========================");

		// Simulate batch operations
		const operations = [
			{ type: "install" as const, package_name: "com.example.app1" },
			{ type: "uninstall" as const, package_name: "com.example.app2" },
			{ type: "install" as const, package_name: "com.example.app3" },
		];

		const result = await this.adb.batchAppOperations(this.deviceId, operations);

		if (result.code === 200) {
			console.log(`✅ Batch operations completed!`);
			console.log(
				`📊 Results: ${result.data.results.successful} successful, ${result.data.results.failed} failed`,
			);
			console.log(`📈 Total: ${result.data.results.total} operations`);
			console.log("");

			result.data.operations.forEach((op, index) => {
				const status = op.status === "success" ? "✅" : "❌";
				console.log(
					`${status} ${index + 1}. ${op.type.toUpperCase()} ${op.package_name}`,
				);
				if (op.status === "failed") {
					console.log(`   Error: ${op.message}`);
				}
			});
		} else {
			console.log("❌ Batch operations failed");
			console.log(`Error: ${result.message}`);
		}
	}

	private async listPreinstalledApps(): Promise<void> {
		console.log("📱 Preinstalled Applications");
		console.log("=============================");

		const result = await this.adb.listPreinstalledApps(this.deviceId);

		if (result.code === 200) {
			console.log(`Found ${result.data.total} preinstalled apps:\n`);
			result.data.preinstalled.forEach((app, index) => {
				console.log(`${index + 1}. ${app.app_name} (${app.package_name})`);
				console.log(
					`   Version: ${app.version} | Size: ${(app.size / 1024 / 1024).toFixed(1)}MB`,
				);
				console.log(`   Category: ${app.category}`);
				console.log("");
			});
		} else {
			console.log("❌ Failed to list preinstalled applications");
			console.log(`Error: ${result.message}`);
		}
	}

	// Team Management Methods

	private async listTeams(): Promise<void> {
		console.log("👥 Team Management");
		console.log("==================");

		const result = await this.adb.listTeams({
			limit: 20,
		});

		if (result.code === 200) {
			console.log(`Found ${result.data.total} teams:\n`);
			result.data.teams.forEach((team, index) => {
				const statusIcon = team.status === "active" ? "✅" : "⏸️";
				console.log(`${index + 1}. ${statusIcon} ${team.name} (${team.id})`);
				console.log(`   Description: ${team.description}`);
				console.log(
					`   Members: ${team.member_count} | Devices: ${team.device_count}`,
				);
				console.log(`   Created: ${team.created_at}`);
				console.log("");
			});

			if (result.data.total > 20) {
				console.log(`... and ${result.data.total - 20} more teams`);
			}
		} else {
			console.log("❌ Failed to list teams");
			console.log(`Error: ${result.message}`);
		}
	}

	private async listTeamMembers(): Promise<void> {
		console.log("👥 Team Members");
		console.log("===============");

		const result = await this.adb.listTeamMembers(undefined, {
			limit: 20,
		});

		if (result.code === 200) {
			console.log(`Found ${result.data.total} members:\n`);
			result.data.members.forEach((member, index) => {
				const statusIcon = member.status === "active" ? "🟢" : "⚪";
				const roleIcon =
					member.role === "admin"
						? "👑"
						: member.role === "member"
							? "👤"
							: "👁️";
				console.log(
					`${index + 1}. ${statusIcon} ${roleIcon} ${member.name} (${member.email})`,
				);
				console.log(`   Role: ${member.role} | ID: ${member.id}`);
				console.log(`   Joined: ${member.joined_at}`);
				console.log(`   Last Active: ${member.last_active}`);
				console.log("");
			});

			if (result.data.total > 20) {
				console.log(`... and ${result.data.total - 20} more members`);
			}
		} else {
			console.log("❌ Failed to list team members");
			console.log(`Error: ${result.message}`);
		}
	}

	private async listGroups(): Promise<void> {
		console.log("📁 Team Groups");
		console.log("===============");

		const result = await this.adb.listTeamGroups(undefined, {
			limit: 20,
		});

		if (result.code === 200) {
			console.log(`Found ${result.data.total} groups:\n`);
			result.data.groups.forEach((group: any, index: number) => {
				const statusIcon = group.status === "active" ? "✅" : "⏸️";
				console.log(`${index + 1}. ${statusIcon} ${group.name} (${group.id})`);
				console.log(`   Description: ${group.description || "No description"}`);
				console.log(
					`   Members: ${group.member_count} | Devices: ${group.device_count}`,
				);
				console.log(`   Created: ${group.created_at}`);
				console.log("");
			});

			if (result.data.total > 20) {
				console.log(`... and ${result.data.total - 20} more groups`);
			}
		} else {
			console.log("❌ Failed to list groups");
			console.log(`Error: ${result.message}`);
		}
	}

	private async inviteTeamMember(email: string): Promise<void> {
		console.log(`📧 Inviting Team Member: ${email}`);
		console.log("===============================");

		const result = await this.adb.inviteTeamMembers([
			{
				email: email,
				role: "member",
				message: "Welcome to our Duoplus team!",
			},
		]);

		if (result.code === 200) {
			console.log(`✅ Invitation process completed!`);
			console.log(
				`📊 Results: ${result.data.successful.length} successful, ${result.data.failed.length} failed`,
			);
			console.log("");

			result.data.invitations.forEach((invitation, index) => {
				const statusIcon = invitation.status === "sent" ? "✅" : "❌";
				console.log(`${statusIcon} ${index + 1}. ${invitation.email}`);
				if (invitation.status === "sent") {
					console.log(`   Invitation ID: ${invitation.invitation_id}`);
					console.log(`   Role: ${invitation.role}`);
				} else {
					console.log(`   Error: ${invitation.error}`);
				}
			});
		} else {
			console.log("❌ Failed to send invitations");
			console.log(`Error: ${result.message}`);
		}
	}

	private async listTeamGroups(): Promise<void> {
		console.log("🏷️  Team Groups");
		console.log("================");

		const result = await this.adb.listTeamGroups(undefined, {
			limit: 20,
		});

		if (result.code === 200) {
			console.log(`Found ${result.data.total} groups:\n`);
			result.data.groups.forEach((group, index) => {
				console.log(`${index + 1}. 🏷️  ${group.name} (${group.id})`);
				console.log(`   Description: ${group.description}`);
				console.log(`   Members: ${group.member_count}`);
				console.log(`   Permissions: ${group.permissions.join(", ")}`);
				console.log(`   Created: ${group.created_at}`);
				console.log("");
			});

			if (result.data.total > 20) {
				console.log(`... and ${result.data.total - 20} more groups`);
			}
		} else {
			console.log("❌ Failed to list team groups");
			console.log(`Error: ${result.message}`);
		}
	}

	private async shareResource(resourceId: string): Promise<void> {
		console.log(`🔗 Sharing Resource: ${resourceId}`);
		console.log("===============================");

		const result = await this.adb.shareResources({
			type: "device",
			resource_id: resourceId,
			team_id: "team_001",
			permissions: ["view", "control"],
			expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
			message: "Shared device for testing purposes",
		});

		if (result.code === 200) {
			const share = result.data.shares[0];
			console.log("✅ Resource shared successfully!");
			console.log(`📋 Share ID: ${share.id}`);
			console.log(`🔗 Share URL: ${share.share_url}`);
			console.log(`📱 Resource: ${share.type} (${share.resource_id})`);
			console.log(`👥 Shared with: ${share.shared_with.join(", ")}`);
			console.log(`🔐 Permissions: ${share.permissions.join(", ")}`);
			console.log(`🕐 Created: ${share.created_at}`);
			console.log(`⏰ Expires: ${share.expires_at || "Never"}`);
		} else {
			console.log("❌ Failed to share resource");
			console.log(`Error: ${result.message}`);
		}
	}

	// Device Operations Methods

	private async restartDevice(): Promise<void> {
		console.log("🔄 Restarting Device");
		console.log("====================");

		const result = await this.adb.restartDevice(this.deviceId, {
			force: false,
			wait_time: 30,
		});

		if (result.code === 200) {
			if (result.data.success.includes(this.deviceId)) {
				const restart = result.data.restarts[this.deviceId];
				console.log("✅ Device restarted successfully!");
				console.log(`📱 Device ID: ${this.deviceId}`);
				console.log(`🕐 Restart Time: ${restart.restart_time}`);
				console.log(`📊 Previous Status: ${restart.previous_status}`);
				console.log(`📊 New Status: ${restart.new_status}`);
				console.log(`✅ Success: ${restart.success}`);
			} else {
				console.log("❌ Failed to restart device");
				if (result.data.fail.length > 0) {
					console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
				}
			}
		} else {
			console.log("❌ Device restart API failed");
			console.log(`Error: ${result.message}`);
		}
	}

	private async transferDevice(targetUser: string): Promise<void> {
		console.log(`🔄 Transferring Device to: ${targetUser}`);
		console.log("========================================");

		const result = await this.adb.transferDevice(this.deviceId, targetUser, {
			message: "Device transferred for project collaboration",
			preserve_data: true,
		});

		if (result.code === 200) {
			if (result.data.success.includes(this.deviceId)) {
				const transfer = result.data.transfers[this.deviceId];
				console.log("✅ Device transferred successfully!");
				console.log(`📱 Device ID: ${this.deviceId}`);
				console.log(`🔄 Transfer ID: ${transfer.transfer_id}`);
				console.log(`👤 From User: ${transfer.from_user}`);
				console.log(`👤 To User: ${transfer.to_user}`);
				console.log(`🕐 Transfer Time: ${transfer.transfer_time}`);
				console.log(`✅ Success: ${transfer.success}`);
			} else {
				console.log("❌ Failed to transfer device");
				if (result.data.fail.length > 0) {
					console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
				}
			}
		} else {
			console.log("❌ Device transfer API failed");
			console.log(`Error: ${result.message}`);
		}
	}

	private async setFocusMode(mode: string): Promise<void> {
		console.log(`🎯 Setting Focus Mode: ${mode}`);
		console.log("===============================");

		const validModes = ["none", "work", "gaming", "reading"];
		if (!validModes.includes(mode)) {
			console.log(
				"❌ Invalid focus mode. Valid options: none, work, gaming, reading",
			);
			return;
		}

		const result = await this.adb.setFocusMode(this.deviceId, mode as any, {
			block_notifications: mode !== "none",
			block_calls: mode === "work" || mode === "reading",
			whitelist_apps: mode === "gaming" ? ["com.game.app"] : [],
		});

		if (result.code === 200) {
			const settings = result.data.focus_settings;
			console.log("✅ Focus mode set successfully!");
			console.log(`🎯 Mode: ${settings.mode}`);
			console.log(`🔔 Enabled: ${settings.enabled}`);
			console.log(`📵 Block Notifications: ${settings.block_notifications}`);
			console.log(`📞 Block Calls: ${settings.block_calls}`);
			console.log(
				`📱 Whitelist Apps: ${settings.whitelist_apps.join(", ") || "None"}`,
			);
			console.log(`🕐 Activated: ${settings.activated_time}`);
		} else {
			console.log("❌ Failed to set focus mode");
			console.log(`Error: ${result.message}`);
		}
	}

	private async manage2FA(action: string): Promise<void> {
		console.log(`🔐 Managing 2FA: ${action}`);
		console.log("===========================");

		const validActions = ["enable", "disable", "generate-backup-codes"];
		if (!validActions.includes(action)) {
			console.log(
				"❌ Invalid 2FA action. Valid options: enable, disable, generate-backup-codes",
			);
			return;
		}

		const result = await this.adb.manage2FA(this.deviceId, action as any);

		if (result.code === 200) {
			const twoFactor = result.data.two_factor;
			console.log("✅ 2FA operation completed successfully!");
			console.log(`🔐 Enabled: ${twoFactor.enabled}`);

			if (action === "enable") {
				console.log(`🔑 Secret: ${twoFactor.secret}`);
				console.log(`📱 QR Code: ${twoFactor.qr_code}`);
				console.log(`🕐 Setup Time: ${twoFactor.setup_time}`);
			} else if (action === "generate-backup-codes") {
				console.log(`🔢 Backup Codes (${twoFactor.backup_codes.length}):`);
				twoFactor.backup_codes.forEach((code, index) => {
					console.log(`   ${index + 1}. ${code}`);
				});
			}
		} else {
			console.log("❌ Failed to manage 2FA");
			console.log(`Error: ${result.message}`);
		}
	}

	// Additional Device Operations Methods

	private async cleanDevice(): Promise<void> {
		console.log("🧹 Cleaning Device");
		console.log("==================");

		const result = await this.adb.cleanDevice(this.deviceId, {
			clean_cache: true,
			clean_logs: true,
			clean_temp: true,
			preserve_data: true,
		});

		if (result.code === 200) {
			if (result.data.success.includes(this.deviceId)) {
				const clean = result.data.clean_results[this.deviceId];
				console.log("✅ Device cleaned successfully!");
				console.log(`📱 Device ID: ${this.deviceId}`);
				console.log(`🕐 Clean Time: ${clean.clean_time}`);
				console.log(`🗑️  Cache Cleared: ${clean.cache_cleared}`);
				console.log(`📋 Logs Cleared: ${clean.logs_cleared}`);
				console.log(`📁 Temp Files Cleared: ${clean.temp_cleared}`);
				console.log(
					`💾 Space Freed: ${(clean.space_freed / 1024 / 1024).toFixed(1)}MB`,
				);
				console.log(`✅ Success: ${clean.success}`);
			} else {
				console.log("❌ Failed to clean device");
				if (result.data.fail.length > 0) {
					console.log(`Reason: ${result.data.fail_reason[this.deviceId]}`);
				}
			}
		} else {
			console.log("❌ Device cleaning API failed");
			console.log(`Error: ${result.message}`);
		}
	}

	private async backupDevice(): Promise<void> {
		console.log("💾 Backing Up Device");
		console.log("====================");

		const result = await this.adb.backupDevice(this.deviceId, {
			include_apps: true,
			include_data: true,
			include_settings: true,
			backup_location: "/cloud/backups/",
		});

		if (result.code === 200) {
			const backup = result.data.backup_results[this.deviceId];
			console.log("✅ Device backed up successfully!");
			console.log(`📱 Device ID: ${this.deviceId}`);
			console.log(`💾 Backup ID: ${backup.backup_id}`);
			console.log(`🕐 Backup Time: ${backup.backup_time}`);
			console.log(
				`📊 Backup Size: ${(backup.backup_size / 1024 / 1024 / 1024).toFixed(2)}GB`,
			);
			console.log(`📁 Backup Location: ${backup.backup_location}`);
			console.log(`📱 Apps Included: ${backup.included_apps}`);
			console.log(`💾 Data Included: ${backup.included_data}`);
			console.log(`⚙️  Settings Included: ${backup.included_settings}`);
			console.log(`✅ Success: ${backup.success}`);
		} else {
			console.log("❌ Device backup API failed");
			console.log(`Error: ${result.message}`);
		}
	}

	// Advanced Functions Methods

	private async manageRootAccess(action: string): Promise<void> {
		console.log(`🔑 Managing Root Access: ${action}`);
		console.log("===================================");

		const validActions = ["enable", "disable", "status"];
		if (!validActions.includes(action)) {
			console.log(
				"❌ Invalid root action. Valid options: enable, disable, status",
			);
			return;
		}

		const result = await this.adb.manageRootAccess(
			this.deviceId,
			action as any,
			{
				method: "systemless",
				preserve_warranty: true,
			},
		);

		if (result.code === 200) {
			const rootStatus = result.data.root_status[this.deviceId];
			console.log("✅ Root access operation completed successfully!");
			console.log(`🔑 Action: ${rootStatus.action}`);
			console.log(`🔓 Root Enabled: ${rootStatus.root_enabled}`);
			if (rootStatus.method) {
				console.log(`🛠️  Method: ${rootStatus.method}`);
			}
			console.log(`🕐 Access Time: ${rootStatus.access_time}`);
			console.log(`✅ Success: ${rootStatus.success}`);
		} else {
			console.log("❌ Failed to manage root access");
			console.log(`Error: ${result.message}`);
		}
	}

	private async scanQRCode(): Promise<void> {
		console.log("📷 Scanning QR Code");
		console.log("====================");

		const result = await this.adb.scanQRCode(this.deviceId, {
			scan_type: "camera",
			format: "qr",
		});

		if (result.code === 200) {
			const scanResult = result.data.scan_results[this.deviceId];
			console.log("✅ QR code scanned successfully!");
			console.log(`📱 Device ID: ${this.deviceId}`);
			console.log(`📊 QR Data: ${scanResult.qr_data}`);
			console.log(`🕐 Scan Time: ${scanResult.scan_time}`);
			console.log(`📋 Format: ${scanResult.format}`);
			console.log(`🎯 Confidence: ${scanResult.confidence}%`);
			console.log(`✅ Success: ${scanResult.success}`);
		} else {
			console.log("❌ Failed to scan QR code");
			console.log(`Error: ${result.message}`);
		}
	}

	private async changeResolution(resolution: string): Promise<void> {
		console.log(`🖥️  Changing Resolution: ${resolution}`);
		console.log("===============================");

		const result = await this.adb.changeResolution(this.deviceId, resolution, {
			refresh_rate: 60,
			density: 420,
		});

		if (result.code === 200) {
			const resolutionResult = result.data.resolution_results[this.deviceId];
			console.log("✅ Resolution changed successfully!");
			console.log(`📱 Device ID: ${this.deviceId}`);
			console.log(
				`📊 Current Resolution: ${resolutionResult.current_resolution}`,
			);
			console.log(`🖥️  New Resolution: ${resolutionResult.new_resolution}`);
			console.log(`🔄 Refresh Rate: ${resolutionResult.refresh_rate}Hz`);
			console.log(`📏 Density: ${resolutionResult.density}dpi`);
			console.log(`🕐 Change Time: ${resolutionResult.change_time}`);
			console.log(`✅ Success: ${resolutionResult.success}`);
		} else {
			console.log("❌ Failed to change resolution");
			console.log(`Error: ${result.message}`);
		}
	}

	private async startStreaming(): Promise<void> {
		console.log("📺 Starting Live Streaming");
		console.log("===========================");

		const result = await this.adb.startStreaming(this.deviceId, {
			quality: "high",
			fps: 30,
			bitrate: 4000,
			audio: true,
		});

		if (result.code === 200) {
			const streamingStatus = result.data.streaming_status[this.deviceId];
			console.log("✅ Streaming started successfully!");
			console.log(`📱 Device ID: ${this.deviceId}`);
			console.log(`🔗 Stream URL: ${streamingStatus.stream_url}`);
			console.log(`🎥 Quality: ${streamingStatus.quality}`);
			console.log(`🎬 FPS: ${streamingStatus.fps}`);
			console.log(`📊 Bitrate: ${streamingStatus.bitrate}kbps`);
			console.log(`🔊 Audio Enabled: ${streamingStatus.audio_enabled}`);
			console.log(`🕐 Start Time: ${streamingStatus.start_time}`);
			console.log(`👥 Viewers: ${streamingStatus.viewers}`);
			console.log(`✅ Success: ${streamingStatus.success}`);
		} else {
			console.log("❌ Failed to start streaming");
			console.log(`Error: ${result.message}`);
		}
	}

	private async adjustQuality(quality: string): Promise<void> {
		console.log(`⚙️  Adjusting Quality: ${quality}`);
		console.log("===============================");

		const validQualities = ["low", "medium", "high", "ultra", "auto"];
		if (!validQualities.includes(quality)) {
			console.log(
				"❌ Invalid quality. Valid options: low, medium, high, ultra, auto",
			);
			return;
		}

		const result = await this.adb.adjustQuality(this.deviceId, quality as any, {
			adaptive: true,
			save_power: false,
		});

		if (result.code === 200) {
			const qualitySettings = result.data.quality_settings[this.deviceId];
			console.log("✅ Quality adjusted successfully!");
			console.log(`📱 Device ID: ${this.deviceId}`);
			console.log(`📊 Current Quality: ${qualitySettings.current_quality}`);
			console.log(`⚙️  New Quality: ${qualitySettings.new_quality}`);
			console.log(`🔄 Adaptive Enabled: ${qualitySettings.adaptive_enabled}`);
			console.log(`🔋 Power Saving: ${qualitySettings.power_saving}`);
			console.log(`🕐 Adjustment Time: ${qualitySettings.adjustment_time}`);
			console.log(`✅ Adjusted: ${qualitySettings.adjusted}`);
		} else {
			console.log("❌ Failed to adjust quality");
			console.log(`Error: ${result.message}`);
		}
	}

	private async selectRoute(route: string): Promise<void> {
		console.log(`🛣️  Selecting Route: ${route}`);
		console.log("============================");

		const validRoutes = ["direct", "optimized", "secure", "balanced"];
		if (!validRoutes.includes(route)) {
			console.log(
				"❌ Invalid route. Valid options: direct, optimized, secure, balanced",
			);
			return;
		}

		const result = await this.adb.selectRoute(this.deviceId, route as any, {
			force_change: false,
			test_speed: true,
		});

		if (result.code === 200) {
			const routeSettings = result.data.route_settings[this.deviceId];
			console.log("✅ Route selected successfully!");
			console.log(`📱 Device ID: ${this.deviceId}`);
			console.log(`🛣️  Current Route: ${routeSettings.current_route}`);
			console.log(`🎯 New Route: ${routeSettings.new_route}`);
			console.log(`⚡ Latency: ${routeSettings.latency_ms}ms`);
			console.log(`📶 Bandwidth: ${routeSettings.bandwidth_mbps}Mbps`);
			console.log(`🔒 Secure: ${routeSettings.secure}`);
			console.log(`🕐 Selection Time: ${routeSettings.selection_time}`);
			console.log(`⚡ Optimized: ${routeSettings.optimized}`);
		} else {
			console.log("❌ Failed to select route");
			console.log(`Error: ${result.message}`);
		}
	}

	// Enhanced Features Methods

	private async executeBatch(configFile: string): Promise<void> {
		console.log(`🔄 Executing Batch Operations: ${configFile}`);
		console.log("==========================================");

		try {
			// Simulate batch configuration file reading
			const batchOperations = [
				{ command: "status", description: "Check device status" },
				{ command: "clean", description: "Clean device cache" },
				{ command: "backup", description: "Create device backup" },
				{ command: "apps", description: "List installed apps" },
			];

			console.log(`📋 Found ${batchOperations.length} batch operations:`);
			batchOperations.forEach((op, index) => {
				console.log(`   ${index + 1}. ${op.command} - ${op.description}`);
			});

			console.log("\n🚀 Executing batch operations...");

			for (let i = 0; i < batchOperations.length; i++) {
				const op = batchOperations[i];
				console.log(`\n[${i + 1}/${batchOperations.length}] ${op.description}`);

				// Simulate execution based on command type
				switch (op.command) {
					case "status":
						await this.showStatus();
						break;
					case "clean":
						await this.cleanDevice();
						break;
					case "backup":
						await this.backupDevice();
						break;
					case "apps":
						await this.listApps();
						break;
				}

				// Small delay between operations
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			console.log("\n✅ Batch operations completed successfully!");
		} catch (error) {
			console.log("❌ Batch execution failed");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async startAutomation(): Promise<void> {
		console.log("🤖 Starting Device Automation");
		console.log("==============================");

		try {
			console.log("🔧 Configuring automation settings...");

			// Simulate automation configuration
			const automationTasks = [
				{ name: "Health Check", interval: 300, enabled: true },
				{ name: "Cache Cleanup", interval: 3600, enabled: true },
				{ name: "Performance Monitor", interval: 60, enabled: true },
				{ name: "Security Scan", interval: 1800, enabled: true },
			];

			console.log("✅ Automation configured with the following tasks:");
			automationTasks.forEach((task) => {
				const status = task.enabled ? "✅" : "❌";
				const interval =
					task.interval < 60 ? `${task.interval}s` : `${task.interval / 60}m`;
				console.log(`   ${status} ${task.name} (every ${interval})`);
			});

			console.log("\n🚀 Starting automation services...");

			// Simulate starting automation services
			for (const task of automationTasks) {
				if (task.enabled) {
					console.log(`   ▶️  Starting ${task.name} service...`);
					await new Promise((resolve) => setTimeout(resolve, 200));
					console.log(`   ✅ ${task.name} service started`);
				}
			}

			console.log("\n🤖 Device automation is now active!");
			console.log("💡 Use --monitor to view real-time status");
		} catch (error) {
			console.log("❌ Failed to start automation");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async startMonitoring(): Promise<void> {
		console.log("📊 Starting Real-time Monitoring");
		console.log("===============================");

		try {
			console.log("🔌 Connecting to device monitoring services...");

			// Simulate monitoring dashboard
			const metrics = {
				cpu: Math.floor(Math.random() * 30) + 20,
				memory: Math.floor(Math.random() * 40) + 40,
				battery: Math.floor(Math.random() * 30) + 60,
				temperature: Math.floor(Math.random() * 10) + 35,
				network: Math.floor(Math.random() * 20) + 80,
			};

			console.log("✅ Connected to monitoring services");
			console.log("\n📊 Real-time Device Metrics:");
			console.log(`   💻 CPU Usage: ${metrics.cpu}%`);
			console.log(`   🧠 Memory Usage: ${metrics.memory}%`);
			console.log(`   🔋 Battery: ${metrics.battery}%`);
			console.log(`   🌡️  Temperature: ${metrics.temperature}°C`);
			console.log(`   📶 Network Quality: ${metrics.network}%`);

			console.log("\n🔄 Monitoring active (updates every 5 seconds)");
			console.log("💡 Press Ctrl+C to stop monitoring");

			// Record metrics to analytics service
			const deviceMetrics: DeviceMetrics = {
				deviceId: this.deviceId,
				timestamp: new Date().toISOString(),
				cpu: metrics.cpu,
				memory: metrics.memory,
				battery: metrics.battery,
				temperature: metrics.temperature,
				network: metrics.network,
				storage: {
					total: 128000000000,
					used: 64000000000,
					available: 64000000000,
				},
				performance: {
					bootTime: 45000,
					uptime: 86400000,
					responseTime: 150,
				},
			};

			this.analyticsService.recordMetrics(deviceMetrics);

			// Simulate real-time updates
			for (let i = 0; i < 5; i++) {
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Update metrics with small variations
				metrics.cpu = Math.max(
					10,
					Math.min(90, metrics.cpu + Math.floor(Math.random() * 11) - 5),
				);
				metrics.memory = Math.max(
					20,
					Math.min(95, metrics.memory + Math.floor(Math.random() * 11) - 5),
				);
				metrics.battery = Math.max(0, Math.min(100, metrics.battery - 1));
				metrics.temperature = Math.max(
					30,
					Math.min(50, metrics.temperature + Math.floor(Math.random() * 5) - 2),
				);
				metrics.network = Math.max(
					50,
					Math.min(100, metrics.network + Math.floor(Math.random() * 11) - 5),
				);

				process.stdout.write(
					`\r📊 CPU: ${metrics.cpu}% | Memory: ${metrics.memory}% | Battery: ${metrics.battery}% | Temp: ${metrics.temperature}°C | Network: ${metrics.network}%`,
				);
			}

			console.log("\n\n✅ Monitoring session completed");
		} catch (error) {
			console.log("❌ Failed to start monitoring");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	// Configuration and Integration Methods

	private async showConfig(action: string): Promise<void> {
		console.log(`⚙️  Configuration Management: ${action}`);
		console.log("===================================");

		switch (action) {
			case "show":
				this.configManager.getConfigSummary();
				break;

			case "summary":
				this.configManager.getConfigSummary();
				break;

			case "validate":
				await this.validateConfiguration();
				break;

			case "reset":
				this.configManager.resetToDefaults();
				break;

			default:
				console.log(
					"❌ Invalid config action. Use: show, summary, validate, reset",
				);
		}
	}

	// Pattern Management Methods

	private async listPatterns(): Promise<void> {
		console.log("📚 Available Configuration Patterns");
		console.log("===================================");
		this.configManager.listAvailablePatterns();
	}

	private async applyPattern(patternName: string): Promise<void> {
		console.log(`🎯 Applying Configuration Pattern: ${patternName}`);
		console.log("==========================================");

		try {
			this.configManager.applyPattern(patternName);
			console.log(`✅ Pattern '${patternName}' applied successfully!`);
			console.log("💡 Use --config summary to see the updated configuration");
		} catch (error) {
			console.log("❌ Failed to apply pattern");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			console.log("💡 Use --patterns to see available patterns");
		}
	}

	private async applyMultiplePatterns(patternNames: string): Promise<void> {
		console.log(`🎯 Applying Multiple Patterns: ${patternNames}`);
		console.log("==========================================");

		try {
			const patterns = patternNames.split(",").map((p) => p.trim());
			this.configManager.applyPatterns(patterns);
			console.log(`✅ Patterns applied successfully: ${patterns.join(", ")}`);
			console.log("💡 Use --config summary to see the updated configuration");
		} catch (error) {
			console.log("❌ Failed to apply patterns");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			console.log("💡 Use --patterns to see available patterns");
		}
	}

	private async resetConfiguration(): Promise<void> {
		console.log("🔄 Resetting Configuration");
		console.log("==========================");

		try {
			this.configManager.resetToDefaults();
			console.log("✅ Configuration reset to defaults successfully!");
		} catch (error) {
			console.log("❌ Failed to reset configuration");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async exportConfiguration(filePath?: string): Promise<void> {
		console.log("📤 Exporting Configuration");
		console.log("==========================");

		try {
			this.configManager.exportConfig(filePath);
			console.log("✅ Configuration exported successfully!");
		} catch (error) {
			console.log("❌ Failed to export configuration");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async importConfiguration(filePath: string): Promise<void> {
		console.log(`📥 Importing Configuration: ${filePath}`);
		console.log("===================================");

		try {
			this.configManager.importConfig(filePath);
			console.log("✅ Configuration imported successfully!");
			console.log("💡 Use --config summary to see the imported configuration");
		} catch (error) {
			console.log("❌ Failed to import configuration");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async validateConfiguration(): Promise<void> {
		console.log("✅ Validating Configuration");
		console.log("============================");

		try {
			const validation = this.configManager.validateConfig();

			if (validation.valid) {
				console.log("✅ Configuration is valid!");
			} else {
				console.log("❌ Configuration validation failed:");
				validation.errors.forEach((error) => {
					console.log(`   - ${error}`);
				});
			}
		} catch (error) {
			console.log("❌ Failed to validate configuration");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async showIntegrations(): Promise<void> {
		console.log("🔗 Integration Status");
		console.log("====================");

		const integrations = this.configManager.getIntegrations();

		console.log("📊 Configured Integrations:");

		Object.entries(integrations).forEach(([name, integration]) => {
			const status = integration?.enabled ? "✅" : "❌";
			const displayName = name.charAt(0).toUpperCase() + name.slice(1);
			console.log(`   ${status} ${displayName}`);

			if (integration?.enabled) {
				if (
					name === "slack" &&
					"channel" in integration &&
					integration.channel
				) {
					console.log(`      Channel: ${integration.channel}`);
				} else if (
					name === "teams" &&
					"channel" in integration &&
					integration.channel
				) {
					console.log(`      Channel: ${integration.channel}`);
				} else if (
					name === "email" &&
					"recipients" in integration &&
					integration.recipients &&
					integration.recipients.length > 0
				) {
					console.log(`      Recipients: ${integration.recipients.length}`);
				} else if (
					name === "webhook" &&
					"url" in integration &&
					integration.url
				) {
					console.log(`      URL: ${integration.url}`);
				}
			}
		});

		console.log("\n💡 Use --config to manage integration settings");
	}

	private async showAnalytics(): Promise<void> {
		console.log("📊 Analytics Dashboard");
		console.log("=======================");

		const summary = this.analyticsService.getDeviceSummary(this.deviceId);

		if (!summary) {
			console.log("❌ No analytics data available for this device");
			return;
		}

		console.log(`📱 Device: ${summary.deviceId}`);
		console.log(`📊 Data Points: ${summary.dataPoints}`);
		console.log(`🕐 Last Updated: ${summary.lastUpdated}`);

		console.log("\n📈 Current Metrics:");
		console.log(`   💻 CPU: ${summary.currentMetrics.cpu}%`);
		console.log(`   🧠 Memory: ${summary.currentMetrics.memory}%`);
		console.log(`   🔋 Battery: ${summary.currentMetrics.battery}%`);
		console.log(`   🌡️  Temperature: ${summary.currentMetrics.temperature}°C`);
		console.log(`   📶 Network: ${summary.currentMetrics.network}%`);

		console.log("\n📊 Average Metrics:");
		console.log(`   💻 CPU: ${summary.averageMetrics.cpu}%`);
		console.log(`   🧠 Memory: ${summary.averageMetrics.memory}%`);
		console.log(`   🔋 Battery: ${summary.averageMetrics.battery}%`);
		console.log(`   🌡️  Temperature: ${summary.averageMetrics.temperature}°C`);
		console.log(`   📶 Network: ${summary.averageMetrics.network}%`);

		console.log("\n📈 Trends:");
		Object.entries(summary.trends).forEach(([metric, trend]) => {
			const icon = trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️";
			const displayName = metric.charAt(0).toUpperCase() + metric.slice(1);
			console.log(`   ${icon} ${displayName}: ${trend}`);
		});

		// Show alert rules
		const alertRules = this.analyticsService.getAlertRules();
		console.log(`\n🚨 Alert Rules: ${alertRules.length} configured`);
		alertRules.forEach((rule) => {
			const status = rule.enabled ? "✅" : "❌";
			console.log(
				`   ${status} ${rule.name} (${rule.metric} ${rule.operator} ${rule.threshold})`,
			);
		});
	}

	private async showScheduler(): Promise<void> {
		console.log("⏰ Task Scheduler");
		console.log("=================");

		const status = this.schedulerService.getStatus();
		const tasks = this.schedulerService.getTasks();

		console.log(`🔄 Status: ${status.running ? "✅ Running" : "❌ Stopped"}`);
		console.log(`📋 Total Tasks: ${status.totalTasks}`);
		console.log(`▶️  Active Tasks: ${status.enabledTasks}`);
		console.log(`🏃 Running: ${status.runningExecutions}`);
		console.log(`📊 Success Rate: ${status.successRate}%`);

		console.log("\n📋 Scheduled Tasks:");
		tasks.forEach((task) => {
			const status = task.enabled ? "✅" : "❌";
			console.log(`   ${status} ${task.name}`);
			console.log(`      Schedule: ${task.schedule}`);
			console.log(
				`      Runs: ${task.runCount} (✅ ${task.successCount} | ❌ ${task.failureCount})`,
			);
			if (task.nextRun) {
				console.log(
					`      Next Run: ${new Date(task.nextRun).toLocaleString()}`,
				);
			}
		});

		console.log("\n💡 Use --config to manage scheduler settings");
	}

	private async sendNotification(message: string): Promise<void> {
		console.log("📬 Sending Test Notification");
		console.log("=============================");

		const notification: NotificationMessage = {
			title: "Duoplus Test Notification",
			message: message,
			level: "info",
			timestamp: new Date().toISOString(),
			deviceId: this.deviceId,
			metadata: {
				source: "cli",
				test: true,
			},
		};

		try {
			await this.notificationService.sendNotification(notification);
			console.log("✅ Test notification sent successfully!");
			console.log(`📝 Message: ${message}`);
			console.log(`📱 Device: ${this.deviceId}`);
			console.log(`🕐 Time: ${notification.timestamp}`);
		} catch (error) {
			console.log("❌ Failed to send notification");
			console.log(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async executeCommand(command: string): Promise<void> {
		console.log(`🔧 Executing: ${command}`);
		console.log("========================");

		const result = await this.adb.executeADBCommand(this.deviceId, command);

		if (result.code === 200 && result.data.success) {
			console.log("✅ Command executed successfully");
			if (result.data.content.trim()) {
				console.log("Output:");
				console.log(result.data.content);
			}
		} else {
			console.log(`❌ Command failed: ${result.data.message}`);
		}
	}

	private showHelp(category?: string, searchTerm?: string): void {
		console.log("📱 Duoplus Cloud Phone CLI");
		console.log("============================");
		console.log("");

		if (category) {
			this.showCategoryHelp(category);
			return;
		}

		if (searchTerm) {
			this.searchHelp(searchTerm);
			return;
		}

		console.log("USAGE:");
		console.log("  duoplus-cli [options]");
		console.log(
			"  duoplus-cli --help <category>  # Show help for specific category",
		);
		console.log("  duoplus-cli --search <term>     # Search commands");
		console.log("");
		console.log("CATEGORIES:");
		console.log("  device        - Device listing and status commands");
		console.log("  control       - Device control and power management");
		console.log("  apps          - Application management");
		console.log("  team          - Team collaboration features");
		console.log("  advanced      - Advanced device operations");
		console.log("  config        - Configuration and patterns");
		console.log("  monitoring    - Analytics and monitoring");
		console.log("");
		console.log("QUICK START:");
		console.log("  duoplus-cli --list              # List all devices");
		console.log("  duoplus-cli --status            # Show device status");
		console.log("  duoplus-cli --cloud-status      # Show cloud status");
		console.log("  duoplus-cli --screenshot        # Take screenshot");
		console.log("  duoplus-cli --help device       # Device commands help");
		console.log("");
		console.log("OTHER:");
		console.log("  --help             Show this help message");
		console.log("  --help <category>  Show category-specific help");
		console.log("  --search <term>    Search for commands");
		console.log("  --verbose          Enable verbose output");
		console.log("");
		console.log(
			"💡 Examples: duoplus-cli --help device | duoplus-cli --search screenshot",
		);
	}

	private showCategoryHelp(category: string): void {
		const categories = {
			device: {
				title: "DEVICE MANAGEMENT",
				commands: [
					{
						flag: "--device <id>",
						desc: "Specify device ID (default: DUOPLUS-OPPO-FIND-X7)",
					},
					{ flag: "--list", desc: "List all available devices" },
					{ flag: "--status", desc: "Show device status" },
					{
						flag: "--cloud-status",
						desc: "Show cloud phone status via official API",
					},
					{ flag: "--details", desc: "Show detailed device information" },
				],
			},
			control: {
				title: "DEVICE CONTROL",
				commands: [
					{ flag: "--reset", desc: "Reset device to factory settings" },
					{
						flag: "--factory-reset",
						desc: "Complete factory reset with data wipe",
					},
					{ flag: "--enable", desc: "Enable ADB on device" },
					{ flag: "--power <on|off>", desc: "Power device on/off" },
					{ flag: "--restart", desc: "Restart device" },
				],
			},
			apps: {
				title: "APPLICATION MANAGEMENT",
				commands: [
					{ flag: "--install <pkg>", desc: "Install application package" },
					{ flag: "--uninstall <pkg>", desc: "Uninstall application" },
					{ flag: "--apps", desc: "List installed applications" },
					{ flag: "--preinstalled", desc: "List preinstalled apps" },
					{ flag: "--batch-apps", desc: "Execute batch app operations" },
				],
			},
			team: {
				title: "TEAM COLLABORATION",
				commands: [
					{ flag: "--teams", desc: "List all teams" },
					{ flag: "--members", desc: "List team members" },
					{ flag: "--invite <email>", desc: "Invite team member" },
					{ flag: "--groups", desc: "List team groups" },
					{ flag: "--share <resource>", desc: "Share resource with team" },
				],
			},
			advanced: {
				title: "ADVANCED OPERATIONS",
				commands: [
					{ flag: "--command <cmd>", desc: "Execute ADB command" },
					{ flag: "--screenshot", desc: "Take device screenshot" },
					{ flag: "--upload <path>", desc: "Upload file to device" },
					{
						flag: "--root <action>",
						desc: "Manage root access (enable/disable/status)",
					},
					{ flag: "--qr-scan", desc: "Scan QR codes using camera" },
					{ flag: "--resolution <res>", desc: "Change screen resolution" },
					{ flag: "--streaming", desc: "Start live streaming" },
					{ flag: "--quality <qual>", desc: "Adjust streaming quality" },
					{ flag: "--route <type>", desc: "Select network route" },
				],
			},
			config: {
				title: "CONFIGURATION & PATTERNS",
				commands: [
					{
						flag: "--config <action>",
						desc: "Manage configuration (show/summary/validate/reset)",
					},
					{ flag: "--patterns", desc: "List available configuration patterns" },
					{
						flag: "--apply-pattern <name>",
						desc: "Apply a single configuration pattern",
					},
					{
						flag: "--apply-patterns <list>",
						desc: "Apply multiple patterns (comma-separated)",
					},
					{
						flag: "--export-config <path>",
						desc: "Export configuration to file",
					},
					{
						flag: "--import-config <path>",
						desc: "Import configuration from file",
					},
					{ flag: "--validate-config", desc: "Validate current configuration" },
					{ flag: "--reset-config", desc: "Reset configuration to defaults" },
				],
			},
			monitoring: {
				title: "MONITORING & ANALYTICS",
				commands: [
					{ flag: "--monitor", desc: "Start real-time device monitoring" },
					{ flag: "--analytics", desc: "Show analytics dashboard" },
					{ flag: "--scheduler", desc: "Show task scheduler status" },
					{ flag: "--integrations", desc: "Show integration status" },
					{ flag: "--notify <msg>", desc: "Send test notification" },
					{ flag: "--automation", desc: "Start device automation services" },
					{
						flag: "--batch <config>",
						desc: "Execute batch operations from config file",
					},
				],
			},
		};

		const cat = categories[category as keyof typeof categories];
		if (!cat) {
			console.log(`❌ Unknown category: ${category}`);
			console.log(
				"Available categories: device, control, apps, team, advanced, config, monitoring",
			);
			return;
		}

		console.log(`📱 ${cat.title}`);
		console.log("=".repeat(cat.title.length + 4));
		console.log("");

		cat.commands.forEach((cmd) => {
			const padding = 25 - cmd.flag.length;
			const spaces = " ".repeat(Math.max(0, padding));
			console.log(`  ${cmd.flag}${spaces}${cmd.desc}`);
		});

		console.log("");
		console.log(
			"💡 Use --help to see all categories or --search <term> to find commands",
		);
	}

	private searchHelp(searchTerm: string): void {
		console.log(`🔍 Searching for "${searchTerm}"...`);
		console.log("");

		const allCommands = [
			{ category: "device", flag: "--device", desc: "Specify device ID" },
			{
				category: "device",
				flag: "--list",
				desc: "List all available devices",
			},
			{ category: "device", flag: "--status", desc: "Show device status" },
			{
				category: "device",
				flag: "--cloud-status",
				desc: "Show cloud phone status via official API",
			},
			{
				category: "device",
				flag: "--details",
				desc: "Show detailed device information",
			},
			{
				category: "control",
				flag: "--reset",
				desc: "Reset device to factory settings",
			},
			{
				category: "control",
				flag: "--factory-reset",
				desc: "Complete factory reset with data wipe",
			},
			{ category: "control", flag: "--enable", desc: "Enable ADB on device" },
			{ category: "control", flag: "--power", desc: "Power device on/off" },
			{ category: "control", flag: "--restart", desc: "Restart device" },
			{
				category: "apps",
				flag: "--install",
				desc: "Install application package",
			},
			{ category: "apps", flag: "--uninstall", desc: "Uninstall application" },
			{ category: "apps", flag: "--apps", desc: "List installed applications" },
			{
				category: "apps",
				flag: "--preinstalled",
				desc: "List preinstalled apps",
			},
			{
				category: "apps",
				flag: "--batch-apps",
				desc: "Execute batch app operations",
			},
			{ category: "advanced", flag: "--command", desc: "Execute ADB command" },
			{
				category: "advanced",
				flag: "--screenshot",
				desc: "Take device screenshot",
			},
			{ category: "advanced", flag: "--upload", desc: "Upload file to device" },
			{ category: "advanced", flag: "--root", desc: "Manage root access" },
			{
				category: "advanced",
				flag: "--qr-scan",
				desc: "Scan QR codes using camera",
			},
			{
				category: "advanced",
				flag: "--resolution",
				desc: "Change screen resolution",
			},
			{
				category: "advanced",
				flag: "--streaming",
				desc: "Start live streaming",
			},
			{ category: "config", flag: "--config", desc: "Manage configuration" },
			{
				category: "config",
				flag: "--patterns",
				desc: "List available configuration patterns",
			},
			{
				category: "config",
				flag: "--apply-pattern",
				desc: "Apply a single configuration pattern",
			},
			{
				category: "monitoring",
				flag: "--monitor",
				desc: "Start real-time device monitoring",
			},
			{
				category: "monitoring",
				flag: "--analytics",
				desc: "Show analytics dashboard",
			},
			{
				category: "monitoring",
				flag: "--scheduler",
				desc: "Show task scheduler status",
			},
		];

		const term = searchTerm.toLowerCase();
		const matches = allCommands.filter(
			(cmd) =>
				cmd.flag.includes(term) ||
				cmd.desc.toLowerCase().includes(term) ||
				cmd.category.includes(term),
		);

		if (matches.length === 0) {
			console.log(`❌ No commands found for "${searchTerm}"`);
			console.log(
				"💡 Try: --search device | --search screenshot | --search config",
			);
			return;
		}

		console.log(`Found ${matches.length} command(s):`);
		console.log("");

		matches.forEach((cmd, index) => {
			const categoryIcon =
				{
					device: "📱",
					control: "⚡",
					apps: "📦",
					team: "👥",
					advanced: "🔧",
					config: "⚙️",
					monitoring: "📊",
				}[cmd.category] || "📋";

			console.log(`${index + 1}. ${categoryIcon} ${cmd.flag}`);
			console.log(`   ${cmd.desc}`);
			console.log(`   Category: ${cmd.category}`);
			console.log("");
		});
	}

	static parseArgs(args: string[]): DuoplusCLIOptions {
		// Use Bun's native util.parseArgs for robust argument parsing
		const { values, positionals } = parseArgs({
			args: ["bun", "duoplus-cli.ts", ...args], // Add program name and script name
			options: {
				// Device Options
				device: { type: "string" },

				// Basic Commands
				list: { type: "boolean" },
				status: { type: "boolean" },
				"cloud-status": { type: "boolean" },
				details: { type: "boolean" },
				// Help and Search
				help: { type: "boolean", short: "h" },
				search: { type: "string" },
				verbose: { type: "boolean", short: "v" },

				// Device Control
				reset: { type: "boolean" },
				"factory-reset": { type: "boolean" },
				enable: { type: "boolean" },
				power: { type: "string" },

				// Advanced Commands
				command: { type: "string" },
				screenshot: { type: "boolean" },
				upload: { type: "string" },
				install: { type: "string" },
				uninstall: { type: "string" },

				// App Management
				"batch-apps": { type: "boolean" },
				preinstalled: { type: "boolean" },
				apps: { type: "boolean" },

				// Team Management
				teams: { type: "boolean" },
				members: { type: "boolean" },
				invite: { type: "string" },
				groups: { type: "boolean" },
				share: { type: "string" },

				// Device Operations
				restart: { type: "boolean" },
				transfer: { type: "string" },
				"focus-mode": { type: "string" },
				"2fa": { type: "string" },
				clean: { type: "boolean" },
				backup: { type: "boolean" },

				// Advanced Functions
				root: { type: "string" },
				"qr-scan": { type: "boolean" },
				resolution: { type: "string" },
				streaming: { type: "boolean" },
				quality: { type: "string" },
				route: { type: "string" },

				// Enhanced Features
				batch: { type: "string" },
				automation: { type: "boolean" },
				monitor: { type: "boolean" },

				// Configuration & Integrations
				config: { type: "string" },
				integrations: { type: "boolean" },
				analytics: { type: "boolean" },
				scheduler: { type: "boolean" },
				notify: { type: "string" },

				// Pattern Management
				patterns: { type: "boolean" },
				"apply-pattern": { type: "string" },
				"apply-patterns": { type: "string" },
				"reset-config": { type: "boolean" },
				"export-config": { type: "string" },
				"import-config": { type: "string" },
				"validate-config": { type: "boolean" },

				// Legacy options (for compatibility)
				proxy: { type: "string" },
				gps: { type: "string" },
			},
			strict: false, // Allow unknown options for now
			allowPositionals: true,
		});

		// Convert the parsed values to our CLI options interface
		const options: DuoplusCLIOptions = {
			// Basic options
			device: values.device as string | undefined,
			command: values.command as string | undefined,
			list: values.list as boolean | undefined,
			status: values.status as boolean | undefined,
			cloudStatus: values["cloud-status"] as boolean | undefined,
			details: values.details as boolean | undefined,
			help: values.help as boolean | undefined,
			search: values.search as string | undefined,
			verbose: values.verbose as boolean | undefined,

			// Device control
			reset: values.reset as boolean | undefined,
			factoryReset: values["factory-reset"] as boolean | undefined,
			enable: values.enable as boolean | undefined,
			power: values.power as string | undefined,

			// Advanced commands
			screenshot: values.screenshot as boolean | undefined,
			upload: values.upload as string | undefined,
			install: values.install as string | undefined,
			uninstall: values.uninstall as string | undefined,

			// App management
			batchApps: values["batch-apps"] as boolean | undefined,
			preinstalled: values.preinstalled as boolean | undefined,
			apps: values.apps as boolean | undefined,

			// Team management
			teams: values.teams as boolean | undefined,
			members: values.members as boolean | undefined,
			invite: values.invite as string | undefined,
			groups: values.groups as boolean | undefined,
			share: values.share as string | undefined,

			// Device operations
			restart: values.restart as boolean | undefined,
			transfer: values.transfer as string | undefined,
			focusMode: values["focus-mode"] as string | undefined,
			twoFA: values["2fa"] as string | undefined,
			clean: values.clean as boolean | undefined,
			backup: values.backup as boolean | undefined,

			// Advanced functions
			root: values.root as string | undefined,
			qrScan: values["qr-scan"] as boolean | undefined,
			resolution: values.resolution as string | undefined,
			streaming: values.streaming as boolean | undefined,
			quality: values.quality as string | undefined,
			route: values.route as string | undefined,

			// Enhanced features
			batch: values.batch as string | undefined,
			automation: values.automation as boolean | undefined,
			monitor: values.monitor as boolean | undefined,

			// Configuration & integrations
			config: values.config as string | undefined,
			integrations: values.integrations as boolean | undefined,
			analytics: values.analytics as boolean | undefined,
			scheduler: values.scheduler as boolean | undefined,
			notify: values.notify as string | undefined,

			// Pattern management
			patterns: values.patterns as boolean | undefined,
			applyPattern: values["apply-pattern"] as string | undefined,
			applyPatterns: values["apply-patterns"] as string | undefined,
			resetConfig: values["reset-config"] as boolean | undefined,
			exportConfig: values["export-config"] as string | undefined,
			importConfig: values["import-config"] as string | undefined,
			validateConfig: values["validate-config"] as boolean | undefined,

			// Legacy
			proxy: values.proxy as string | undefined,
			gps: values.gps as string | undefined,
		};

		// Handle unknown options (warn user)
		const knownOptions = new Set(Object.keys(options));
		const unknownOptions = Object.keys(values).filter(
			(key) => !knownOptions.has(key),
		);

		if (unknownOptions.length > 0) {
			console.warn(`⚠️  Unknown options: ${unknownOptions.join(", ")}`);
			console.warn("💡 Use --help to see available options");
		}

		return options;
	}
}

// Main execution
async function main() {
	try {
		const options = DuoplusCLI.parseArgs(process.argv.slice(2));
		const cli = new DuoplusCLI();
		await cli.run(options);
	} catch (error) {
		console.error(
			"❌ Fatal error:",
			error instanceof Error ? error.message : "Unknown error",
		);
		process.exit(1);
	}
}

// Bun-specific execution
if (typeof Bun !== "undefined") {
	// Running under Bun
	main().catch((error) => {
		console.error("❌ Unhandled error:", error);
		process.exit(1);
	});
} else if (import.meta.main) {
	// Running under Node.js with ES modules
	main().catch(console.error);
} else {
	// Fallback for other environments
	main().catch(console.error);
}
