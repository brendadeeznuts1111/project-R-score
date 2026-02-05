/**
 * Enhanced Process Management Utilities
 * Provides advanced process spawning, monitoring, and control
 * Integrated with security hardening and signal handling
 */

import { cpus } from "node:os";
import { secureConsole, securityManager } from "../security/security-hardening";
import { signalHandler } from "../security/signal-handler";

export interface ProcessOptions {
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
	timeout?: number;
	silent?: boolean;
	enableSecurity?: boolean;
	maxOutputSize?: number;
	validatePaths?: boolean;
}

export interface ProcessResult {
	success: boolean;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	duration: number;
	pid?: number;
	securityViolations?: string[];
	truncated?: boolean;
}

export interface ProcessInfo {
	pid: number;
	command: string;
	status: "running" | "completed" | "failed";
	exitCode?: number;
	startTime: Date;
	duration?: number;
}

export interface StreamOptions {
	onStdout?: (data: string) => void;
	onStderr?: (data: string) => void;
	onComplete?: (result: ProcessResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Enhanced Process Manager
 * Provides comprehensive process control and monitoring
 * Integrated with security features and signal handling
 */
export class ProcessManager {
	private processes: Map<number, ProcessInfo> = new Map();
	private defaultTimeout: number = 60000; // 60 seconds

	constructor() {
		// Initialize signal handling for graceful shutdown
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

	/**
	 * Execute a command and wait for completion
	 */
	async execute(options: ProcessOptions): Promise<ProcessResult> {
		const startTime = Date.now();
		const {
			command,
			args = [],
			cwd,
			env,
			timeout = this.defaultTimeout,
			silent = false,
			enableSecurity = true,
		} = options;

		try {
			// Security validation if enabled
			let securityViolations: string[] = [];
			if (enableSecurity) {
				const validationResult = this.validateSecurity(options);
				if (!validationResult.valid) {
					securityViolations = validationResult.violations;
					securityManager.logSecurityEvent(
						"PROCESS_SECURITY_VIOLATION",
						{
							command,
							violations: securityViolations,
						},
						"medium",
					);
				}
			}

			// Use Bun's $ for shell execution
			const processCommand =
				args.length > 0 ? `${command} ${args.join(" ")}` : command;

			const result = await Bun.spawn({
				cmd: ["/bin/bash", "-c", processCommand],
				cwd,
				env: { ...process.env, ...env },
			});

			const output = await new Response(result.stdout).text();
			const duration = Date.now() - startTime;

			// Apply security filtering
			const filteredOutput = enableSecurity
				? securityManager.maskSecrets(output)
				: output;

			// Check output size limits
			const maxOutputSize = options.maxOutputSize || 10 * 1024 * 1024; // 10MB
			const truncated = filteredOutput.length > maxOutputSize;
			const finalOutput = truncated
				? `${filteredOutput.substring(0, maxOutputSize)}... [TRUNCATED]`
				: filteredOutput;

			const processResult: ProcessResult = {
				success: result.exitCode === 0,
				exitCode: result.exitCode,
				stdout: finalOutput,
				stderr: "",
				duration,
				pid: result.pid,
				securityViolations: enableSecurity ? securityViolations : undefined,
				truncated,
			};

			// Log execution if not silent
			if (!silent) {
				secureConsole.log(
					`Process executed in ${duration}ms: ${processCommand}`,
				);
			}

			return processResult;
		} catch (error: any) {
			const errorResult: ProcessResult = {
				success: false,
				exitCode: -1,
				stdout: "",
				stderr: error.message,
				duration: Date.now() - startTime,
				securityViolations: enableSecurity
					? ["Process execution failed"]
					: undefined,
			};

			if (enableSecurity) {
				securityManager.logSecurityEvent(
					"PROCESS_EXECUTION_ERROR",
					{
						command,
						error: error.message,
					},
					"high",
				);
			}

			return errorResult;
		}
	}

	/**
	 * Execute with streaming output
	 */
	async executeStreaming(
		options: ProcessOptions,
		streamOptions?: StreamOptions,
	): Promise<ProcessResult> {
		const startTime = Date.now();
		const { command, args = [], cwd, env } = options;

		return new Promise((resolve) => {
			const processCommand =
				args.length > 0 ? `${command} ${args.join(" ")}` : command;

			const childProcess = Bun.spawn({
				cmd: ["/bin/bash", "-c", processCommand],
				cwd,
				env: { ...process.env, ...env },
				stdout: "pipe",
				stderr: "pipe",
			});

			const stdout = childProcess.stdout;
			const stderr = childProcess.stderr;
			let stdoutData = "";
			let stderrData = "";

			// Read stdout stream
			const readStdout = async () => {
				try {
					const chunk = await new Response(stdout).text();
					if (chunk) {
						stdoutData += chunk;
						streamOptions?.onStdout?.(chunk);
					}
				} catch (error) {
					streamOptions?.onError?.(error as Error);
				}
			};

			// Read stderr stream
			const readStderr = async () => {
				try {
					const chunk = await new Response(stderr).text();
					if (chunk) {
						stderrData += chunk;
						streamOptions?.onStderr?.(chunk);
					}
				} catch (error) {
					streamOptions?.onError?.(error as Error);
				}
			};

			// Process streams
			Promise.all([readStdout(), readStderr()]).then(async () => {
				const exitCode = await childProcess.exited;
				const duration = Date.now() - startTime;

				const result: ProcessResult = {
					success: exitCode === 0,
					exitCode,
					stdout: stdoutData,
					stderr: stderrData,
					duration,
					pid: childProcess.pid,
				};

				streamOptions?.onComplete?.(result);
				resolve(result);
			});
		});
	}

	/**
	 * Start a background process
	 */
	start(options: ProcessOptions): ProcessInfo {
		const { command, args = [], cwd, env } = options;
		const processCommand =
			args.length > 0 ? `${command} ${args.join(" ")}` : command;

		// Validate paths if security is enabled
		if (
			options.enableSecurity !== false &&
			cwd &&
			!securityManager.validateFilePath(cwd)
		) {
			throw new Error(`Invalid working directory: ${cwd}`);
		}

		const childProcess = Bun.spawn({
			cmd: ["/bin/bash", "-c", processCommand],
			cwd,
			env: { ...process.env, ...env },
			detached: true,
			stdout: "ignore",
			stderr: "ignore",
		});

		const info: ProcessInfo = {
			pid: childProcess.pid,
			command: processCommand,
			status: "running",
			startTime: new Date(),
		};

		this.processes.set(childProcess.pid, info);
		signalHandler.trackProcess(childProcess);

		// Log process start
		secureConsole.log(
			`Started background process: ${processCommand} (PID: ${childProcess.pid})`,
		);

		return info;
	}

	/**
	 * Kill a process by PID
	 */
	kill(pid: number, signal: number = 15): boolean {
		const processInfo = this.processes.get(pid);
		if (!processInfo) return false;

		try {
			process.kill(pid, signal);
			processInfo.status = "completed";
			processInfo.exitCode = -signal;
			processInfo.duration = Date.now() - processInfo.startTime.getTime();

			// Log process termination
			secureConsole.log(`Terminated process ${pid}: ${processInfo.command}`);
			securityManager.logSecurityEvent(
				"PROCESS_TERMINATED",
				{
					pid,
					command: processInfo.command,
					signal,
				},
				"low",
			);

			return true;
		} catch (error) {
			secureConsole.error(`Failed to kill process ${pid}: ${error}`);
			return false;
		}
	}

	/**
	 * Get process status
	 */
	getProcessInfo(pid: number): ProcessInfo | undefined {
		return this.processes.get(pid);
	}

	/**
	 * List all tracked processes
	 */
	listProcesses(): ProcessInfo[] {
		return Array.from(this.processes.values());
	}

	/**
	 * Wait for a process to complete
	 */
	async waitFor(pid: number, timeout?: number): Promise<ProcessResult> {
		const startTime = Date.now();
		const timeoutDuration = timeout || this.defaultTimeout;

		while (Date.now() - startTime < timeoutDuration) {
			const info = this.processes.get(pid);
			if (!info || info.status !== "running") {
				const result: ProcessResult = {
					success: info?.status === "completed",
					exitCode: info?.exitCode || null,
					stdout: "",
					stderr: "",
					duration: Date.now() - startTime,
					pid,
				};
				return result;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		return {
			success: false,
			exitCode: null,
			stdout: "",
			stderr: "Timeout",
			duration: Date.now() - startTime,
			pid,
		};
	}

	/**
	 * Clean up all processes on shutdown
	 */
	private async cleanupAllProcesses(): Promise<void> {
		if (this.processes.size === 0) {
			return;
		}

		secureConsole.log(`Cleaning up ${this.processes.size} processes...`);

		const cleanupPromises: Promise<void>[] = [];

		for (const [pid, _info] of this.processes) {
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
		this.processes.clear();

		secureConsole.log("All processes cleaned up");
	}

	/**
	 * Validate security constraints for process execution
	 */
	private validateSecurity(options: ProcessOptions): {
		valid: boolean;
		violations: string[];
	} {
		const violations: string[] = [];

		// Check for shell injection attempts
		const injectionPatterns = [/;&|`$(){}[\]]/, /\.\./, /\/etc\//, /\/proc\//];
		const checkString = `${options.command} ${(options.args || []).join(" ")}`;

		for (const pattern of injectionPatterns) {
			if (pattern.test(checkString)) {
				violations.push(`Potential shell injection: ${pattern.source}`);
			}
		}

		// Validate command whitelist
		const allowedCommands = [
			"ls",
			"cat",
			"echo",
			"date",
			"pwd",
			"whoami",
			"git",
			"npm",
			"bun",
			"node",
		];
		const commandName = options.command.split(" ")[0];

		if (!allowedCommands.includes(commandName)) {
			violations.push(`Command not in whitelist: ${commandName}`);
		}

		return {
			valid: violations.length === 0,
			violations,
		};
	}
}

/**
 * Enhanced Console Reader
 * Provides advanced console input handling
 */
export class ConsoleReader {
	private history: string[] = [];
	private prompt: string = "> ";

	/**
	 * Read a single line from console
	 */
	async readLine(prompt?: string): Promise<string> {
		const promptText = prompt || this.prompt;
		process.stdout.write(promptText);

		for await (const line of console) {
			const trimmed = line.trim();

			// Add to history
			if (trimmed && trimmed !== this.history[this.history.length - 1]) {
				this.history.push(trimmed);
				this.historyIndex = this.history.length;
			}

			return trimmed;
		}

		return "";
	}

	/**
	 * Read multiple lines until delimiter
	 */
	async readUntil(
		delimiter: string = "END",
		includeDelimiter: boolean = false,
	): Promise<string[]> {
		const lines: string[] = [];

		while (true) {
			const line = await this.readLine();
			if (line === delimiter) {
				if (includeDelimiter) lines.push(line);
				break;
			}
			lines.push(line);
		}

		return lines;
	}

	/**
	 * Read with validation
	 */
	async readValidated(options: {
		prompt: string;
		validator: (input: string) => boolean | string;
		retryMessage?: string;
		maxRetries?: number;
	}): Promise<string> {
		const {
			prompt,
			validator,
			retryMessage = "Invalid input, please try again",
			maxRetries = 3,
		} = options;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			const input = await this.readLine(
				`${prompt} (attempt ${attempt}/${maxRetries}): `,
			);

			const result = validator(input);

			if (result === true) {
				return input;
			}

			const errorMessage = typeof result === "string" ? result : retryMessage;
			console.log(`❌ ${errorMessage}`);
		}

		throw new Error("Maximum retries exceeded");
	}

	/**
	 * Read with auto-completion
	 */
	async readWithCompletion(options: {
		prompt: string;
		completions: string[];
		caseSensitive?: boolean;
	}): Promise<string> {
		const { prompt, completions, caseSensitive = false } = options;

		while (true) {
			const input = await this.readLine(`${prompt}: `);
			const searchTerm = caseSensitive ? input : input.toLowerCase();

			// Find matching completions
			const matches = completions.filter((c) =>
				caseSensitive
					? c.startsWith(input)
					: c.toLowerCase().startsWith(searchTerm),
			);

			if (matches.length === 1) {
				return matches[0];
			} else if (matches.length > 1) {
				console.log(`\n📋 Possible completions:`);
				matches.forEach((match, i) => console.log(`  ${i + 1}. ${match}`));
			} else if (input) {
				return input;
			}
		}
	}

	/**
	 * Read password (hidden input)
	 */
	async readPassword(prompt: string = "Password: "): Promise<string> {
		process.stdout.write(prompt);

		// Use a simple approach - in production, use a proper terminal library
		for await (const line of console) {
			return line;
		}

		return "";
	}

	/**
	 * Read number with range validation
	 */
	async readNumber(options: {
		prompt: string;
		min?: number;
		max?: number;
		default?: number;
	}): Promise<number> {
		const { prompt, min, max, default: defaultValue } = options;

		return this.readValidated({
			prompt,
			validator: (input): boolean | string => {
				const num = parseFloat(input);

				if (Number.isNaN(num)) {
					if (defaultValue !== undefined) {
						// Return true to accept the default, but we'll parse it separately
						return true;
					}
					return "Please enter a valid number";
				}

				if (min !== undefined && num < min) {
					return `Number must be at least ${min}`;
				}

				if (max !== undefined && num > max) {
					return `Number must be at most ${max}`;
				}

				return true;
			},
		}).then((input) => {
			const num = parseFloat(input);
			if (!Number.isNaN(num)) return num;
			if (defaultValue !== undefined) return defaultValue;
			return 0;
		});
	}

	/**
	 * Read yes/no confirmation
	 */
	async readConfirmation(prompt: string = "Confirm?"): Promise<boolean> {
		const response = await this.readLine(`${prompt} (y/n): `);
		return response.toLowerCase() === "y" || response.toLowerCase() === "yes";
	}

	/**
	 * Read selection from a list
	 */
	async readSelection<T>(options: {
		prompt: string;
		items: { key: string; value: T; description?: string }[];
		allowMultiple?: boolean;
	}): Promise<T | T[]> {
		const { prompt, items, allowMultiple = false } = options;

		console.log(`\n${prompt}`);
		items.forEach((item, i) => {
			const desc = item.description ? ` - ${item.description}` : "";
			console.log(`  ${i + 1}. [${item.key}]${desc}`);
		});

		const input = await this.readLine(`Select option(s): `);
		const selections = input.split(",").map((s) => s.trim());

		if (allowMultiple) {
			return selections
				.map((sel) => {
					const index = parseInt(sel, 10) - 1;
					return items[index]?.value;
				})
				.filter(Boolean);
		} else {
			const index = parseInt(selections[0], 10) - 1;
			return items[index]?.value;
		}
	}

	/**
	 * Set custom prompt
	 */
	setPrompt(prompt: string): void {
		this.prompt = prompt;
	}

	/**
	 * Clear history
	 */
	clearHistory(): void {
		this.history = [];
		this.historyIndex = -1;
	}

	/**
	 * Get history
	 */
	getHistory(): string[] {
		return [...this.history];
	}
}

/**
 * Process and Console utilities
 */
export const ProcessUtils = {
	/**
	 * Execute a simple command
	 */
	async exec(command: string): Promise<ProcessResult> {
		const manager = new ProcessManager();
		return manager.execute({ command });
	},

	/**
	 * Get system information
	 */
	getSystemInfo(): Record<string, any> {
		return {
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.version,
			pid: process.pid,
			cwd: process.cwd(),
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			cpuCount: cpus().length,
		};
	},

	/**
	 * Sleep for specified milliseconds
	 */
	sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	},

	/**
	 * Retry a function with exponential backoff
	 */
	async retry<T>(
		fn: () => Promise<T>,
		options: { maxRetries?: number; baseDelay?: number; maxDelay?: number },
	): Promise<T> {
		const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;

		let lastError: Error;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error as Error;
				if (attempt < maxRetries) {
					const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
					console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
					await this.sleep(delay);
				}
			}
		}

		throw lastError!;
	},
};

/**
 * Interactive Process Manager with Console
 */
export class InteractiveProcessManager {
	private processManager = new ProcessManager();
	private consoleReader = new ConsoleReader();

	/**
	 * Run an interactive shell
	 */
	async startShell(): Promise<void> {
		console.log("🚀 Interactive Process Shell");
		console.log("============================");
		console.log("Commands: exec, start, kill, list, status, help, exit");

		while (true) {
			try {
				const command = await this.consoleReader.readLine("\nshell> ");

				if (!command) continue;

				if (command === "exit" || command === "quit") {
					console.log("👋 Goodbye!");
					break;
				}

				if (command === "help") {
					this.printHelp();
					continue;
				}

				if (command === "list") {
					this.printProcessList();
					continue;
				}

				if (command.startsWith("exec ")) {
					const cmd = command.substring(5);
					console.log(`⚡ Executing: ${cmd}`);
					const result = await this.processManager.execute({ command: cmd });
					console.log(result.stdout);
					continue;
				}

				if (command.startsWith("kill ")) {
					const pid = parseInt(command.substring(5), 10);
					const success = this.processManager.kill(pid);
					console.log(
						success
							? `✅ Process ${pid} killed`
							: `❌ Failed to kill process ${pid}`,
					);
					continue;
				}

				if (command === "status") {
					this.printProcessList();
					continue;
				}

				console.log(`Unknown command: ${command}`);
				this.printHelp();
			} catch (error) {
				console.error("Shell error:", error);
			}
		}
	}

	private printHelp(): void {
		console.log("\n📖 Available Commands:");
		console.log("  exec <command>  - Execute a command");
		console.log("  start <command> - Start a background process");
		console.log("  kill <pid>      - Kill a process by PID");
		console.log("  list            - List all processes");
		console.log("  status          - Show process status");
		console.log("  help            - Show this help");
		console.log("  exit            - Exit the shell");
	}

	private printProcessList(): void {
		const processes = this.processManager.listProcesses();
		console.log("\n📋 Running Processes:");
		if (processes.length === 0) {
			console.log("  No running processes");
		} else {
			processes.forEach((p) => {
				console.log(
					`  PID: ${p.pid} | Command: ${p.command.substring(0, 30)}...`,
				);
			});
		}
	}
}

// Export default instances
export const processManager = new ProcessManager();
export const consoleReader = new ConsoleReader();
