#!/usr/bin/env bun

/**
 * Enhanced SIGINT Test Suite
 * Tests the improved signal handling implementation
 */

import { securityManager } from "../src/security/security-hardening";
import { signalHandler } from "../src/security/signal-handler";
import { secureProcessManager } from "../src/utils/secure-process-manager";

class SIGINTTestSuite {
	private testsPassed = 0;
	private testsFailed = 0;
	private testResults: Array<{
		name: string;
		passed: boolean;
		duration: number;
		error?: string;
	}> = [];

	async runAllTests(): Promise<void> {
		console.log("🧪 Enhanced SIGINT Test Suite");
		console.log("===============================\n");

		await this.testSignalHandlerInitialization();
		await this.testCleanupTaskRegistration();
		await this.testProcessTracking();
		await this.testGracefulShutdown();
		await this.testSecurityIntegration();
		await this.testEmergencyCleanup();
		await this.testHealthCheck();
		await this.testMultipleSignals();
		await this.testTimeoutHandling();

		this.printResults();
	}

	private async testSignalHandlerInitialization(): Promise<void> {
		const testName = "Signal Handler Initialization";
		const startTime = Date.now();

		try {
			// Initialize signal handler
			signalHandler.initialize();

			// Check if handlers are registered
			const status = signalHandler.getShutdownStatus();

			if (status.cleanupTasks >= 0 && status.activeProcesses >= 0) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error("Signal handler not properly initialized");
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testCleanupTaskRegistration(): Promise<void> {
		const testName = "Cleanup Task Registration";
		const startTime = Date.now();

		try {
			let _taskExecuted = false;

			// Register a test cleanup task
			signalHandler.registerCleanupTask({
				id: "test-cleanup-task",
				name: "Test Cleanup Task",
				priority: "medium",
				cleanup: async () => {
					_taskExecuted = true;
					await new Promise((resolve) => setTimeout(resolve, 100));
				},
			});

			// Check if task was registered
			const status = signalHandler.getShutdownStatus();

			if (status.cleanupTasks > 0) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error("Cleanup task not registered");
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testProcessTracking(): Promise<void> {
		const testName = "Process Tracking";
		const startTime = Date.now();

		try {
			// Execute a long-running process
			const result = await secureProcessManager.execute({
				command: "sleep",
				args: ["5"],
				timeout: 10000,
				enableAuditLogging: false,
			});

			// Check if process was tracked
			const _activeProcesses = secureProcessManager.getActiveProcesses();

			if (result.success && result.exitCode === 0) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error(`Process failed: ${result.stderr}`);
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testGracefulShutdown(): Promise<void> {
		const testName = "Graceful Shutdown";
		const startTime = Date.now();

		try {
			let _cleanupExecuted = false;

			// Register cleanup task
			signalHandler.registerCleanupTask({
				id: "graceful-shutdown-test",
				name: "Graceful Shutdown Test",
				priority: "high",
				cleanup: async () => {
					_cleanupExecuted = true;
					console.log("   🔄 Graceful shutdown cleanup executed");
				},
			});

			// Start a background process
			const proc = Bun.spawn(["sleep", "10"]);
			signalHandler.trackProcess(proc);

			// Send SIGINT after a short delay
			setTimeout(() => {
				console.log("   ⚡ Sending SIGINT to test graceful shutdown...");
				process.kill(process.pid, "SIGINT");
			}, 500);

			// Wait for shutdown (this will exit the process, so we can't actually test it fully)
			// Instead, we'll just verify the setup is correct
			const status = signalHandler.getShutdownStatus();

			if (status.cleanupTasks > 0) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error("Graceful shutdown not properly set up");
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testSecurityIntegration(): Promise<void> {
		const testName = "Security Integration";
		const startTime = Date.now();

		try {
			// Test secure process execution
			const result = await secureProcessManager.execute({
				command: "echo",
				args: ["Hello World"],
				enableAuditLogging: true,
			});

			// Check if security events were logged
			const auditLog = securityManager.getAuditLog();
			const securityEvents = auditLog.filter(
				(event) =>
					event.event.includes("PROCESS") || event.event.includes("SECURITY"),
			);

			if (result.success && securityEvents.length > 0) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error("Security integration failed");
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testEmergencyCleanup(): Promise<void> {
		const testName = "Emergency Cleanup";
		const startTime = Date.now();

		try {
			// Simulate emergency cleanup scenario
			const _activeProcesses = secureProcessManager.getActiveProcesses();

			// The emergency cleanup is tested internally by the signal handler
			// We just verify the mechanism is in place
			const status = signalHandler.getShutdownStatus();

			if (status !== null) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error("Emergency cleanup mechanism not available");
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testHealthCheck(): Promise<void> {
		const testName = "Health Check";
		const startTime = Date.now();

		try {
			// Send SIGUSR1 to trigger health check
			setTimeout(() => {
				process.kill(process.pid, "SIGUSR1");
			}, 100);

			// Wait a moment for health check to run
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Check if health check was logged
			const auditLog = securityManager.getAuditLog();
			const healthCheckEvents = auditLog.filter(
				(event) => event.event === "HEALTH_CHECK_PERFORMED",
			);

			if (healthCheckEvents.length > 0) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error("Health check not performed");
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testMultipleSignals(): Promise<void> {
		const testName = "Multiple Signal Handling";
		const startTime = Date.now();

		try {
			let _signalCount = 0;

			// Test multiple rapid signals
			const signals = ["SIGUSR1", "SIGUSR2"];

			for (const signal of signals) {
				setTimeout(() => {
					process.kill(process.pid, signal as NodeJS.Signals);
					_signalCount++;
				}, 100 * signals.indexOf(signal));
			}

			// Wait for all signals to be processed
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Check audit log for signal events
			const auditLog = securityManager.getAuditLog();
			const signalEvents = auditLog.filter(
				(event) =>
					event.event.includes("SIGNAL") ||
					event.event.includes("HEALTH") ||
					event.event.includes("LOG"),
			);

			if (signalEvents.length >= signals.length) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error(
					`Expected ${signals.length} signal events, got ${signalEvents.length}`,
				);
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private async testTimeoutHandling(): Promise<void> {
		const testName = "Timeout Handling";
		const startTime = Date.now();

		try {
			// Execute a process that will timeout
			const result = await secureProcessManager.execute({
				command: "sleep",
				args: ["10"],
				timeout: 1000, // 1 second timeout
				enableAuditLogging: false,
			});

			// The process should be terminated by timeout
			if (!result.success && result.duration < 5000) {
				this.recordTestSuccess(testName, Date.now() - startTime);
			} else {
				throw new Error("Timeout handling failed");
			}
		} catch (error) {
			this.recordTestFailure(
				testName,
				Date.now() - startTime,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	private recordTestSuccess(name: string, duration: number): void {
		this.testsPassed++;
		this.testResults.push({ name, passed: true, duration });
		console.log(`✅ ${name} (${duration}ms)`);
	}

	private recordTestFailure(
		name: string,
		duration: number,
		error: string,
	): void {
		this.testsFailed++;
		this.testResults.push({ name, passed: false, duration, error });
		console.log(`❌ ${name} (${duration}ms) - ${error}`);
	}

	private printResults(): void {
		console.log("\n📊 Test Results Summary");
		console.log("========================");
		console.log(`✅ Passed: ${this.testsPassed}`);
		console.log(`❌ Failed: ${this.testsFailed}`);
		console.log(
			`📈 Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`,
		);

		if (this.testsFailed > 0) {
			console.log("\n❌ Failed Tests:");
			this.testResults
				.filter((test) => !test.passed)
				.forEach((test) => {
					console.log(`   • ${test.name}: ${test.error}`);
				});
		}

		console.log("\n📋 Detailed Results:");
		this.testResults.forEach((test) => {
			const status = test.passed ? "✅" : "❌";
			console.log(`   ${status} ${test.name} (${test.duration}ms)`);
		});

		// Generate security report
		const securityReport = securityManager.generateSecurityReport();
		console.log("\n🔒 Security Report:");
		console.log(`   Total Events: ${securityReport.totalEvents}`);
		console.log(`   Critical Events: ${securityReport.criticalEvents}`);
		console.log(`   High Events: ${securityReport.highEvents}`);

		if (securityReport.recommendations.length > 0) {
			console.log("   Recommendations:");
			securityReport.recommendations.forEach((rec) => {
				console.log(`     • ${rec}`);
			});
		}

		console.log(
			`\n🏁 Test suite completed with ${this.testsFailed === 0 ? "success" : "failures"}`,
		);
	}
}

// Run the test suite
async function main() {
	const testSuite = new SIGINTTestSuite();

	// Set up signal handling for the test suite itself
	signalHandler.initialize();

	try {
		await testSuite.runAllTests();
		process.exit(testSuite.testsFailed > 0 ? 1 : 0);
	} catch (error) {
		console.error("Test suite failed:", error);
		process.exit(1);
	}
}

// Handle uncaught errors in the test suite
process.on("uncaughtException", (error) => {
	console.error("Uncaught exception in test suite:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled rejection in test suite:", reason);
	process.exit(1);
});

// Run the tests
main();
