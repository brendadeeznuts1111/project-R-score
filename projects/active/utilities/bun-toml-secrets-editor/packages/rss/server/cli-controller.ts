// src/server/cli-controller.ts - CLI Command Execution Controller

import { spawn } from "node:child_process";
import { $ } from "bun";

export interface CLICommand {
	id: string;
	command: string;
	args: string[];
	description: string;
	category: "bun" | "rss" | "profile" | "build" | "test" | "security";
	status: "pending" | "running" | "completed" | "error";
	output?: string;
	error?: string;
	startTime?: Date;
	endTime?: Date;
	duration?: number;
}

export interface CLIResponse {
	success: boolean;
	commandId?: string;
	output?: string;
	error?: string;
	duration?: number;
}

class CLIController {
	private commands: Map<string, CLICommand> = new Map();
	private commandHistory: CLICommand[] = [];
	private maxHistory = 100;

	/**
	 * Execute a CLI command and return the result
	 */
	async executeCommand(
		command: string,
		args: string[] = [],
		description: string = "",
		category: CLICommand["category"] = "bun",
	): Promise<CLIResponse> {
		const commandId = this.generateCommandId();
		const cliCommand: CLICommand = {
			id: commandId,
			command,
			args,
			description,
			category,
			status: "pending",
			startTime: new Date(),
		};

		this.commands.set(commandId, cliCommand);
		this.addToHistory(cliCommand);

		try {
			cliCommand.status = "running";

			const startTime = Date.now();
			let output = "";
			let error = "";

			// Use Bun's $ for better process handling
			if (command.startsWith("bun") || command.startsWith("matrix")) {
				const result = await $`${command} ${args.join(" ")}`.quiet();
				output = result.stdout?.toString() || "";
				error = result.stderr?.toString() || "";

				cliCommand.output = output;

				if (result.exitCode === 0) {
					cliCommand.status = "completed";
				} else {
					cliCommand.status = "error";
					// Provide better error message
					if (!error) {
						error = `Command failed with exit code ${result.exitCode}`;
					}
					if (!output && !error) {
						error = `Command '${command} ${args.join(" ")}' failed with no output`;
					}
				}

				cliCommand.error = error || undefined;
			} else {
				// Fallback to spawn for other commands
				const result = await this.spawnCommand(command, args);
				output = result.output;
				error = result.error;
				cliCommand.output = output;
				cliCommand.error = error || undefined;
				cliCommand.status = result.success ? "completed" : "error";
			}

			const endTime = Date.now();
			cliCommand.endTime = new Date();
			cliCommand.duration = endTime - startTime;

			return {
				success: cliCommand.status === "completed",
				commandId,
				output: cliCommand.output,
				error: cliCommand.error,
				duration: cliCommand.duration,
			};
		} catch (err: any) {
			cliCommand.status = "error";
			cliCommand.endTime = new Date();
			cliCommand.error = err.message;
			cliCommand.duration = Date.now() - (cliCommand.startTime?.getTime() || 0);

			return {
				success: false,
				commandId,
				error: err.message,
				duration: cliCommand.duration,
			};
		}
	}

	/**
	 * Execute command using spawn (fallback method)
	 */
	private async spawnCommand(
		command: string,
		args: string[],
	): Promise<{ success: boolean; output: string; error: string }> {
		return new Promise((resolve) => {
			let output = "";
			let error = "";

			const process = spawn(command, args, {
				stdio: "pipe",
				shell: true,
			});

			process.stdout?.on("data", (data) => {
				output += data.toString();
			});

			process.stderr?.on("data", (data) => {
				error += data.toString();
			});

			process.on("close", (code) => {
				resolve({
					success: code === 0,
					output,
					error,
				});
			});

			process.on("error", (err) => {
				resolve({
					success: false,
					output,
					error: err.message,
				});
			});
		});
	}

	/**
	 * Get available CLI commands
	 */
	getAvailableCommands(): Array<{
		command: string;
		args: string[];
		description: string;
		category: CLICommand["category"];
	}> {
		return [
			// Bun tooling commands
			{
				command: "bun",
				args: ["--version"],
				description: "Check Bun version",
				category: "bun",
			},
			{
				command: "bun",
				args: ["run", "typecheck"],
				description: "Run TypeScript type checking",
				category: "bun",
			},
			{
				command: "bun",
				args: ["test"],
				description: "Run test suite",
				category: "test",
			},
			{
				command: "bun",
				args: ["build"],
				description: "Build the project",
				category: "build",
			},
			{
				command: "bun",
				args: ["run", "build:dev"],
				description: "Build development version",
				category: "build",
			},

			// Matrix CLI commands
			{
				command: "matrix",
				args: ["profile", "list"],
				description: "List available profiles",
				category: "profile",
			},
			{
				command: "matrix",
				args: ["analytics", "dashboard"],
				description: "Show analytics dashboard",
				category: "profile",
			},
			{
				command: "matrix",
				args: ["security", "status"],
				description: "Check security status",
				category: "security",
			},

			// RSS commands
			{
				command: "matrix",
				args: ["rss", "list"],
				description: "List RSS profiles",
				category: "rss",
			},
			{
				command: "matrix",
				args: ["rss", "hacker"],
				description: "Profile Hacker News RSS",
				category: "rss",
			},
			{
				command: "matrix",
				args: ["rss", "bbc"],
				description: "Profile BBC News RSS",
				category: "rss",
			},

			// Dev dashboard commands
			{
				command: "bun",
				args: ["run", "dev-dashboard"],
				description: "Start development dashboard",
				category: "bun",
			},

			// Configuration commands
			{
				command: "matrix",
				args: ["config", "generate", "--template=golden-template"],
				description: "Generate config from template",
				category: "profile",
			},
		];
	}

	/**
	 * Get command status by ID
	 */
	getCommandStatus(commandId: string): CLICommand | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Get command history
	 */
	getCommandHistory(limit: number = 20): CLICommand[] {
		return this.commandHistory.slice(-limit);
	}

	/**
	 * Get running commands
	 */
	getRunningCommands(): CLICommand[] {
		return Array.from(this.commands.values()).filter(
			(cmd) => cmd.status === "running",
		);
	}

	/**
	 * Generate unique command ID
	 */
	private generateCommandId(): string {
		return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Add command to history
	 */
	private addToHistory(command: CLICommand): void {
		this.commandHistory.push(command);
		if (this.commandHistory.length > this.maxHistory) {
			this.commandHistory = this.commandHistory.slice(-this.maxHistory);
		}
	}

	/**
	 * Clean up old completed commands
	 */
	cleanup(): void {
		const now = Date.now();
		const oneHour = 60 * 60 * 1000;

		for (const [id, command] of this.commands.entries()) {
			if (
				(command.status === "completed" || command.status === "error") &&
				command.endTime &&
				now - command.endTime.getTime() > oneHour
			) {
				this.commands.delete(id);
			}
		}
	}
}

export const cliController = new CLIController();

// Auto-cleanup every 30 minutes
setInterval(
	() => {
		cliController.cleanup();
	},
	30 * 60 * 1000,
);
