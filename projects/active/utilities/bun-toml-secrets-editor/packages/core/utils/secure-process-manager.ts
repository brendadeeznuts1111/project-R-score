/**
 * Enhanced Process Manager with Security Integration
 * Addresses Bun.spawn() patterns and security audit findings
 */

import { secureConsole, securityManager } from "../security/security-hardening";
import { signalHandler } from "../security/signal-handler";

export interface SecureProcessOptions {
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
	timeout?: number;
	maxOutputSize?: number;
	allowShellInjection?: boolean;
	validatePaths?: boolean;
	enableAuditLogging?: boolean;
	trackTiming?: boolean;
	inheritStdout?: boolean;
	inheritStderr?: boolean;
}

export interface SecureProcessResult {
	success: boolean;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	duration: number;
	startTime: number;
	endTime: number;
	pid?: number;
	truncated: boolean;
	securityViolations: string[];
}

export class SecureProcessManager {
	private static instance: SecureProcessManager;
	private activeProcesses: Map<number, SecureProcessOptions> = new Map();
	private readonly defaultTimeout = 30000; // 30 seconds
	private readonly maxOutputSize = 10 * 1024 * 1024; // 10MB

	private constructor() {
		// Initialize security and signal handling
		signalHandler.initialize();

		// Register cleanup task
		signalHandler.registerCleanupTask({
			id: "process-manager-cleanup",
			name: "Process Manager Cleanup",
			priority: "high",
			cleanup: async () => {
				await this.cleanupAllProcesses();
			},
		});
	}

	static getInstance(): SecureProcessManager {
		if (!SecureProcessManager.instance) {
			SecureProcessManager.instance = new SecureProcessManager();
		}
		return SecureProcessManager.instance;
	}

	/**
	 * Execute a command with comprehensive security checks
	 */
	async execute(options: SecureProcessOptions): Promise<SecureProcessResult> {
		const startTime = Date.now();
		const securityViolations: string[] = [];

		try {
			// Security validation
			const validationResult = this.validateSecurity(options);
			if (!validationResult.valid) {
				securityViolations.push(...validationResult.violations);

				if (validationResult.violations.some((v) => v.includes("critical"))) {
					throw new Error(
						`Critical security violations: ${validationResult.violations.join(", ")}`,
					);
				}
			}

			// Log execution start
			if (options.enableAuditLogging !== false) {
				secureConsole.log(
					`Executing: ${options.command} ${(options.args || []).join(" ")}`,
					"INFO",
				);
				securityManager.logSecurityEvent(
					"PROCESS_EXECUTION_STARTED",
					{
						command: options.command,
						args: options.args,
						cwd: options.cwd,
					},
					"low",
				);
			}

			// Execute the process
			const result = await this.executeInternal(options, securityViolations);

			// Log completion
			if (options.enableAuditLogging !== false) {
				secureConsole.log(`Process completed in ${result.duration}ms`, "INFO");
				if (securityViolations.length > 0) {
					secureConsole.log(
						`Security violations detected: ${securityViolations.join(", ")}`,
						"WARN",
					);
				}
			}

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorResult: SecureProcessResult = {
				success: false,
				exitCode: -1,
				stdout: "",
				stderr: error instanceof Error ? error.message : "Unknown error",
				duration,
				startTime,
				endTime: Date.now(),
				truncated: false,
				securityViolations,
			};

			securityManager.logSecurityEvent(
				"PROCESS_EXECUTION_FAILED",
				{
					command: options.command,
					error: errorResult.stderr,
					duration,
					securityViolations,
				},
				"high",
			);

			return errorResult;
		}
	}

	/**
	 * Internal execution method
	 */
	private async executeInternal(
		options: SecureProcessOptions,
		securityViolations: string[],
	): Promise<SecureProcessResult> {
		const startTime = Date.now();
		const {
			command,
			args = [],
			cwd,
			env,
			timeout = this.defaultTimeout,
		} = options;

		// Build command array
		const commandArray = args.length > 0 ? [command, ...args] : [command];

		// Validate working directory
		if (cwd && options.validatePaths !== false) {
			if (!securityManager.validateFilePath(cwd)) {
				throw new Error(`Invalid working directory: ${cwd}`);
			}
		}

		// Create process with security settings
		const proc = Bun.spawn(commandArray, {
			cwd,
			env: { ...process.env, ...env },
			stdout: options.inheritStdout ? "inherit" : "pipe",
			stderr: options.inheritStderr ? "inherit" : "pipe",
		});

		// Track process for cleanup
		this.activeProcesses.set(proc.pid, options);
		signalHandler.trackProcess(proc);

		// Set up timeout
		const timeoutHandle = setTimeout(() => {
			if (!proc.killed) {
				secureConsole.log(
					`Process timeout (${timeout}ms), terminating...`,
					"WARN",
				);
				proc.kill("SIGTERM");

				// Force kill after additional timeout
				setTimeout(() => {
					if (!proc.killed) {
						proc.kill("SIGKILL");
					}
				}, 5000);
			}
		}, timeout);

		try {
			await proc.exited;
			clearTimeout(timeoutHandle);
		} finally {
			this.activeProcesses.delete(proc.pid);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;

		// Capture output with size limits
		let stdout = "";
		let stderr = "";
		let truncated = false;

		if (!options.inheritStdout && proc.stdout) {
			// Bun.spawn returns a ReadableStream for stdout/stderr
			const stdoutStream = proc.stdout as ReadableStream<Uint8Array>;
			stdout = await this.captureOutputSafely(
				stdoutStream,
				options.maxOutputSize || this.maxOutputSize,
			);
			truncated =
				stdout.length >= (options.maxOutputSize || this.maxOutputSize);
		}

		if (!options.inheritStderr && proc.stderr) {
			// Bun.spawn returns a ReadableStream for stdout/stderr
			const stderrStream = proc.stderr as ReadableStream<Uint8Array>;
			stderr = await this.captureOutputSafely(
				stderrStream,
				options.maxOutputSize || this.maxOutputSize,
			);
			if (!truncated) {
				truncated =
					stderr.length >= (options.maxOutputSize || this.maxOutputSize);
			}
		}

		const result: SecureProcessResult = {
			success: proc.exitCode === 0,
			exitCode: proc.exitCode,
			stdout: securityManager.maskSecrets(stdout),
			stderr: securityManager.maskSecrets(stderr),
			duration,
			startTime,
			endTime,
			pid: proc.pid,
			truncated,
			securityViolations,
		};

		// Log security events if violations detected
		if (securityViolations.length > 0) {
			securityManager.logSecurityEvent(
				"PROCESS_SECURITY_VIOLATIONS",
				{
					command,
					violations: securityViolations,
					exitCode: proc.exitCode,
				},
				"medium",
			);
		}

		return result;
	}

	/**
	 * Capture output with size limits and security filtering
	 */
	private async captureOutputSafely(
		stream: ReadableStream,
		maxSize: number,
	): Promise<string> {
		try {
			const response = new Response(stream);
			const text = await response.text();

			// Validate input size
			if (!securityManager.validateInputSize(text)) {
				throw new Error("Output exceeds maximum size limit");
			}

			// Truncate if necessary
			if (text.length > maxSize) {
				return `${text.substring(0, maxSize)}\n... [TRUNCATED]`;
			}

			return text;
		} catch (error) {
			secureConsole.error(`Failed to capture process output: ${error}`);
			return `[ERROR: Failed to capture output - ${error instanceof Error ? error.message : "Unknown"}]`;
		}
	}

	/**
	 * Validate security constraints
	 */
	private validateSecurity(options: SecureProcessOptions): {
		valid: boolean;
		violations: string[];
	} {
		const violations: string[] = [];

		// Check for shell injection attempts
		if (!options.allowShellInjection) {
			const injectionPatterns = [
				/[;&|`$(){}[\]]/, // Shell metacharacters
				/\.\./, // Directory traversal
				/\/etc\//, // System files
				/\/proc\//, // Process files
				/\/sys\//, // System files
			];

			const checkString = `${options.command} ${(options.args || []).join(" ")}`;
			for (const pattern of injectionPatterns) {
				if (pattern.test(checkString)) {
					violations.push(`Potential shell injection: ${pattern.source}`);
				}
			}
		}

		// Validate command whitelist (basic check)
		const allowedCommands = [
			"ls",
			"cat",
			"echo",
			"date",
			"pwd",
			"whoami",
			"uname",
			"git",
			"npm",
			"bun",
			"node",
			"python",
			"python3",
			"curl",
			"wget",
			"grep",
			"find",
			"sort",
			"uniq",
			"wc",
		];

		const commandName = options.command.split(" ")[0];
		if (!allowedCommands.includes(commandName)) {
			violations.push(`Command not in whitelist: ${commandName}`);
		}

		// Check argument count limits
		if ((options.args || []).length > 50) {
			violations.push("Too many arguments (potential DoS)");
		}

		// Check for extremely long arguments
		for (const arg of options.args || []) {
			if (arg.length > 10000) {
				violations.push("Argument too long (potential DoS)");
				break;
			}
		}

		return {
			valid: violations.filter((v) => v.includes("critical")).length === 0,
			violations,
		};
	}

	/**
	 * Execute with streaming output
	 */
	async executeWithStreaming(
		options: SecureProcessOptions,
		onStdout: (data: string) => void,
		onStderr: (data: string) => void,
	): Promise<SecureProcessResult> {
		const startTime = Date.now();
		const securityViolations: string[] = [];

		// Security validation
		const validationResult = this.validateSecurity(options);
		if (!validationResult.valid) {
			throw new Error(
				`Security violations: ${validationResult.violations.join(", ")}`,
			);
		}

		const {
			command,
			args = [],
			cwd,
			env,
			timeout = this.defaultTimeout,
		} = options;
		const commandArray = args.length > 0 ? [command, ...args] : [command];

		const proc = Bun.spawn(commandArray, {
			cwd,
			env: { ...process.env, ...env },
			stdout: "pipe",
			stderr: "pipe",
		});

		this.activeProcesses.set(proc.pid, options);
		signalHandler.trackProcess(proc);

		// Set up timeout
		const timeoutHandle = setTimeout(() => {
			if (!proc.killed) {
				proc.kill("SIGTERM");
			}
		}, timeout);

		let stdoutData = "";
		let stderrData = "";
		let truncated = false;

		try {
			// Stream stdout
			if (proc.stdout) {
				const reader = proc.stdout.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						stdoutData += chunk;

						// Check size limit
						if (
							stdoutData.length > (options.maxOutputSize || this.maxOutputSize)
						) {
							truncated = true;
							stdoutData = `${stdoutData.substring(
								0,
								options.maxOutputSize || this.maxOutputSize,
							)}\n... [TRUNCATED]`;
							break;
						}

						// Send chunk to callback (masked)
						const maskedChunk = securityManager.maskSecrets(chunk);
						onStdout(maskedChunk);
					}
				} finally {
					reader.releaseLock();
				}
			}

			// Stream stderr
			if (proc.stderr) {
				const reader = proc.stderr.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						stderrData += chunk;

						// Check size limit
						if (
							stderrData.length > (options.maxOutputSize || this.maxOutputSize)
						) {
							truncated = true;
							stderrData = `${stderrData.substring(
								0,
								options.maxOutputSize || this.maxOutputSize,
							)}\n... [TRUNCATED]`;
							break;
						}

						// Send chunk to callback (masked)
						const maskedChunk = securityManager.maskSecrets(chunk);
						onStderr(maskedChunk);
					}
				} finally {
					reader.releaseLock();
				}
			}

			await proc.exited;
			clearTimeout(timeoutHandle);
		} finally {
			this.activeProcesses.delete(proc.pid);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;

		return {
			success: proc.exitCode === 0,
			exitCode: proc.exitCode,
			stdout: securityManager.maskSecrets(stdoutData),
			stderr: securityManager.maskSecrets(stderrData),
			duration,
			startTime,
			endTime,
			pid: proc.pid,
			truncated,
			securityViolations,
		};
	}

	/**
	 * Clean up all active processes
	 */
	private async cleanupAllProcesses(): Promise<void> {
		if (this.activeProcesses.size === 0) {
			return;
		}

		secureConsole.log(
			`Cleaning up ${this.activeProcesses.size} active processes...`,
		);

		const cleanupPromises: Promise<void>[] = [];

		for (const [pid, _options] of this.activeProcesses) {
			const promise = new Promise<void>((resolve) => {
				try {
					process.kill(pid, "SIGTERM");

					// Force kill after delay
					setTimeout(() => {
						try {
							process.kill(pid, "SIGKILL");
						} catch {
							// Process might already be dead
						}
						resolve();
					}, 5000);
				} catch {
					resolve();
				}
			});

			cleanupPromises.push(promise);
		}

		await Promise.all(cleanupPromises);
		this.activeProcesses.clear();

		secureConsole.log("All processes cleaned up");
	}

	/**
	 * Get active process information
	 */
	getActiveProcesses(): Array<{
		pid: number;
		command: string;
		startTime: number;
	}> {
		return Array.from(this.activeProcesses.entries()).map(([pid, options]) => ({
			pid,
			command: options.command,
			startTime: Date.now(), // This is approximate
		}));
	}

	/**
	 * Kill a specific process
	 */
	killProcess(pid: number, signal: "SIGTERM" | "SIGKILL" = "SIGTERM"): boolean {
		try {
			process.kill(pid, signal);
			this.activeProcesses.delete(pid);
			secureConsole.log(`Process ${pid} killed with ${signal}`);
			return true;
		} catch (error) {
			secureConsole.error(`Failed to kill process ${pid}: ${error}`);
			return false;
		}
	}
}

// Export singleton instance
export const secureProcessManager = SecureProcessManager.getInstance();

// Convenience functions
export const executeSecureCommand = (options: SecureProcessOptions) =>
	secureProcessManager.execute(options);

export const executeWithStreaming = (
	options: SecureProcessOptions,
	onStdout: (data: string) => void,
	onStderr: (data: string) => void,
) => secureProcessManager.executeWithStreaming(options, onStdout, onStderr);
