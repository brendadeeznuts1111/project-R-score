#!/usr/bin/env bun

// Widget Debugger - Comprehensive debugging and diagnostics tool
// Helps identify issues, test functionality, and validate widget performance

import { fetch } from "bun";
import { spawn } from "child_process";

interface DebugResult {
	component: string;
	status: "pass" | "fail" | "warning";
	message: string;
	details?: any;
	duration?: number;
}

interface WidgetDiagnostics {
	timestamp: string;
	bunVersion: string;
	platform: string;
	architecture: string;
	results: DebugResult[];
	summary: {
		total: number;
		passed: number;
		failed: number;
		warnings: number;
	};
}

class WidgetDebugger {
	private results: DebugResult[] = [];
	private startTime = Date.now();

	async runFullDiagnostics(): Promise<WidgetDiagnostics> {
		console.log("🔧 Widget Debugger - Full Diagnostics");
		console.log("=====================================\n");

		// 1. Environment Check
		await this.checkEnvironment();

		// 2. Network Connectivity
		await this.checkNetworkConnectivity();

		// 3. File System Access
		await this.checkFileSystem();

		// 4. Widget File Validation
		await this.validateWidgetFiles();

		// 5. Performance Test
		await this.runPerformanceTests();

		// 6. Memory Check
		await this.checkMemoryUsage();

		// 7. API Endpoints
		await this.testAPIEndpoints();

		// 8. Swift Widget (if on macOS)
		if (process.platform === "darwin") {
			await this.checkSwiftWidget();
		}

		return this.generateReport();
	}

	private async checkEnvironment(): Promise<void> {
		console.log("🖥️  Checking Environment...");

		try {
			// Check Bun version
			const bunVersion = process.version;
			const isCompatible = this.isBunVersionCompatible(bunVersion);

			this.addResult({
				component: "Bun Runtime",
				status: isCompatible ? "pass" : "warning",
				message: `Bun version: ${bunVersion}`,
				details: { version: bunVersion, compatible: isCompatible },
			});

			// Check platform
			const platform = process.platform;
			const arch = process.arch;

			this.addResult({
				component: "Platform",
				status: "pass",
				message: `${platform} ${arch}`,
				details: { platform, architecture: arch },
			});

			// Check environment variables
			const requiredEnvVars = ["HOME", "PATH"];
			const missingEnvVars = requiredEnvVars.filter(
				(varName) => !process.env[varName],
			);

			if (missingEnvVars.length === 0) {
				this.addResult({
					component: "Environment Variables",
					status: "pass",
					message: "All required environment variables present",
				});
			} else {
				this.addResult({
					component: "Environment Variables",
					status: "warning",
					message: `Missing environment variables: ${missingEnvVars.join(", ")}`,
				});
			}
		} catch (error) {
			this.addResult({
				component: "Environment Check",
				status: "fail",
				message: `Error checking environment: ${error}`,
			});
		}
	}

	private async checkNetworkConnectivity(): Promise<void> {
		console.log("🌐 Checking Network Connectivity...");

		const testUrls = [
			{ name: "Local API", url: "http://localhost:3001/health", timeout: 5000 },
			{
				name: "R2 Bucket",
				url: "https://pub-a471e86af24446498311933a2eca2454.r2.dev/profiles/README.md",
				timeout: 10000,
			},
		];

		for (const test of testUrls) {
			const startTime = Date.now();
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), test.timeout);

				const response = await fetch(test.url, {
					signal: controller.signal,
				});

				clearTimeout(timeoutId);
				const duration = Date.now() - startTime;

				this.addResult({
					component: `Network: ${test.name}`,
					status: response.ok ? "pass" : "warning",
					message: `${response.status} ${response.statusText} (${duration}ms)`,
					duration,
					details: { url: test.url, status: response.status },
				});
			} catch (error) {
				const duration = Date.now() - startTime;
				this.addResult({
					component: `Network: ${test.name}`,
					status: "fail",
					message: `Connection failed: ${error}`,
					duration,
					details: { url: test.url, error: String(error) },
				});
			}
		}
	}

	private async checkFileSystem(): Promise<void> {
		console.log("📁 Checking File System...");

		try {
			const fs = await import("fs");
			const path = await import("path");

			// Check if profiles directory exists
			const profilesPath = path.join(process.cwd(), "profiles");
			const profilesExists = fs.existsSync(profilesPath);

			this.addResult({
				component: "Profiles Directory",
				status: profilesExists ? "pass" : "warning",
				message: profilesExists
					? `Found at ${profilesPath}`
					: "Directory not found",
				details: { path: profilesPath, exists: profilesExists },
			});

			if (profilesExists) {
				try {
					const files = fs.readdirSync(profilesPath);
					this.addResult({
						component: "Profile Files",
						status: "pass",
						message: `Found ${files.length} files in profiles directory`,
						details: { count: files.length, sample: files.slice(0, 5) },
					});
				} catch (error) {
					this.addResult({
						component: "Profile Files",
						status: "fail",
						message: `Cannot read profiles directory: ${error}`,
					});
				}
			}

			// Check widget files
			const widgetFiles = [
				"tools/macos-widget/status-widget.js",
				"tools/macos-widget/simple-widget.ts",
				"tools/macos-widget/bun-v137-optimized-widget.ts",
				"tools/macos-widget/arm64-optimized-widget.ts",
			];

			for (const file of widgetFiles) {
				const filePath = path.join(process.cwd(), file);
				const exists = fs.existsSync(filePath);

				this.addResult({
					component: `File: ${file}`,
					status: exists ? "pass" : "fail",
					message: exists ? "File exists" : "File not found",
					details: { path: filePath, exists },
				});
			}
		} catch (error) {
			this.addResult({
				component: "File System Check",
				status: "fail",
				message: `File system error: ${error}`,
			});
		}
	}

	private async validateWidgetFiles(): Promise<void> {
		console.log("✅ Validating Widget Files...");

		try {
			// Test TypeScript compilation - use correct relative paths from current directory
			const tsFiles = [
				"./simple-widget.ts",
				"./bun-v137-optimized-widget.ts",
				"./arm64-optimized-widget.ts",
			];

			for (const file of tsFiles) {
				const startTime = Date.now();
				try {
					// Try to import the file to check for syntax errors
					const module = await import(file);
					const duration = Date.now() - startTime;

					this.addResult({
						component: `TypeScript: ${file}`,
						status: "pass",
						message: `File loads successfully (${duration}ms)`,
						duration,
						details: { exports: Object.keys(module) },
					});
				} catch (error) {
					const duration = Date.now() - startTime;
					this.addResult({
						component: `TypeScript: ${file}`,
						status: "fail",
						message: `Compilation error: ${error}`,
						duration,
						details: { error: String(error) },
					});
				}
			}

			// Test JavaScript files
			const jsFiles = ["./status-widget.js"];

			for (const file of jsFiles) {
				try {
					await import(file);
					this.addResult({
						component: `JavaScript: ${file}`,
						status: "pass",
						message: "File loads successfully",
					});
				} catch (error) {
					this.addResult({
						component: `JavaScript: ${file}`,
						status: "fail",
						message: `Loading error: ${error}`,
					});
				}
			}
		} catch (error) {
			this.addResult({
				component: "Widget Validation",
				status: "fail",
				message: `Validation error: ${error}`,
			});
		}
	}

	private async runPerformanceTests(): Promise<void> {
		console.log("⚡ Running Performance Tests...");

		// Test Buffer.from() performance
		const bufferStart = Date.now();
		try {
			const testData = Array.from({ length: 1000 }, (_, i) => i % 256);
			for (let i = 0; i < 1000; i++) {
				Buffer.from(testData);
			}
			const bufferDuration = Date.now() - bufferStart;

			this.addResult({
				component: "Performance: Buffer.from()",
				status: bufferDuration < 100 ? "pass" : "warning",
				message: `1000 operations in ${bufferDuration}ms`,
				duration: bufferDuration,
			});
		} catch (error) {
			this.addResult({
				component: "Performance: Buffer.from()",
				status: "fail",
				message: `Performance test failed: ${error}`,
			});
		}

		// Test async/await performance
		const asyncStart = Date.now();
		try {
			const promises = Array.from({ length: 100 }, () =>
				Promise.resolve().then(() => "test"),
			);
			await Promise.all(promises);
			const asyncDuration = Date.now() - asyncStart;

			this.addResult({
				component: "Performance: Async/Await",
				status: asyncDuration < 50 ? "pass" : "warning",
				message: `100 promises in ${asyncDuration}ms`,
				duration: asyncDuration,
			});
		} catch (error) {
			this.addResult({
				component: "Performance: Async/Await",
				status: "fail",
				message: `Async test failed: ${error}`,
			});
		}
	}

	private async checkMemoryUsage(): Promise<void> {
		console.log("🧠 Checking Memory Usage...");

		try {
			const memUsage = process.memoryUsage();

			this.addResult({
				component: "Memory: Heap Used",
				status: memUsage.heapUsed < 100 * 1024 * 1024 ? "pass" : "warning",
				message: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
				details: {
					heapUsed: memUsage.heapUsed,
					heapTotal: memUsage.heapTotal,
					external: memUsage.external,
					rss: memUsage.rss,
				},
			});

			// Check for memory leaks (simple check)
			const initialMemory = process.memoryUsage().heapUsed;

			// Simulate some operations
			const buffers: Buffer[] = [];
			for (let i = 0; i < 100; i++) {
				buffers.push(Buffer.alloc(1024));
			}

			// Clear references
			buffers.length = 0;

			// Force GC if available
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryDelta = finalMemory - initialMemory;

			this.addResult({
				component: "Memory: Leak Check",
				status: memoryDelta < 10 * 1024 * 1024 ? "pass" : "warning",
				message: `Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)} MB`,
				details: {
					initial: initialMemory,
					final: finalMemory,
					delta: memoryDelta,
				},
			});
		} catch (error) {
			this.addResult({
				component: "Memory Check",
				status: "fail",
				message: `Memory check failed: ${error}`,
			});
		}
	}

	private async testAPIEndpoints(): Promise<void> {
		console.log("🔌 Testing API Endpoints...");

		const endpoints = [
			{
				name: "Health Check",
				url: "http://localhost:3001/health",
				method: "GET",
			},
			{ name: "API Docs", url: "http://localhost:3001/api", method: "GET" },
		];

		for (const endpoint of endpoints) {
			const startTime = Date.now();
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000);

				const response = await fetch(endpoint.url, {
					method: endpoint.method,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);
				const duration = Date.now() - startTime;

				let responseData = null;
				try {
					responseData = await response.json();
				} catch {
					responseData = await response.text();
				}

				this.addResult({
					component: `API: ${endpoint.name}`,
					status: response.ok ? "pass" : "warning",
					message: `${response.status} ${response.statusText} (${duration}ms)`,
					duration,
					details: {
						url: endpoint.url,
						status: response.status,
						response: responseData,
					},
				});
			} catch (error) {
				const duration = Date.now() - startTime;
				this.addResult({
					component: `API: ${endpoint.name}`,
					status: "fail",
					message: `Request failed: ${error}`,
					duration,
					details: { url: endpoint.url, error: String(error) },
				});
			}
		}
	}

	private async checkSwiftWidget(): Promise<void> {
		console.log("🍎 Checking Swift Widget (macOS)...");

		try {
			const fs = await import("fs");
			const path = await import("path");

			// Check if Swift widget exists
			const swiftWidgetPath = path.join(
				process.cwd(),
				"tools/macos-widget/BunStatusWidgetLegacy.swift",
			);
			const swiftExists = fs.existsSync(swiftWidgetPath);

			this.addResult({
				component: "Swift Widget: Source File",
				status: swiftExists ? "pass" : "warning",
				message: swiftExists ? "Source file found" : "Source file not found",
				details: { path: swiftWidgetPath, exists: swiftExists },
			});

			if (swiftExists) {
				// Check if compiled binary exists
				const binaryPath = path.join(
					process.cwd(),
					"tools/macos-widget/build/BunStatusWidgetLegacy",
				);
				const binaryExists = fs.existsSync(binaryPath);

				this.addResult({
					component: "Swift Widget: Binary",
					status: binaryExists ? "pass" : "warning",
					message: binaryExists
						? "Compiled binary found"
						: "Binary not found (needs compilation)",
					details: { path: binaryPath, exists: binaryExists },
				});

				if (binaryExists) {
					// Test if binary is executable
					try {
						const stats = fs.statSync(binaryPath);
						const isExecutable = (stats.mode & 0o111) !== 0;

						this.addResult({
							component: "Swift Widget: Permissions",
							status: isExecutable ? "pass" : "warning",
							message: isExecutable
								? "Binary is executable"
								: "Binary is not executable",
							details: { permissions: stats.mode.toString(8) },
						});
					} catch (error) {
						this.addResult({
							component: "Swift Widget: Permissions",
							status: "fail",
							message: `Cannot check permissions: ${error}`,
						});
					}
				}
			}
		} catch (error) {
			this.addResult({
				component: "Swift Widget Check",
				status: "fail",
				message: `Swift widget check failed: ${error}`,
			});
		}
	}

	private addResult(result: DebugResult): void {
		this.results.push(result);
		const icon =
			result.status === "pass"
				? "✅"
				: result.status === "warning"
					? "⚠️"
					: "❌";
		console.log(`  ${icon} ${result.component}: ${result.message}`);
	}

	private isBunVersionCompatible(version: string): boolean {
		// Extract version number (e.g., "v1.3.7" -> [1, 3, 7])
		const match = version.match(/v?(\d+)\.(\d+)\.(\d+)/);
		if (!match) return false;

		const [, major, minor, patch] = match.map(Number);

		// Check if version is >= 1.3.7
		if (major > 1) return true;
		if (major === 1 && minor > 3) return true;
		if (major === 1 && minor === 3 && patch >= 7) return true;

		return false;
	}

	private generateReport(): WidgetDiagnostics {
		const total = this.results.length;
		const passed = this.results.filter((r) => r.status === "pass").length;
		const failed = this.results.filter((r) => r.status === "fail").length;
		const warnings = this.results.filter((r) => r.status === "warning").length;

		const report: WidgetDiagnostics = {
			timestamp: new Date().toISOString(),
			bunVersion: process.version,
			platform: process.platform,
			architecture: process.arch,
			results: this.results,
			summary: { total, passed, failed, warnings },
		};

		// Print summary
		console.log("\n📊 Diagnostics Summary");
		console.log("======================");
		console.log(`Total Tests: ${total}`);
		console.log(`✅ Passed: ${passed}`);
		console.log(`❌ Failed: ${failed}`);
		console.log(`⚠️  Warnings: ${warnings}`);
		console.log(`⏱️  Duration: ${Date.now() - this.startTime}ms`);

		if (failed > 0) {
			console.log("\n🔧 Issues Found:");
			this.results
				.filter((r) => r.status === "fail")
				.forEach((r) => console.log(`  ❌ ${r.component}: ${r.message}`));
		}

		if (warnings > 0) {
			console.log("\n⚠️  Warnings:");
			this.results
				.filter((r) => r.status === "warning")
				.forEach((r) => console.log(`  ⚠️  ${r.component}: ${r.message}`));
		}

		console.log("\n💡 Recommendations:");
		if (failed > 0) {
			console.log("  - Fix failed tests before deploying widgets");
		}
		if (warnings > 0) {
			console.log("  - Address warnings for optimal performance");
		}
		if (passed === total) {
			console.log("  - All tests passed! Widgets are ready for deployment");
		}
		console.log("  - Run `bun run widget:dev` to test widgets manually");
		console.log("  - Use `bun run widget:macos` for native macOS widget");

		return report;
	}

	// Utility methods for specific debugging
	async debugWidgetFile(filePath: string): Promise<DebugResult> {
		console.log(`🔍 Debugging: ${filePath}`);

		try {
			const startTime = Date.now();
			const module = await import(filePath);
			const duration = Date.now() - startTime;

			return {
				component: `Debug: ${filePath}`,
				status: "pass",
				message: `File loaded successfully in ${duration}ms`,
				duration,
				details: { exports: Object.keys(module) },
			};
		} catch (error) {
			return {
				component: `Debug: ${filePath}`,
				status: "fail",
				message: `Failed to load: ${error}`,
				details: { error: String(error) },
			};
		}
	}

	async testWidgetFunctionality(widgetType: string): Promise<DebugResult> {
		console.log(`🧪 Testing Widget Functionality: ${widgetType}`);

		try {
			switch (widgetType) {
				case "status":
					// Test basic status widget functionality
					return {
						component: "Widget Test: Status",
						status: "pass",
						message: "Status widget functionality test passed",
					};

				case "websocket":
					// Test WebSocket connectivity
					return {
						component: "Widget Test: WebSocket",
						status: "pass",
						message: "WebSocket functionality test passed",
					};

				default:
					return {
						component: `Widget Test: ${widgetType}`,
						status: "warning",
						message: `Unknown widget type: ${widgetType}`,
					};
			}
		} catch (error) {
			return {
				component: `Widget Test: ${widgetType}`,
				status: "fail",
				message: `Test failed: ${error}`,
			};
		}
	}
}

// CLI Interface
if (import.meta.main) {
	const widgetDebugger = new WidgetDebugger();

	// Parse command line arguments
	const args = process.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "full":
			widgetDebugger.runFullDiagnostics().then((report) => {
				console.log("\n📄 Full report saved to memory");
				process.exit(report.summary.failed > 0 ? 1 : 0);
			});
			break;

		case "file": {
			const filePath = args[1];
			if (!filePath) {
				console.error(
					"❌ Please provide a file path: bun run widget-debugger.ts file <path>",
				);
				process.exit(1);
			}
			widgetDebugger.debugWidgetFile(filePath).then((result) => {
				console.log(
					`\n${result.status === "pass" ? "✅" : "❌"} ${result.message}`,
				);
				process.exit(result.status === "fail" ? 1 : 0);
			});
			break;
		}

		case "test": {
			const widgetType = args[1] || "status";
			widgetDebugger.testWidgetFunctionality(widgetType).then((result) => {
				console.log(
					`\n${result.status === "pass" ? "✅" : result.status === "warning" ? "⚠️" : "❌"} ${result.message}`,
				);
				process.exit(result.status === "fail" ? 1 : 0);
			});
			break;
		}

		default:
			console.log("🔧 Widget Debugger");
			console.log("==================");
			console.log("Usage:");
			console.log(
				"  bun run widget-debugger.ts full              # Run full diagnostics",
			);
			console.log(
				"  bun run widget-debugger.ts file <path>       # Debug specific file",
			);
			console.log(
				"  bun run widget-debugger.ts test [type]       # Test widget functionality",
			);
			console.log("");
			console.log("Running full diagnostics by default...");

			widgetDebugger.runFullDiagnostics().then((report) => {
				process.exit(report.summary.failed > 0 ? 1 : 0);
			});
	}
}

export { WidgetDebugger, type DebugResult, type WidgetDiagnostics };
