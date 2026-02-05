/**
 * Process Utilities for Bun.spawn() and Bun Shell
 * Demonstrates different stdout handling patterns with both Bun.spawn() and Bun Shell ($)
 */

import { $ } from "bun";

export interface ProcessOptions {
	inheritStdout?: boolean;
	inheritStderr?: boolean;
	timeout?: number;
	env?: Record<string, string>;
	trackTiming?: boolean; // New option to track execution timing
	useShell?: boolean; // New option to use Bun Shell ($)
	timezone?: string; // New option to set timezone for execution
}

export interface ProcessResult {
	stdout: string;
	stderr: string;
	exitCode: number | null; // Can be null if process hasn't exited
	duration: number; // Execution duration in milliseconds
	startTime: number; // Process start timestamp
	endTime: number; // Process end timestamp
}

export interface ShellResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	duration: number; // Execution duration in milliseconds
	startTime: number; // Process start timestamp
	endTime: number; // Process end timestamp
	success: boolean; // Convenience property indicating success
}

export class ProcessUtils {
	private static activeProcesses: Set<Bun.Subprocess> = new Set();
	private static isShuttingDown = false;
	private static originalTimezone: string | undefined;

	/**
	 * Set timezone for the process
	 */
	static setTimezone(timezone: string): void {
		if (!ProcessUtils.originalTimezone) {
			ProcessUtils.originalTimezone = process.env.TZ;
		}
		process.env.TZ = timezone;
		console.log(`🌍 Timezone set to: ${timezone}`);
	}

	/**
	 * Reset timezone to original value
	 */
	static resetTimezone(): void {
		if (ProcessUtils.originalTimezone !== undefined) {
			process.env.TZ = ProcessUtils.originalTimezone;
			console.log(
				`🌍 Timezone reset to: ${ProcessUtils.originalTimezone || "system default"}`,
			);
		} else {
			delete process.env.TZ;
			console.log(`🌍 Timezone reset to system default`);
		}
	}

	/**
	 * Get current timezone
	 */
	static getCurrentTimezone(): string {
		return process.env.TZ || "system default";
	}

	/**
	 * Get formatted timestamp with current timezone
	 */
	static getFormattedTimestamp(date: Date = new Date()): string {
		return date.toISOString();
	}

	/**
	 * Get local time string with timezone info
	 */
	static getLocalTimeString(date: Date = new Date()): string {
		return date.toLocaleString();
	}

	/**
	 * Execute with timezone support
	 */
	static async executeWithTimezone(
		command: string | string[],
		options: ProcessOptions = {},
	): Promise<ProcessResult | ShellResult> {
		const originalTimezone = process.env.TZ;

		try {
			// Set timezone if specified
			if (options.timezone) {
				ProcessUtils.setTimezone(options.timezone);
			}

			console.log(
				`🌍 Executing in timezone: ${ProcessUtils.getCurrentTimezone()}`,
			);
			console.log(`🕐 Local time: ${ProcessUtils.getLocalTimeString()}`);

			// Execute command
			const result = await ProcessUtils.execute(command, options);

			return result;
		} finally {
			// Always restore original timezone
			if (options.timezone) {
				if (originalTimezone) {
					process.env.TZ = originalTimezone;
				} else {
					delete process.env.TZ;
				}
			}
		}
	}

	/**
	 * Get process uptime in milliseconds
	 */
	static getProcessUptime(): number {
		return Math.floor(Bun.nanoseconds() / 1_000_000);
	}

	/**
	 * Get process uptime in human-readable format
	 */
	static getProcessUptimeFormatted(): string {
		const totalMs = ProcessUtils.getProcessUptime();
		const seconds = Math.floor(totalMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	/**
	 * Format duration in milliseconds to human-readable format
	 */
	static formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		} else if (ms < 60000) {
			return `${(ms / 1000).toFixed(2)}s`;
		} else {
			const minutes = Math.floor(ms / 60000);
			const seconds = Math.floor((ms % 60000) / 1000);
			return `${minutes}m ${seconds}s`;
		}
	}

	/**
	 * Setup comprehensive signal handlers for graceful shutdown
	 * Following best practices for process event handling
	 */
	static setupGracefulShutdown(): void {
		if (process.listenerCount("SIGINT") === 0) {
			// Handle Ctrl+C (SIGINT) - User interrupt
			process.on("SIGINT", () => {
				if (!ProcessUtils.isShuttingDown) {
					ProcessUtils.isShuttingDown = true;
					console.log(
						"\n🛑 SIGINT (Ctrl+C) detected - Gracefully shutting down...",
					);
					ProcessUtils.performCleanup("SIGINT");
				}
			});

			// Handle termination signal (SIGTERM) - System termination
			process.on("SIGTERM", () => {
				if (!ProcessUtils.isShuttingDown) {
					ProcessUtils.isShuttingDown = true;
					console.log("\n🛑 SIGTERM detected - Gracefully shutting down...");
					ProcessUtils.performCleanup("SIGTERM");
				}
			});

			// Handle beforeExit event - Event loop is empty, last chance for async cleanup
			process.on("beforeExit", (code) => {
				console.log(
					`\n📋 Event loop is empty with code ${code} - Final cleanup...`,
				);
				ProcessUtils.performCleanup("beforeExit");
			});

			// Handle exit event - Process is exiting (synchronous only)
			process.on("exit", (code) => {
				console.log(`📤 Process exiting with code ${code}`);
			});

			// Handle uncaught exceptions - Critical errors
			process.on("uncaughtException", (error) => {
				console.error("\n💥 Uncaught Exception:", error.message);
				ProcessUtils.performCleanup("uncaughtException");
				process.exit(1);
			});

			// Handle unhandled promise rejections - Async errors
			process.on("unhandledRejection", (reason, _promise) => {
				console.error("\n⚠️  Unhandled Promise Rejection:", reason);
				ProcessUtils.performCleanup("unhandledRejection");
			});
		}
	}

	/**
	 * Perform cleanup operations
	 */
	private static performCleanup(signal: string): void {
		console.log(`🧹 Cleaning up resources... (signal: ${signal})`);

		// Kill all active processes
		let killedCount = 0;
		for (const proc of ProcessUtils.activeProcesses) {
			if (!proc.killed) {
				proc.kill();
				killedCount++;
			}
		}

		if (killedCount > 0) {
			console.log(`   🔄 Terminated ${killedCount} active process(es)`);
		}

		ProcessUtils.activeProcesses.clear();

		// Log cleanup completion
		console.log("✅ Cleanup completed");
	}

	/**
	 * Track a process for graceful shutdown
	 */
	private static trackProcess(proc: Bun.Subprocess): void {
		ProcessUtils.activeProcesses.add(proc);

		// Remove from tracking when process exits
		proc.exited.then(() => {
			ProcessUtils.activeProcesses.delete(proc);
		});
	}
	/**
	 * Execute a command using Bun Shell with timing
	 */
	static async executeWithShell(
		command: string,
		options: ProcessOptions = {},
	): Promise<ShellResult> {
		const startTime = Date.now();

		console.log(`🐚 Starting shell command: ${command}`);
		console.log(`⏱️  At ${new Date().toISOString()}`);
		console.log(
			`📊 Process uptime: ${ProcessUtils.getProcessUptimeFormatted()}`,
		);

		try {
			// Execute command using Bun Shell
			const result =
				options.trackTiming !== false
					? await $`sh -c ${command}` // Use sh -c for complex commands
					: await $`sh -c ${command}`.quiet();

			const endTime = Date.now();
			const duration = endTime - startTime;

			const shellResult: ShellResult = {
				stdout: result.stdout?.toString() || "",
				stderr: result.stderr?.toString() || "",
				exitCode: result.exitCode,
				duration,
				startTime,
				endTime,
				success: result.exitCode === 0,
			};

			// Log timing information if requested
			if (options.trackTiming !== false) {
				console.log(
					`✅ Shell command completed in ${ProcessUtils.formatDuration(duration)}`,
				);
				console.log(`📈 Exit code: ${shellResult.exitCode ?? "unknown"}`);
				console.log(`🎯 Success: ${shellResult.success}`);
				if (shellResult.stderr.trim()) {
					console.log(`⚠️  Stderr: ${shellResult.stderr.trim()}`);
				}
			}

			return shellResult;
		} catch (error) {
			const endTime = Date.now();
			const duration = endTime - startTime;

			console.log(
				`❌ Shell command failed in ${ProcessUtils.formatDuration(duration)}`,
			);

			return {
				stdout: "",
				stderr: error instanceof Error ? error.message : "Unknown error",
				exitCode: 1,
				duration,
				startTime,
				endTime,
				success: false,
			};
		}
	}

	/**
	 * Execute command and get lines as array using Bun Shell
	 */
	static async executeWithShellLines(
		command: string,
		_options: ProcessOptions = {},
	): Promise<string[]> {
		console.log(`🐚 Executing shell command for lines: ${command}`);

		try {
			const lines: string[] = [];

			// Use Bun Shell's lines() method for streaming line-by-line output
			for await (const line of $`sh -c ${command}`.lines()) {
				lines.push(line);
			}

			console.log(`✅ Retrieved ${lines.length} lines from shell command`);
			return lines;
		} catch (error) {
			console.log(
				`❌ Shell command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		}
	}

	/**
	 * Execute command with JSON output using Bun Shell
	 */
	static async executeWithShellJSON<T = any>(
		command: string,
		options: ProcessOptions = {},
	): Promise<T> {
		console.log(`🐚 Executing shell command for JSON: ${command}`);

		try {
			const result = await ProcessUtils.executeWithShell(command, options);

			if (!result.stdout.trim()) {
				throw new Error("Empty response from shell command");
			}

			// Parse JSON output
			const parsed = JSON.parse(result.stdout);

			console.log(`✅ Successfully parsed JSON from shell command`);
			return parsed;
		} catch (error) {
			console.log(
				`❌ Failed to parse JSON from shell command: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		}
	}

	/**
	 * Hybrid method that chooses between Bun.spawn() and Bun Shell based on options
	 */
	static async execute(
		command: string | string[],
		options: ProcessOptions = {},
	): Promise<ProcessResult | ShellResult> {
		// Use Bun Shell if explicitly requested or if command is a string
		if (options.useShell || typeof command === "string") {
			const cmd = typeof command === "string" ? command : command.join(" ");
			return await ProcessUtils.executeWithShell(cmd, options);
		}

		// Use Bun.spawn() for array commands
		return await ProcessUtils.captureWithTiming(command as string[], options);
	}
	static async captureWithTiming(
		args: string[],
		options: ProcessOptions = {},
	): Promise<ProcessResult> {
		// Setup graceful shutdown on first use
		ProcessUtils.setupGracefulShutdown();

		const startTime = Date.now();
		const _startUptime = ProcessUtils.getProcessUptime();

		console.log(`⏱️  Starting process at ${new Date().toISOString()}`);
		console.log(
			`📊 Process uptime: ${ProcessUtils.getProcessUptimeFormatted()}`,
		);

		const proc = Bun.spawn(args, {
			env: options.env || process.env,
			stdout: "pipe",
			stderr: "pipe",
		});

		// Track process for graceful shutdown
		ProcessUtils.trackProcess(proc);

		// Add timeout if specified
		if (options.timeout) {
			setTimeout(() => {
				if (!proc.killed) {
					proc.kill();
				}
			}, options.timeout);
		}

		await proc.exited;

		const endTime = Date.now();
		const duration = endTime - startTime;
		const _endUptime = ProcessUtils.getProcessUptime();

		// Capture output with type safety
		let stdout = "";
		let stderr = "";

		try {
			if (typeof proc.stdout === "object" && proc.stdout !== null) {
				stdout = await new Response(
					proc.stdout as unknown as ReadableStream,
				).text();
			}
		} catch (_e) {
			if (proc.stdout && typeof proc.stdout === "object") {
				stdout = await new Response(proc.stdout as any).text();
			}
		}

		try {
			if (typeof proc.stderr === "object" && proc.stderr !== null) {
				stderr = await new Response(
					proc.stderr as unknown as ReadableStream,
				).text();
			}
		} catch (_e) {
			if (proc.stderr && typeof proc.stderr === "object") {
				stderr = await new Response(proc.stderr as any).text();
			}
		}

		const result: ProcessResult = {
			stdout,
			stderr,
			exitCode: proc.exitCode,
			duration,
			startTime,
			endTime,
		};

		// Log timing information if requested
		if (options.trackTiming !== false) {
			console.log(
				`✅ Process completed in ${ProcessUtils.formatDuration(duration)}`,
			);
			console.log(`📈 Exit code: ${result.exitCode ?? "unknown"}`);
			if (stderr.trim()) {
				console.log(`⚠️  Stderr: ${stderr.trim()}`);
			}
		}

		return result;
	}
	static async captureOutput(
		args: string[],
		options: ProcessOptions = {},
	): Promise<string> {
		// Setup graceful shutdown on first use
		ProcessUtils.setupGracefulShutdown();

		const proc = Bun.spawn(args, {
			env: options.env || process.env,
			stdout: "pipe",
			stderr: options.inheritStderr ? "inherit" : "pipe",
		});

		// Track process for graceful shutdown
		ProcessUtils.trackProcess(proc);

		// Add timeout if specified
		if (options.timeout) {
			setTimeout(() => {
				if (!proc.killed) {
					proc.kill();
				}
			}, options.timeout);
		}

		await proc.exited;

		if (proc.exitCode !== 0) {
			let stderr = "";
			if (!options.inheritStderr && proc.stderr) {
				try {
					// Check if it's actually a ReadableStream before converting
					if (typeof proc.stderr === "object" && proc.stderr !== null) {
						stderr = await new Response(
							proc.stderr as unknown as ReadableStream,
						).text();
					}
				} catch (_e) {
					// Fallback for any type issues
					if (proc.stderr && typeof proc.stderr === "object") {
						stderr = await new Response(proc.stderr as any).text();
					}
				}
			}
			throw new Error(
				`Process failed with exit code ${proc.exitCode}: ${stderr}`,
			);
		}

		let stdout = "";
		try {
			// Check if it's actually a ReadableStream before converting
			if (typeof proc.stdout === "object" && proc.stdout !== null) {
				stdout = await new Response(
					proc.stdout as unknown as ReadableStream,
				).text();
			}
		} catch (_e) {
			// Fallback for any type issues
			if (proc.stdout && typeof proc.stdout === "object") {
				stdout = await new Response(proc.stdout as any).text();
			}
		}

		return stdout;
	}

	/**
	 * Spawn a process and inherit stdout to parent process
	 */
	static async inheritOutput(
		args: string[],
		options: ProcessOptions = {},
	): Promise<void> {
		// Setup graceful shutdown on first use
		ProcessUtils.setupGracefulShutdown();

		const proc = Bun.spawn(args, {
			env: options.env || process.env,
			stdout: "inherit",
			stderr: options.inheritStderr ? "inherit" : "pipe",
		});

		// Track process for graceful shutdown
		ProcessUtils.trackProcess(proc);

		// Add timeout if specified
		if (options.timeout) {
			setTimeout(() => {
				if (!proc.killed) {
					proc.kill();
				}
			}, options.timeout);
		}

		await proc.exited;

		if (proc.exitCode !== 0) {
			let stderr = "";
			if (!options.inheritStderr && proc.stderr) {
				try {
					// Check if it's actually a ReadableStream before converting
					if (typeof proc.stderr === "object" && proc.stderr !== null) {
						stderr = await new Response(
							proc.stderr as unknown as ReadableStream,
						).text();
					}
				} catch (_e) {
					// Fallback for any type issues
					if (proc.stderr && typeof proc.stderr === "object") {
						stderr = await new Response(proc.stderr as any).text();
					}
				}
			}
			throw new Error(
				`Process failed with exit code ${proc.exitCode}: ${stderr}`,
			);
		}
	}

	/**
	 * Spawn a process and get both stdout and stderr
	 */
	static async captureBoth(
		args: string[],
		options: ProcessOptions = {},
	): Promise<{ stdout: string; stderr: string }> {
		// Setup graceful shutdown on first use
		ProcessUtils.setupGracefulShutdown();

		const proc = Bun.spawn(args, {
			env: options.env || process.env,
			stdout: "pipe",
			stderr: "pipe",
		});

		// Track process for graceful shutdown
		ProcessUtils.trackProcess(proc);

		// Add timeout if specified
		if (options.timeout) {
			setTimeout(() => {
				if (!proc.killed) {
					proc.kill();
				}
			}, options.timeout);
		}

		await proc.exited;

		let stdout = "";
		let stderr = "";

		try {
			// Check if it's actually a ReadableStream before converting
			if (typeof proc.stdout === "object" && proc.stdout !== null) {
				stdout = await new Response(
					proc.stdout as unknown as ReadableStream,
				).text();
			}
		} catch (_e) {
			// Fallback for any type issues
			if (proc.stdout && typeof proc.stdout === "object") {
				stdout = await new Response(proc.stdout as any).text();
			}
		}

		try {
			// Check if it's actually a ReadableStream before converting
			if (typeof proc.stderr === "object" && proc.stderr !== null) {
				stderr = await new Response(
					proc.stderr as unknown as ReadableStream,
				).text();
			}
		} catch (_e) {
			// Fallback for any type issues
			if (proc.stderr && typeof proc.stderr === "object") {
				stderr = await new Response(proc.stderr as any).text();
			}
		}

		if (proc.exitCode !== 0) {
			throw new Error(
				`Process failed with exit code ${proc.exitCode}: ${stderr}`,
			);
		}

		return { stdout, stderr };
	}

	/**
	 * Stream output line by line
	 */
	static async streamOutput(
		args: string[],
		onLine: (line: string) => void,
		options: ProcessOptions = {},
	): Promise<void> {
		// Setup graceful shutdown on first use
		ProcessUtils.setupGracefulShutdown();

		const proc = Bun.spawn(args, {
			env: options.env || process.env,
			stdout: "pipe",
			stderr: options.inheritStderr ? "inherit" : "pipe",
		});

		// Track process for graceful shutdown
		ProcessUtils.trackProcess(proc);

		// Add timeout if specified
		if (options.timeout) {
			setTimeout(() => {
				if (!proc.killed) {
					proc.kill();
				}
			}, options.timeout);
		}

		// Read stdout line by line
		const reader = proc.stdout.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || ""; // Keep incomplete line in buffer

				for (const line of lines) {
					if (line.trim()) {
						onLine(line);
					}
				}
			}

			// Process remaining buffer
			if (buffer.trim()) {
				onLine(buffer);
			}
		} finally {
			reader.releaseLock();
		}

		await proc.exited;

		if (proc.exitCode !== 0) {
			let stderr = "";
			if (!options.inheritStderr && proc.stderr) {
				try {
					// Check if it's actually a ReadableStream before converting
					if (typeof proc.stderr === "object" && proc.stderr !== null) {
						stderr = await new Response(
							proc.stderr as unknown as ReadableStream,
						).text();
					}
				} catch (_e) {
					// Fallback for any type issues
					if (proc.stderr && typeof proc.stderr === "object") {
						stderr = await new Response(proc.stderr as any).text();
					}
				}
			}
			throw new Error(
				`Process failed with exit code ${proc.exitCode}: ${stderr}`,
			);
		}
	}
}
